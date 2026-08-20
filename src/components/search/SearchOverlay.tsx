"use client";

import { useState } from "react";
import Link from "next/link";
import { useDialog } from "@/hooks/useDialog";
import type { BrowseLists } from "@/types/content";
import { cn } from "@/lib/cn";

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
 * PHASE 4 connects `onSubmit` to the Django/PostgreSQL search endpoint. The
 * result list will render into `<SearchResults>` below; nothing else changes.
 *
 * `browse` arrives as a prop. This component used to import the whole catalogue
 * to render the browse fallback, and read `name` and `slug` from about ten
 * records of it — the clearest case in the codebase of a client component
 * pulling far more data than it uses.
 */
export function SearchOverlay({
  open,
  onClose,
  browse,
}: {
  open: boolean;
  onClose: () => void;
  browse: BrowseLists;
}) {
  const [query, setQuery] = useState("");
  const containerRef = useDialog<HTMLDivElement>(open, onClose);

  if (!open) return null;

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

      <div
        ref={containerRef}
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

        <form
          role="search"
          className="mt-5"
          onSubmit={(event) => {
            // No endpoint yet — submitting must not navigate nowhere.
            event.preventDefault();
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, applications, industries…"
              autoComplete="off"
              aria-describedby="search-status"
              className="w-full bg-transparent text-lead outline-none placeholder:text-text-light"
            />
          </div>
        </form>

        <SearchResults query={query} onNavigate={onClose} browse={browse} />
      </div>
    </div>
  );
}

/**
 * Results region.
 *
 * Until the search backend exists this states plainly that search is not yet
 * connected and offers real navigation instead. The `aria-live` region means a
 * screen-reader user is told the state rather than left with a silent input.
 */
function SearchResults({
  query,
  onNavigate,
  browse,
}: {
  query: string;
  onNavigate: () => void;
  browse: BrowseLists;
}) {
  const hasQuery = query.trim().length > 0;

  return (
    <div className="mt-8">
      <p id="search-status" role="status" aria-live="polite" className="sr-only">
        {hasQuery
          ? "Search is not yet connected. Browse the categories listed below."
          : "Type to search, or browse the categories listed below."}
      </p>

      {hasQuery && (
        <div className="mb-8 border border-border bg-background-soft p-4">
          <p className="text-small text-text-muted">
            <span className="font-medium text-text">
              Search is not connected yet.
            </span>{" "}
            The full product search is in development. In the meantime, browse
            the catalogue below or{" "}
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
