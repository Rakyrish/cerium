import Link from "next/link";
import type { Category, ImageRef } from "@/types/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { CeriumImage } from "@/components/ui/CeriumImage";
import { Reveal } from "@/components/motion/Reveal";
import { companyMetrics, aboutSummary } from "@/data/company";
import { siteConfig } from "@/config/site";

/**
 * Homepage hero.
 *
 * PLACEHOLDER-SAFE BY DESIGN. Cerium has not supplied production photography,
 * so the hero renders a typographic treatment on deep green: strong, credible,
 * and dependent on nothing that does not exist yet.
 *
 * Pass an `image` and it becomes a full-bleed image hero with a scrim — the
 * layout, type scale and contrast are already built for it. That is the single
 * change needed once real photography lands.
 *
 * The headline is real HTML text, never baked into an image, so it is indexable
 * and selectable.
 */
export function Hero({
  image,
  categories,
}: {
  image?: ImageRef;
  categories: Category[];
}) {
  const hasImage = Boolean(image?.src ?? image?.cloudinaryId);

  return (
    <section
      aria-labelledby="hero-heading"
      className="on-dark relative isolate overflow-hidden bg-green-950 text-white"
    >
      {/* Optional photographic layer */}
      {hasImage && (
        <>
          <CeriumImage
            image={image}
            alt=""
            ratio="auto"
            priority
            sizes="100vw"
            className="absolute inset-0 h-full w-full"
            imageClassName="animate-drift"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-green-950 via-green-950/85 to-green-950/40"
          />
        </>
      )}

      {/* Ambient depth. Pure CSS — no image request, no layout cost. */}
      {!hasImage && (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 60% at 78% 8%, rgba(53,160,95,0.28), transparent 62%), " +
              "radial-gradient(ellipse 55% 50% at 8% 92%, rgba(29,63,209,0.16), transparent 60%)",
          }}
        />
      )}

      <Container className="relative">
        <div className="grid items-end gap-12 pb-16 pt-20 md:pb-20 md:pt-28 lg:grid-cols-12 lg:gap-16 lg:pb-24 lg:pt-36">
          <div className="lg:col-span-8">
            <Reveal>
              <p className="flex items-center gap-3 text-eyebrow font-semibold uppercase text-primary-light">
                <span
                  aria-hidden="true"
                  className="animate-rule h-px w-10 bg-accent"
                />
                {siteConfig.tagline}
              </p>
            </Reveal>

            <Reveal delay={80}>
              <Heading
                level={1}
                size="h1"
                id="hero-heading"
                className="mt-7 max-w-[18ch] text-white"
              >
                Specialty raw materials for personal care and home care
              </Heading>
            </Reveal>

            <Reveal delay={140}>
              <p className="mt-7 max-w-[54ch] text-lead text-white/75">
                {aboutSummary}
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button href="/products" variant="inverse" size="lg" withArrow>
                  Explore products
                </Button>
                <Button
                  href="/contact"
                  size="lg"
                  className="border border-white/25 bg-transparent text-white hover:border-white/60 hover:bg-white/5"
                >
                  Make an enquiry
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Metrics. Cerium's own published figures, reproduced verbatim. */}
          <Reveal delay={260} className="lg:col-span-4">
            <dl className="grid grid-cols-3 gap-6 border-t border-white/15 pt-8 lg:grid-cols-1 lg:gap-7">
              {/* dt/dd are in correct source order (term, then value) and
                  visually reversed with CSS, so the label is announced once. */}
              {companyMetrics.map((metric) => (
                <div key={metric.label} className="flex flex-col-reverse">
                  <dt className="mt-2 text-caption uppercase tracking-wide text-white/60">
                    {metric.label}
                  </dt>
                  <dd className="font-display text-[2.25rem] leading-none text-accent lg:text-[2.75rem]">
                    {metric.asStated}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </Container>

      {/* Product discovery, immediately — a visitor should not have to scroll
          to find out what Cerium actually supplies. */}
      <div className="relative border-t border-white/12">
        <Container bleed={false}>
          <nav aria-label="Product families" className="py-2">
            <ul className="rail-scroll -mx-1 flex overflow-x-auto">
              {categories.map((category) => (
                <li key={category.slug} className="shrink-0">
                  <Link
                    href={`/products/${category.slug}`}
                    className="group inline-flex items-center gap-2.5 px-4 py-4 text-small font-medium text-white/70 transition-colors hover:text-white"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 rounded-full bg-accent opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100"
                    />
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>
    </section>
  );
}
