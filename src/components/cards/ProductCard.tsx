import Link from "next/link";
import type { ProductSummary } from "@/types/content";
import { CeriumImage } from "@/components/ui/CeriumImage";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

interface ProductCardProps {
  product: ProductSummary;
  /** Hide the category label where the surrounding context already states it. */
  showCategory?: boolean;
  showImage?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Product card.
 *
 * Deliberately makes no assumption about the final product schema — it renders
 * only the fields that are present and omits the rest, so adding specifications
 * or documents in a later phase is additive rather than a rewrite.
 *
 * There is no product detail route in Phase 1, so the card does not pretend to
 * link to one. The name is text; the actionable element is an enquiry link that
 * carries the product through as a query parameter.
 */
export function ProductCard({
  product,
  showCategory = true,
  showImage = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  className,
}: ProductCardProps) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col border border-border bg-surface p-5",
        "transition-colors duration-[var(--duration-base)] hover:border-green-300",
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

      <h3 className="text-h4 font-semibold text-text">{product.name}</h3>

      {product.olfactive && (
        <p className="mt-1.5 text-caption uppercase tracking-wide text-text-muted">
          {product.olfactive}
        </p>
      )}

      {product.benefit && (
        <p className="mt-3 text-small text-text-muted">{product.benefit}</p>
      )}

      {product.applications && product.applications.length > 0 && (
        <div className="mt-4">
          <h4 className="sr-only">Applications for {product.name}</h4>
          <ul className="flex flex-wrap gap-1.5">
            {product.applications.map((application) => (
              <li key={application}>
                <Badge tone="neutral">{application}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-5">
        <Link
          href={`/contact?product=${encodeURIComponent(product.slug)}`}
          className="inline-flex items-center gap-1.5 text-small font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
        >
          Enquire
          <span className="sr-only">about {product.name}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-3 w-3 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
          </svg>
        </Link>
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
