import "server-only";

/**
 * The Content Studio writes to the source tree. That is safe on a developer's
 * machine and absolutely not safe on a server, so it is disabled outside
 * development — in one place, checked by every Studio route and API handler.
 *
 * `NODE_ENV` is set to "production" by `next build`/`next start` and cannot be
 * altered by a request, so this cannot be bypassed by a header, query parameter
 * or crafted URL.
 *
 * This is a local authoring tool, not an admin panel. It has no authentication
 * because it must never be reachable by anyone but the developer running
 * `npm run dev`. If a deployed, authenticated admin is needed, that is the
 * Django admin in Phase 2 — do not try to promote this to one.
 */
export const isStudioEnabled = process.env.NODE_ENV !== "production";

/** JSON 403 for API handlers. */
export function studioDisabledResponse(): Response {
  return Response.json(
    {
      error:
        "The Content Studio is only available in development (npm run dev).",
    },
    { status: 403 },
  );
}
