import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/layout/PageHeader";
import { IndustryCard } from "@/components/cards/ApplicationCard";
import { CTA } from "@/components/sections/CTA";
import { BrowseCatalogue } from "@/components/sections/BrowseCatalogue";
import { Reveal } from "@/components/motion/Reveal";
import { fetchApplicationsForIndustry, fetchIndustries } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Industries",
  description:
    "Cerium Chemicals supplies raw material solutions to the personal care and home care industries across East and Central Africa.",
  path: "/industries",
});

export default async function IndustriesPage() {
  const industries = await fetchIndustries();
  const items = await Promise.all(
    industries.map(async (industry) => ({
      industry,
      applications: await fetchApplicationsForIndustry(industry),
    })),
  );

  return (
    <>
      <PageHeader
        eyebrow="Who we serve"
        title="Industries"
        intro="Cerium supplies formulators and brands across East and Central Africa."
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Industries", href: "/industries" },
        ]}
      />

      <Section space="lg" ariaLabelledBy="industries-list-heading">
        <Container>
          {/* Same fix as /applications: the h1 was followed directly by the
              cards' h3, skipping h2. Hidden because the h1 already reads
              "Industries". */}
          <h2 id="industries-list-heading" className="sr-only">
            Industries we serve
          </h2>
          <ul className="space-y-8">
            {items.map(({ industry, applications }, index) => (
              <li key={industry.slug}>
                <Reveal delay={index * 60}>
                  <IndustryCard industry={industry} applications={applications} />
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <BrowseCatalogue
        exclude="/industries"
        title="Other ways to explore"
        intro="This page lists the markets Cerium supplies. You can also start from the material itself, or from what you are formulating."
      />

      <CTA />
    </>
  );
}
