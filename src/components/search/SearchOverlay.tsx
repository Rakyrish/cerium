"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDialog } from "@/hooks/useDialog";
import type { BrowseLists } from "@/types/content";
import type { SearchResponse } from "@/lib/search";
import { searchAction } from "@/app/search/actions";
import { SearchResultList } from "@/components/search/SearchResultList";
import { cn } from "@/lib/cn";

/** Below this the query matches most of the catalogue. Mirrors MIN_QUERY_LENGTH. */
const MIN_QUERY = 2;

/**
 * Pause after the last keystroke before asking the server.
 *
 * Long enough that typing a product name is one request rather than fifteen,
 * short enough that it still feels immediate. A local timeout rather than a
 * debounce dependency — this is the whole implementation.
 */
const DEBOUNCE_MS = 180;

/**
 * Search overlay — UI architecture only.
 *
 * PHASE 1 SCOPE. There is no search engine behind this. It deliberately does
 * NOT filter the local data and pretend that is search: a fake result list
 * would set a false expectation of coverage and quality, and would have to be
 * thrown away.
 *
 * What it does provide is the finished shell — trigger, modal, focus
 * management, labelled input, results region with a live-region announcement,
 * and a browse fallback so the overlay is genuinely useful today.
 *
 * SEARCH IS NOW CONNECTED. Results come from `searchAction`, a Server Action
 * wrapping the `server-only` search implementation. What crosses into this
 * component is a query string and at most five finished results per group —
 * never anything it could search itself. The catalogue stays on the server,
 * which is the Phase 2.1A boundary and the reason this is not a client-side
 * filter over a shipped index.
 *
 * The form still submits to `/search` as a real GET. That is deliberate
 * progressive enhancement: with no JavaScript the overlay never opens and the
 * header search link goes to the same page, and with JavaScript pressing Enter
 * navigates to the fuller result list rather than doing nothing.
 *
 * `browse` arrives as a prop. This component used to import the whole catalogue
 * to render the browse fallback, and read `name` and `slug` from about ten
 * records of it — the clearest case in the codebase of a client component
 * pulling far more data than it uses.
 */
export function SearchOverlay({
  onClose,
  browse,
}: {
  onClose: () => void;
  browse: BrowseLists;
}) {
  const [query, setQuery] = useState("");
  /*
   * Results are stored WITH the query they belong to.
   *
   * That pairing is what makes staleness derivable instead of something an
   * effect has to clear: when the input changes, `active` is null on the very
   * next render because the stored query no longer matches, with no extra
   * state write and no frame showing the previous query's results.
   */
  const [result, setResult] = useState<{
    q: string;
    data: SearchResponse | null;
    failed: boolean;
  }>({ q: "", data: null, failed: false });

  const [pending, startTransition] = useTransition();
  const containerRef = useDialog<HTMLDivElement>(true, onClose);
  const router = useRouter();

  /*
   * Guards against a slow response for an earlier query overwriting a newer
   * one. Requests can finish out of order, and without this, deleting
   * characters quickly can leave results for a query that is no longer typed.
   */
  const latest = useRef(0);

  const trimmed = query.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_QUERY;
  const active = result.q === trimmed && trimmed.length >= MIN_QUERY ? result : null;

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;

    const ticket = ++latest.current;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const data = await searchAction(trimmed);
          if (ticket === latest.current) {
            setResult({ q: trimmed, data, failed: false });
          }
        } catch {
          // Never surface the underlying error — it says nothing useful to a
          // visitor and can leak implementation detail.
          if (ticket === latest.current) {
            setResult({ q: trimmed, data: null, failed: true });
          }
        }
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [trimmed]);

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-heading"
    >
      {/* Backdrop. A button so it is dismissible by pointer; hidden from AT
          because Escape and the explicit Close button already cover it. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-green-950/55 backdrop-blur-[2px]"
      />

      {/*
        Arrow keys move focus through the results.
        
        Handled at the panel rather than per-result so the input participates:
        pressing Down from the input steps into the list, and Up from the first
        result returns to it, which is the behaviour people expect from a
        search box. Focus really moves — these are ordinary links — so nothing
        needs `aria-activedescendant`, and Tab, Shift+Tab and Enter keep
        working natively alongside it.
      */}
      <div
        ref={containerRef}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

          const panel = event.currentTarget;
          const input = panel.querySelector<HTMLInputElement>("#site-search");
          const results = Array.from(
            panel.querySelectorAll<HTMLAnchorElement>("[data-search-result]"),
          );
          if (results.length === 0) return;

          // Stops the page scrolling underneath while stepping the list.
          event.preventDefault();

          const active = document.activeElement;
          const index = results.indexOf(active as HTMLAnchorElement);

          if (event.key === "ArrowDown") {
            const next = index < 0 ? 0 : Math.min(index + 1, results.length - 1);
            results[next].focus();
            return;
          }

          // Up from the first result goes back to the input rather than
          // wrapping to the bottom — wrapping in a search list reads as the
          // focus having been lost.
          if (index <= 0) input?.focus();
          else results[index - 1].focus();
        }}
        className="relative mx-auto mt-0 w-full max-w-3xl bg-surface px-5 pb-10 pt-6 shadow-menu sm:mt-[10vh] sm:px-8 sm:pb-12"
      >
        <div className="flex items-start justify-between gap-6">
          <h2 id="search-heading" className="text-h4 font-semibold">
            Search Cerium
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 inline-flex h-10 w-10 items-center justify-center text-text-muted transition-colors hover:text-text"
          >
            <span className="sr-only">Close search</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        </div>

        {/*
          A real GET form pointed at /search. Without JavaScript this is an
          ordinary form submission to a working page; with it, Enter routes to
          the same URL client-side. Either way the destination is shareable.
        */}
        <form
          role="search"
          action="/search"
          method="get"
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed.length < MIN_QUERY) return;
            router.push(`/search?q=${encodeURIComponent(trimmed)}`);
            onClose();
          }}
        >
          <label htmlFor="site-search" className="sr-only">
            Search products, applications and industries
          </label>
          <div className="flex items-center gap-3 border-b-2 border-border-strong pb-3 focus-within:border-primary">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-5 w-5 shrink-0 text-text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m13.5 13.5 4 4" />
            </svg>
            <input
              id="site-search"
              data-autofocus
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, applications, industries…"
              autoComplete="off"
              aria-describedby="search-status"
              className="w-full bg-transparent text-lead outline-none placeholder:text-text-light"
            />
          </div>
        </form>

        <SearchResults
          query={trimmed}
          tooShort={tooShort}
          pending={pending}
          failed={active?.failed ?? false}
          response={active?.data ?? null}
          onNavigate={onClose}
          browse={browse}
        />
      </div>
    </div>
  );
}

