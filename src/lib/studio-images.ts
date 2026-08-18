import "server-only";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export const IMAGES_DIR = path.join(process.cwd(), "public", "images");

/** Extensions the Studio will accept, mapped to their expected MIME types. */
export const ALLOWED_IMAGE_TYPES: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".avif": ["image/avif"],
  ".svg": ["image/svg+xml"],
};

export interface StoredImage {
  name: string;
  src: string;
  bytes: number;
}

/**
 * List everything in `public/images/`.
 *
 * Read on the server so the Studio renders with its library already populated —
 * no loading spinner and no client-side fetch on mount.
 */
export async function listImages(): Promise<StoredImage[]> {
  try {
    const entries = await readdir(IMAGES_DIR);
    const files = await Promise.all(
      entries
        .filter((name) => path.extname(name).toLowerCase() in ALLOWED_IMAGE_TYPES)
        .map(async (name) => {
          const info = await stat(path.join(IMAGES_DIR, name));
          return { name, src: `/images/${name}`, bytes: info.size };
        }),
    );
    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
