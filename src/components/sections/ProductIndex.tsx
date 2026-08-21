import Link from "next/link";
import type { ProductSummary } from "@/types/content";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { productPath } from "@/lib/routes";

/**
 * Alphabetical index of the whole catalogue.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Before this section, /products listed families and sub-families and no
 * products at all, so every product page's only inbound link came from its own
 * range page. That is how product pages end up orphaned in practice: reachable
 * in principle, three clicks deep, and crawled last. One flat index gives all
 * 122 pages a link from the section's most authoritative page and gives a
 * returning buyer who already knows the material name a direct route to it.
 *
 * It is also the reason this is not a search box. Search is a UI shell in
 * Phase 1 and a real backend in Phase 4 — an A-Z index needs no JavaScript, no
 * catalogue in the browser bundle, and it is crawlable, which a search input
 * never is.
 *
 * Rendered on the server from props: the catalogue does not cross into the
 * client bundle to produce it. CSS multi-column layout does the balancing, so
 * there is no measurement code and nothing to hydrate.
 */
export function ProductIndex({ products }: { products: ProductSummary[] }) {
  const groups = groupByInitial(products);

  if (groups.length === 0) return null;

  return (
    <Section tone="soft" space="lg" ariaLabelledBy="product-index-heading">
      <Container>
        <div className="max-w-2xl">
          <Heading level={2} size="h3" id="product-index-heading">
            Product index
          </Heading>
          <p className="mt-3 text-body text-text-muted">
            Every product currently listed in the Cerium catalogue, A–Z. Product
            names and benefit copy are as published by Cerium; technical
            documentation is available on request.
          </p>
        </div>

        <div className="mt-12 gap-x-12 sm:columns-2 lg:columns-3 xl:columns-4">
          {groups.map(({ initial, items }) => (
            // `break-inside-avoid` keeps a letter group from being split
            // across two columns, which would put a heading at the foot of one
            // column and its list at the head of the next.
            <section
              key={initial}
              aria-label={`Products beginning with ${initial}`}
              className="mb-9 break-inside-avoid"
            >
              <h3
                aria-hidden="true"
                className="border-b border-border pb-2 font-display text-h4 text-primary"
              >
                {initial}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {items.map((product) => {
                  const href = productPath(product);
                  return (
                    <li key={`${product.categorySlug}-${product.slug}`}>
                      {href ? (
                        <Link
                          href={href}
                          className="group/item block text-small text-text underline decoration-transparent underline-offset-4 transition-colors hover:text-primary hover:decoration-primary/40"
                        >
                          {product.name}
                          {product.categoryName && (
                            <span className="block text-caption text-text-muted">
                              {product.categoryName}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <span className="block text-small text-text">
                          {product.name}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/**
 * Group products under their first character.
 *
 * Anything not starting A-Z (a numeral, say) collects under "#" rather than
 * creating a one-item group per symbol. Sorted with `localeCompare` so
 * "Olive Oil (Extra Virgin)" and "Olive Oil Pomace" order predictably rather
 * than by raw code point.
 *
 * The letter headings are `aria-hidden`: each group is a labelled `section`
 * ("Products beginning with C"), so exposing the bare glyph as well would make
 * a screen reader announce "C, heading level 3" between every group with no
 * added meaning.
 */
function groupByInitial(
  products: ProductSummary[],
): Array<{ initial: string; items: ProductSummary[] }> {
  const buckets = new Map<string, ProductSummary[]>();

  for (const product of products) {
    const first = product.name.trim().charAt(0).toUpperCase();
    const initial = /[A-Z]/.test(first) ? first : "#";
    const bucket = buckets.get(initial);
    if (bucket) bucket.push(product);
    else buckets.set(initial, [product]);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([initial, items]) => ({
      initial,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
