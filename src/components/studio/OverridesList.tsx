"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogueOverrides } from "@/data/overrides";
import { Notice } from "@/components/studio/fields";

/**
 * Everything added through the Studio, with the ability to remove it.
 *
 * Kept visible on the main tab on purpose: Studio content is the only catalogue
 * data that has not been checked against a Cerium document, so it should be easy
 * to see exactly what it is before a deploy.
 */
export function OverridesList({ data }: { data: CatalogueOverrides }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const isEmpty = data.categories.length === 0 && data.products.length === 0;

  async function remove(kind: "category" | "product", slug: string, categorySlug?: string) {
    setBusy(`${kind}:${slug}`);
    setError(null);
    try {
      const params = new URLSearchParams({ kind, slug });
      if (categorySlug) params.set("categorySlug", categorySlug);
      const response = await fetch(`/api/studio/catalogue?${params}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Could not remove.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove.");
    } finally {
      setBusy(null);
    }
  }

  if (isEmpty) {
    return (
      <p className="text-small text-text-muted">
        Nothing has been added through the Studio yet. Everything currently on the
        site comes from the reviewed catalogue in{" "}
        <code className="font-mono text-text">src/data/taxonomy.ts</code>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <Notice tone="error">{error}</Notice>}

      {data.categories.length > 0 && (
        <section>
          <h3 className="text-h4 font-semibold">Ranges added ({data.categories.length})</h3>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {data.categories.map((entry) => (
              <li key={entry.slug} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-body font-medium">{entry.name}</p>
                  <p className="truncate text-caption text-text-muted">
                    /products/{entry.slug}
                    {entry.parentSlug && ` · under ${entry.parentSlug}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === `category:${entry.slug}`}
                  onClick={() => void remove("category", entry.slug)}
                  className="shrink-0 text-small font-medium text-error underline underline-offset-4 disabled:opacity-50"
                >
                  Remove
                  <span className="sr-only"> {entry.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-text-muted">
            Removing a range also removes any products added to it here.
          </p>
        </section>
      )}

      {data.products.length > 0 && (
        <section>
          <h3 className="text-h4 font-semibold">Products added ({data.products.length})</h3>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {data.products.map((entry) => (
              <li
                key={`${entry.categorySlug}-${entry.slug}`}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-body font-medium">{entry.name}</p>
                  <p className="truncate text-caption text-text-muted">
                    in {entry.categorySlug}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === `product:${entry.slug}`}
                  onClick={() => void remove("product", entry.slug, entry.categorySlug)}
                  className="shrink-0 text-small font-medium text-error underline underline-offset-4 disabled:opacity-50"
                >
                  Remove
                  <span className="sr-only"> {entry.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
