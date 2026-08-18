"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

/**
 * Route error boundary.
 *
 * Shows a recoverable state rather than a blank page, and never surfaces the
 * raw error message to the visitor — that can leak internals. `digest` is the
 * server-generated identifier which is safe to display and lets a support
 * request be matched to a specific log entry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced by real error reporting during production hardening (Phase 14).
    console.error(error);
  }, [error]);

  return (
    <Section space="xl">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>Something went wrong</Eyebrow>
          <Heading level={1} size="h1" className="mt-6">
            This page didn&rsquo;t load correctly.
          </Heading>
          <p className="mt-6 text-lead text-text-muted">
            Please try again. If the problem continues, contact us on{" "}
            <a
              href={siteConfig.contact.phoneHref}
              className="text-primary underline underline-offset-4"
            >
              {siteConfig.contact.phoneDisplay}
            </a>{" "}
            and we will help directly.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button href="/" variant="outline">
              Back to homepage
            </Button>
          </div>

          {error.digest && (
            <p className="mt-10 text-caption text-text-muted">
              Reference: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </div>
      </Container>
    </Section>
  );
}
