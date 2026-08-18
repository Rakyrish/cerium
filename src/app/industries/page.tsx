import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/layout/PageHeader";
import { IndustryCard } from "@/components/cards/ApplicationCard";
import { CTA } from "@/components/sections/CTA";
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

      <Section space="lg">
        <Container>
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

      <CTA />
    </>
  );
}
