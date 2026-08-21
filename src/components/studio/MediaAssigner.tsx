"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoredImage } from "@/lib/studio-images";
import { Notice } from "@/components/studio/fields";
import { cn } from "@/lib/cn";

/**
 * Assign images to things.
 *
 * ---------------------------------------------------------------------------
 * WHAT CROSSES THE SERVER/CLIENT BOUNDARY
 * ---------------------------------------------------------------------------
 * Only what a picker needs: a slug, a display label, and the currently assigned
 * image. No benefit copy, no `source`, no formats — none of the catalogue
 * record. The Studio is development-only and exempt from the data-layer rule
 * either way, but sending the whole tree into a client component when three
 * fields will do would set the wrong precedent for the Django migration, where
 * this list becomes a paginated query rather than a prop.
 */

export type AssignScope = "site" | "category" | "product";

export interface AssignTarget {
  /** Site slot name, or the category/product slug. */
  key: string;
  label: string;
  /** Range name for a product, parent family for a category. Disambiguates. */
  context?: string;
  /** Guidance for a site slot — what the shot is meant to be. */
  hint?: string;
  assigned?: { src: string; alt: string };
}

interface Props {
  library: StoredImage[];
  site: AssignTarget[];
  categories: AssignTarget[];
  products: AssignTarget[];
}

const SCOPES: Array<{ id: AssignScope; label: string; blurb: string }> = [
  {
    id: "site",
    label: "Site images",
    blurb:
      "Editorial photography for fixed positions in the layout — the homepage hero and the two company portraits. These belong to the website, not to any product.",
  },
  {
    id: "product",
    label: "Product images",
    blurb:
      "A photograph of the material itself, shown on that product's own page and on its card in every listing. Attaches to one product.",
  },
  {
    id: "category",
    label: "Range images",
    blurb:
      "The image that represents a whole range on category cards and range pages.",
  },
];

