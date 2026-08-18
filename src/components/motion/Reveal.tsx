"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

/**
 * Shared IntersectionObserver.
 *
 * One observer for every Reveal on the page rather than one per element. With
 * dozens of revealed elements that is the difference between a single
 * observer callback and dozens competing during scroll.
 */
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return null;
  }

  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealed = "true";
        // Reveal is a one-shot effect — never re-hide content on scroll back.
        observer?.unobserve(entry.target);
      }
    },
    {
      // Trigger slightly before the element reaches the viewport so the
      // animation is already settling by the time it is properly in view.
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.01,
    },
  );

  return observer;
}

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  /** Stagger, in ms. Keep cumulative delay under ~250ms or it reads as lag. */
  delay?: number;
  /** Travel distance in px. Small values look considered; large ones look cheap. */
  distance?: number;
  className?: string;
}

/**
 * Fade-and-rise reveal.
 *
 * The animation itself lives in CSS (`[data-reveal]` in globals.css); this
 * component only flips the `data-revealed` attribute. That keeps the JS
 * footprint to one observer and means `prefers-reduced-motion` is honoured by
 * the stylesheet, not by a runtime check that could be missed.
 *
 * Content is never hidden permanently: if JS fails, the `.no-js` rule and the
 * reduced-motion block both force the final visible state.
 */
export function Reveal({
  children,
  as = "div",
  delay = 0,
  distance = 18,
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const io = getObserver();
    if (!io) {
      // No observer support — show immediately rather than leave it hidden.
      node.dataset.revealed = "true";
      return;
    }

    // Already in view on mount (above the fold): reveal without waiting.
    io.observe(node);

    return () => io.unobserve(node);
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={cn(className)}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-y": `${distance}px`,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
