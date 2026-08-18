import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "inverse";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2.5 " +
  "text-button font-medium rounded-sm " +
  "transition-[background-color,color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  // Motion is a nicety; the colour change is what actually communicates state.
  "active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-green-700",
  secondary: "bg-green-950 text-white hover:bg-green-900",
  outline:
    "border border-border-strong text-text hover:border-primary hover:text-primary",
  ghost: "text-primary hover:bg-primary-soft",
  inverse: "bg-white text-green-950 hover:bg-green-50",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-small",
  md: "h-11 px-6",
  lg: "h-13 px-8",
};

interface CommonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Trailing arrow that nudges on hover. Purely decorative. */
  withArrow?: boolean;
  className?: string;
}

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<"button">, keyof CommonProps> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, keyof CommonProps | "href"> & {
    href: string;
  };

/**
 * Button / link.
 *
 * Renders a real `<a>` when `href` is given and a real `<button>` otherwise —
 * never a div with a click handler. That is what makes it keyboard-operable and
 * announced correctly without any ARIA.
 */
export function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    children,
    variant = "primary",
    size = "md",
    withArrow = false,
    className,
    ...rest
  } = props;

  const classes = cn(base, variants[variant], sizes[size], className);
  const content = (
    <>
      {children}
      {withArrow && <Arrow />}
    </>
  );

  if (typeof rest.href === "string") {
    const { href, ...linkProps } = rest as ButtonAsLink;
    const isExternal = /^(https?:|mailto:|tel:)/.test(href);

    if (isExternal) {
      return (
        <a href={href} className={classes} {...(linkProps as ComponentProps<"a">)}>
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...linkProps}>
        {content}
      </Link>
    );
  }

  const { ...buttonProps } = rest as ButtonAsButton;
  return (
    <button className={classes} {...buttonProps}>
      {content}
    </button>
  );
}

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] group-hover/btn:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

/**
 * Text link with an underline that draws in on hover.
 *
 * The underline is always present at rest (thin, low contrast) so the link is
 * identifiable without relying on colour alone.
 */
export function TextLink({
  href,
  children,
  tone = "default",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: "default" | "inverse";
  className?: string;
}) {
  const tones = {
    default: "text-primary decoration-primary/30 hover:decoration-primary",
    inverse:
      "text-primary-light decoration-primary-light/40 hover:decoration-primary-light",
  } as const;

  return (
    <Link
      href={href}
      className={cn(
        "group/link inline-flex items-center gap-2 font-medium underline underline-offset-[6px] decoration-1",
        "transition-colors duration-[var(--duration-fast)]",
        tones[tone],
        className,
      )}
    >
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3 w-3 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] group-hover/link:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
      </svg>
    </Link>
  );
}
