import { Container } from "@/components/ui/Container";

/**
 * Full-page loading skeleton.
 *
 * NOT wired up as a route `loading.tsx`, deliberately.
 *
 * In Phase 1 no route does slow async work — every page but /contact is
 * statically prerendered, and /contact only reads a query parameter. Adding a
 * `loading.tsx` anywhere wraps that route in a Suspense boundary, which makes
 * Next stream the page: the HTML then ships this skeleton up front with the
 * real content inside `<div hidden>`, to be swapped in by JavaScript. That is
 * exactly the crawlability failure this rebuild exists to fix (the current
 * Netlify prototype serves an empty shell to crawlers), so loading UI is only
 * introduced where a route genuinely defers on data.
 *
 * FROM PHASE 2: when routes start fetching from the Django API, drop this in as
 * `loading.tsx` beside those routes — or better, wrap just the data-dependent
 * section in <Suspense> so the page shell still renders in the initial HTML.
 *
 * `aria-hidden` on the shapes with a single polite status message: a screen
 * reader should hear "Loading", not a description of grey blocks.
 */
export function PageSkeleton() {
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        Loading page…
      </p>

      <div aria-hidden="true">
        <div className="border-b border-border bg-background-soft">
          <Container>
            <div className="animate-pulse pb-16 pt-8 md:pt-10">
              <div className="h-2.5 w-52 bg-border" />
              <div className="mt-10 h-3 w-28 bg-border" />
              <div className="mt-6 h-10 w-full max-w-xl bg-border" />
              <div className="mt-4 h-10 w-full max-w-md bg-border" />
              <div className="mt-7 h-3 w-full max-w-lg bg-border" />
            </div>
          </Container>
        </div>

        <Container>
          <div className="grid animate-pulse gap-6 py-20 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="border border-border">
                <div className="aspect-[16/10] w-full bg-surface-sunken" />
                <div className="space-y-3 p-6">
                  <div className="h-4 w-2/3 bg-surface-sunken" />
                  <div className="h-2.5 w-full bg-surface-sunken" />
                  <div className="h-2.5 w-5/6 bg-surface-sunken" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </>
  );
}
