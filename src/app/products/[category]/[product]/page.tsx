import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { Breadcrumbs } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CeriumImage } from "@/components/ui/CeriumImage";
import { ProductCard } from "@/components/cards/ProductCard";
import { CTA } from "@/components/sections/CTA";
import { Reveal } from "@/components/motion/Reveal";
import {
  fetchAllProductParams,
  fetchCategoryPath,
  fetchProductInCategory,
  fetchRelatedProducts,
} from "@/lib/content";
import {
  buildMetadata,
  jsonLd,
  metaDescription,
  productSchema,
} from "@/lib/seo";
import { categoryPath, enquiryPath } from "@/lib/routes";
import type { Breadcrumb, ProductSummary } from "@/types/content";

/*
 * ---------------------------------------------------------------------------
 * WHAT THIS PAGE CAN HONESTLY SHOW  (audited against src/data/taxonomy.ts)
 * ---------------------------------------------------------------------------
 * Of 122 products:
 *   name        122   olfactive    14
 *   benefit      40   image         0   <- no product has photography
 *   formats      14   name only    68
 *
 * `source` is on all 122 but is internal provenance and is never rendered.
 *
 * ABSENT ENTIRELY: CAS, INCI, specifications, grade, purity, certifications,
 * regulatory status, TDS/SDS/CoA documents, pricing, manufacturer, principal.
 *
 * Two consequences drive the layout below:
 *
 * 1. 56% of these pages have a NAME AND NOTHING ELSE. The page therefore has to
 *    look finished with one field populated. Every block below is conditional,
 *    and what remains when they all drop out is still a coherent page —
 *    identity, where it sits in the range, and a way to ask. That is the design
 *    target, not the degraded case.
 *
 * 2. There is NO technical section and NO documents section, because there is
 *    no technical data and there are no documents. An empty table, an "N/A"
 *    column or a document card that links nowhere would each imply Cerium
 *    withheld information it has never supplied. Adding them later is inserting
 *    a section between two existing ones — see the seam marked below — not a
 *    redesign. `docs/phase-2-2a-schema-specification.md` §4.3 is explicit that
 *    technical values must arrive document-attributed rather than as bare
 *    columns, so no speculative fields are added to the type to "prepare".
 */

interface PageProps {
  params: Promise<{ category: string; product: string }>;
}

/**
 * Pre-render every product at build time.
 *
 * Pairs come from one traversal in the content layer, so the routes generated
 * here, the links that point at them and the sitemap entries all derive from
 * the same source and cannot drift apart.
 */
export async function generateStaticParams() {
  return fetchAllProductParams();
}

/**
 * The description a product page can honestly claim.
 *
 * Where Cerium supplied benefit copy it is used verbatim (trimmed to length).
 * Where it did not — 82 of 122 products — the fallback states only what is
 * structurally true: this product, this range, this supplier. Nothing about
 * performance, composition or suitability is asserted, and no superlative is
 * introduced that is not already Cerium's own word.
 */
