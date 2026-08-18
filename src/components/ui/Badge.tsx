import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "primary" | "secondary" | "outline" | "inverse";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-text-muted",
  primary: "bg-primary-soft text-green-700",
  secondary: "bg-secondary-soft text-secondary-dark",
  outline: "border border-border text-text-muted",
  inverse: "bg-white/10 text-white",
};

/**
 * Small metadata label.
 *
 * Never the sole carrier of meaning — badges here restate information that is
 * also available as text, so colour is never doing the work alone.
 */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2 py-1 text-caption font-medium leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
