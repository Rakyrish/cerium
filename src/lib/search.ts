import "server-only";

import {
  fetchAllProducts,
  fetchApplications,
  fetchIndustries,
  fetchPublishableCategories,
} from "@/lib/content";
import {
  applicationPath,
  categoryPath,
  industryPath,
  productPath,
} from "@/lib/routes";

/**
 * Catalogue search.
 *
 * ---------------------------------------------------------------------------
 * SERVER ONLY, AND THAT IS THE WHOLE POINT
 * ---------------------------------------------------------------------------
 * This module reads the catalogue, so it can never be imported by a client
 * component — `server-only` turns that into a build error rather than a
 * convention. The browser receives a query and a handful of finished result
 * objects; it never receives anything it could search itself.
 *
 * That is a deliberate architectural choice rather than a technical necessity.
 * The full searchable corpus currently measures about 19 KB, small enough to
 * ship and match client-side. It is not shipped because the taxonomy is
 * provisional and growing, because the boundary is the thing being protected
 * rather than the byte count, and because the same seam has to keep working
 * when the catalogue is a database rather than a file.
 *
 * ---------------------------------------------------------------------------
 * DETERMINISTIC, NOT CLEVER
 * ---------------------------------------------------------------------------
 * Fixed weights, explainable ordering, no stemming, no fuzzy distance, no
 * embeddings. Two reasons beyond the phase scope:
 *
 *   - 68 of 122 products are a name and nothing else, so for half the corpus
 *     search IS name matching, and sophistication has nothing to work with;
 *   - stemming mangles chemical terminology. "Silicones" must not stem into a
 *     token that also matches "silica", and "Oat Extract" must not collapse
 *     toward "oats". Wrong-but-confident matching is worse here than a miss.
 */

export type SearchResultType = "product" | "category" | "application" | "industry";

/**
 * The minimum a result needs to render.
 *
 * Deliberately narrow: no source document, no ids, no formats, no taxonomy,
 * no image, no internal status. Everything here is already public on the page
 * it links to.
 */
export interface SearchResult {
  type: SearchResultType;
  title: string;
  href: string;
  /** Where it sits — the range name for a product. Omitted when redundant. */
  context?: string;
  /** Verbatim Cerium copy, trimmed for a result row. Never generated. */
  summary?: string;
}

export interface SearchGroup {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
  /** Matches beyond the limit, so the UI can offer the fuller list honestly. */
  total: number;
  /**
   * Score of this group's best match. Orders the groups themselves — see the
   * note where they are assembled.
   */
  topScore: number;
}

export interface SearchResponse {
  /** Echoed back normalised, so the UI never has to re-derive it. */
  query: string;
  /** False when the query is too short to run — distinct from "no matches". */
  ran: boolean;
  total: number;
  groups: SearchGroup[];
}

/**
 * Below this, matching returns too much to be useful.
 *
 * One character matches most of the catalogue and tells the visitor nothing.
 * The UI reports "keep typing" rather than an empty result list, because those
 * two states mean different things.
 */
export const MIN_QUERY_LENGTH = 2;

/** Guard against a pathological query being used to burn CPU. */
const MAX_QUERY_LENGTH = 120;

/* -------------------------------------------------------------------------- */
/* Normalisation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Lower-case, trim, collapse runs of whitespace. Nothing else.
 *
 * Punctuation is preserved because it is load-bearing in this catalogue:
 * "Olive Oil (Extra Virgin)", "BTMS 50", "Phenoxyethanol & Ethylhexylglycerin",
 * "Blue Bouquet 05". Stripping it would make some products unfindable by the
 * name printed on their own page.
 */
