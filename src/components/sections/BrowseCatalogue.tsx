import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/cn";

/**
 * Catalogue signposts for the pages that are otherwise dead ends.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * The Phase 2.3F-1 crawl measured `/about` and `/contact` as link sinks: each
 * receives roughly 160 inbound links from the header and footer and emits one
 * or two body links back. They absorb internal linking and return almost
 * nothing, and a visitor who lands on either from search has no route into the
 * catalogue that is not the global navigation.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE THREE, AND WHY THIS WORDING
 * ---------------------------------------------------------------------------
 * The three destinations are the site's three browse axes, and the one-line
 * descriptions are the routing rule the project already documents in
 * `CLAUDE.md` — /products is what the material IS, /applications what it is
 * FOR, /industries who it is for. That is real orientation rather than an SEO
 * block, and it states nothing that is not already true of the routes.
 *
 * No counts appear here. Counts must be derived from data rather than written
 * into copy, and a hardcoded "122 products" is precisely the sort of number
 * that goes stale silently.
 *
 * This creates no relationship. Every link points at an existing top-level
 * route that the global navigation already links to.
 */

const AXES = [
  {
    href: "/products",
    label: "Products",
    line: "What the material is — extracts, oils, actives and fragrances, grouped by range.",
  },
  {
    href: "/applications",
    label: "Applications",
    line: "What it is for — skin care, hair care, fabric care and the rest.",
  },
  {
    href: "/industries",
    label: "Industries",
    line: "Who it is for — the personal care and home care markets Cerium supplies.",
  },
] as const;

export function BrowseCatalogue({
  title = "Browse the catalogue",
  intro,
  exclude,
}: {
  title?: string;
  /** Optional lead-in, so each page can frame the section in its own terms. */
  intro?: string;
  /**
   * Href to leave out — the page rendering the section.
   *
   * Added so the three catalogue index pages can each signpost the other two.
   * Without it, /products would link to itself, which is noise in a links list
   * and a wasted row. `/about` and `/contact` pass nothing and still get all
   * three, because neither is one of the axes.
   */
  exclude?: string;
}) {
  const axes = AXES.filter((axis) => axis.href !== exclude);

  return (
    <Section tone="soft" space="md" ariaLabelledBy="browse-catalogue-heading">
      <Container>
        <div className="max-w-2xl">
          <Heading level={2} size="h3" id="browse-catalogue-heading">
            {title}
          </Heading>
          {intro && (
            <p className="mt-3 text-body text-text-muted">{intro}</p>
          )}
        </div>

        {/* Column count follows the number of axes shown, so a two-item list
            fills the row instead of leaving a gap where the excluded one was. */}
        <ul
          className={cn(
            "mt-8 grid gap-px overflow-hidden rounded-sm border border-border bg-border",
            axes.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3",
          )}
        >
          {axes.map((axis) => (
            <li key={axis.href} className="bg-surface">
              {/*
                The whole tile is one link with the destination name as its
                accessible name — short, unique, and unambiguous in a links
                list, unlike a shared "learn more".
              */}
              <Link
                href={axis.href}
                className="group flex h-full flex-col gap-2 p-6 transition-colors hover:bg-background-soft"
              >
                <span className="inline-flex items-center gap-2 text-h4 font-semibold text-text transition-colors group-hover:text-primary">
                  {axis.label}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 text-primary transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] group-hover:translate-x-1 motion-reduce:transform-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
                  </svg>
                </span>
                <span className="text-small text-text-muted">{axis.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
