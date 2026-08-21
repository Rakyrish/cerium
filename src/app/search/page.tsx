import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { Breadcrumbs } from "@/components/layout/PageHeader";
import { CTA } from "@/components/sections/CTA";
import { SearchResultList } from "@/components/search/SearchResultList";
import { searchCatalogue, MIN_QUERY_LENGTH } from "@/lib/search";
import { buildMetadata } from "@/lib/seo";

/**
 * Search results page.
 *
 * ---------------------------------------------------------------------------
 * DELIBERATELY NOT INDEXABLE
 * ---------------------------------------------------------------------------
 * `/search?q=anything` is an infinite URL space. Left indexable it becomes a
 * page generator: thousands of near-duplicate, thin URLs competing with the
 * product and range pages that are the actual ranking targets, and each one a
 * place a crawler can spend budget instead of on the catalogue.
 *
 * So: `noindex, follow`. `follow` matters — the links out of here are
 * canonical destinations, and a crawler that lands on a shared search URL
 * should still be able to walk into the catalogue from it. The page is
 * absent from `sitemap.ts` for the same reason, and `robots.ts` already
 * disallows query-parameter duplicates of clean URLs.
 *
 * The canonical points at `/search` with no query, so any shared result URL
 * consolidates rather than each becoming its own entity.
 *
 * Built through `buildMetadata` like every other route. Hand-rolling the
 * metadata object here meant this page declared no `openGraph` at all, so it
 * inherited the root layout's resolved object wholesale — including `url`,
 * which is the site root. The page therefore advertised the homepage as its own
 * og:url while its canonical said `/search`, telling a crawler two different
 * things about the same page. Going through the helper fixes that; `index:
 * false` keeps the page out of the index exactly as before.
 *
 * Note that inheriting the root object is also what kept the OG image working
 * here while 158 other routes lost it — see the `OG_IMAGE` comment in
 * `lib/seo.ts`. Both symptoms had one cause, and the helper now handles both.
 */
export const metadata: Metadata = buildMetadata({
  title: "Search",
  description:
    "Search the Cerium Chemicals catalogue — products, ranges, applications and industries.",
  path: "/search",
  index: false,
});

/** Depends on the query string, so it is rendered per request. */
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const raw = typeof q === "string" ? q : "";

  // A generous limit here — this is the "see everything" destination, unlike
  // the overlay, which shows the top few.
  const response = await searchCatalogue(raw, { limit: 24 });
  const typed = raw.trim().length > 0;

  return (
    <>
      <div className="border-b border-border bg-background-soft">
        <Container>
          <div className="pb-12 pt-8 md:pb-14 md:pt-10">
            <Breadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Search", href: "/search" },
              ]}
            />

            <div className="mt-8 max-w-3xl md:mt-10">
              <Eyebrow>Catalogue</Eyebrow>
              <Heading level={1} size="h1" className="mt-5 break-words">
                {response.ran ? `Results for “${response.query}”` : "Search"}
              </Heading>

              {response.ran && (
                <p className="mt-5 text-lead text-text-muted">
                  {response.total === 0
                    ? "No matches in the catalogue."
                    : `${response.total} ${response.total === 1 ? "match" : "matches"} across products, ranges, applications and industries.`}
                </p>
              )}

              {/*
                A plain GET form. It needs no JavaScript, so the results page
                is fully usable if the overlay's script never loads, and the
                resulting URL is shareable and back-button friendly.
              */}
              <form
                role="search"
                action="/search"
                method="get"
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <label htmlFor="search-page-input" className="sr-only">
                  Search products, ranges, applications and industries
                </label>
                <input
                  id="search-page-input"
                  type="search"
                  name="q"
                  defaultValue={raw}
                  autoComplete="off"
                  placeholder="Search the catalogue…"
                  className="h-12 w-full rounded-sm border border-border-strong bg-surface px-4 text-body outline-none transition-colors focus:border-primary sm:max-w-md"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-sm bg-primary px-6 text-button font-medium text-white transition-colors hover:bg-green-700"
                >
                  Search
                </button>
              </form>

              {typed && !response.ran && (
                <p className="mt-4 text-small text-text-muted">
                  Enter at least {MIN_QUERY_LENGTH} characters.
                </p>
              )}
            </div>
          </div>
        </Container>
      </div>

      {response.ran && response.total > 0 && (
        <Section space="lg" ariaLabelledBy="results-heading">
          <Container>
            <h2 id="results-heading" className="sr-only">
              Search results
            </h2>
            <SearchResultList groups={response.groups} />
          </Container>
        </Section>
      )}

      {response.ran && response.total === 0 && <NoResults query={response.query} />}

      {!response.ran && <BrowseInstead />}

      <CTA
        eyebrow="Cannot find it?"
        title="Tell us what you are looking for"
        body="Our catalogue is not exhaustive. Send us your requirement and our team will come back with what we can supply."
      />
    </>
  );
}

/**
 * No-results state.
 *
 * Offers real destinations rather than guessing at what was meant. There is no
 * "did you mean" because there is no authoritative basis for one — inventing a
 * suggestion for a chemical name is exactly the class of guess this codebase
 * refuses to make.
 */
function NoResults({ query }: { query: string }) {
  return (
    <Section space="lg" ariaLabelledBy="no-results-heading">
      <Container>
        <div className="max-w-[62ch]">
          <Heading level={2} size="h3" id="no-results-heading">
            No results for “{query}”
          </Heading>
          <p className="mt-4 text-body text-text-muted">
            The catalogue lists what Cerium has published so far, and it is not
            exhaustive. Try a shorter or more general term, browse below, or ask
            us directly.
          </p>
          <BrowseLinks />
        </div>
      </Container>
    </Section>
  );
}

function BrowseInstead() {
  return (
    <Section space="lg" ariaLabelledBy="browse-heading">
      <Container>
        <div className="max-w-[62ch]">
          <Heading level={2} size="h3" id="browse-heading">
            Browse the catalogue
          </Heading>
          <p className="mt-4 text-body text-text-muted">
            Search by product name, range, application or industry — or start
            from one of these.
          </p>
          <BrowseLinks />
        </div>
      </Container>
    </Section>
  );
}

function BrowseLinks() {
  const links = [
    { href: "/products", label: "All products" },
    { href: "/applications", label: "Applications" },
    { href: "/industries", label: "Industries" },
    { href: "/contact", label: "Contact Cerium" },
  ];

  return (
    <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="text-body font-medium text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