/**
 * Results region.
 *
 * Five states, each meaning something different and each said plainly:
 * nothing typed, too short to run, searching, failed, and results (including
 * zero). Collapsing "too short" into "no results" would tell someone their
 * product is missing from the catalogue when they have simply typed one
 * letter.
 *
 * The live region announces the state rather than the result list, so a
 * screen-reader user hears "12 results" instead of having the whole list
 * re-read on every keystroke.
 */
function SearchResults({
  query,
  tooShort,
  pending,
  failed,
  response,
  onNavigate,
  browse,
}: {
  query: string;
  tooShort: boolean;
  pending: boolean;
  failed: boolean;
  response: SearchResponse | null;
  onNavigate: () => void;
  browse: BrowseLists;
}) {
  const hasResults = Boolean(response?.ran && response.total > 0);
  const noResults = Boolean(response?.ran && response.total === 0);

  const status = failed
    ? "Search is temporarily unavailable."
    : tooShort
      ? `Enter at least ${MIN_QUERY} characters.`
      : pending
        ? "Searching…"
        : hasResults
          ? `${response!.total} ${response!.total === 1 ? "result" : "results"}.`
          : noResults
            ? `No results for ${query}.`
            : "Type to search, or browse the categories listed below.";

  return (
    /*
      `-mx-3 px-3` is not decoration — it is what stops this scroll region
      overflowing horizontally.

      Result rows bleed their hover background outward with `-mx-3`. Without
      matching padding here, those 12px sit outside the scroll container's
      content box, which gives the container horizontal scroll: a stray
      scrollbar under the results and a group count clipped to "5 of". Widening
      the container by the same amount lets the rows bleed into padding that
      actually exists. `pr-5` is the second half of the same fix: the vertical
      scrollbar overlays the right edge and the group count sits flush right,
      so with symmetric padding it rendered as "5 of 3" — the total sliced off.
      The extra right padding is that clearance.
    */
    <div className="-mx-3 mt-8 max-h-[60vh] overflow-y-auto overflow-x-hidden pl-3 pr-5 sm:max-h-[55vh]">
      <p id="search-status" role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      {tooShort && (
        <p className="text-small text-text-muted">
          Enter at least {MIN_QUERY} characters.
        </p>
      )}

      {failed && (
        <div className="border border-border bg-background-soft p-4">
          <p className="text-small text-text-muted">
            <span className="font-medium text-text">
              Search is temporarily unavailable.
            </span>{" "}
            Browse the catalogue below, or{" "}
            <Link
              href="/contact"
              onClick={onNavigate}
              className="font-medium text-primary underline underline-offset-4"
            >
              send us an enquiry
            </Link>
            .
          </p>
        </div>
      )}

      {noResults && !failed && (
        <div className="border border-border bg-background-soft p-4">
          <p className="text-small text-text-muted">
            <span className="font-medium text-text">
              No results for “{query}”.
            </span>{" "}
            The catalogue is not exhaustive — try a more general term, browse
            below, or{" "}
            <Link
              href="/contact"
              onClick={onNavigate}
              className="font-medium text-primary underline underline-offset-4"
            >
              ask us directly
            </Link>
            .
          </p>
        </div>
      )}

      {hasResults && !failed && (
        <div
          // Dim rather than blank while a newer query is in flight: replacing
          // results with a spinner makes the overlay flicker on every keystroke.
          className={cn(
            "transition-opacity duration-[var(--duration-fast)]",
            pending ? "opacity-60" : "opacity-100",
          )}
        >
          <SearchResultList
            groups={response!.groups}
            onNavigate={onNavigate}
            compact
          />

          {response!.total > response!.groups.reduce((n, g) => n + g.results.length, 0) && (
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              onClick={onNavigate}
              className="mt-6 inline-flex text-small font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
            >
              See all {response!.total} results
            </Link>
          )}
        </div>
      )}

      {/* Browse fallback — shown only when there is nothing else to show, so it
          never competes with real results for space. */}
      {!hasResults && !noResults && !failed && !tooShort && (
        <div className="grid gap-8 sm:grid-cols-2">
          <BrowseGroup
            title="Product families"
            onNavigate={onNavigate}
            links={browse.families}
          />
          <BrowseGroup
            title="Applications"
            onNavigate={onNavigate}
            links={browse.applications}
          />
        </div>
      )}
    </div>
  );
}

function BrowseGroup({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
  onNavigate: () => void;
}) {
  return (
    <div>
      <h3 className="text-eyebrow font-semibold uppercase text-text-muted">
        {title}
      </h3>
      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "-mx-2 block rounded-xs px-2 py-1.5 text-small text-text",
                "transition-colors hover:bg-primary-soft hover:text-primary",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