function normalise(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Split into comparable tokens.
 *
 * Separates on anything that is not a letter or digit, so a hyphen, ampersand,
 * slash or bracket becomes a boundary rather than part of a word. This is what
 * lets "anti dandruff" find "Anti-dandruff" and "btms 50" find "BTMS 50",
 * without the normalised string itself losing its punctuation.
 */
function tokenise(value: string): string[] {
  return normalise(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                     */
/* -------------------------------------------------------------------------- */

/*
 * Weights are ordered by how much confidence the match deserves. The gaps are
 * wide enough that a strong name match always outranks any number of weak
 * summary matches — a product literally called "Aloe Vera Extract" must be
 * first for "aloe", regardless of how many benefit lines mention aloe.
 */
const SCORE = {
  exactName: 1000,
  namePrefix: 500,
  nameTokenPrefix: 300,
  nameContains: 200,
  allTokensInName: 150,
  contextMatch: 60,
  summaryContains: 40,
  summaryToken: 20,
} as const;

interface Scoreable {
  name: string;
  summary?: string;
  context?: string;
}

/** Score one record. Zero means no match, and the record is dropped. */
function score(item: Scoreable, query: string, queryTokens: string[]): number {
  const name = normalise(item.name);
  const nameTokens = tokenise(item.name);
  let total = 0;

  if (name === query) {
    total += SCORE.exactName;
  } else if (name.startsWith(query)) {
    total += SCORE.namePrefix;
  } else if (nameTokens.some((token) => token.startsWith(query))) {
    // "extr" finds "Aloe Vera Extract" — matching a word start rather than the
    // whole name is what makes partial typing work mid-phrase.
    total += SCORE.nameTokenPrefix;
  } else if (name.includes(query)) {
    total += SCORE.nameContains;
  }

  // Multi-word queries where every word appears somewhere in the name, in any
  // order: "oil argan" finds "Argan Oil".
  if (
    total === 0 &&
    queryTokens.length > 1 &&
    queryTokens.every((token) =>
      nameTokens.some((nameToken) => nameToken.startsWith(token)),
    )
  ) {
    total += SCORE.allTokensInName;
  }

  if (item.context) {
    const context = normalise(item.context);
    if (context.includes(query)) total += SCORE.contextMatch;
  }

  if (item.summary) {
    const summary = normalise(item.summary);
    if (summary.includes(query)) {
      total += SCORE.summaryContains;
    } else if (queryTokens.length > 0) {
      const summaryTokens = new Set(tokenise(item.summary));
      const hit = queryTokens.every((token) =>
        [...summaryTokens].some((word) => word.startsWith(token)),
      );
      if (hit) total += SCORE.summaryToken;
    }
  }

  return total;
}

/** Shorten copy for a result row without rewriting it. */
function trim(value: string | undefined, max = 120): string | undefined {
  if (!value) return undefined;
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > 0 ? cut.slice(0, boundary) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export interface SearchOptions {
  /** Results kept per group. The overlay asks for fewer than the page does. */
  limit?: number;
}

/**
 * Search the catalogue.
 *
 * Reads exclusively through `lib/content.ts`, so it already searches Postgres
 * where one is configured and the reviewed local data otherwise — and when the
 * data source changes again, nothing here changes. Ranking happens in this
 * file today; if it eventually moves into a database query, this function's
 * signature and its return shape stay put, which is what keeps the UI unaware
 * of the implementation.
 */
export async function searchCatalogue(
  rawQuery: string,
  { limit = 5 }: SearchOptions = {},
): Promise<SearchResponse> {
  const query = normalise(rawQuery).slice(0, MAX_QUERY_LENGTH);

  if (query.length < MIN_QUERY_LENGTH) {
    return { query, ran: false, total: 0, groups: [] };
  }

  const queryTokens = tokenise(query);

  const [products, categories, applications, industries] = await Promise.all([
    fetchAllProducts(),
    fetchPublishableCategories(),
    fetchApplications(),
    fetchIndustries(),
  ]);

  /** Rank, drop non-matches, and keep the group's true size before slicing. */
  function rank<T>(
    items: T[],
    toScoreable: (item: T) => Scoreable,
    toResult: (item: T) => SearchResult,
  ): { results: SearchResult[]; total: number; topScore: number } {
    const scored = items
      .map((item) => ({ item, value: score(toScoreable(item), query, queryTokens) }))
      .filter((entry) => entry.value > 0)
      // Ties break alphabetically so ordering is stable across builds rather
      // than dependent on catalogue order.
      .sort(
        (a, b) =>
          b.value - a.value ||
          toScoreable(a.item).name.localeCompare(toScoreable(b.item).name),
      );

    return {
      results: scored.slice(0, limit).map((entry) => toResult(entry.item)),
      total: scored.length,
      topScore: scored[0]?.value ?? 0,
    };
  }

  const productHits = rank(
    // A product with no category context has no canonical URL, so it cannot be
    // offered as a destination.
    products.filter((product) => productPath(product) !== null),
    (product) => ({
      name: product.name,
      summary: product.benefit,
      context: product.categoryName,
    }),
    (product) => ({
      type: "product",
      title: product.name,
      href: productPath(product)!,
      context: product.categoryName,
      summary: trim(product.benefit),
    }),
  );

  const categoryHits = rank(
    categories,
    (category) => ({ name: category.name, summary: category.summary }),
    (category) => ({
      type: "category",
      title: category.name,
      href: categoryPath(category.slug),
      summary: trim(category.summary),
    }),
  );

  const applicationHits = rank(
    applications,
    (application) => ({
      name: application.name,
      summary: application.description,
    }),
    (application) => ({
      type: "application",
      title: application.name,
      href: applicationPath(application.slug),
      summary: trim(application.description),
    }),
  );

  const industryHits = rank(
    industries,
    (industry) => ({ name: industry.name, summary: industry.description }),
    (industry) => ({
      type: "industry",
      title: industry.name,
      href: industryPath(industry.slug),
      summary: trim(industry.description),
    }),
  );

  /*
   * Groups are ordered by their best match, not by a fixed type order.
   *
   * With a fixed order, searching "skin care" put the Skin Care APPLICATION —
   * an exact name match — below nine products that matched only because their
   * range name happens to contain "care". The strongest result on the page was
   * third from the bottom.
   *
   * Ordering by top score fixes that without giving up grouping: each block is
   * still labelled by type, and the ordering is still fully deterministic for a
   * given query. Ties fall back to the fixed order below, so a query that hits
   * products and ranges equally well still reads Products first.
   */
  const ORDER: SearchResultType[] = ["product", "category", "application", "industry"];

  const groups: SearchGroup[] = [
    { type: "product" as const, label: "Products", ...productHits },
    { type: "category" as const, label: "Ranges", ...categoryHits },
    { type: "application" as const, label: "Applications", ...applicationHits },
    { type: "industry" as const, label: "Industries", ...industryHits },
  ]
    .filter((group) => group.results.length > 0)
    .sort(
      (a, b) =>
        b.topScore - a.topScore ||
        ORDER.indexOf(a.type) - ORDER.indexOf(b.type),
    );

  return {
    query,
    ran: true,
    total:
      productHits.total +
      categoryHits.total +
      applicationHits.total +
      industryHits.total,
    groups,
  };
}
