"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Modal surface behaviour: focus trap, Escape to close, scroll lock, and focus
 * restoration to the trigger on close.
 *
 * Shared by the search overlay and the mobile navigation drawer so both behave
 * identically — a keyboard user should not have to learn two sets of rules.
 *
 * Implemented directly rather than pulled from a dependency: this is the whole
 * behaviour, and a focus-management library would be far more code than the
 * project needs.
 */
export function useDialog<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Lock scroll without layout shift from the disappearing scrollbar.
    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    // Move focus into the dialog so the next Tab starts inside it.
    const container = containerRef.current;
    const focusFirst = window.setTimeout(() => {
      const target =
        container?.querySelector<HTMLElement>("[data-autofocus]") ??
        container?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 20);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap focus at both ends so Tab can never escape the dialog.
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusFirst);
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      // Return focus to whatever opened the dialog.
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  return containerRef;
}
