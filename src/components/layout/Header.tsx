"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import type { BrowseLists, NavItem } from "@/types/content";
import { cn } from "@/lib/cn";

/** Delay before a hovered menu closes, so diagonal mouse travel is forgiving. */
const CLOSE_DELAY = 140;

/**
 * Site header.
 *
 * Client because of interaction state (which menu is open, scroll position) —
 * NOT because it needs data at runtime. `navigation` and `browse` are resolved
 * on the server and passed in, which is what keeps the catalogue out of the
 * client bundle: this component used to import `primaryNavigation`, and through
 * it the entire taxonomy, to render a dozen links.
 */
export function Header({
  navigation,
  browse,
}: {
  navigation: NavItem[];
  browse: BrowseLists;
}) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const headerRef = useRef<HTMLElement>(null);

  /* --- Scroll-aware chrome ------------------------------------------------ */
  // The header stays put; only its weight changes. Hiding navigation on scroll
  // saves a few pixels and costs the visitor their way around, so it does not.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* --- Close menus on navigation ------------------------------------------ */
  // Adjusted during render rather than in an effect. React re-runs this
  // component immediately without committing the intermediate state, so the
  // menus never flash open on the new route — which is exactly what an effect
  // would allow. See "You Might Not Need an Effect".
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenMenu(null);
    setMobileOpen(false);
    setSearchOpen(false);
  }

  /* --- Dismissal ---------------------------------------------------------- */
  const closeMenu = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu(null);
  }, []);

  useEffect(() => {
    if (!openMenu) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
        // Return focus to the trigger so keyboard context is not lost.
        headerRef.current
          ?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${openMenu}"]`)
          ?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) closeMenu();
    }

    // Any focus leaving the header closes the panel — covers Tab-out.
    function onFocusIn(event: FocusEvent) {
      if (!headerRef.current?.contains(event.target as Node)) closeMenu();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [openMenu, closeMenu]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const openWithHover = (label: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu(label);
  };

  const closeWithDelay = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), CLOSE_DELAY);
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Skip link — first focusable element on every page. */}
      <a
        href="#main"
        className={cn(
          "sr-only focus:not-sr-only",
          "focus:fixed focus:left-4 focus:top-4 focus:z-[100]",
          "focus:rounded-sm focus:bg-primary focus:px-4 focus:py-3",
          "focus:text-small focus:font-medium focus:text-white",
        )}
      >
        Skip to main content
      </a>

      <header
        ref={headerRef}
        onMouseLeave={closeWithDelay}
        className={cn(
          "sticky top-0 z-50 bg-surface",
          "transition-shadow duration-[var(--duration-base)]",
          scrolled ? "border-b border-border shadow-subtle" : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-[var(--spacing-header)] w-full max-w-[var(--container-content)] items-center gap-6 px-5 sm:px-8 lg:px-12 xl:px-16">
          <Logo isHome={pathname === "/"} />

          {/* --- Desktop navigation --- */}
          <nav
            aria-label="Main"
            className="ml-auto hidden items-center gap-1 lg:flex"
          >
            {navigation.map((item) => {
              const hasMenu = Boolean(item.columns?.length);
              const menuId = `megamenu-${item.label.toLowerCase()}`;
              const expanded = openMenu === item.label;

              if (!hasMenu) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "relative px-3.5 py-2 text-nav font-medium transition-colors duration-[var(--duration-fast)]",
                      isActive(item.href)
                        ? "text-primary"
                        : "text-text hover:text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <div
                  key={item.label}
                  onMouseEnter={() => openWithHover(item.label)}
                >
                  <button
                    type="button"
                    data-menu-trigger={item.label}
                    aria-expanded={expanded}
                    aria-controls={menuId}
                    onClick={() => setOpenMenu(expanded ? null : item.label)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setOpenMenu(item.label);
                      }
                    }}
                    className={cn(
                      "group inline-flex items-center gap-1.5 px-3.5 py-2 text-nav font-medium",
                      "transition-colors duration-[var(--duration-fast)]",
                      expanded || isActive(item.href)
                        ? "text-primary"
                        : "text-text hover:text-primary",
                    )}
                  >
                    {item.label}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 12 12"
                      className={cn(
                        "h-2.5 w-2.5 transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
                        expanded && "rotate-180",
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

                  {expanded && (
                    <MegaMenu
                      item={item}
                      id={menuId}
                      onNavigate={closeMenu}
                      onMouseEnter={() => openWithHover(item.label)}
                      onMouseLeave={closeWithDelay}
                    />
                  )}
                </div>
              );
            })}
          </nav>

          {/* --- Actions --- */}
          <div className="ml-auto flex items-center gap-1 lg:ml-4 lg:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex h-10 w-10 items-center justify-center text-text transition-colors hover:text-primary"
            >
              <span className="sr-only">Open search</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="m13.5 13.5 4 4" />
              </svg>
            </button>

            <Link
              href="/contact"
              className={cn(
                "hidden h-10 items-center rounded-sm bg-primary px-5 text-button font-medium text-white",
                "transition-colors duration-[var(--duration-fast)] hover:bg-green-700 sm:inline-flex",
              )}
            >
              Make an enquiry
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
              className="-mr-2 inline-flex h-10 w-10 items-center justify-center text-text transition-colors hover:text-primary lg:hidden"
            >
              <span className="sr-only">Open menu</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              >
                <path d="M3 6h14M3 10h14M3 14h14" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileNavigation
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navigation={navigation}
      />
      {/* Mounted only while open, so closing discards the query and results
          instead of the overlay having to reset itself — and reopening always
          starts clean. */}
      {searchOpen && (
        <SearchOverlay onClose={() => setSearchOpen(false)} browse={browse} />
      )}
    </>
  );
}
