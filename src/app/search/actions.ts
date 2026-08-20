"use server";

import { searchCatalogue, type SearchResponse } from "@/lib/search";

/**
 * Live search for the header overlay.
 *
 * ---------------------------------------------------------------------------
 * WHY A SERVER ACTION RATHER THAN AN API ROUTE
 * ---------------------------------------------------------------------------
 * The overlay needs results while someone types, which means a client → server
 * round trip. A Route Handler at `/api/search` would work, but it would also
 * be the first public API this site has ever had — a documented property worth
 * keeping (`robots.ts` disallows `/api/`, and the only handlers are the
 * dev-only Studio and Auth.js callbacks).
 *
 * A Server Action needs no public endpoint, no hand-written request parsing
 * and no response schema kept in sync by hand. The catalogue stays on the
 * server; what crosses back is the same small `SearchResponse` the page
 * renders, capped at a few results per group.
 *
 * `searchCatalogue` is `server-only`, so this file is the boundary: a client
 * component may import THIS, and importing the search implementation directly
 * fails the build.
 */
export async function searchAction(query: string): Promise<SearchResponse> {
  // Input is untrusted. It is never interpolated into a query, never rendered
  // as HTML, and is length-capped and normalised inside `searchCatalogue`.
  if (typeof query !== "string") {
    return { query: "", ran: false, total: 0, groups: [] };
  }

  return searchCatalogue(query, { limit: 5 });
}
