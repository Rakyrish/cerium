/**
 * Cloudinary delivery.
 *
 * `f_auto` negotiates AVIF/WebP per browser and `q_auto` picks quality per
 * image, so the responsive srcset Next.js generates is delivered in a modern
 * format without any per-image configuration.
 *
 * Nothing here activates until NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is set.
 */

import type { ImageLoaderProps } from "next/image";
import { cloudinaryConfig } from "@/config/site";

export function cloudinaryLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const transforms = [
    "f_auto",
    `q_${quality ?? "auto"}`,
    "c_limit",
    `w_${width}`,
  ].join(",");

  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${transforms}/${src}`;
}
