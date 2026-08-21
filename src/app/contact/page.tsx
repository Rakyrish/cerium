import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { BrowseCatalogue } from "@/components/sections/BrowseCatalogue";
import { fetchProduct } from "@/lib/content";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description:
    "Contact Cerium Chemicals in Industrial Area, Nairobi. Call +254 724 532 892 or email hello@ceriumchemicals.co.ke to enquire about specialty raw materials.",
  path: "/contact",
});

interface PageProps {
  searchParams: Promise<{ product?: string }>;
}

/**
 * Contact page.
 *
 * PHASE 1 SCOPE. There is no enquiry form here, and that is deliberate: the
 * enquiry/quotation system is Phase 11, and a form that silently discards
 * submissions is worse than no form — a customer would believe they had made
 * contact when they had not.
 *
 * Instead this page routes to channels that genuinely work today: phone,
 * WhatsApp and email, with the email pre-composed. Product cards link here with
 * `?product=<slug>`, which is picked up below so the enquiry arrives with
 * context already attached.
 */
export default async function ContactPage({ searchParams }: PageProps) {
  const { product: productSlug } = await searchParams;

  const product = productSlug ? await fetchProduct(productSlug) : null;

  const subject = product
    ? `Enquiry: ${product.name}`
    : "Enquiry via ceriumchemicals.co.ke";

  const body = product
    ? `Hello Cerium Chemicals,\n\nI would like to enquire about ${product.name}.\n\nQuantity required:\nIntended application:\nCompany:\n\nThank you.`
    : `Hello Cerium Chemicals,\n\nI would like to enquire about:\n\nQuantity required:\nIntended application:\nCompany:\n\nThank you.`;

  const mailto = `${siteConfig.contact.emailHref}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title="Contact Cerium"
        intro="Tell us what you are formulating and our team will come back with what we can supply."
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Contact", href: "/contact" },
        ]}
      />

      <Section space="lg">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              {product && (
                <Reveal>
                  <div className="mb-10 border-l-2 border-accent bg-primary-soft px-6 py-5">
                    <p className="text-eyebrow font-semibold uppercase text-primary">
                      Enquiring about
                    </p>
                    <p className="mt-2 text-h4 font-semibold text-text">
                      {product.name}
                    </p>
                    {product.benefit && (
                      <p className="mt-2 max-w-[58ch] text-small text-text-muted">
                        {product.benefit}
                      </p>
                    )}
                  </div>
                </Reveal>
              )}

              <Reveal delay={60}>
                <Heading level={2} size="h3">
                  Send an enquiry
                </Heading>
                <p className="mt-4 max-w-[58ch] text-body text-text-muted">
                  Email is the fastest way to reach the team with a full
                  specification. The link below opens a pre-filled message
                  {product ? ` for ${product.name}` : ""} in your email
                  application.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button href={mailto} size="lg" withArrow>
                    Email {siteConfig.contact.email}
                  </Button>
                  <Button
                    href={siteConfig.contact.whatsappHref}
                    variant="outline"
                    size="lg"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Message on WhatsApp
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="mt-12 border-t border-border pt-8">
                  <h3 className="text-eyebrow font-semibold uppercase text-text-muted">
                    Helpful to include
                  </h3>
                  <ul className="mt-4 space-y-2 text-body text-text-muted">
                    {[
                      "The ingredient or product range you are interested in",
                      "Quantity required and how often",
                      "The end product you are formulating",
                      "Your company name and location",
                    ].map((item) => (
                      <li key={item} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            {/* Contact details */}
            <Reveal delay={100} className="lg:col-span-5">
              <div className="border border-border bg-background-soft p-8">
                <h2 className="text-h4 font-semibold">Cerium Chemicals</h2>

                <dl className="mt-7 space-y-7">
                  <div>
                    <dt className="text-eyebrow font-semibold uppercase text-text-muted">
                      Phone
                    </dt>
                    <dd className="mt-2">
                      <a
                        href={siteConfig.contact.phoneHref}
                        className="text-lead text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
                      >
                        {siteConfig.contact.phoneDisplay}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-eyebrow font-semibold uppercase text-text-muted">
                      Email
                    </dt>
                    <dd className="mt-2">
                      <a
                        href={siteConfig.contact.emailHref}
                        className="break-words text-body text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
                      >
                        {siteConfig.contact.email}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-eyebrow font-semibold uppercase text-text-muted">
                      Address
                    </dt>
                    <dd className="mt-2">
                      <address className="text-body not-italic text-text-muted">
                        {siteConfig.address.street}
                        <br />
                        {siteConfig.address.locality}
                        <br />
                        {siteConfig.address.region}, {siteConfig.address.country}
                      </address>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-eyebrow font-semibold uppercase text-text-muted">
                      Opening hours
                    </dt>
                    <dd className="mt-2 space-y-1.5">
                      {siteConfig.hours.map((entry) => (
                        <p
                          key={entry.days}
                          className="flex flex-wrap gap-x-3 text-body text-text-muted"
                        >
                          <span className="min-w-[9.5rem]">{entry.days}</span>
                          <span className="text-text">{entry.time}</span>
                        </p>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Same link-sink fix as /about: this page received heavy navigation
          linking and returned a single body link. */}
      <BrowseCatalogue
        title="While you are here"
        intro="If you are not sure what to ask for yet, these are the three ways into the catalogue."
      />
    </>
  );
}
