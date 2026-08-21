import { handlers } from "@/lib/auth";

/**
 * Auth.js callback endpoints.
 *
 * The only public API route on the site that is not the Studio. `robots.ts`
 * already disallows `/api/`, so it is not crawlable.
 */
export const { GET, POST } = handlers;
