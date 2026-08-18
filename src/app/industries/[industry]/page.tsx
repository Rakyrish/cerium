import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApplicationCard } from "@/components/cards/ApplicationCard";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { CTA } from "@/components/sections/CTA";
import { Reveal } from "@/components/motion/Reveal";
import {
  fetchApplicationsForIndustry,
  fetchCategory,
  fetchIndustries,
  fetchIndustry,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

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
    description:
      industry.description ??
      `Raw material solutions supplied by Cerium Chemicals to the ${industry.name.toLowerCase()} industry.`,
    path: `/industries/${industry.slug}`,
  });
}

export default async function IndustryPage({ params }: PageProps) {
  const { industry: slug } = await params;
  const industry = await fetchIndustry(slug);

  if (!industry) notFound();

  const applications = await fetchApplicationsForIndustry(industry);

  // Industry slugs mirror the top-level product family slugs, so the matching
  // family is linked where one exists. Guarded rather than assumed.
  const relatedFamily = await fetchCategory(industry.slug);

  return (
    <>
      <PageHeader
        eyebrow="Industry"
        title={industry.name}
        intro={industry.description}
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Industries", href: "/industries" },
          { name: industry.name, href: `/industries/${industry.slug}` },
        ]}
      />

      {applications.length > 0 && (
        <Section space="lg" ariaLabelledBy="industry-applications-heading">
          <Container>
            <Heading level={2} size="h3" id="industry-applications-heading">
              Applications in {industry.name.toLowerCase()}
            </Heading>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {applications.map((application, index) => (
                <li key={application.slug}>
                  <Reveal delay={(index % 3) * 60}>
                    <ApplicationCard application={application} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {relatedFamily && (
        <Section tone="soft" space="md" ariaLabelledBy="industry-range-heading">
          <Container>
            <Heading level={2} size="h3" id="industry-range-heading">
              {relatedFamily.name} range
            </Heading>
            <div className="mt-8 max-w-xl">
              <Reveal>
                <CategoryCard category={relatedFamily} variant="tile" />
              </Reveal>
            </div>
          </Container>
        </Section>
      )}

      <CTA />
    </>
  );
}
