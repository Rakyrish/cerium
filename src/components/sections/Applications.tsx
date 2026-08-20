import type { Application, Industry } from "@/types/content";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { TextLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ApplicationCard, IndustryCard } from "@/components/cards/ApplicationCard";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Applications.
 *
 * The second axis of product discovery: a formulator usually knows the product
 * they are making before they know the material they need. This section is the
 * "I'm making a shampoo" entry point into the same catalogue.
 *
 * Uses overlay tiles — visually distinct from the product-family section above
 * so the two discovery routes are not confusable.
 *
 * `formats` is passed in rather than imported so this stays a presentational
 * section with a single source of data — its parent, which reads through the
 * content seam.
 */
export function Applications({
  applications,
  formats,
}: {
  applications: Application[];
  formats: ReadonlyArray<string>;
}) {
  return (
    <Section tone="default" space="lg" ariaLabelledBy="applications-heading">
      <Container>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>Where they are used</Eyebrow>
            </Reveal>
            <Reveal delay={60}>
              <Heading
                level={2}
                size="h2"
                id="applications-heading"
                className="mt-6"
              >
                Applications
              </Heading>
            </Reveal>
            <Reveal delay={110}>
              <p className="mt-5 text-lead text-text-muted">
                Start from what you are formulating and work back to the
                materials that deliver it.
              </p>
            </Reveal>
          </div>

          <Reveal delay={140} className="shrink-0">
            <TextLink href="/applications">All applications</TextLink>
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {applications.map((application, index) => (
            <li key={application.slug}>
              <Reveal delay={(index % 3) * 70}>
                <ApplicationCard application={application} />
              </Reveal>
            </li>
          ))}
        </ul>

        {/* End-product formats named in Cerium's own fragrance price list.
            Display-only in Phase 1; these become filters once product data is
            in the database. */}
        <Reveal delay={100}>
          <div className="mt-14 border-t border-border pt-8">
            <h3 className="text-eyebrow font-semibold uppercase text-text-muted">
              End products we supply into
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {formats.map((format) => (
                <li key={format}>
                  <Badge tone="outline">{format}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

/**
 * Industries.
 *
 * Wide split panels — a third layout pattern, so product families,
 * applications and industries each read as a different kind of thing.
 */
export function Industries({
  items,
}: {
  items: Array<{ industry: Industry; applications: Application[] }>;
}) {
  return (
    <Section tone="soft" space="lg" ariaLabelledBy="industries-heading">
      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>Who we serve</Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <Heading level={2} size="h2" id="industries-heading" className="mt-6">
              Industries
            </Heading>
          </Reveal>
          <Reveal delay={110}>
            <p className="mt-5 text-lead text-text-muted">
              Cerium supplies formulators and brands across East and Central
              Africa.
            </p>
          </Reveal>
        </div>

        <ul className="mt-14 space-y-8">
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
  );
}
