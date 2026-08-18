"use client";

import { useState } from "react";
import Link from "next/link";
import { useDialog } from "@/hooks/useDialog";
import { primaryNavigation } from "@/data/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

/**
 * Mobile navigation drawer.
 *
 * Designed for touch rather than derived from the desktop bar:
 * - Sections expand in place; nothing hides behind a hover state.
 * - Every target is at least 48px tall.
 * - The primary action and the direct-contact details sit at the bottom, in
 *   thumb reach, because on a phone "call them" is often the actual intent.
 * - The panel scrolls independently while the page behind it is locked.
 */
export function MobileNavigation({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const containerRef = useDialog<HTMLDivElement>(open, onClose);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-green-950/55"
      />

      <div
        ref={containerRef}
        className="absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col bg-surface shadow-menu"
        style={{
          animation:
            "cerium-drawer-in var(--duration-base) var(--ease-out-soft) both",
        }}
      >
        {/* Header row */}
        <div className="flex h-[var(--spacing-header)] shrink-0 items-center justify-between border-b border-border px-5">
          <span className="text-eyebrow font-semibold uppercase text-text-muted">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center text-text-muted transition-colors hover:text-text"
          >
            <span className="sr-only">Close menu</span>
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

        {/* Scrollable body */}
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto overscroll-contain">
          <ul className="divide-y divide-border">
            {primaryNavigation.map((item) => {
              const hasChildren = Boolean(item.columns?.length);
              const isOpen = expanded === item.label;
              const panelId = `mobile-panel-${item.label.toLowerCase()}`;

              if (!hasChildren) {
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex min-h-[56px] items-center px-5 text-lead font-medium text-text"
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.label}>
                  <div className="flex items-stretch">
                    {/* Split control: tapping the label navigates to the
                        overview page, the chevron expands the section. Merging
                        both into one control forces a choice the visitor
                        should not have to make. */}
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex min-h-[56px] flex-1 items-center px-5 text-lead font-medium text-text"
                    >
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setExpanded(isOpen ? null : item.label)}
                      className="inline-flex w-14 shrink-0 items-center justify-center border-l border-border text-text-muted"
                    >
                      <span className="sr-only">
                        {isOpen ? "Collapse" : "Expand"} {item.label}
                      </span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 12 12"
                        className={cn(
                          "h-3 w-3 transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
                          isOpen && "rotate-180",
                        )}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
                      </svg>
                    </button>
                  </div>

                  {isOpen && (
                    <div id={panelId} className="bg-background-soft pb-2">
                      {item.columns!.map((column, columnIndex) => (
                        <div key={column.title ?? columnIndex} className="pt-3">
                          {column.title && (
                            <h3 className="px-5 pb-1 text-eyebrow font-semibold uppercase text-text-muted">
                              {column.title}
                            </h3>
                          )}
                          <ul>
                            {column.links.map((link) => (
                              <li key={link.href + link.label}>
                                <Link
                                  href={link.href}
                                  onClick={onClose}
                                  className="flex min-h-[48px] items-center px-5 text-body text-text-muted transition-colors active:text-primary"
                                >
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Persistent footer — primary action plus direct contact */}
        <div className="shrink-0 border-t border-border bg-surface p-5">
          <Link
            href="/contact"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-sm bg-primary text-button font-medium text-white"
          >
            Make an enquiry
          </Link>
          <div className="mt-4 flex flex-col gap-1">
            <a
              href={siteConfig.contact.phoneHref}
              className="flex min-h-[44px] items-center gap-2.5 text-small text-text-muted"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 3h3l1.5 4-2 1.5a11 11 0 0 0 5 5L13 11l4 1.5V16a1 1 0 0 1-1.1 1A14 14 0 0 1 3 4.1 1 1 0 0 1 4 3Z" />
              </svg>
              {siteConfig.contact.phoneDisplay}
            </a>
            <a
              href={siteConfig.contact.emailHref}
              className="flex min-h-[44px] items-center gap-2.5 text-small text-text-muted"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
                <path d="m3 5.5 7 5 7-5" />
              </svg>
              {siteConfig.contact.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
