import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { Breadcrumbs } from "@/components/layout/PageHeader";
import { CeriumImage } from "@/components/ui/CeriumImage";
import { ProductCard } from "@/components/cards/ProductCard";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { CTA } from "@/components/sections/CTA";
import { Reveal } from "@/components/motion/Reveal";
import {
  fetchAllCategorySlugs,
  fetchApplications,
  fetchCategory,
  fetchCategoryPath,
  fetchProductsInCategory,
} from "@/lib/content";
import { isIndexable, isPublishable } from "@/data/taxonomy";
import { buildMetadata, itemListSchema, jsonLd, metaDescription } from "@/lib/seo";
import { applicationPath, categoryPath, productPath } from "@/lib/routes";
import type { Breadcrumb, ProductSummary } from "@/types/content";

/*
 * ---------------------------------------------------------------------------
 * WHAT A CATEGORY PAGE CAN HONESTLY SHOW  (audited against the catalogue)
 * ---------------------------------------------------------------------------
 * Of 30 categories, 24 are publishable:
 *   name          30      summary     4   <- only the four top-level families
 *   applications  23      image       0   <- no category has photography
 *   children       4
 *
 * So TWENTY of the twenty-four published pages have a name, a product list and
 * nothing else. That is the case this layout is designed for, not a degraded
 * version of it. The hero therefore earns its height from structure rather
 * than from prose: where the range sits in the family, how much is in it, and
 * where to go next — all of which are true for every category, unlike a
 * summary, which is true for four.
 *
 * The temptation this page exists to resist is writing "Discover our
 * high-quality range of innovative ingredients" for the other twenty.
 */

interface PageProps {
  params: Promise<{ category: string }>;
}

/**
 * Pre-render every category at build time.
 *
 * Static HTML is the fastest possible response and the most reliably crawlable.
 * Filtered by `isPublishable`, so a range with neither products nor sub-ranges
 * never gets a URL.
 */
