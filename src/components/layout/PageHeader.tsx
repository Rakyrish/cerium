import Link from "next/link";
import type { Breadcrumb } from "@/types/content";
import { Container } from "@/components/ui/Container";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { Reveal } from "@/components/motion/Reveal";
import { breadcrumbSchema, jsonLd } from "@/lib/seo";

/**
 * Breadcrumb trail.
 *
 * Rendered as a real ordered list inside a labelled nav, and mirrored as
 * BreadcrumbList structured data so search engines can show the hierarchy in
 * results. The current page is marked `aria-current` and is not a link.
 */
export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  if (items.length === 0) return null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(items)) }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-2">
                {isLast ? (
                  <span aria-current="page" className="text-text">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="underline decoration-transparent underline-offset-4 transition-colors hover:text-primary hover:decoration-current"
                  >
                    {item.name}
                  </Link>
                )}
                {!isLast && (
                  <span aria-hidden="true" className="text-text-light">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

/**
 * Standard page header.
 *
 * Carries the single `<h1>` for the page. Every route uses this so heading
 * hierarchy stays correct and consistent by construction rather than by
 * discipline.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  breadcrumbs,
  meta,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  breadcrumbs?: Breadcrumb[];
  /** Small supporting line, e.g. a derived product count. */
  meta?: string;
}) {
  return (
    <div className="border-b border-border bg-background-soft">
      <Container>
        <div className="pb-14 pt-8 md:pb-16 md:pt-10">
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

          <div className="mt-10 max-w-4xl">
            {eyebrow && (
              <Reveal>
                <Eyebrow>{eyebrow}</Eyebrow>
              </Reveal>
            )}
            <Reveal delay={60}>
              <Heading level={1} size="h1" className="mt-6">
                {title}
              </Heading>
            </Reveal>
            {intro && (
              <Reveal delay={110}>
                <p className="mt-6 max-w-[62ch] text-lead text-text-muted">
                  {intro}
                </p>
              </Reveal>
            )}
            {meta && (
              <Reveal delay={140}>
                <p className="mt-6 text-caption uppercase tracking-wide text-text-muted">
                  {meta}
                </p>
              </Reveal>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
