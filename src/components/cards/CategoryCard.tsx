import Link from "next/link";
import type { ReactNode } from "react";
import type { Category } from "@/types/content";
import { CeriumImage, type AspectRatio } from "@/components/ui/CeriumImage";
import { isPublishable } from "@/data/taxonomy";
import { cn } from "@/lib/cn";

/**
 * Links only when the destination exists.
 *
 * A range with no products and no sub-ranges has no page (see `isPublishable`),
 * so its card renders as plain content instead of a link into a 404.
 */
function CardShell({
  href,
  linked,
  className,
  children,
}: {
  href: string;
  linked: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!linked) return <div className={className}>{children}</div>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

interface CategoryCardProps {
  category: Category;
  /** Number of products beneath this family. Passed in — never guessed. */
  productCount?: number;
  /**
   * Layout pattern. The homepage deliberately mixes these so the page does not
   * read as one repeated grid of identical tiles.
   */
  variant?: "tile" | "editorial" | "rail";
  /** Large index numeral, editorial variant only. */
  index?: number;
  /** Override the image crop — lets a card widen to fill a row on its own. */
  imageRatio?: AspectRatio;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

export function CategoryCard({
  category,
  productCount,
  variant = "tile",
  index,
  imageRatio,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  className,
}: CategoryCardProps) {
  const href = `/products/${category.slug}`;
  const linked = isPublishable(category);

  if (variant === "editorial") {
    return (
      <article className={cn("group relative", className)}>
        <Link href={href} className="block focus-visible:outline-none">
          {/* Whole-card hit area. The visible focus ring is drawn on the
              wrapper below so it frames the card, not just the text. */}
          <span className="absolute inset-0 z-10 rounded-md" />
          <div className="relative overflow-hidden">
            <CeriumImage
              image={category.image}
              alt=""
              ratio={imageRatio ?? "portrait"}
              priority={priority}
              sizes={sizes}
              zoomOnHover
              placeholderLabel={`${category.name} category image`}
            />
            {typeof index === "number" && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-5 top-4 font-display text-[3.5rem] leading-none text-white/85 mix-blend-difference"
              >
                {String(index).padStart(2, "0")}
              </span>
            )}
          </div>

          <div className="pt-5">
            <h3 className="text-h3 font-sans font-medium text-text transition-colors duration-[var(--duration-fast)] group-hover:text-primary">
              {category.name}
            </h3>
            {category.summary && (
              <p className="mt-2 max-w-[46ch] text-small text-text-muted">
                {category.summary}
              </p>
            )}
            {typeof productCount === "number" && productCount > 0 && (
              <p className="mt-3 text-caption text-text-muted">
                {productCount} {productCount === 1 ? "product" : "products"}
              </p>
            )}
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "rail") {
    return (
      <article
        className={cn(
          "group relative shrink-0",
          "w-[74vw] sm:w-[46vw] lg:w-[31vw] xl:w-[420px]",
          className,
        )}
      >
        <CardShell href={href} linked={linked} className="block">
          <div className="relative overflow-hidden">
            <CeriumImage
              image={category.image}
              alt=""
              ratio="wide"
              sizes="(min-width: 1280px) 420px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 74vw"
              zoomOnHover
              placeholderLabel={`${category.name} image`}
            />
          </div>
          <h3 className="mt-4 text-h4 font-medium text-text transition-colors duration-[var(--duration-fast)] group-hover:text-primary">
            {category.name}
          </h3>
          {category.summary && (
            <p className="mt-1.5 line-clamp-2 text-small text-text-muted">
              {category.summary}
            </p>
          )}
        </CardShell>
      </article>
    );
  }

  // Default: bordered tile. Restrained — border does the separation, not shadow.
  return (
    <article
      className={cn(
        "group relative flex flex-col border border-border bg-surface",
        "transition-[border-color,transform] duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
        "hover:border-green-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <CardShell href={href} linked={linked} className="flex h-full flex-col">
        <CeriumImage
          image={category.image}
          alt=""
          ratio="wide"
          sizes={sizes}
          zoomOnHover
          placeholderLabel={`${category.name} image`}
        />
        <div className="flex flex-1 flex-col p-6">
          <h3 className="text-h4 font-medium text-text transition-colors duration-[var(--duration-fast)] group-hover:text-primary">
            {category.name}
          </h3>
          {category.summary && (
            <p className="mt-2 text-small text-text-muted">{category.summary}</p>
          )}
          <div className="mt-auto flex items-center justify-between gap-4 pt-5">
            {typeof productCount === "number" && productCount > 0 ? (
              <span className="text-caption text-text-muted">
                {productCount} {productCount === 1 ? "product" : "products"}
              </span>
            ) : !linked ? (
              // Honest state for a range Cerium supplies but has not published
              // a product list for. Not a link, so it cannot lead to a 404.
              <span className="text-caption text-text-muted">
                Available on request
              </span>
            ) : (
              <span />
            )}
            {linked && (
              <span
                aria-hidden="true"
                className="text-primary transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] group-hover:translate-x-1"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </CardShell>
    </article>
  );
}
