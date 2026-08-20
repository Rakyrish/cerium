"use client";

import Link from "next/link";
import type { NavItem } from "@/types/content";
import { cn } from "@/lib/cn";

/**
 * Mega-menu panel.
 *
 * Rendered inside the header's relative wrapper and positioned full-width so
 * the panel spans the viewport while its content stays on the page grid.
 *
 * Accessibility notes:
 * - The trigger is a real <button> with aria-expanded/aria-controls (Header).
 * - The panel is not aria-hidden while open, and is unmounted while closed, so
 *   its links never sit in the tab order invisibly.
 * - `onMouseEnter`/`onMouseLeave` are conveniences layered on top of click and
 *   keyboard control, never the only way in.
 */
export function MegaMenu({
  item,
  id,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: {
  item: NavItem;
  id: string;
  onNavigate: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (!item.columns?.length) return null;

  return (
    <div
      id={id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "absolute inset-x-0 top-full z-50",
        "border-t border-border bg-surface shadow-menu",
        "animate-in",
      )}
      style={{
        animation:
          "cerium-menu-in var(--duration-base) var(--ease-out-soft) both",
      }}
    >
      <div className="mx-auto grid w-full max-w-[var(--container-content)] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:gap-16 lg:px-12 xl:px-16">
        <div
          className={cn(
            "grid gap-x-12 gap-y-8",
            item.columns.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1",
          )}
        >
          {item.columns.map((column, columnIndex) => (
            <div key={column.title ?? columnIndex}>
              {column.title && (
                <h3 className="mb-4 text-eyebrow font-semibold uppercase text-text-muted">
                  {/*
                    A heading that names a real page becomes a link to it. The
                    visible label is unchanged, so the column still reads as a
                    grouping rather than turning into another list item — the
                    hover and focus treatment is what marks it as actionable.
                  */}
                  {column.titleHref ? (
                    <Link
                      href={column.titleHref}
                      onClick={onNavigate}
                      className="underline decoration-transparent underline-offset-4 transition-colors hover:text-primary hover:decoration-primary/40"
                    >
                      {column.title}
                    </Link>
                  ) : (
                    column.title
                  )}
                </h3>
              )}
              {/* A long single column flows into two, keeping one heading and
                  one shared baseline rather than splitting into headless
                  columns that no longer line up. */}
              <ul
                className={cn(
                  "space-y-0.5",
                  item.columns!.length === 1 &&
                    column.links.length > 4 &&
                    "sm:grid sm:grid-cols-2 sm:gap-x-10 sm:space-y-0",
                )}
              >
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      onClick={onNavigate}
                      className="group -mx-3 block rounded-sm px-3 py-2.5 transition-colors duration-[var(--duration-fast)] hover:bg-primary-soft"
                    >
                      <span className="block text-nav font-medium text-text transition-colors group-hover:text-primary">
                        {link.label}
                      </span>
                      {link.description && (
                        <span className="mt-0.5 block max-w-[46ch] text-caption text-text-muted">
                          {link.description}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {item.feature && (
          <aside className="lg:w-[300px] lg:border-l lg:border-border lg:pl-12">
            <p className="text-eyebrow font-semibold uppercase text-primary">
              {item.feature.eyebrow}
            </p>
            <p className="mt-3 text-h4 font-medium text-text">
              {item.feature.title}
            </p>
            <p className="mt-2 text-small text-text-muted">{item.feature.body}</p>
            <Link
              href={item.feature.href}
              onClick={onNavigate}
              className="mt-5 inline-flex items-center gap-2 text-small font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
            >
              {item.feature.linkLabel}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
              </svg>
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}
