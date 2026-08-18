import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { TextLink } from "@/components/ui/Button";
import { CeriumImage } from "@/components/ui/CeriumImage";
import { Reveal } from "@/components/motion/Reveal";
import { brandStatement, vision, mission } from "@/data/company";
import { siteMedia } from "@/data/media";

/**
 * Company introduction.
 *
 * Asymmetric two-column composition: a wide type column against a tall image
 * column, deliberately unequal so the page does not settle into a 50/50 rhythm.
 *
 * Copy is Cerium's own vision and mission, verbatim.
 */
export function CompanyIntro() {
  return (
    <Section tone="default" space="lg" ariaLabelledBy="intro-heading">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7 xl:col-span-6">
            <Reveal>
              <Eyebrow>Who we are</Eyebrow>
            </Reveal>

            <Reveal delay={60}>
              <Heading level={2} size="h2" id="intro-heading" className="mt-6">
                {brandStatement.map((word, index) => (
                  <span key={word}>
                    {word}
                    {index < brandStatement.length - 1 && (
                      <span aria-hidden="true" className="text-accent">
                        .{" "}
                      </span>
                    )}
                    {index === brandStatement.length - 1 && (
                      <span aria-hidden="true" className="text-accent">
                        .
                      </span>
                    )}
                  </span>
                ))}
              </Heading>
            </Reveal>

            <Reveal delay={110}>
              <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:gap-12">
                <div>
                  <h3 className="text-eyebrow font-semibold uppercase text-text-muted">
                    Our vision
                  </h3>
                  <p className="mt-4 text-body text-text-muted">{vision}</p>
                </div>
                <div>
                  <h3 className="text-eyebrow font-semibold uppercase text-text-muted">
                    Our mission
                  </h3>
                  <p className="mt-4 text-body text-text-muted">{mission}</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="mt-10">
                <TextLink href="/about">More about Cerium</TextLink>
              </div>
            </Reveal>
          </div>

          {/* Image column — offset downward so the two columns do not align,
              which is what keeps the composition from feeling like a table. */}
          <Reveal delay={140} className="lg:col-span-5 lg:col-start-8 lg:pt-12">
            <CeriumImage
              image={siteMedia.companyIntro.image}
              ratio="portrait"
              sizes="(min-width: 1024px) 40vw, 100vw"
              placeholderLabel={siteMedia.companyIntro.placeholder}
            />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
