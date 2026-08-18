import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

/**
 * Brand lockup.
 *
 * The supplied logo is blue on transparent, which disappears on dark green, so
 * a monochrome white reversal is used on dark surfaces. Both files are derived
 * from the single supplied asset — no re-drawing of the mark.
 *
 * `priority` because the header logo is in the initial viewport on every page.
 */
export function Logo({
  variant = "default",
  className,
  /** True when this is the site-wide home link in the header. */
  isHome = false,
}: {
  variant?: "default" | "inverse";
  className?: string;
  isHome?: boolean;
}) {
  const asset =
    variant === "inverse" ? siteConfig.brand.logoInverse : siteConfig.brand.logo;

  const image = (
    <Image
      src={asset.src}
      alt={`${siteConfig.name} — ${siteConfig.tagline}`}
      width={asset.width}
      height={asset.height}
      priority
      className={cn("h-auto w-[168px] sm:w-[184px]", className)}
    />
  );

  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name}, back to homepage`}
      aria-current={isHome ? "page" : undefined}
      className="inline-flex shrink-0 items-center"
    >
      {image}
    </Link>
  );
}
