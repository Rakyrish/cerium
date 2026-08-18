import type { Category } from "@/types/content";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { TextLink } from "@/components/ui/Button";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { Reveal } from "@/components/motion/Reveal";
import { catalogueIntro } from "@/data/company";

export interface CategoryWithCount {
  category: Category;
  productCount: number;
}

/**
 * Product families.
 *
 * An asymmetric editorial grid rather than a uniform card wall: the first two
 * families take a wide row, the remainder a three-up row. The unequal weighting
 * is what gives the section a composed, magazine-like feel instead of the
 * repeating-tile look the brief explicitly rules out.
 *
 * Spans are derived from index, so adding a sixth family degrades gracefully
 * into the three-up row rather than breaking the layout.
 */
export function ProductCategories({ items }: { items: CategoryWithCount[] }) {
  const [lead, second, ...rest] = items;

  return (
    <Section tone="soft" space="lg" ariaLabelledBy="categories-heading">
      <Container>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>What we supply</Eyebrow>
            </Reveal>
            <Reveal delay={60}>
              <Heading level={2} size="h2" id="categories-heading" className="mt-6">
                Product families
              </Heading>
            </Reveal>
            <Reveal delay={110}>
              <p className="mt-5 text-lead text-text-muted">{catalogueIntro}</p>
            </Reveal>
          </div>

          <Reveal delay={140} className="shrink-0">
            <TextLink href="/products">View all products</TextLink>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-12">
          {lead && (
            <Reveal className="md:col-span-7">
              <CategoryCard
                category={lead.category}
                productCount={lead.productCount}
                variant="editorial"
                index={1}
                sizes="(min-width: 768px) 58vw, 100vw"
              />
            </Reveal>
          )}

          {second && (
            <Reveal delay={80} className="md:col-span-5 md:pt-16">
              <CategoryCard
                category={second.category}
                productCount={second.productCount}
                variant="editorial"
                index={2}
                sizes="(min-width: 768px) 42vw, 100vw"
              />
            </Reveal>
          )}

          {/* A single remaining family would sit alone in a three-up row and
              look like a mistake, so it widens to fill the row instead. The
              grid stays composed at any count. */}
          {rest.map((item, index) => {
            const isLoneRemainder = rest.length === 1;
            return (
              <Reveal
                key={item.category.slug}
                delay={index * 70}
                className={isLoneRemainder ? "md:col-span-12" : "md:col-span-4"}
              >
                <CategoryCard
                  category={item.category}
                  productCount={item.productCount}
                  variant="editorial"
                  index={index + 3}
                  imageRatio={isLoneRemainder ? "ultrawide" : "portrait"}
                  sizes={
                    isLoneRemainder
                      ? "(min-width: 768px) 92vw, 100vw"
                      : "(min-width: 768px) 32vw, 100vw"
                  }
                />
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

/**
 * Sub-family discovery rail.
 *
 * A horizontally scrolling row, presented as a second, lighter way into the
 * catalogue. Native overflow scrolling with snap points — no carousel library,
 * no autoplay, and it stays keyboard- and swipe-navigable.
 */
export function CategoryRail({
  title,
  eyebrow,
  categories,
}: {
  title: string;
  eyebrow: string;
  categories: Category[];
}) {
  if (categories.length === 0) return null;

  return (
    <Section tone="default" space="md" ariaLabelledBy="rail-heading">
      <Container>
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={60}>
          <Heading level={2} size="h3" id="rail-heading" className="mt-5">
            {title}
          </Heading>
        </Reveal>
      </Container>

      {/* Bleeds to the viewport edge so the row reads as continuing off-screen,
          which is what signals "scrollable" without a instructional label. */}
      <div className="mt-10">
        <ul className="rail-scroll flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-2 sm:px-8 lg:px-12 xl:px-16">
          {categories.map((category) => (
            <li key={category.slug} className="snap-start">
              <CategoryCard category={category} variant="rail" />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
