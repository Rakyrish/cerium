import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { PageHeader } from "@/components/layout/PageHeader";
import { CeriumImage } from "@/components/ui/CeriumImage";
import { Values, Partners } from "@/components/sections/Values";
import { CTA } from "@/components/sections/CTA";
import { BrowseCatalogue } from "@/components/sections/BrowseCatalogue";
import { Reveal } from "@/components/motion/Reveal";
import {
  aboutSummary,
  brandStatement,
  companyMetrics,
  mission,
  vision,
} from "@/data/company";
import { siteMedia } from "@/data/media";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About Cerium Chemicals",
  description:
    "Cerium Chemicals is a customer-oriented supplier of specialty raw materials to the personal care and home care industries in East and Central Africa.",
  path: "/about",
});

/**
 * About page.
 *
 * Every claim on this page comes from the supplied vision statement or the 2026
 * catalogue. No history, headcount, facility description, certification or
 * founding date is asserted, because none was supplied.
 */
export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Company"
        title={brandStatement.join(". ") + "."}
        intro={aboutSummary}
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "About", href: "/about" },
        ]}
      />

      {/* Vision & mission */}
      <Section id="vision" space="lg" ariaLabelledBy="vision-heading">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <Reveal>
                <Eyebrow>Direction</Eyebrow>
              </Reveal>
              <Reveal delay={60}>
                <Heading level={2} size="h2" id="vision-heading" className="mt-6">
                  Vision &amp; mission
                </Heading>
              </Reveal>

              <div className="mt-10 space-y-10">
                <Reveal delay={100}>
                  <div className="border-l-2 border-accent pl-6">
                    <h3 className="text-eyebrow font-semibold uppercase text-text-muted">
                      Vision
                    </h3>
                    <p className="mt-3 font-display text-h3 text-text">{vision}</p>
                  </div>
                </Reveal>
                <Reveal delay={140}>
                  <div className="border-l-2 border-border pl-6">
                    <h3 className="text-eyebrow font-semibold uppercase text-text-muted">
                      Mission
                    </h3>
                    <p className="mt-3 text-lead text-text-muted">{mission}</p>
                  </div>
                </Reveal>
              </div>
            </div>

            <Reveal delay={120} className="lg:col-span-5 lg:pt-12">
              <CeriumImage
                image={siteMedia.aboutPortrait.image}
                ratio="portrait"
                sizes="(min-width: 1024px) 40vw, 100vw"
                placeholderLabel={siteMedia.aboutPortrait.placeholder}
              />

              <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-8">
                {companyMetrics.map((metric) => (
                  <div key={metric.label} className="flex flex-col-reverse">
                    <dt className="mt-2 text-caption text-text-muted">
                      {metric.label}
                    </dt>
                    <dd className="font-display text-h3 leading-none text-primary">
                      {metric.asStated}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </Container>
      </Section>

      <div id="values">
        <Values />
      </div>

      <div id="partners">
        <Partners />
      </div>

      {/* This page was a link sink — heavy inbound from the global navigation,
          almost no way onward into the catalogue. See BrowseCatalogue. */}
      <BrowseCatalogue intro="Cerium supplies raw materials to formulators. There are three ways into the catalogue, depending on where you are starting from." />

      <CTA />
    </>
  );
}
