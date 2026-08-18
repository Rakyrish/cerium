import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { StudioTabs } from "@/components/studio/StudioTabs";
import { isStudioEnabled } from "@/lib/studio-guard";

export const metadata: Metadata = {
  title: "Content Studio",
  // Belt and braces — the route 404s in production, but if it were ever
  // reachable it must never be indexed.
  robots: { index: false, follow: false },
};

/**
 * Content Studio shell.
 *
 * A local authoring tool for adding ranges, products and images without hand
 * editing TypeScript. Development only: in production this 404s before any
 * child renders.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  if (!isStudioEnabled) notFound();

  return (
    <div className="min-h-screen bg-background-soft">
      <div className="border-b border-border bg-surface">
        <Container>
          <div className="flex flex-col gap-1 pb-6 pt-10">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h3 font-semibold">Content Studio</h1>
              <span className="rounded-xs bg-warning/10 px-2 py-1 text-caption font-medium leading-none text-warning">
                Development only
              </span>
            </div>
            <p className="max-w-[70ch] text-small text-text-muted">
              Additions are written to{" "}
              <code className="font-mono text-text">
                src/data/catalogue.overrides.json
              </code>{" "}
              and images to{" "}
              <code className="font-mono text-text">public/images/</code>. Commit
              and deploy to publish them — this does not edit the live site.
            </p>
          </div>
          <StudioTabs />
        </Container>
      </div>

      <Container>
        <div className="py-10">{children}</div>
      </Container>
    </div>
  );
}
