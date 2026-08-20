import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApplicationCard } from "@/components/cards/ApplicationCard";
import { Badge } from "@/components/ui/Badge";
import { CTA } from "@/components/sections/CTA";
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

      <Section space="lg">
        <Container>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {applications.map((application, index) => (
              <li key={application.slug}>
                <Reveal delay={(index % 3) * 60}>
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

      <CTA />
    </>
  );
}
