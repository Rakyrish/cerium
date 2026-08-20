/**
 * Public URL builders.
 *
 * Every link to a catalogue entity is composed here rather than by string
 * interpolation at the call site. Four places need a product URL — the card,
 * the related-products rail, the product index and the sitemap — and a URL
 * that four files build independently is a URL that eventually disagrees with
 * itself. `generateStaticParams` and `sitemap.ts` are generated from the same
 * pairs these functions consume, so a link can only point at a route that
 * exists.
 *
 * Deliberately free of any `src/data` import, so this module is safe to use
 * from either side of the server/client boundary. It maps identifiers to
 * paths; it does not read the catalogue.
 */

import type { ProductSummary } from "@/types/content";

/** A product family or sub-family listing. */
export function categoryPath(slug: string): string {
  return `/products/${slug}`;
}

/**
 * The canonical URL for a product.
 *
 * A product is addressed under the category that actually declares it — its
 * leaf range — not under whichever ancestor the visitor happened to browse
 * from. `getProductsInCategory` stamps that leaf on `categorySlug` when it
 * reads a product, which is what makes one product resolve to exactly one URL
 * even though it appears in several listings.
 *
 * Returns null when the caller holds a product that was not read through the
 * content layer and therefore has no category context. The callers render
 * plain text in that case rather than guessing a path into a 404 — the type
 * marks `categorySlug` optional, so this cannot be assumed away.
 */
export function productPath(
  product: Pick<ProductSummary, "slug" | "categorySlug">,
): string | null {
  if (!product.categorySlug) return null;
  return `/products/${product.categorySlug}/${product.slug}`;
}

/**
 * The enquiry route for a product.
 *
 * Phase 1 has no enquiry form (that is Phase 11); the contact page reads this
 * parameter and pre-composes the email. See `src/app/contact/page.tsx`.
 */
export function enquiryPath(product: Pick<ProductSummary, "slug">): string {
  return `/contact?product=${encodeURIComponent(product.slug)}`;
}

export function applicationPath(slug: string): string {
  return `/applications/${slug}`;
}

export function industryPath(slug: string): string {
  return `/industries/${slug}`;
}
