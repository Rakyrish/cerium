import Link from "next/link";
import type { Application, Industry } from "@/types/content";
import { CeriumImage } from "@/components/ui/CeriumImage";
import { cn } from "@/lib/cn";

/**
 * Application card — an overlay tile.
 *
 * Text sits on the image, so a fixed dark scrim is applied rather than relying
 * on the photograph being dark enough. Without it, contrast would depend on
 * whatever image is eventually uploaded.
 */
export function ApplicationCard({
  application,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  className,
}: {
  application: Application;
  sizes?: string;
  className?: string;
}) {
  return (
    <article className={cn("group relative isolate overflow-hidden", className)}>
      <Link href={`/applications/${application.slug}`} className="block">
        <CeriumImage
          image={application.image}
          alt=""
          ratio="portrait"
          sizes={sizes}
          zoomOnHover
          placeholderLabel={`${application.name} application image`}
        />

        {/* Scrim guarantees legibility regardless of the final photograph. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-green-950/85 via-green-950/35 to-green-950/5 transition-opacity duration-[var(--duration-base)] group-hover:from-green-950/90"
        />

        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="text-h4 font-medium text-white">{application.name}</h3>
          {application.description && (
            <p className="mt-2 max-w-[38ch] text-small text-white/80">
              {application.description}
            </p>
          )}
          <span
            aria-hidden="true"
            className="mt-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-white transition-[background-color,border-color] duration-[var(--duration-base)] group-hover:border-white group-hover:bg-white group-hover:text-green-950"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
            </svg>
          </span>
        </div>
      </Link>
    </article>
  );
}

/**
 * Industry card.
 *
 * A wide split panel rather than another image tile — industries are a
 * different kind of entity from applications and should not look identical.
 */
export function IndustryCard({
  industry,
  applications = [],
  className,
}: {
  industry: Industry;
  applications?: Application[];
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group grid gap-0 border border-border bg-surface md:grid-cols-2",
        "transition-colors duration-[var(--duration-base)] hover:border-green-300",
        className,
      )}
    >
      <CeriumImage
        image={industry.image}
        alt=""
        ratio="landscape"
        sizes="(min-width: 768px) 50vw, 100vw"
        zoomOnHover
        placeholderLabel={`${industry.name} industry image`}
        className="h-full"
      />

      <div className="flex flex-col justify-center p-7 lg:p-10">
        <h3 className="text-h3 font-sans font-medium text-text">
          <Link
            href={`/industries/${industry.slug}`}
            className="transition-colors duration-[var(--duration-fast)] hover:text-primary"
          >
            {industry.name}
          </Link>
        </h3>

        {industry.description && (
          <p className="mt-3 max-w-[48ch] text-body text-text-muted">
            {industry.description}
          </p>
        )}

        {applications.length > 0 && (
          <div className="mt-6">
            <h4 className="text-eyebrow font-semibold uppercase text-text-muted">
              Applications
            </h4>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {applications.map((application) => (
                <li key={application.slug}>
                  <Link
                    href={`/applications/${application.slug}`}
                    className="text-small font-medium text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
                  >
                    {application.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
