"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignMedia, deleteMedia, uploadMedia } from "@/app/admin/actions";
import { cn } from "@/lib/cn";

/**
 * Media library and assignment.
 *
 * Only identifiers, labels and the current assignment cross the boundary — no
 * catalogue records. That keeps this consistent with the rule the public site
 * enforces, and means the payload stays a list of names rather than the tree.
 */

export type Scope = "site" | "product" | "category";

export interface LibraryItem {
  id: number;
  cloudinaryId: string;
  label: string;
  width: number;
  height: number;
  bytes: number;
}

export interface Target {
  scope: Scope;
  key: string;
  label: string;
  context?: string;
  mediaId: number | null;
  alt: string;
}

interface Props {
  cloudName: string;
  uploadsEnabled: boolean;
  library: LibraryItem[];
  site: Target[];
  products: Target[];
  categories: Target[];
}

const SCOPES: Array<{ id: Scope; label: string; blurb: string }> = [
  {
    id: "site",
    label: "Site images",
    blurb:
      "Fixed editorial positions in the layout. These belong to the website rather than to any product.",
  },
  {
    id: "product",
    label: "Product images",
    blurb:
      "A photograph of the material itself, shown on its product page and on its card in every listing.",
  },
  {
    id: "category",
    label: "Range images",
    blurb: "The image representing a whole range on cards and range pages.",
  },
];

