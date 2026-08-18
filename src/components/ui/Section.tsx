import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionTone = "default" | "soft" | "sunken" | "dark" | "primary";
type SectionSpace = "sm" | "md" | "lg" | "xl" | "none";

const tones: Record<SectionTone, string> = {
  default: "bg-background text-text",
  soft: "bg-background-soft text-text",
  sunken: "bg-surface-sunken text-text",
  /** `on-dark` re-targets the focus ring so it stays visible. */
  dark: "on-dark bg-green-950 text-text-inverse",
  primary: "on-dark bg-green-900 text-text-inverse",
};

const spaces: Record<SectionSpace, string> = {
  none: "",
  sm: "py-14 md:py-16",
  md: "py-16 md:py-24",
  lg: "py-20 md:py-28 lg:py-32",
  xl: "py-24 md:py-32 lg:py-40",
};

interface SectionProps {
  children: ReactNode;
  /**
   * Landmark element. Defaults to `section`. Only pass an id when the section
   * is a link target — an id alone does not make it a landmark.
   */
  as?: "section" | "div" | "article" | "aside";
  id?: string;
  tone?: SectionTone;
  space?: SectionSpace;
  /** Accessible name for the section landmark. Strongly recommended. */
  ariaLabelledBy?: string;
  className?: string;
}

/**
 * Vertical rhythm primitive.
 *
 * Every page section goes through this so spacing and surface tone stay
 * consistent, and so section landmarks are labelled for screen readers.
 */
export function Section({
  children,
  as: Tag = "section",
  id,
  tone = "default",
  space = "lg",
  ariaLabelledBy,
  className,
}: SectionProps) {
  return (
    <Tag
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn("relative", tones[tone], spaces[space], className)}
    >
      {children}
    </Tag>
  );
}
