import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { isStudioEnabled, studioDisabledResponse } from "@/lib/studio-guard";
import {
  ALLOWED_IMAGE_TYPES as ALLOWED,
  IMAGES_DIR,
  listImages,
} from "@/lib/studio-images";
import { slugify } from "@/lib/slug";

/**
 * Image upload for the Content Studio. Development only.
 *
 * Writes into `public/images/`. Two things matter here:
 *
 * 1. PATH TRAVERSAL. The uploaded filename is never trusted. Only the basename
 *    is taken, it is slugified down to `[a-z0-9-]`, and the resolved path is
 *    checked to still sit inside the images directory before anything is
 *    written. A name like `../../src/app/page.tsx` cannot escape.
 *
 * 2. FILE TYPE. Only known raster/vector image extensions with a matching
 *    `image/*` MIME type are accepted, so this cannot be used to drop a `.ts`
 *    or `.sh` file into the source tree.
 */

const MAX_BYTES = 8 * 1024 * 1024;

export async function GET() {
  if (!isStudioEnabled) return studioDisabledResponse();
  return Response.json({ files: await listImages() });
}

export async function POST(request: Request) {
  if (!isStudioEnabled) return studioDisabledResponse();

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file was received." }, { status: 400 });
  }

  if (file.size === 0) {
    return Response.json({ error: "That file is empty." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      {
        error: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Keep images under 8MB — resize it first.`,
      },
      { status: 413 },
    );
  }

  // Take the basename only, then rebuild it from a safe alphabet.
  const original = path.basename(file.name);
  const extension = path.extname(original).toLowerCase();
  const allowedTypes = ALLOWED[extension];

  if (!allowedTypes) {
    return Response.json(
      { error: `${extension || "That file type"} is not allowed. Use JPG, PNG, WebP, AVIF or SVG.` },
      { status: 415 },
    );
  }

  if (!allowedTypes.includes(file.type)) {
    return Response.json(
      { error: `File contents (${file.type || "unknown"}) do not match the ${extension} extension.` },
      { status: 415 },
    );
  }

  const base = slugify(path.basename(original, extension)) || "image";
  let filename = `${base}${extension}`;
  let target = path.join(IMAGES_DIR, filename);

  // Belt and braces: confirm the resolved path is still inside IMAGES_DIR.
  if (path.dirname(path.resolve(target)) !== path.resolve(IMAGES_DIR)) {
    return Response.json({ error: "Invalid filename." }, { status: 400 });
  }

  await mkdir(IMAGES_DIR, { recursive: true });

  // Never overwrite an image that is already referenced somewhere.
  let counter = 2;
  while (await exists(target)) {
    filename = `${base}-${counter}${extension}`;
    target = path.join(IMAGES_DIR, filename);
    counter += 1;
  }

  await writeFile(target, Buffer.from(await file.arrayBuffer()));

  return Response.json({ ok: true, src: `/images/${filename}`, name: filename });
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
