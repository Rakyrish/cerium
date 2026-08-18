import Image from "next/image";
import type { ImageRef } from "@/types/content";
import { cloudinaryConfig } from "@/config/site";
import { cloudinaryLoader } from "@/lib/cloudinary";
import { cn } from "@/lib/cn";

export type AspectRatio =
  | "square"
  | "portrait"
  | "landscape"
  | "wide"
  | "ultrawide"
  | "auto";

const ratios: Record<AspectRatio, string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  wide: "aspect-[16/10]",
  ultrawide: "aspect-[21/9]",
  auto: "",
};

interface CeriumImageProps {
  image?: ImageRef;
  /**
   * Fallback alt text. An `image.alt` always wins.
   * Pass "" only for genuinely decorative imagery.
   */
  alt?: string;
  ratio?: AspectRatio;
  /**
   * Set true for images above the fold (the hero). Sets fetchpriority=high and
   * disables lazy loading. Using it on more than one or two images per page
   * makes LCP worse, not better.
   */
  priority?: boolean;
  /**
   * Responsive sizes hint. Getting this right is the single biggest lever on
   * image bytes — the default assumes a full-width image.
   */
  sizes?: string;
  /** Zoom slightly on hover of an ancestor marked `group`. */
  zoomOnHover?: boolean;
  /** Label shown on the development placeholder. Describes the intended shot. */
  placeholderLabel?: string;
  className?: string;
  imageClassName?: string;
}

/**
 * The only image component in the application.
 *
 * Everything goes through here so that responsive sizing, lazy loading, format
 * negotiation and the Cloudinary migration are handled in exactly one place.
 *
 * When no real asset exists it renders a visibly-labelled DEVELOPMENT
 * PLACEHOLDER. That is deliberate: Cerium has not supplied production
 * photography (the catalogue PDF is photographs of a printed booklet), and
 * dressing the site with stock imagery would misrepresent it as finished.
 */
export function CeriumImage({
  image,
  alt,
  ratio = "landscape",
  priority = false,
  sizes = "100vw",
  zoomOnHover = false,
  placeholderLabel,
  className,
  imageClassName,
}: CeriumImageProps) {
  const useCloudinary = Boolean(image?.cloudinaryId && cloudinaryConfig.isConfigured);
  const src = useCloudinary ? image!.cloudinaryId! : image?.src;
  const resolvedAlt = image?.alt ?? alt ?? "";

  if (!src) {
    return (
      <ImagePlaceholder
        ratio={ratio}
        label={placeholderLabel ?? alt}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-sunken",
        ratios[ratio],
        className,
      )}
    >
      <Image
        src={src}
        alt={resolvedAlt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        loader={useCloudinary ? cloudinaryLoader : undefined}
        style={image?.focal ? { objectPosition: image.focal } : undefined}
        className={cn(
          "object-cover",
          zoomOnHover &&
            "transition-transform duration-[900ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none",
          imageClassName,
        )}
      />
    </div>
  );
}

/**
 * Development placeholder.
 *
 * Intentionally unattractive-adjacent: it reads as scaffolding, not as art
 * direction, so no one mistakes it for delivered work or ships it by accident.
 * Replace by populating `image.cloudinaryId` in the data layer.
 */
export function ImagePlaceholder({
  ratio = "landscape",
  label,
  className,
}: {
  ratio?: AspectRatio;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={
        label
          ? `Placeholder for image: ${label}. Final image pending.`
          : "Placeholder image. Final image pending."
      }
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden",
        "border border-dashed border-green-200 bg-green-50/60",
        ratios[ratio],
        className,
      )}
    >
      {/* Hatch pattern — pure CSS, no asset request */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--color-green-200) 0 1px, transparent 1px 11px)",
        }}
      />
      <div className="relative flex flex-col items-center gap-1.5 px-5 text-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 text-green-300"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="16" rx="1.5" />
          <path d="m3 16 5-5 4 4 3-3 6 6" />
          <circle cx="8.5" cy="9" r="1.4" />
        </svg>
        <span className="text-eyebrow font-semibold uppercase text-green-500">
          Image pending
        </span>
        {label && (
          <span className="max-w-[24ch] text-caption text-text-muted">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