/** Small preview straight from Cloudinary — no Next optimizer for a thumbnail. */
function thumb(cloudName: string, cloudinaryId: string, width = 240): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width * 0.75)}/${cloudinaryId}`;
}

export function MediaManager({
  cloudName,
  uploadsEnabled,
  library,
  site,
  products,
  categories,
}: Props) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("product");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const targets = scope === "site" ? site : scope === "product" ? products : categories;
  const byId = useMemo(() => new Map(library.map((i) => [i.id, i])), [library]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        (t.context ?? "").toLowerCase().includes(q),
    );
  }, [targets, query]);

  const assigned = targets.filter((t) => t.mediaId !== null).length;

  function run(work: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await work();
      setNotice(
        result.ok
          ? { tone: "ok", text: result.message ?? "Saved." }
          : { tone: "error", text: result.error ?? "Something went wrong." },
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ---------------------------------------------------------------- */}
      {/* Upload                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-sm border border-border bg-surface p-6">
        <h2 className="text-h4 font-semibold">Library</h2>

        {uploadsEnabled ? (
          <>
            <label htmlFor="admin-upload" className="mt-4 block text-small font-medium">
              Upload images
            </label>
            <input
              id="admin-upload"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={pending}
              onChange={(event) => {
                const files = event.target.files;
                if (!files?.length) return;
                const data = new FormData();
                for (const file of Array.from(files)) data.append("files", file);
                event.target.value = "";
                run(() => uploadMedia(data));
              }}
              className="mt-2 block w-full max-w-lg text-small text-text-muted file:mr-3 file:rounded-sm file:border file:border-border file:bg-surface file:px-4 file:py-2 file:text-small file:font-medium file:text-text hover:file:border-primary"
            />
            <p className="mt-2 text-caption text-text-muted">
              JPG, PNG, WebP or AVIF, up to 10MB. Stored in Cloudinary, so
              uploads survive a redeploy.
            </p>
          </>
        ) : (
          <p className="mt-4 rounded-sm border border-warning/30 bg-warning/5 px-4 py-3 text-small text-warning">
            Cloudinary is not configured, so uploading is disabled.
          </p>
        )}

        {library.length > 0 && (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {library.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-xs border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb(cloudName, item.cloudinaryId)}
                  alt=""
                  className="h-24 w-full bg-surface-sunken object-cover"
                />
                <div className="p-2">
                  <p className="truncate text-caption" title={item.label}>
                    {item.label}
                  </p>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => deleteMedia(item.id))}
                    className="mt-1 text-caption text-text-muted underline underline-offset-2 hover:text-error disabled:opacity-50"
                  >
                    Delete
                    <span className="sr-only"> {item.label}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-sm border px-4 py-3 text-small",
            notice.tone === "ok"
              ? "border-green-200 bg-primary-soft text-green-700"
              : "border-error/25 bg-error/5 text-error",
          )}
        >
          {notice.text}
        </p>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Assignment                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <h2 className="text-h4 font-semibold">Assign</h2>

        <div role="group" aria-label="What to assign to" className="mt-4 flex flex-wrap gap-1">
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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
          <p className="text-caption text-text-muted">
            {assigned} of {targets.length} have an image
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

        {library.length === 0 ? (
          <p className="mt-5 text-small text-text-muted">
            Upload an image first — there is nothing to assign yet.
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {filtered.map((target) => (
              <Row
                key={`${target.scope}-${target.key}`}
                target={target}
                library={library}
                current={target.mediaId ? byId.get(target.mediaId) : undefined}
                cloudName={cloudName}
                pending={pending}
                onSave={(mediaId, alt, decorative) =>
                  run(() =>
                    assignMedia({
                      scope: target.scope,
                      key: target.key,
                      mediaId,
                      alt,
                      decorative,
                    }),
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  target,
  library,
  current,
  cloudName,
  pending,
  onSave,
}: {
  target: Target;
  library: LibraryItem[];
  current?: LibraryItem;
  cloudName: string;
  pending: boolean;
  onSave: (mediaId: number | null, alt: string, decorative: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(target.mediaId);
  const [alt, setAlt] = useState(target.alt);
  const [decorative, setDecorative] = useState(
    target.mediaId !== null && target.alt === "",
  );

  const panelId = `assign-${target.scope}-${target.key}`;

  return (
    <li className="rounded-sm border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-4 p-4">
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xs border border-border bg-surface-sunken">
          {current ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumb(cloudName, current.cloudinaryId, 160)}
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
          {current && (
            <p className="mt-0.5 truncate text-caption text-text-muted">
              {target.alt === "" ? (
                <span className="italic">Marked decorative</span>
              ) : (
                target.alt
              )}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className="text-small font-medium text-primary underline underline-offset-4"
          >
            {current ? "Change" : "Assign"}
            <span className="sr-only"> image for {target.label}</span>
          </button>
          {current && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onSave(null, "", false)}
              className="text-small text-text-muted underline underline-offset-4 hover:text-error disabled:opacity-50"
            >
              Remove
              <span className="sr-only"> image from {target.label}</span>
            </button>
          )}
        </div>
      </div>

      {open && (
        <div id={panelId} className="border-t border-border p-4">
          <fieldset>
            <legend className="text-caption font-medium uppercase tracking-wide text-text-muted">
              Choose an image
            </legend>
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {library.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={selected === item.id}
                    onClick={() => setSelected(item.id)}
                    title={item.label}
                    className={cn(
                      "block w-full overflow-hidden rounded-xs border-2 transition-colors",
                      selected === item.id
                        ? "border-primary"
                        : "border-transparent hover:border-border-strong",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb(cloudName, item.cloudinaryId, 160)}
                      alt={item.label}
                      className="h-16 w-full bg-surface-sunken object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="mt-5">
            <label htmlFor={`${panelId}-alt`} className="text-small font-medium">
              Alt text
            </label>
            <input
              id={`${panelId}-alt`}
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
              Decorative — carries no information
            </label>
            <p className="mt-2 max-w-[68ch] text-caption text-text-light">
              Describe the content and its purpose, never the filename. A product
              photograph is content and needs real alt text; a backdrop behind
              its own headline is decorative.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              disabled={pending || selected === null}
              onClick={() => {
                onSave(selected, alt, decorative);
                setOpen(false);
              }}
              className="inline-flex h-10 items-center rounded-sm bg-primary px-5 text-small font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-45"
            >
              {pending ? "Saving…" : "Save"}
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
