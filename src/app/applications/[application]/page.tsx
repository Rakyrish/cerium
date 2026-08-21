import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { CTA } from "@/components/sections/CTA";
import { Reveal } from "@/components/motion/Reveal";
import {
  fetchApplication,
  fetchApplications,
  fetchCategoriesForApplication,
  fetchIndustries,
} from "@/lib/content";
import { isPublishable } from "@/data/taxonomy";
import { buildMetadata, itemListSchema, jsonLd, metaDescription } from "@/lib/seo";
import { applicationPath, categoryPath, industryPath } from "@/lib/routes";

/*
 * ---------------------------------------------------------------------------
 * WHY THIS PAGE LISTS RANGES AND NOT PRODUCTS
 * ---------------------------------------------------------------------------
 * It used to render a grid of 59 products under "Ingredients for skin care".
 * Those products were resolved by taking the application's `categorySlugs` and
 * returning everything inside them — so the page asserted, for each of 122
 * materials, that it suits a named application, on the strength of nothing but
 * which range it sits in.
 *
 * `Product -> Application` does not exist as a stored relation
 * (`docs/phase-2-2a-schema-specification.md` §4.4: "REQUIRED — does not
 * exist"). What Cerium's material actually declares is Category -> Application.
 * For a raw material, "suitable for skin care" is a formulation claim rather
 * than a merchandising one, and inferring it from containment is exactly the
 * inference the data does not support.
 *
 * So the page now navigates at the level the relationship exists: the ranges
 * that serve this application, each of which lists its own products. The same
 * reasoning removed the applications block from the product page in Phase 2.3B;
 * this is the other direction of the same edge.
 */

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
    description: metaDescription(
      application.description ??
        `Ranges supplied by Cerium Chemicals for ${application.name.toLowerCase()} formulations.`,
    ),
    path: `/applications/${application.slug}`,
  });
}

export default async function ApplicationPage({ params }: PageProps) {
  const { application: slug } = await params;
  const application = await fetchApplication(slug);

  if (!application) notFound();

  const [categories, allApplications, industries] = await Promise.all([
    fetchCategoriesForApplication(application),
    fetchApplications(),
    fetchIndustries(),
  ]);

  // A range with no page of its own cannot be linked to. Guarded rather than
  // assumed, even though every declared range is currently publishable.
  const ranges = categories.filter(isPublishable);

  /*
   * The industry this application belongs to.
   *
   * `groupSlug` names it, and the industry independently lists this
   * application in `applicationSlugs` — so the edge is declared from both
   * ends. Matched rather than assumed: an unknown group simply yields no link.
   */
  const industry = industries.find(
    (item) =>
      item.slug === application.groupSlug &&
      (item.applicationSlugs ?? []).includes(application.slug),
  );

  /* Applications sharing this industry. A declared grouping, not a similarity. */
  const siblings = allApplications.filter(
    (item) =>
      item.slug !== application.slug &&
      item.groupSlug === application.groupSlug,
  );

  return (
    <>
      {ranges.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              // The list describes what this page actually lists: ranges. It
              // deliberately does not enumerate products, because the page
              // makes no claim about them.
              itemListSchema(
                `Ranges for ${application.name.toLowerCase()}`,
                ranges.map((range) => ({
                  name: range.name,
                  path: categoryPath(range.slug),
                })),
              ),
            ),
          }}
        />
      )}

      <PageHeader
        eyebrow="Application"
        title={`${application.name} ingredients`}
        intro={application.description}
        meta={
          ranges.length > 0
            ? `${ranges.length} ${ranges.length === 1 ? "range" : "ranges"}`
            : undefined
        }
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Applications", href: "/applications" },
          { name: application.name, href: applicationPath(application.slug) },
        ]}
      />

      {/* ================================================================= */}
      {/* RANGES — the relationship the data actually declares              */}
      {/* ================================================================= */}
      {ranges.length > 0 && (
        <Section tone="soft" space="lg" ariaLabelledBy="ranges-heading">
          <Container>
            <Heading level={2} size="h3" id="ranges-heading">
              Explore ranges for {application.name.toLowerCase()}
            </Heading>
            {/*
              "Ranges Cerium supplies FOR" — not "products suitable for". The
              distinction is the whole point: the range-level relationship is
              declared in Cerium's material; the product-level one is not.
            */}
            <p className="mt-3 max-w-[62ch] text-body text-text-muted">
              Cerium supplies these ranges for {application.name.toLowerCase()}{" "}
              formulations. Open a range to see the products it contains.
            </p>

            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ranges.map((range, index) => (
                <li key={range.slug}>
                  <Reveal delay={(index % 3) * 60} className="h-full">
                    <CategoryCard category={range} variant="tile" className="h-full" />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {/* ================================================================= */}
      {/* CONTEXT — industry and sibling applications                       */}
      {/* ================================================================= */}
      {(industry || siblings.length > 0) && (
        <Section space="md" ariaLabelledBy="context-heading">
          <Container>
            <Heading level={2} size="h3" id="context-heading">
              Related
            </Heading>

            <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:gap-16">
              {industry && (
                <div>
                  <h3 className="text-caption uppercase tracking-wide text-text-muted">
                    Industry
                  </h3>
                  <p className="mt-3">
                    <Link
                      href={industryPath(industry.slug)}
                      className="text-body font-medium text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
                    >
                      {industry.name}
                    </Link>
                  </p>
                </div>
              )}

              {siblings.length > 0 && industry && (
                <div>
                  <h3 className="text-caption uppercase tracking-wide text-text-muted">
                    Other {industry.name.toLowerCase()} applications
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                    {siblings.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={applicationPath(item.slug)}
                          className="text-body font-medium text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-10 border-t border-border pt-8">
              <Link
                href="/applications"
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
                All applications
              </Link>
            </div>
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
