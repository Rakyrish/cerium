import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingSize = "display" | "h1" | "h2" | "h3" | "h4";

const sizes: Record<HeadingSize, string> = {
  display: "text-display font-display font-normal",
  h1: "text-h1 font-display font-normal",
  h2: "text-h2 font-display font-normal",
  // h3/h4 return to the sans face — the serif is reserved for major statements
  h3: "text-h3 font-sans font-medium",
  h4: "text-h4 font-sans font-semibold",
};

interface HeadingProps {
  children: ReactNode;
  /**
   * Semantic level. Chosen for document outline, NOT for appearance.
   * Every page has exactly one `level={1}`.
   */
  level: HeadingLevel;
  /** Visual size, independent of level, so hierarchy is never faked by tag. */
  size?: HeadingSize;
  id?: string;
  /** Renders the trailing word(s) in the accent green. */
  className?: string;
}

/**
 * Heading primitive.
 *
 * Separating `level` from `size` is the whole point: it lets a section use a
 * visually large `h2` without ever skipping heading levels, which keeps the
 * document outline correct for assistive tech and for search engines.
 */
export function Heading({
  children,
  level,
  size,
  id,
  className,
}: HeadingProps) {
  const Tag = `h${level}` as const;
  const resolved: HeadingSize =
    size ?? (["display", "h1", "h2", "h3", "h4", "h4"][level - 1] as HeadingSize);

  return (
    <Tag id={id} className={cn(sizes[resolved], "text-balance", className)}>
      {children}
    </Tag>
  );
}

/**
 * The small uppercase label that opens most sections.
 *
 * Rendered as a `<p>`, not a heading: it is a label, and promoting it to a
 * heading would corrupt the outline. Letter-spaced uppercase is hard to read at
 * length, so it is kept to two or three words.
 */
export function Eyebrow({
  children,
  className,
  tone = "primary",
}: {
  children: ReactNode;
  className?: string;
  tone?: "primary" | "light" | "muted";
}) {
  const tones = {
    primary: "text-primary",
    light: "text-primary-light",
    muted: "text-text-muted",
  } as const;

  return (
    <p
      className={cn(
        "flex items-center gap-3 text-eyebrow font-semibold uppercase",
        tones[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="animate-rule h-px w-8 bg-current opacity-60"
      />
      {children}
    </p>
  );
}
