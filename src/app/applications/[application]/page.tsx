import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductCard } from "@/components/cards/ProductCard";
import { CTA } from "@/components/sections/CTA";
import { Reveal } from "@/components/motion/Reveal";
import {
  fetchApplication,
  fetchApplications,
  fetchCategoriesForApplication,
  fetchProductsForApplication,
} from "@/lib/content";
import { buildMetadata, itemListSchema, jsonLd } from "@/lib/seo";

interface PageProps {
  params: Promise<{ application: string }>;
}

export async function generateStaticParams() {
  const applications = await fetchApplications();
  return applications.map((application) => ({ application: application.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { application: slug } = await params;
  const application = await fetchApplication(slug);

  if (!application) {
    return buildMetadata({
      title: "Application not found",
      description: "This application could not be found.",
      path: `/applications/${slug}`,
      index: false,
    });
  }

  return buildMetadata({
    title: `${application.name} ingredients`,
    description:
      application.description ??
      `Ingredients supplied by Cerium Chemicals for ${application.name.toLowerCase()} formulations.`,
    path: `/applications/${application.slug}`,
  });
}

export default async function ApplicationPage({ params }: PageProps) {
  const { application: slug } = await params;
  const application = await fetchApplication(slug);

  if (!application) notFound();

  const [products, categories] = await Promise.all([
    fetchProductsForApplication(application),
    fetchCategoriesForApplication(application),
  ]);

  return (
    <>
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              itemListSchema(`${application.name} ingredients`, products),
            ),
          }}
        />
      )}

      <PageHeader
        eyebrow="Application"
        title={`${application.name} ingredients`}
        intro={application.description}
        meta={
          products.length > 0
            ? `${products.length} products across ${categories.length} ranges`
            : undefined
        }
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Applications", href: "/applications" },
          { name: application.name, href: `/applications/${application.slug}` },
        ]}
      />

      {/* Ranges that serve this application — the Application -> Category link */}
      {categories.length > 0 && (
        <Section space="md" ariaLabelledBy="ranges-heading">
          <Container>
            <Heading level={2} size="h3" id="ranges-heading">
              Ranges for {application.name.toLowerCase()}
            </Heading>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/products/${category.slug}`}
                    className="text-body font-medium text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {/* Products — the Application -> Products relationship the architecture
          is built around. Resolved through the data layer in Phase 1 and
          through a database join from Phase 2, with no change here. */}
      {products.length > 0 && (
        <Section tone="soft" space="lg" ariaLabelledBy="products-heading">
          <Container>
            <Heading level={2} size="h3" id="products-heading">
              Ingredients for {application.name.toLowerCase()}
            </Heading>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product, index) => (
                <li key={`${product.categorySlug}-${product.slug}`}>
                  <Reveal delay={(index % 4) * 50}>
                    <ProductCard product={product} className="h-full" />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      <CTA
        eyebrow={application.name}
        title={`Formulating for ${application.name.toLowerCase()}?`}
        body="Send us your specification and our team will come back with what we can supply."
      />
    </>
  );
}
