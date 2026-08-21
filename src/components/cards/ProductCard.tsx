import Link from "next/link";
import type { ProductSummary } from "@/types/content";
import { CeriumImage } from "@/components/ui/CeriumImage";
import { Badge } from "@/components/ui/Badge";
import { enquiryPath, productPath } from "@/lib/routes";
import { cn } from "@/lib/cn";

interface ProductCardProps {
  product: ProductSummary;
  /** Hide the category label where the surrounding context already states it. */
  showCategory?: boolean;
  showImage?: boolean;
  sizes?: string;
  /** Clamp long benefit copy so a grid row keeps even card heights. */
  clampBenefit?: boolean;
  className?: string;
}

/**
 * Product card.
 *
 * Deliberately makes no assumption about the final product schema — it renders
 * only the fields that are present and omits the rest, so adding specifications
 * or documents in a later phase is additive rather than a rewrite.
 *
 * ---------------------------------------------------------------------------
 * WHY THE WHOLE CARD IS NOT ONE LINK
 * ---------------------------------------------------------------------------
 * The card has two destinations — the product page and an enquiry — so the
 * obvious "wrap everything in an <a>" shortcut is wrong twice over: it cannot
 * hold a second link, and it gives the one link an accessible name assembled
 * from every scrap of text in the card, which is what a screen-reader user then
 * has to sit through for all 122 of them.
 *
 * Instead the product name is the link and it stretches its own hit area over
 * the card with an ::after overlay, so a pointer still gets the large target.
 * The enquiry link is lifted above that overlay with `relative z-10` so it
 * stays independently clickable. Two links, two honest accessible names, one
 * comfortable tap target — and the focus ring lands on the name text, which is
 * the thing that was actually focused.
 */
export function ProductCard({
  product,
  showCategory = true,
  showImage = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  clampBenefit = false,
  className,
}: ProductCardProps) {
  const href = productPath(product);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col border border-border bg-surface p-5",
        "transition-[border-color,transform] duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
        "hover:border-green-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      {showImage && (
        <CeriumImage
          image={product.image}
          alt=""
          ratio="square"
          sizes={sizes}
          zoomOnHover
          placeholderLabel={`${product.name} product image`}
          className="mb-5"
        />
      )}

      {showCategory && product.categoryName && (
        <p className="mb-2 text-eyebrow font-semibold uppercase text-primary">
          {product.categoryName}
        </p>
      )}

      <h3 className="text-h4 font-semibold text-text">
        {href ? (
          <Link
            href={href}
            className={cn(
              "transition-colors duration-[var(--duration-fast)] group-hover:text-primary",
              // Stretches the hit area over the card without swallowing the
              // enquiry link below, which sits above this overlay.
              "after:absolute after:inset-0 after:content-['']",
            )}
          >
            {product.name}
          </Link>
        ) : (
          /* No category context means no canonical URL can be built, so the
             name stays text rather than linking into a 404. */
          product.name
        )}
      </h3>

      {product.olfactive && (
        <p className="mt-1.5 text-caption uppercase tracking-wide text-text-muted">
          <span className="sr-only">Olfactive family: </span>
          {product.olfactive}
        </p>
      )}

      {product.benefit && (
        <p
          className={cn(
            "mt-3 text-small text-text-muted",
            clampBenefit && "line-clamp-3",
          )}
        >
          {product.benefit}
        </p>
      )}

      {product.formats && product.formats.length > 0 && (
        <div className="mt-4">
          {/* These badges are end-product formats, not the six site
              Applications. The heading says so, because "Applications for
              Jojoba Oil" read out before a list of "Shampoo, Shower gel"
              describes the wrong relationship to anyone using a screen
              reader. */}
          <h4 className="sr-only">End-product formats for {product.name}</h4>
          <ul className="flex flex-wrap gap-1.5">
            {product.formats.map((format) => (
              <li key={format}>
                <Badge tone="neutral">{format}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-4 pt-5">
        {/*
          `relative z-10` lifts the enquiry link above the name link's stretched
          overlay, so the card carries two independently operable destinations
          rather than one that swallows the other.

          The name link is not repeated here as a "View details" row. It would
          be a second link to the same URL, which buys a sighted user nothing
          the whole-card hit area does not already give them and costs a
          screen-reader user a duplicate entry in the links list — 122 times
          over. The arrow carries the same affordance decoratively.
        */}
        <Link
          href={enquiryPath(product)}
          className="relative z-10 text-small font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
        >
          Enquire
          <span className="sr-only"> about {product.name}</span>
        </Link>

        {href && (
          <span
            aria-hidden="true"
            className="text-primary transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] group-hover:translate-x-1 motion-reduce:transform-none"
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
    </article>
  );
}

/**
 * Loading skeleton.
 *
 * `aria-hidden` with a polite status message alongside: a screen reader should
 * hear "loading", not a description of grey rectangles.
 */
export function ProductCardSkeleton({ showImage = false }: { showImage?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full animate-pulse flex-col border border-border bg-surface p-5"
    >
      {showImage && <div className="mb-5 aspect-square w-full bg-surface-sunken" />}
      <div className="h-2.5 w-24 bg-surface-sunken" />
      <div className="mt-3 h-4 w-3/4 bg-surface-sunken" />
      <div className="mt-4 space-y-2">
        <div className="h-2.5 w-full bg-surface-sunken" />
        <div className="h-2.5 w-5/6 bg-surface-sunken" />
      </div>
      <div className="mt-auto pt-5">
        <div className="h-2.5 w-16 bg-surface-sunken" />
      </div>
    </div>
  );
}

/** Grid of skeletons with a single polite announcement. */
export function ProductGridSkeleton({
  count = 8,
  showImage = false,
}: {
  count?: number;
  showImage?: boolean;
}) {
  return (
    <>
      <p role="status" className="sr-only">
        Loading products…
      </p>
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }, (_, index) => (
          <ProductCardSkeleton key={index} showImage={showImage} />
        ))}
      </div>
    </>
  );
}
