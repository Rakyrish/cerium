import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductCard } from "@/components/cards/ProductCard";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { CTA } from "@/components/sections/CTA";
import { Reveal } from "@/components/motion/Reveal";
import {
  fetchAllCategorySlugs,
  fetchApplications,
  fetchCategory,
  fetchProductCount,
  fetchProductsInCategory,
} from "@/lib/content";
import { isPublishable } from "@/data/taxonomy";
import { buildMetadata, itemListSchema, jsonLd } from "@/lib/seo";

interface PageProps {
  params: Promise<{ category: string }>;
}

/**
 * Pre-render every category at build time.
 *
 * Static HTML is the fastest possible response and the most reliably crawlable.
 * When categories move to Postgres this becomes an ISR revalidate.
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

  const count = await fetchProductCount(category);

  return buildMetadata({
    title: category.name,
    description:
      category.summary ??
      `${category.name} supplied by Cerium Chemicals${
        count > 0 ? ` — ${count} products` : ""
      }. Raw material solutions for personal care and home care formulators.`,
    path: `/products/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params;
  const category = await fetchCategory(slug);

  // `generateStaticParams` omits unpublishable ranges, but Next still renders
  // unknown params on demand — so the guard has to be here too, or a range with
  // no products would serve a thin page on a URL the sitemap never listed.
  if (!category || !isPublishable(category)) notFound();

  const [products, applications] = await Promise.all([
    fetchProductsInCategory(category),
    fetchApplications(),
  ]);

  const children = category.children ?? [];
  const relatedApplications = applications.filter((application) =>
    (category.applicationSlugs ?? []).includes(application.slug),
  );

  // Group products by their immediate sub-family so a long list stays readable
  // and each group keeps a real heading in the outline.
  const grouped = children.length
    ? children.map((child) => ({
        name: child.name,
        slug: child.slug,
        products: products.filter((product) => product.categorySlug === child.slug),
      }))
    : [];

  const ungrouped = children.length
    ? products.filter((product) => product.categorySlug === category.slug)
    : products;

  return (
    <>
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(itemListSchema(category.name, products)),
          }}
        />
      )}

      <PageHeader
        eyebrow="Products"
        title={category.name}
        intro={category.summary}
        meta={
          products.length > 0
            ? `${products.length} ${products.length === 1 ? "product" : "products"}`
            : undefined
        }
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Products", href: "/products" },
          { name: category.name, href: `/products/${category.slug}` },
        ]}
      />

      {/* Sub-families */}
      {children.length > 0 && (
        <Section space="md" ariaLabelledBy="ranges-heading">
          <Container>
            <Heading level={2} size="h3" id="ranges-heading">
              Ranges in {category.name}
            </Heading>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {children.map((child, index) => (
                <li key={child.slug}>
                  <Reveal delay={(index % 3) * 60}>
                    <CategoryCard category={child} variant="tile" className="h-full" />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {/* Products */}
      {products.length > 0 ? (
        <Section tone="soft" space="lg" ariaLabelledBy="products-heading">
          <Container>
            <Heading level={2} size="h3" id="products-heading">
              Products
            </Heading>

            <p className="mt-3 max-w-[62ch] text-small text-text-muted">
              Product names and benefits as published in the Cerium 2026
              catalogue. Technical documentation is available on request.
            </p>

            {grouped
              .filter((group) => group.products.length > 0)
              .map((group) => (
                <div key={group.slug} className="mt-14">
                  <h3 className="text-h4 font-semibold">{group.name}</h3>
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
        <Section tone="soft" space="md">
          <Container>
            {/* Honest empty state — never a fabricated placeholder product. */}
            <div className="max-w-[62ch] border border-border bg-surface p-8">
              <h2 className="text-h4 font-semibold">
                Product listing in preparation
              </h2>
              <p className="mt-3 text-body text-text-muted">
                Detailed listings for {category.name} are being prepared. Get in
                touch and we will send you current availability.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex text-small font-medium text-primary underline underline-offset-4"
              >
                Make an enquiry
              </Link>
            </div>
          </Container>
        </Section>
      )}

      {/* Internal linking to the application axis */}
      {relatedApplications.length > 0 && (
        <Section space="md" ariaLabelledBy="related-applications-heading">
          <Container>
            <Heading level={2} size="h3" id="related-applications-heading">
              Used in
            </Heading>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {relatedApplications.map((application) => (
                <li key={application.slug}>
                  <Link
                    href={`/applications/${application.slug}`}
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

      <CTA />
    </>
  );
}

function ProductGrid({
  products,
}: {
  products: Awaited<ReturnType<typeof fetchProductsInCategory>>;
}) {
  return (
    <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={`${product.categorySlug}-${product.slug}`}>
          <Reveal delay={(index % 4) * 50}>
            <ProductCard product={product} showCategory={false} className="h-full" />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