export async function generateStaticParams() {
  const slugs = await fetchAllCategorySlugs();
  return slugs.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await fetchCategory(slug);

  if (!category || !isPublishable(category)) {
    // Do not let a missing page inherit an indexable title.
    return buildMetadata({
      title: "Category not found",
      description: "This product category could not be found.",
      path: `/products/${slug}`,
      index: false,
    });
  }

  const [products, ancestry] = await Promise.all([
    fetchProductsInCategory(category),
    fetchCategoryPath(slug),
  ]);

  const family = ancestry.length > 1 ? ancestry[0] : undefined;

  /*
   * The description states what is true, in plain words.
   *
   * Where Cerium wrote a summary it is used verbatim. Where it did not — 20 of
   * 24 pages — the fallback names the family, the count and the industries
   * Cerium says it serves. No superlative, no "leading supplier", no keyword
   * list: those are the descriptions that read as spam and that the brand voice
   * forbids anyway.
   */
  const description = category.summary
    ? metaDescription(category.summary)
    : metaDescription(
        `${category.name}${family ? ` from the ${family.name} range` : ""} at Cerium Chemicals${
          products.length > 0
            ? ` — ${products.length} ${products.length === 1 ? "product" : "products"}`
            : ""
        }. Specialty raw materials for personal care and home care formulators.`,
      );

  return buildMetadata({
    title: category.name,
    description,
    path: `/products/${category.slug}`,
    /*
     * A publishable range with no products anywhere beneath it is a real page
     * with nothing on it. It stays reachable and linked; it is simply not
     * offered as a search landing page. See `isIndexable`.
     */
    index: isIndexable(category),
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params;
  const category = await fetchCategory(slug);

  // `generateStaticParams` omits unpublishable ranges, but Next still renders
  // unknown params on demand — so the guard has to be here too, or a range with
  // no products would serve a thin page on a URL the sitemap never listed.
  if (!category || !isPublishable(category)) notFound();

  const [products, applications, ancestry] = await Promise.all([
    fetchProductsInCategory(category),
    fetchApplications(),
    fetchCategoryPath(slug),
  ]);

  const children = category.children ?? [];
  const parent = ancestry.length > 1 ? ancestry[ancestry.length - 2] : undefined;
  const family = ancestry.length > 1 ? ancestry[0] : undefined;

  /*
   * Sibling ranges — the navigation this page was missing entirely.
   *
   * Standing on Essential Oils there was previously no route to Carrier Oils
   * except back up to the family page and down again. Siblings come from the
   * parent's own children, which is a real edge in the taxonomy rather than an
   * inferred association, and unpublishable ones are filtered so the list
   * cannot link into a 404.
   */
  const siblings = (parent?.children ?? []).filter(
    (item) => item.slug !== category.slug && isPublishable(item),
  );

  const relatedApplications = applications.filter((application) =>
    (category.applicationSlugs ?? []).includes(application.slug),
  );

  // Group products by their immediate sub-family so a long list stays readable
  // and each group keeps a real heading in the outline.
  const grouped = children.length
    ? children.map((child) => ({
        name: child.name,
        slug: child.slug,
        publishable: isPublishable(child),
        products: products.filter((product) => product.categorySlug === child.slug),
      }))
    : [];

  const ungrouped = children.length
    ? products.filter((product) => product.categorySlug === category.slug)
    : products;

  const hasImage = Boolean(category.image?.src ?? category.image?.cloudinaryId);

  const breadcrumbs: Breadcrumb[] = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    ...ancestry.map((node) => ({
      name: node.name,
      href: categoryPath(node.slug),
    })),
  ];

  return (
    <>
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              itemListSchema(
                category.name,
                // Each entry now carries the URL of the product's own page, so
                // the list is a route into the catalogue rather than a bare
                // set of names.
                products.map((product) => ({
                  name: product.name,
                  path: productPath(product) ?? undefined,
                })),
              ),
            ),
          }}
        />
      )}

      {/* ================================================================= */}
      {/* HERO                                                              */}
      {/* ================================================================= */}
      <div className="border-b border-border bg-background-soft">
        <Container>
          <div className="pb-12 pt-8 md:pb-14 md:pt-10">
            <Breadcrumbs items={breadcrumbs} />

            <div
              className={
                hasImage
                  ? "mt-8 grid gap-10 md:mt-10 lg:grid-cols-12 lg:items-center lg:gap-14"
                  : "mt-8 md:mt-10"
              }
            >
              <div className={hasImage ? "lg:col-span-7" : "max-w-4xl"}>
                <Reveal>
                  {/*
                    The eyebrow carries orientation rather than the word
                    "Products". On a sub-range it names the family and links to
                    it, which is the fastest way to answer "where am I?" — and
                    on 20 pages with no summary it is the only context in the
                    hero that is not the title itself.
                  */}
                  {family ? (
                    <Eyebrow>
                      <Link
                        href={categoryPath(family.slug)}
                        className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current"
                      >
                        {family.name}
                      </Link>
                    </Eyebrow>
                  ) : (
                    <Eyebrow>Product family</Eyebrow>
                  )}
                </Reveal>

                <Reveal delay={60}>
                  <Heading level={1} size="h1" className="mt-5 break-words">
                    {category.name}
                  </Heading>
                </Reveal>

                {category.summary && (
                  <Reveal delay={110}>
                    <p className="mt-6 max-w-[62ch] text-lead text-text-muted">
                      {category.summary}
                    </p>
                  </Reveal>
                )}

                {/*
                  Counts are derived from what is actually listed below, so a
                  label can never disagree with the page. Rendered as a
                  definition list because they are labelled values, not prose.
                */}
                <Reveal delay={140}>
                  <dl className="mt-7 flex flex-wrap items-baseline gap-x-8 gap-y-3">
                    {products.length > 0 && (
                      <Stat
                        value={products.length}
                        label={products.length === 1 ? "product" : "products"}
                      />
                    )}
                    {children.length > 0 && (
                      <Stat
                        value={children.length}
                        label={children.length === 1 ? "range" : "ranges"}
                      />
                    )}
                  </dl>
                </Reveal>
              </div>

              {hasImage && (
                <div className="lg:col-span-5">
                  <Reveal delay={120}>
                    <CeriumImage
                      image={category.image}
                      alt={category.image?.alt ?? category.name}
                      ratio="landscape"
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      placeholderLabel={`${category.name} image`}
                      className="border border-border"
                    />
                  </Reveal>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* ================================================================= */}
      {/* SUB-RANGES                                                        */}
      {/* ================================================================= */}
      {children.length > 0 && (
        <Section space="md" ariaLabelledBy="ranges-heading">
          <Container>
            <Heading level={2} size="h3" id="ranges-heading">
              Ranges in {category.name}
            </Heading>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {children.map((child, index) => (
                <li key={child.slug}>
                  <Reveal delay={(index % 3) * 60} className="h-full">
                    {/* CategoryCard renders an unpublishable range as plain
                        content rather than a link, so a sub-range with no page
                        cannot lead anywhere broken. */}
                    <CategoryCard category={child} variant="tile" className="h-full" />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {/* ================================================================= */}
      {/* PRODUCTS                                                          */}
      {/* ================================================================= */}
      {products.length > 0 ? (
        <Section tone="soft" space="lg" ariaLabelledBy="products-heading">
          <Container>
            <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <Heading level={2} size="h3" id="products-heading">
                {products.length} {products.length === 1 ? "product" : "products"}
                {" in "}
                {category.name}
              </Heading>
              <p className="max-w-[46ch] text-caption text-text-muted">
                Listed in the order Cerium publishes them.
              </p>
            </div>

            <p className="mt-6 max-w-[62ch] text-small text-text-muted">
              Product names and benefit copy as published by Cerium. Technical
              documentation is available on request.
            </p>

            {grouped
              .filter((group) => group.products.length > 0)
              .map((group) => (
                <div key={group.slug} className="mt-14">
                  {/* The group heading links to the sub-range's own page. On a
                      parent family this is the only route from the grouped
                      listing down into the range that owns those products. */}
                  <h3 className="text-h4 font-semibold">
                    {group.publishable ? (
                      <Link
                        href={categoryPath(group.slug)}
                        className="underline decoration-transparent underline-offset-4 transition-colors hover:text-primary hover:decoration-primary/40"
                      >
                        {group.name}
                      </Link>
                    ) : (
                      group.name
                    )}
                  </h3>
                  <ProductGrid products={group.products} />
                </div>
              ))}

            {ungrouped.length > 0 && (
              <div className="mt-14">
                {grouped.some((group) => group.products.length > 0) && (
                  <h3 className="text-h4 font-semibold">Other {category.name}</h3>
                )}
                <ProductGrid products={ungrouped} />
              </div>
            )}
          </Container>
        </Section>
      ) : (
        <Section tone="soft" space="md" ariaLabelledBy="pending-heading">
          <Container>
            {/*
              Honest empty state — never a fabricated placeholder product.

              Only one publishable category reaches this branch: Food
              Ingredients, which has six sub-ranges and no published product
              names anywhere in the supplied material. Its behaviour is
              deliberately left exactly as it was; see the report.
            */}
            <div className="max-w-[62ch] border border-border bg-surface p-8">
              <Heading level={2} size="h4" id="pending-heading">
                Product listing in preparation
              </Heading>
              <p className="mt-3 text-body text-text-muted">
                Detailed listings for {category.name} are being prepared. Get in
                touch and we will send you current availability.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex text-small font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
              >
                Make an enquiry
                <span className="sr-only"> about {category.name}</span>
              </Link>
            </div>
          </Container>
        </Section>
      )}

      {/* ================================================================= */}
      {/* APPLICATIONS — attributed to the range, never to each product     */}
      {/* ================================================================= */}
      {relatedApplications.length > 0 && (
        <Section space="md" ariaLabelledBy="applications-heading">
          <Container>
            <Heading level={2} size="h3" id="applications-heading">
              Where this range is used
            </Heading>
            {/*
              The sentence attributes the relationship to the RANGE, because
              that is the level at which Cerium's material declares it. Product
              -> Application does not exist as a stored relation, so "every
              product here suits skin care" would be an inference — and for a
              raw material that is a formulation claim rather than a
              merchandising one. The previous heading, "Used in", left the
              subject ambiguous.
            */}
            <p className="mt-3 max-w-[62ch] text-body text-text-muted">
              Cerium supplies {category.name} for the following applications.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {relatedApplications.map((application) => (
                <li key={application.slug}>
                  <Link
                    href={applicationPath(application.slug)}
                    className="text-body font-medium text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
                  >
                    {application.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {/* ================================================================= */}
      {/* SIBLING RANGES                                                    */}
      {/* ================================================================= */}
      {siblings.length > 0 && parent && (
        <Section tone="soft" space="md" ariaLabelledBy="siblings-heading">
          <Container>
            {/* `flex-wrap` is load-bearing: at the sm breakpoint a long heading
                  ("Other ranges in Natural Ingredients") beside a shrink-0
                  "View all" link needs more width than the container has, and
                  without wrapping the row pushes the page sideways. */}
            <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <Heading level={2} size="h3" id="siblings-heading">
                Other ranges in {parent.name}
              </Heading>
              <Link
                href={categoryPath(parent.slug)}
                className="shrink-0 text-small font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
              >
                View all {parent.name}
              </Link>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {siblings.map((item, index) => (
                <li key={item.slug}>
                  <Reveal delay={(index % 3) * 60} className="h-full">
                    <CategoryCard category={item} variant="tile" className="h-full" />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {/* ================================================================= */}
      {/* CONTEXTUAL NAVIGATION                                             */}
      {/* ================================================================= */}
      <Section space="sm" ariaLabelledBy="continue-heading">
        <Container>
          <h2 id="continue-heading" className="sr-only">
            Continue browsing
          </h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-8">
            <Link
              href={parent ? categoryPath(parent.slug) : "/products"}
              className="group/back inline-flex items-center gap-2 text-small font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3 w-3 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] group-hover/back:-translate-x-0.5 motion-reduce:transform-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13.5 8h-11M7 3.5 2.5 8 7 12.5" />
              </svg>
              Back to {parent ? parent.name : "all products"}
            </Link>
            {parent && (
              <Link
                href="/products"
                className="text-small font-medium text-text-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
              >
                All products
              </Link>
            )}
          </div>
        </Container>
      </Section>

      <CTA
        eyebrow={category.name}
        title={`Looking for ${category.name.toLowerCase()}?`}
        body="Tell us what you are formulating and our team will come back with availability, documentation and pricing."
      />
    </>
  );
}

/** A labelled count. Value first visually, term first in the DOM. */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-caption uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="font-display text-[1.75rem] leading-none text-primary">
        {value}
      </dd>
    </div>
  );
}

function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={`${product.categorySlug}-${product.slug}`}>
          <Reveal delay={(index % 4) * 50} className="h-full">
            {/* Benefit copy is clamped in listings — the full wording lives on
                the product page, one click away, so a long entry cannot stretch
                its whole grid row. */}
            <ProductCard
              product={product}
              showCategory={false}
              clampBenefit
              className="h-full"
            />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
