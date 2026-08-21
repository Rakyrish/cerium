import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { CTA } from "@/components/sections/CTA";
import { BrowseCatalogue } from "@/components/sections/BrowseCatalogue";
import { ProductIndex } from "@/components/sections/ProductIndex";
import { Reveal } from "@/components/motion/Reveal";
import { Heading } from "@/components/ui/Heading";
import { TextLink } from "@/components/ui/Button";
import {
  fetchAllProducts,
  fetchCategories,
  fetchProductCount,
  fetchTotalProductCount,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { categoryPath } from "@/lib/routes";
import { catalogueIntro } from "@/data/company";

export const metadata: Metadata = buildMetadata({
  title: "Products",
  /*
   * 145 characters, down from 172.
   *
   * The previous wording exceeded the ~160 that search results display and was
   * truncated mid-phrase. The length came from saying "personal care" twice:
   * once in "cosmetic and personal care ingredients" and again in the trailing
   * "for personal care and home care". Removing the duplicated qualifier is the
   * whole edit — the four named families are Cerium's own top-level taxonomy
   * (Natural Extracts, Skin/Hair Care Actives, Functional Ingredients,
   * Fragrances) and both served industries are still named. Nothing is added.
   */
  description:
    "Browse Cerium Chemicals' range of ingredients for personal care and home care — natural extracts, actives, functional ingredients and fragrances.",
  path: "/products",
});

export default async function ProductsPage() {
  const [categories, total, allProducts] = await Promise.all([
    fetchCategories(),
    fetchTotalProductCount(),
    fetchAllProducts(),
  ]);

  // Counts are derived for the family and for each sub-family, so a label can
  // never disagree with what is actually listed.
  const withCounts = await Promise.all(
    categories.map(async (category) => ({
      category,
      productCount: await fetchProductCount(category),
      children: await Promise.all(
        (category.children ?? []).map(async (child) => ({
          child,
          productCount: await fetchProductCount(child),
        })),
      ),
    })),
  );

  return (
    <>
      <PageHeader
        eyebrow="2026 Catalogue"
        title="Products"
        intro={catalogueIntro}
        // Derived from the data, so it can never drift out of date.
        meta={`${total} products listed across ${categories.length} families`}
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Products", href: "/products" },
        ]}
      />

      {/* Jump navigation.
          Four families, each an in-page anchor. On a phone the families are
          otherwise several screens apart, and this is a plain anchor list — no
          JavaScript, and `scroll-padding-top` in globals.css already keeps the
          sticky header off the target heading. */}
      <Section space="sm" tone="soft" ariaLabelledBy="families-heading">
        <Container>
          <h2 id="families-heading" className="sr-only">
            Product families
          </h2>
          <ul className="flex flex-wrap gap-x-3 gap-y-3">
            {withCounts.map(({ category, productCount }) => (
              <li key={category.slug}>
                <a
                  href={`#${category.slug}`}
                  className="inline-flex items-baseline gap-2 border border-border bg-surface px-4 py-2.5 text-small font-medium text-text transition-colors duration-[var(--duration-fast)] hover:border-primary hover:text-primary"
                >
                  {category.name}
                  {productCount > 0 && (
                    <span className="text-caption text-text-muted">
                      {productCount}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section space="lg">
        <Container>
          <div className="space-y-20">
            {withCounts.map(({ category, productCount, children }) => (
              <div key={category.slug} id={category.slug} className="scroll-mt-32">
                <Reveal>
                  <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                      <Heading level={2} size="h3">
                        {category.name}
                      </Heading>
                      {category.summary && (
                        <p className="mt-3 text-body text-text-muted">
                          {category.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-6">
                      {productCount > 0 && (
                        <span className="text-caption text-text-muted">
                          {productCount}{" "}
                          {productCount === 1 ? "product" : "products"}
                        </span>
                      )}
                      <TextLink href={categoryPath(category.slug)}>
                        View range
                        <span className="sr-only"> — {category.name}</span>
                      </TextLink>
                    </div>
                  </div>
                </Reveal>

                {children.length > 0 && (
                  <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {children.map(({ child, productCount: childCount }, index) => (
                      <li key={child.slug}>
                        <Reveal delay={(index % 3) * 60} className="h-full">
                          <CategoryCard
                            category={child}
                            productCount={childCount}
                            variant="tile"
                            className="h-full"
                          />
                        </Reveal>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Flat A-Z of the whole catalogue. This is what stops the 122 product
          pages from depending on their range page as their only inbound link. */}
      <ProductIndex products={allProducts} />

      {/* Cross-axis signposting. The three index pages are sibling top-level
          routes, so linking between them asserts no entity relationship —
          it just lets someone who started from the wrong axis switch. */}
      <BrowseCatalogue
        exclude="/products"
        title="Other ways to explore"
        intro="This page lists the catalogue by material. If you are starting from what you are formulating, or from the market you sell into, these are the other two routes in."
      />

      <CTA />
    </>
  );
}
