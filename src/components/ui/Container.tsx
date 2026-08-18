import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerWidth = "content" | "narrow" | "wide" | "full";

const widths: Record<ContainerWidth, string> = {
  /** Default page measure. */
  content: "max-w-[var(--container-content)]",
  /** Long-form reading measure — keeps line length comfortable. */
  narrow: "max-w-[var(--container-narrow)]",
  /** Editorial full-bleed-ish, still inset from the viewport edge. */
  wide: "max-w-[1600px]",
  /** No measure, gutters only. For horizontally scrolling rails. */
  full: "max-w-none",
};

interface ContainerProps {
  children: ReactNode;
  as?: ElementType;
  width?: ContainerWidth;
  /** Drop horizontal padding — for rails that must bleed to the edge. */
  bleed?: boolean;
  className?: string;
}

/**
 * The single source of horizontal rhythm.
 *
 * Gutters scale with the viewport rather than snapping at breakpoints, which
 * keeps the large-desktop layout from looking cramped against the edge.
 */
export function Container({
  children,
  as: Tag = "div",
  width = "content",
  bleed = false,
  className,
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full",
        widths[width],
        !bleed && "px-5 sm:px-8 lg:px-12 xl:px-16",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