function describe(product: ProductSummary): string {
  if (product.benefit) {
    return metaDescription(`${product.name} — ${product.benefit}`);
  }

  const range = product.categoryName;
  return metaDescription(
    range
      ? `${product.name} from the ${range} range at Cerium Chemicals, supplier of specialty raw materials to the personal care and home care industries.`
      : `${product.name}, supplied by Cerium Chemicals to the personal care and home care industries.`,
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category: categorySlug, product: productSlug } = await params;
  const product = await fetchProductInCategory(categorySlug, productSlug);

  if (!product) {
    // A non-canonical pair must never inherit an indexable title.
    return buildMetadata({
      title: "Product not found",
      description: "This product could not be found.",
      path: `/products/${categorySlug}/${productSlug}`,
      index: false,
    });
  }

  return buildMetadata({
    title: product.name,
    description: describe(product),
    path: `/products/${categorySlug}/${product.slug}`,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { category: categorySlug, product: productSlug } = await params;
  const product = await fetchProductInCategory(categorySlug, productSlug);

  // `generateStaticParams` only emits canonical pairs, but Next still renders
  // unknown params on demand — so a mismatched pair has to 404 here too, or the
  // same product would be reachable on as many URLs as it has ancestors.
  if (!product) notFound();

  const path = `/products/${categorySlug}/${product.slug}`;

  const [ancestry, related] = await Promise.all([
    fetchCategoryPath(categorySlug),
    fetchRelatedProducts(product),
  ]);

  const range = ancestry.at(-1);
  const family = ancestry.length > 1 ? ancestry[0] : undefined;

  const breadcrumbs: Breadcrumb[] = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    ...ancestry.map((node) => ({
      name: node.name,
      href: categoryPath(node.slug),
    })),
    { name: product.name, href: path },
  ];

  const hasImage = Boolean(product.image?.src ?? product.image?.cloudinaryId);
  const formats = product.formats ?? [];

  /*
   * The context section needs classification the tree does not already carry.
   *
   * Family and Range alone do not qualify. They are stated in the breadcrumb
   * immediately above, in the hero eyebrow, and in the "Back to" link below, so
   * a separate labelled section repeating them adds a heading and a block of
   * vertical space to say nothing new — on 108 of the 122 pages, which is
   * precisely the thin section this page is supposed to avoid. Where a real
   * classification exists (an olfactive family, end-product formats) the
   * section earns its place, and Family and Range are then included in it
   * because a specification block that omits them looks incomplete.
   */
  const hasContext = Boolean(product.olfactive) || formats.length > 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            productSchema({
              name: product.name,
              path,
              // Only Cerium's own words reach structured data. Where there is
              // no benefit copy, no description is emitted at all rather than
              // promoting the page's fallback sentence into a machine-readable
              // claim about the material.
              description: product.benefit,
              category: product.categoryName,
              image: hasImage ? product.image?.src : undefined,
            }),
          ),
        }}
      />

      {/* ================================================================= */}
      {/* HERO — identity                                                    */}
      {/* ================================================================= */}
      <div className="border-b border-border bg-background-soft">
        <Container>
          <div className="pb-12 pt-8 md:pb-16 md:pt-10">
            <Breadcrumbs items={breadcrumbs} />

            {/*
              Media sits left on desktop and the identity right, per the agreed
              hero direction. The DOM order is the reverse — identity first —
              because on a phone the two columns stack in source order, and the
              product name and enquiry action have to be the first things a
              visitor meets rather than sitting under a full-width image. CSS
              `order` restores the visual arrangement from `lg` up, so both
              requirements hold without duplicating any markup.
            */}
            <div className="mt-8 grid gap-10 md:mt-10 lg:grid-cols-12 lg:items-start lg:gap-14">
              <div className="lg:order-2 lg:col-span-7">
                {range && (
                  <Reveal>
                    <Eyebrow>{range.name}</Eyebrow>
                  </Reveal>
                )}

                <Reveal delay={60}>
                  {/*
                    `break-words` is load-bearing here, not decoration. Chemical
                    names contain long unbreakable tokens — "Phenoxyethanol &
                    Ethylhexylglycerin" carries an 18-character word — and at
                    320px the h1 clamp resolves to 36px, which makes that single
                    word wider than the content box. A long word does not wrap
                    on its own, so without this it pushes the document wider
                    than the viewport and scrolls the whole page sideways.
                  */}
                  <Heading level={1} size="h1" className="mt-5 break-words">
                    {product.name}
                  </Heading>
                </Reveal>

                {product.olfactive && (
                  <Reveal delay={90}>
                    <p className="mt-4 text-caption uppercase tracking-wide text-text-muted">
                      {/* The value is a packed olfactive family such as
                          "Vanilla | Ambery | Floral". Without this prefix a
                          screen reader announces three unexplained words. */}
                      <span className="sr-only">Olfactive family: </span>
                      {product.olfactive}
                    </p>
                  </Reveal>
                )}

                <Reveal delay={110}>
                  {product.benefit ? (
                    <p className="mt-6 max-w-[58ch] text-lead text-text-muted">
                      {product.benefit}
                    </p>
                  ) : (
                    /* 82 of 122 products have no benefit copy. This states the
                       relationship that is true and stops — it does not
                       manufacture a paragraph to fill the space. */
                    <p className="mt-6 max-w-[58ch] text-lead text-text-muted">
                      {range
                        ? `${product.name} is supplied by Cerium Chemicals as part of our ${range.name} range.`
                        : `${product.name} is supplied by Cerium Chemicals.`}{" "}
                      Product details and current availability are available on
                      request.
                    </p>
                  )}
                </Reveal>

                <Reveal delay={150}>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    {/*
                      Visible label short, accessible name specific — the same
                      pattern `ProductCard` uses.

                      This read "Enquire about this product" on all 122 product
                      pages while pointing at 122 different URLs, which is one
                      anchor string with no way to tell the destinations apart
                      in a screen reader's links list. It was shortened from the
                      product name in the first place to keep the button inside
                      a 320px layout; moving the name into `sr-only` keeps that
                      width and gives the link its identity back.
                    */}
                    <Button href={enquiryPath(product)} size="md" withArrow>
                      Enquire
                      <span className="sr-only"> about {product.name}</span>
                    </Button>
                    {range && (
                      <Button
                        href={categoryPath(range.slug)}
                        variant="outline"
                        size="md"
                      >
                        View {range.name}
                      </Button>
                    )}
                  </div>
                </Reveal>
              </div>

              <div className="lg:order-1 lg:col-span-5">
                <Reveal delay={120}>
                  {/*
                    No product in the catalogue carries an image, so in practice
                    this is always the placeholder today. It is kept to a 4:3
                    crop rather than a square so the hero stays short and the
                    product name is never pushed below the fold on a laptop —
                    and so a page whose only real content is its name does not
                    read as a large empty picture frame.
                  */}
                  <CeriumImage
                    image={product.image}
                    alt={product.image?.alt ?? (hasImage ? product.name : undefined)}
                    ratio="landscape"
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    placeholderLabel={`${product.name} product image`}
                    className="border border-border"
                  />
                </Reveal>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* ================================================================= */}
      {/* PRODUCT CONTEXT — classification and end-product formats           */}
      {/* ================================================================= */}
      {hasContext && (
        <Section space="md" ariaLabelledBy="context-heading">
          <Container>
            <Heading level={2} size="h3" id="context-heading">
              Product information
            </Heading>

            <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-5">
                <dl className="divide-y divide-border border-y border-border">
                  {family && (
                    <Row label="Family">
                      <ContextLink href={categoryPath(family.slug)}>
                        {family.name}
                      </ContextLink>
                    </Row>
                  )}
                  {range && (
                    <Row label="Range">
                      <ContextLink href={categoryPath(range.slug)}>
                        {range.name}
                      </ContextLink>
                    </Row>
                  )}
                  {product.olfactive && (
                    <Row label="Olfactive family">{product.olfactive}</Row>
                  )}
                </dl>
              </div>

              {formats.length > 0 && (
                <div className="lg:col-span-7">
                  {/*
                    These are the end-product formats Cerium names for this
                    material in the Q3 2026 fragrance price list. They are NOT
                    the six site Applications, and the heading has to say so:
                    "Applications" announced before "Shampoo, Body splash"
                    describes a different relationship than the data supports.

                    Product -> Application does not exist as a stored relation
                    (schema specification §4.4), so no application is claimed
                    here or anywhere else on this page.
                  */}
                  <h3 className="text-h4 font-semibold">
                    Supplied for these end products
                  </h3>
                  <p className="mt-2 max-w-[58ch] text-small text-text-muted">
                    Formats Cerium lists for {product.name}.
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {formats.map((format) => (
                      <li key={format}>
                        <Badge tone="primary">{format}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Container>
        </Section>
      )}

      {/*
        ===================================================================
        EXTENSION SEAM — technical information and documents
        ===================================================================
        Sections for specifications (CAS, INCI, grade, properties) and for
        documents (TDS, SDS, certificates) belong HERE, between context and
        related products. Neither is rendered because neither exists: no
        product carries a technical value and no product document has been
        supplied.

        Adding them is inserting a sibling section at this point plus a
        conditional guard — the surrounding layout, headings and spacing do not
        change. They must arrive with document attribution rather than as bare
        fields; the reasoning is in the schema specification §4.3 and §8.
        ===================================================================
      */}

      {/* ================================================================= */}
      {/* RELATED — same range only, and the heading says which              */}
      {/* ================================================================= */}
      {related && related.products.length > 0 && (
        <Section tone="soft" space="lg" ariaLabelledBy="related-heading">
          <Container>
            <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Heading level={2} size="h3" id="related-heading">
                  More from {related.scope.name}
                </Heading>
                {/*
                  The heading names the range these came from, which is the
                  whole justification for showing them. They are not called
                  alternatives, substitutes or equivalents: nothing in the
                  supplied data establishes that any two Cerium products are
                  interchangeable, and for a raw material that is a formulation
                  and safety claim rather than a merchandising one.
                */}
                <p className="mt-2 text-small text-text-muted">
                  Other products in the same range.
                </p>
              </div>
              <Link
                href={categoryPath(related.scope.slug)}
                className="shrink-0 text-small font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
              >
                View all {related.scope.name}
              </Link>
            </div>

            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.products.map((item, index) => (
                <li key={`${item.categorySlug}-${item.slug}`}>
                  <Reveal delay={(index % 4) * 50} className="h-full">
                    <ProductCard
                      product={item}
                      showCategory={false}
                      clampBenefit
                      className="h-full"
                    />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {/* ================================================================= */}
      {/* CONTEXTUAL NAVIGATION — always answer "where do I go next"         */}
      {/* ================================================================= */}
      <Section space="sm" ariaLabelledBy="continue-heading">
        <Container>
          <h2 id="continue-heading" className="sr-only">
            Continue browsing
          </h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-8">
            {range && (
              <Link
                href={categoryPath(range.slug)}
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
                Back to {range.name}
              </Link>
            )}
            <Link
              href="/products"
              className="text-small font-medium text-text-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
            >
              All products
            </Link>
          </div>
        </Container>
      </Section>

      {/*
        The enquiry is the commercial action on this site — there is no cart and
        no price. Documentation is mentioned here rather than in a section of
        its own: it routes the request that a technical buyer actually has,
        without implying a document library exists to browse.
      */}
      <CTA
        eyebrow="Enquiry"
        title={`Enquire about ${product.name}`}
        body="Tell us what you are formulating and our team will come back with availability, documentation and pricing."
      />
    </>
  );
}

/** One row of the classification list. Rendered only when it has a value. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="text-caption uppercase tracking-wide text-text-muted sm:w-36 sm:shrink-0">
        {label}
      </dt>
      <dd className="text-body text-text">{children}</dd>
    </div>
  );
}

function ContextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
    >
      {children}
    </Link>
  );
}
