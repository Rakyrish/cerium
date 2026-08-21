import Link from "next/link";
import type { SearchGroup } from "@/lib/search";
import { cn } from "@/lib/cn";

/**
 * Grouped search results.
 *
 * Shared by the `/search` page and the header overlay, so a result looks and
 * reads identically in both. It takes finished `SearchGroup` objects and knows
 * nothing about the catalogue — which is what lets a client component render
 * it without pulling the data layer across the boundary.
 *
 * It is NOT a client component: it has no state and no handlers. The overlay
 * imports it and passes an `onNavigate` callback, which makes it a client
 * component only in that tree. Rendered from the server page it stays server
 * markup with zero JavaScript.
 */
export function SearchResultList({
  groups,
  onNavigate,
  compact = false,
}: {
  groups: SearchGroup[];
  /** Overlay only — closes the modal when a result is followed. */
  onNavigate?: () => void;
  /** Denser rows for the overlay, where vertical space is scarce. */
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-6" : "gap-12")}>
      {groups.map((group) => (
        <section key={group.type} aria-labelledby={`group-${group.type}`}>
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <h3
              id={`group-${group.type}`}
              className="text-eyebrow font-semibold uppercase tracking-wide text-text-muted"
            >
              {group.label}
            </h3>
            {/*
              The true match count, not the number shown. Saying "5" when 19
              matched would misrepresent the catalogue's coverage — and the
              count is what tells someone whether it is worth opening the full
              results page.
            */}
            {group.total > group.results.length && (
              <span className="shrink-0 text-caption text-text-muted">
                {group.results.length} of {group.total}
              </span>
            )}
          </div>

          <ul className={cn("mt-2", compact ? "" : "mt-3")}>
            {group.results.map((result) => (
              <li key={`${result.type}-${result.href}`}>
                <Link
                  href={result.href}
                  onClick={onNavigate}
                  // Marks the roving set for arrow-key navigation in the
                  // overlay. Harmless on the search page, which has none.
                  data-search-result=""
                  className={cn(
                    "group/result -mx-3 block rounded-xs px-3 transition-colors",
                    "hover:bg-primary-soft focus-visible:bg-primary-soft",
                    compact ? "py-2.5" : "py-3.5",
                  )}
                >
                  <span
                    className={cn(
                      "block font-medium text-text transition-colors group-hover/result:text-primary",
                      compact ? "text-small" : "text-body",
                    )}
                  >
                    {result.title}
                  </span>

                  {/*
                    Context and summary are separate lines rather than one
                    concatenated string, so a screen reader gets the range name
                    as its own phrase instead of running it into the copy.
                  */}
                  {result.context && (
                    <span className="mt-0.5 block text-caption text-text-muted">
                      {result.context}
                    </span>
                  )}
                  {result.summary && !compact && (
                    <span className="mt-1 block max-w-[70ch] text-small text-text-muted">
                      {result.summary}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
