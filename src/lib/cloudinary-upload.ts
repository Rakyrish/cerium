import "server-only";

import { createHash } from "node:crypto";
import { cloudinaryServerConfig } from "@/config/site";

/**
 * Cloudinary uploads.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SERVER UPLOADS, RATHER THAN SIGNING THE BROWSER
 * ---------------------------------------------------------------------------
 * The usual pattern hands the browser a signature and lets it POST straight to
 * Cloudinary, which saves the bytes a hop. It is not used here because the
 * signature would authorise an upload this application never gets to inspect:
 * whoever holds it controls the filename, the folder and the content type, and
 * the resulting asset appears in the account whether or not the admin session
 * was still valid by the time it landed.
 *
 * Routing the bytes through the server costs one hop and buys the ability to
 * reject a file on type and size before anything reaches Cloudinary, and to
 * record the asset in Postgres in the same request that created it — so the
 * library and the account cannot drift apart.
 *
 * The API secret is never sent to the browser. It has no `NEXT_PUBLIC_` prefix,
 * this module is `server-only`, and the signature is computed here.
 */

/** Matches the delivery-side allow-list; SVG is excluded on purpose. */
export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Folder every Cerium asset lands in, so the account stays navigable. */
const FOLDER = "cerium";

export interface UploadedAsset {
  cloudinaryId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Sign an upload request.
 *
 * Cloudinary signs the alphabetically-sorted parameter string with the API
 * secret appended. SHA-1 is not a security choice here — it is what the
 * Cloudinary signature algorithm specifies.
 */
function sign(params: Record<string, string>): string {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(canonical + cloudinaryServerConfig.apiSecret)
    .digest("hex");
}

/**
 * Upload one file, returning what the database needs to record it.
 *
 * Throws with a human-readable message on rejection — the caller surfaces it
 * to the operator rather than swallowing it, because "nothing happened" is the
 * worst possible upload feedback.
 */
export async function uploadToCloudinary(file: File): Promise<UploadedAsset> {
  if (!cloudinaryServerConfig.isConfigured) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.",
    );
  }

  if (!ALLOWED_UPLOAD_TYPES[file.type]) {
    throw new Error(
      `${file.type || "That file type"} is not allowed. Use JPG, PNG, WebP or AVIF.`,
    );
  }

  if (file.size === 0) throw new Error("That file is empty.");

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Keep images under 10MB.`,
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedParams = { folder: FOLDER, timestamp };

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", cloudinaryServerConfig.apiKey);
  body.append("timestamp", timestamp);
  body.append("folder", FOLDER);
  body.append("signature", sign(signedParams));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryServerConfig.cloudName}/image/upload`,
    { method: "POST", body },
  );

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(detail?.error?.message ?? "Cloudinary rejected the upload.");
  }

  const result = (await response.json()) as {
    public_id: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
  };

  return {
    cloudinaryId: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

/**
 * Remove an asset from Cloudinary.
 *
 * Used only when deleting a library entry, and the database row is removed in
 * the same action so the two cannot disagree.
 */
export async function deleteFromCloudinary(cloudinaryId: string): Promise<void> {
  if (!cloudinaryServerConfig.isConfigured) return;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = sign({ public_id: cloudinaryId, timestamp });

  const body = new FormData();
  body.append("public_id", cloudinaryId);
  body.append("api_key", cloudinaryServerConfig.apiKey);
  body.append("timestamp", timestamp);
  body.append("signature", signature);

  await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryServerConfig.cloudName}/image/destroy`,
    { method: "POST", body },
  );
}
