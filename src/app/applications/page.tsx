import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApplicationCard } from "@/components/cards/ApplicationCard";
import { Badge } from "@/components/ui/Badge";
import { CTA } from "@/components/sections/CTA";
import { BrowseCatalogue } from "@/components/sections/BrowseCatalogue";
import { Reveal } from "@/components/motion/Reveal";
import { fetchApplicationFormats, fetchApplications } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Applications",
  description:
    "Find Cerium Chemicals ingredients by end use — skin care, hair care, bath and shower, fabric care, surface care and air care.",
  path: "/applications",
});

export default async function ApplicationsPage() {
  const [applications, applicationFormats] = await Promise.all([
    fetchApplications(),
    fetchApplicationFormats(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="By end use"
        title="Applications"
        intro="Start from the product you are formulating and work back to the materials that deliver it."
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Applications", href: "/applications" },
        ]}
      />

      <Section space="lg" ariaLabelledBy="application-areas-heading">
        <Container>
          {/*
            The cards are `h3`, which is right where a visible `h2` introduces
            them — the homepage section and the industry detail page both do.
            On this page the h1 was followed straight by h3, skipping a level
            and breaking the outline for anyone navigating by heading.

            The heading is visually hidden rather than shown because the h1
            directly above already says "Applications"; a second visible one
            would be redundant to a sighted reader while the outline still needs
            the level to exist. It also gives this section landmark its name.
          */}
          <h2 id="application-areas-heading" className="sr-only">
            Application areas
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {applications.map((application, index) => (
              <li key={application.slug}>
                <Reveal delay={(index % 3) * 60} className="h-full">
                  <ApplicationCard application={application} />
                </Reveal>
              </li>
            ))}
          </ul>

          <Reveal>
            <div className="mt-16 border-t border-border pt-8">
              <h2 className="text-eyebrow font-semibold uppercase text-text-muted">
                End products we supply into
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {applicationFormats.map((format) => (
                  <li key={format}>
                    <Badge tone="outline">{format}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </Container>
      </Section>

      <BrowseCatalogue
        exclude="/applications"
        title="Other ways to explore"
        intro="This page lists the catalogue by end use. You can also start from the material itself, or from the market you supply."
      />

      <CTA />
    </>
  );
}
