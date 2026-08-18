import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { siteConfig } from "@/config/site";

/**
 * Global call to action.
 *
 * Reused at the foot of every page, so the next step is never more than one
 * screen away. Offers both the considered route (enquiry) and the immediate one
 * (phone), because a B2B buyer in Nairobi is as likely to call as to fill in a
 * form.
 */
export function CTA({
  eyebrow = "Get in touch",
  title = "Tell us what you are formulating.",
  body = "Send us your requirement and our team will come back with what we can supply.",
}: {
  eyebrow?: string;
  title?: string;
  body?: string;
}) {
  return (
    <Section tone="primary" space="lg" ariaLabelledBy="cta-heading">
      {/* Subtle luminosity so the panel is not a flat block of colour */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 70% at 85% 15%, rgba(53,160,95,0.22), transparent 60%)",
        }}
      />

      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow tone="light">{eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={60}>
              <Heading level={2} size="h2" id="cta-heading" className="mt-6 text-white">
                {title}
              </Heading>
            </Reveal>
            <Reveal delay={110}>
              <p className="mt-5 max-w-[52ch] text-lead text-white/70">{body}</p>
            </Reveal>
          </div>

          <Reveal delay={160} className="lg:col-span-5">
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button href="/contact" variant="inverse" size="lg" withArrow>
                Make an enquiry
              </Button>
              <Button
                href={siteConfig.contact.phoneHref}
                size="lg"
                className="border border-white/25 bg-transparent text-white hover:border-white/60 hover:bg-white/5"
              >
                {siteConfig.contact.phoneDisplay}
              </Button>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
