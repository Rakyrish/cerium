import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { CTA } from "@/components/sections/CTA";
import { Reveal } from "@/components/motion/Reveal";
import { Heading } from "@/components/ui/Heading";
import { TextLink } from "@/components/ui/Button";
import {
  fetchCategories,
  fetchProductCount,
  fetchTotalProductCount,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { catalogueIntro } from "@/data/company";

export const metadata: Metadata = buildMetadata({
  title: "Products",
  description:
    "Browse Cerium Chemicals' range of cosmetic and personal care ingredients — natural extracts, actives, functional ingredients and fragrances for personal care and home care.",
  path: "/products",
});

export default async function ProductsPage() {
  const categories = await fetchCategories();
  const total = await fetchTotalProductCount();

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

      <Section space="lg">
        <Container>
          <div className="space-y-20">
            {withCounts.map(({ category, productCount, children }) => (
              <div key={category.slug}>
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
                      <TextLink href={`/products/${category.slug}`}>
                        View range
                      </TextLink>
                    </div>
                  </div>
                </Reveal>

                {children.length > 0 && (
                  <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {children.map(({ child, productCount: childCount }, index) => (
                      <li key={child.slug}>
                        <Reveal delay={(index % 3) * 60}>
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

      <CTA />
    </>
  );
}