export function MediaAssigner({ library, site, categories, products }: Props) {
  const router = useRouter();
  const [scope, setScope] = useState<AssignScope>("site");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targets = scope === "site" ? site : scope === "product" ? products : categories;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        (t.context ?? "").toLowerCase().includes(q),
    );
  }, [targets, query]);

  const assignedCount = targets.filter((t) => t.assigned).length;

  async function assign(
    target: AssignTarget,
    src: string,
    alt: string,
    decorative: boolean,
  ) {
    setBusy(target.key);
    setError(null);
    try {
      const response = await fetch("/api/studio/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: scope === "category" ? "category" : scope,
          key: target.key,
          src,
          alt,
          decorative,
        }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not save.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  async function clear(target: AssignTarget) {
    setBusy(target.key);
    setError(null);
    try {
      const response = await fetch(
        `/api/studio/media?scope=${scope}&key=${encodeURIComponent(target.key)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Could not remove.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove.");
    } finally {
      setBusy(null);
    }
  }

  if (library.length === 0) {
    // Not an error state — it is the expected starting point, so it is not
    // dressed as a failure.
    return (
      <p className="rounded-sm border border-border bg-surface-sunken px-4 py-3 text-small text-text-muted">
        No images have been uploaded yet. Add some on the Images tab first —
        there is nothing to assign until then.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Scope switch. Real buttons in a labelled group. */}
      <div>
        <div role="group" aria-label="What to assign images to" className="flex flex-wrap gap-1">
          {SCOPES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={scope === item.id}
              onClick={() => {
                setScope(item.id);
                setQuery("");
              }}
              className={cn(
                "inline-flex h-10 items-center rounded-sm border px-4 text-small font-medium transition-colors",
                scope === item.id
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-text-muted hover:border-border-strong hover:text-text",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 max-w-[72ch] text-small text-text-muted">
          {SCOPES.find((s) => s.id === scope)?.blurb}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
        <p className="text-caption text-text-muted">
          {assignedCount} of {targets.length} have an image
        </p>
        {targets.length > 12 && (
          <div className="flex items-center gap-2">
            <label htmlFor="media-filter" className="text-caption text-text-muted">
              Filter
            </label>
            <input
              id="media-filter"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or range…"
              className="h-9 w-56 rounded-sm border border-border bg-surface px-3 text-small"
            />
          </div>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {filtered.length === 0 ? (
        <p className="text-small text-text-muted">Nothing matches “{query}”.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((target) => (
            <AssignRow
              key={target.key}
              target={target}
              library={library}
              busy={busy === target.key}
              onAssign={assign}
              onClear={clear}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AssignRow({
  target,
  library,
  busy,
  onAssign,
  onClear,
}: {
  target: AssignTarget;
  library: StoredImage[];
  busy: boolean;
  onAssign: (
    t: AssignTarget,
    src: string,
    alt: string,
    decorative: boolean,
  ) => Promise<void>;
  onClear: (t: AssignTarget) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState(target.assigned?.src ?? "");
  const [alt, setAlt] = useState(target.assigned?.alt ?? "");
  const [decorative, setDecorative] = useState(target.assigned?.alt === "");

  const rowId = `assign-${target.key}`;

  return (
    <li className="rounded-sm border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-4 p-4">
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xs border border-border bg-surface-sunken">
          {target.assigned ? (
            /* Local library preview inside a development-only tool — the
               Next optimizer is not wanted for arbitrary local files. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={target.assigned.src}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-caption text-text-light">
              None
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-small font-medium text-text">{target.label}</p>
          {target.context && (
            <p className="truncate text-caption text-text-muted">{target.context}</p>
          )}
          {!target.assigned && target.hint && (
            <p className="mt-0.5 truncate text-caption text-text-light">
              {target.hint}
            </p>
          )}
          {target.assigned && (
            <p className="mt-0.5 truncate text-caption text-text-muted">
              {target.assigned.alt === "" ? (
                <span className="italic">Marked decorative</span>
              ) : (
                target.assigned.alt
              )}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={rowId}
            onClick={() => setOpen((v) => !v)}
            className="text-small font-medium text-primary underline underline-offset-4"
          >
            {target.assigned ? "Change" : "Assign"}
            <span className="sr-only"> image for {target.label}</span>
          </button>
          {target.assigned && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onClear(target)}
              className="text-small text-text-muted underline underline-offset-4 hover:text-error disabled:opacity-50"
            >
              Remove
              <span className="sr-only"> image from {target.label}</span>
            </button>
          )}
        </div>
      </div>

      {open && (
        <div id={rowId} className="border-t border-border p-4">
          <fieldset>
            <legend className="text-caption font-medium uppercase tracking-wide text-text-muted">
              Choose an image
            </legend>
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
              {library.map((file) => (
                <li key={file.src}>
                  <button
                    type="button"
                    aria-pressed={src === file.src}
                    onClick={() => setSrc(file.src)}
                    title={file.name}
                    className={cn(
                      "block w-full overflow-hidden rounded-xs border-2 transition-colors",
                      src === file.src
                        ? "border-primary"
                        : "border-transparent hover:border-border-strong",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
                    <img
                      src={file.src}
                      alt={file.name}
                      className="h-16 w-full bg-surface-sunken object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="mt-5">
            <label
              htmlFor={`${rowId}-alt`}
              className="text-small font-medium text-text"
            >
              Alt text
            </label>
            <input
              id={`${rowId}-alt`}
              type="text"
              value={alt}
              disabled={decorative}
              onChange={(event) => setAlt(event.target.value)}
              placeholder="What the picture shows, and why it is here"
              className="mt-2 h-10 w-full rounded-sm border border-border bg-surface px-3 text-small disabled:bg-surface-sunken disabled:text-text-light"
            />
            <label className="mt-3 flex items-center gap-2 text-small text-text-muted">
              <input
                type="checkbox"
                checked={decorative}
                onChange={(event) => setDecorative(event.target.checked)}
              />
              Decorative — carries no information (saves an empty alt)
            </label>
            <p className="mt-2 max-w-[68ch] text-caption text-text-light">
              Describe the content and its purpose, never the filename. A
              product photograph is content and needs real alt text; a hero
              backdrop behind its own headline is decorative.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              disabled={busy || !src}
              onClick={() =>
                void onAssign(target, src, alt, decorative).then(() =>
                  setOpen(false),
                )
              }
              className="inline-flex h-10 items-center rounded-sm bg-primary px-5 text-small font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-45"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-small text-text-muted underline underline-offset-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
