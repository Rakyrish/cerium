import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { Reveal } from "@/components/motion/Reveal";
import { coreValues, partners, partnersIntro, partnersStatement } from "@/data/company";

/**
 * Core values.
 *
 * Presented on deep green as a numbered editorial list rather than six icon
 * cards — six identical icon tiles is the single most template-looking pattern
 * in B2B web design, and Cerium's values are written well enough to carry
 * themselves as type.
 *
 * The scripture reference accompanying each value in the source document is
 * retained: it is part of how Cerium states its values, and omitting it would
 * be editing the client's own words.
 */
export function Values() {
  return (
    <Section tone="dark" space="lg" ariaLabelledBy="values-heading">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <Reveal>
              <Eyebrow tone="light">How we work</Eyebrow>
            </Reveal>
            <Reveal delay={60}>
              <Heading
                level={2}
                size="h2"
                id="values-heading"
                className="mt-6 text-white"
              >
                Core values
              </Heading>
            </Reveal>
            <Reveal delay={110}>
              <p className="mt-5 max-w-[40ch] text-body text-white/65">
                Six commitments that shape how Cerium sources, supplies and
                supports.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <ol className="divide-y divide-white/12 border-t border-white/12">
              {coreValues.map((value, index) => (
                <li key={value.name}>
                  <Reveal delay={(index % 3) * 60}>
                    <div className="grid gap-3 py-7 sm:grid-cols-[auto_1fr] sm:gap-8">
                      <span
                        aria-hidden="true"
                        className="font-display text-small tabular-nums text-accent"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-h4 font-medium text-white">
                          {value.name}
                        </h3>
                        <p className="mt-2 max-w-[62ch] text-body text-white/65">
                          {value.description}
                        </p>
                        {value.reference && (
                          <p className="mt-2.5 text-caption text-white/40">
                            {value.reference}
                          </p>
                        )}
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/**
 * Supply partners.
 *
 * No partner logo files were supplied, and reproducing third-party marks from
 * memory would be both inaccurate and a trademark problem. The partners are
 * therefore set as type, which is a defensible design choice rather than a
 * compromise — and the layout accepts logos later without changing.
 */
export function Partners() {
  return (
    <Section tone="default" space="lg" ariaLabelledBy="partners-heading">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow>Global partners in innovation</Eyebrow>
            </Reveal>
            <Reveal delay={60}>
              <Heading level={2} size="h2" id="partners-heading" className="mt-6">
                Backed by science
              </Heading>
            </Reveal>
            <Reveal delay={110}>
              <p className="mt-5 max-w-[46ch] text-body text-text-muted">
                {partnersIntro}
              </p>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 font-display text-h4 text-primary">
                {partnersStatement}
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <ul className="divide-y divide-border border-y border-border">
              {partners.map((partner, index) => (
                <li key={partner.name}>
                  <Reveal delay={index * 70}>
                    <div className="grid gap-2 py-8 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-8">
                      <h3 className="text-h4 font-semibold text-text">
                        {partner.name}
                      </h3>
                      <p className="max-w-[58ch] text-small text-text-muted">
                        {partner.description}
                      </p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  );
}
