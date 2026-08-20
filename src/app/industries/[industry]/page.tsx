import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApplicationCard } from "@/components/cards/ApplicationCard";
import { CTA } from "@/components/sections/CTA";
import { Reveal } from "@/components/motion/Reveal";
import {
  fetchApplicationsForIndustry,
  fetchCategoriesForApplication,
  fetchIndustries,
  fetchIndustry,
} from "@/lib/content";
import { isPublishable } from "@/data/taxonomy";
import { buildMetadata, itemListSchema, jsonLd, metaDescription } from "@/lib/seo";
import { applicationPath, categoryPath, industryPath } from "@/lib/routes";

/*
 * ---------------------------------------------------------------------------
 * WHAT AN INDUSTRY PAGE CAN HONESTLY SHOW
 * ---------------------------------------------------------------------------
 * `Industry` carries a name, a description and `applicationSlugs`. That is all.
 * There is no `categorySlugs` and no product relationship — measured, not
 * assumed. So the only route from an industry into the catalogue is:
 *
 *     Industry -> Application -> Category -> Product
 *
 * Both of those first two edges are declared in Cerium's material, so the path
 * is real. It is rendered as a path rather than flattened into "ranges for
 * personal care", because collapsing two hops into one presents a derived
 * relationship as a stored one, and the next person to read it cannot tell the
 * difference. Each range is shown under the application that connects it.
 *
 * A REMOVED SECTION, recorded so it is not reinstated: this page used to look
 * up `fetchCategory(industry.slug)` to show a "matching product family",
 * commented as "Industry slugs mirror the top-level product family slugs".
 * They do not. `taxonomy.ts` deliberately does NOT model Personal Care or Home
 * Care as families — the information-architecture note at the top of that file
 * explains why, and doing so would create /products/personal-care competing
 * with /applications/skin-care. Both lookups returned null, so the section was
 * unreachable code asserting a relationship the taxonomy explicitly rejects.
 */

interface PageProps {
  params: Promise<{ industry: string }>;
}

export async function generateStaticParams() {
  const industries = await fetchIndustries();
  return industries.map((industry) => ({ industry: industry.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry: slug } = await params;
  const industry = await fetchIndustry(slug);

  if (!industry) {
    return buildMetadata({
      title: "Industry not found",
      description: "This industry could not be found.",
      path: `/industries/${slug}`,
      index: false,
    });
  }

  return buildMetadata({
    title: `${industry.name} ingredients`,
    description: metaDescription(
      industry.description ??
        `Raw material solutions supplied by Cerium Chemicals to the ${industry.name.toLowerCase()} industry.`,
    ),
    path: `/industries/${industry.slug}`,
  });
}

export default async function IndustryPage({ params }: PageProps) {
  const { industry: slug } = await params;
  const industry = await fetchIndustry(slug);

  if (!industry) notFound();

  const applications = await fetchApplicationsForIndustry(industry);

  // Ranges kept grouped under the application that connects them — see the
  // note above on why the two hops are not collapsed.
  const groups = await Promise.all(
    applications.map(async (application) => ({
      application,
      ranges: (await fetchCategoriesForApplication(application)).filter(
        isPublishable,
      ),
    })),
  );

  const otherIndustries = (await fetchIndustries()).filter(
    (item) => item.slug !== industry.slug,
  );

  return (
    <>
      {applications.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              // Applications, because that is what this page lists and the only
              // relationship the industry record actually declares.
              itemListSchema(
                `${industry.name} applications`,
                applications.map((application) => ({
                  name: application.name,
                  path: applicationPath(application.slug),
                })),
              ),
            ),
          }}
        />
      )}

      <PageHeader
        eyebrow="Industry"
        title={`${industry.name} ingredients`}
        intro={industry.description}
        meta={
          applications.length > 0
            ? `${applications.length} ${applications.length === 1 ? "application" : "applications"}`
            : undefined
        }
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Industries", href: "/industries" },
          { name: industry.name, href: industryPath(industry.slug) },
        ]}
      />

      {/* ================================================================= */}
      {/* APPLICATIONS — the industry's only declared relationship          */}
      {/* ================================================================= */}
      {applications.length > 0 && (
        <Section space="lg" ariaLabelledBy="industry-applications-heading">
          <Container>
            <Heading level={2} size="h3" id="industry-applications-heading">
              Applications in {industry.name.toLowerCase()}
            </Heading>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {applications.map((application, index) => (
                <li key={application.slug}>
                  <Reveal delay={(index % 3) * 60} className="h-full">
                    <ApplicationCard application={application} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {/* ================================================================= */}
      {/* RANGES, GROUPED BY THE APPLICATION THAT CONNECTS THEM             */}
      {/* ================================================================= */}
      {groups.some((group) => group.ranges.length > 0) && (
        <Section tone="soft" space="lg" ariaLabelledBy="industry-ranges-heading">
          <Container>
            <Heading level={2} size="h3" id="industry-ranges-heading">
              Ranges behind these applications
            </Heading>
            <p className="mt-3 max-w-[62ch] text-body text-text-muted">
              Each application is served by the ranges below. Open a range to see
              the products it contains.
            </p>

            <div className="mt-10 flex flex-col gap-10">
              {groups
                .filter((group) => group.ranges.length > 0)
                .map((group) => (
                  <div key={group.application.slug}>
                    <h3 className="text-h4 font-semibold">
                      <Link
                        href={applicationPath(group.application.slug)}
                        className="underline decoration-transparent underline-offset-4 transition-colors hover:text-primary hover:decoration-primary/40"
                      >
                        {group.application.name}
                      </Link>
                    </h3>
                    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                      {group.ranges.map((range) => (
                        <li key={range.slug}>
                          <Link
                            href={categoryPath(range.slug)}
                            className="text-body text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
                          >
                            {range.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
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
              href="/industries"
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
              All industries
            </Link>
            {otherIndustries.map((item) => (
              <Link
                key={item.slug}
                href={industryPath(item.slug)}
                className="text-small font-medium text-text-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/products"
              className="text-small font-medium text-text-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
            >
              All products
            </Link>
          </div>
        </Container>
      </Section>

      <CTA
        eyebrow={industry.name}
        title={`Supplying the ${industry.name.toLowerCase()} industry`}
        body="Tell us what you are formulating and our team will come back with what we can supply."
      />
    </>
  );
}
