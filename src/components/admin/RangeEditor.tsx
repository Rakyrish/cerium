"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, saveCategory } from "@/app/admin/actions";
import { cn } from "@/lib/cn";

export interface AdminRange {
  id: number;
  slug: string;
  name: string;
  summary: string;
  parentSlug: string;
  source: string;
  productCount: number;
}

interface Props {
  ranges: AdminRange[];
  sources: Array<{ slug: string; title: string }>;
}

export function RangeEditor({ ranges, sources }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveCategory(formData);
      setNotice(
        result.ok
          ? { tone: "ok", text: result.message ?? "Saved." }
          : { tone: "error", text: result.error ?? "Could not save." },
      );
      if (result.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function remove(id: number, name: string) {
    startTransition(async () => {
      const result = await deleteCategory(id);
      setNotice(
        result.ok
          ? { tone: "ok", text: `Deleted “${name}”.` }
          : { tone: "error", text: result.error ?? "Could not delete." },
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(editing === "new" ? null : "new")}
          className="inline-flex h-10 items-center rounded-sm bg-primary px-5 text-small font-medium text-white hover:bg-green-700"
        >
          {editing === "new" ? "Cancel" : "Add range"}
        </button>
      </div>

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

      {editing === "new" && (
        <div className="rounded-sm border border-primary/30 bg-surface p-5">
          <h2 className="text-h4 font-semibold">New range</h2>
          <RangeForm
            ranges={ranges}
            sources={sources}
            pending={pending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {ranges.map((range) => (
          <li key={range.id} className="rounded-sm border border-border bg-surface">
            <div className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium text-text">
                  {range.parentSlug && (
                    <span aria-hidden="true" className="text-text-light">
                      ↳{" "}
                    </span>
                  )}
                  {range.name}
                </p>
                <p className="truncate text-caption text-text-muted">
                  /{range.slug} ·{" "}
                  {range.productCount === 0
                    ? "no products"
                    : `${range.productCount} product${range.productCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(editing === range.id ? null : range.id)}
                  className="text-small font-medium text-primary underline underline-offset-4"
                >
                  {editing === range.id ? "Close" : "Edit"}
                  <span className="sr-only"> {range.name}</span>
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(range.id, range.name)}
                  className="text-small text-text-muted underline underline-offset-4 hover:text-error disabled:opacity-50"
                >
                  Delete
                  <span className="sr-only"> {range.name}</span>
                </button>
              </div>
            </div>

            {editing === range.id && (
              <div className="border-t border-border p-5">
                <RangeForm
                  range={range}
                  ranges={ranges}
                  sources={sources}
                  pending={pending}
                  onSubmit={submit}
                  onCancel={() => setEditing(null)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RangeForm({
  range,
  ranges,
  sources,
  pending,
  onSubmit,
  onCancel,
}: {
  range?: AdminRange;
  ranges: AdminRange[];
  sources: Array<{ slug: string; title: string }>;
  pending: boolean;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}) {
  const id = range?.id ?? "new";

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      {range && <input type="hidden" name="id" value={range.id} />}

      <div>
        <label htmlFor={`r-name-${id}`} className="text-small font-medium">
          Name
        </label>
        <input
          id={`r-name-${id}`}
          name="name"
          defaultValue={range?.name}
          required
          className="mt-2 h-10 w-full rounded-sm border border-border bg-surface px-3 text-small"
        />
      </div>

      {range ? (
        <p className="text-caption text-text-muted">
          Web address: <code className="font-mono text-text">/products/{range.slug}</code>{" "}
          — fixed, so an indexed range page never 404s after a rename.
        </p>
      ) : (
        <div>
          <label htmlFor="r-slug-new" className="text-small font-medium">
            Web address (optional)
          </label>
          <input
            id="r-slug-new"
            name="slug"
            placeholder="natural-extracts"
            className="mt-2 h-10 w-full rounded-sm border border-border bg-surface px-3 font-mono text-small"
          />
        </div>
      )}

      <div>
        <label htmlFor={`r-parent-${id}`} className="text-small font-medium">
          Parent range
        </label>
        <p className="mt-1 text-caption text-text-muted">
          Leave blank for a top-level family.
        </p>
        <select
          id={`r-parent-${id}`}
          name="parentSlug"
          defaultValue={range?.parentSlug ?? ""}
          className="mt-2 h-10 w-full rounded-sm border border-border bg-surface px-3 text-small"
        >
          <option value="">— none (top level) —</option>
          {ranges
            // A range cannot be its own parent; the action rejects it too, but
            // not offering it is better than explaining it afterwards.
            .filter((option) => option.id !== range?.id)
            .map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label htmlFor={`r-summary-${id}`} className="text-small font-medium">
          Summary
        </label>
        <p className="mt-1 max-w-[72ch] text-caption text-text-muted">
          Positioning copy as written in the Cerium document.
        </p>
        <textarea
          id={`r-summary-${id}`}
          name="summary"
          rows={3}
          defaultValue={range?.summary}
          className="mt-2 w-full rounded-sm border border-border bg-surface px-3 py-2 text-small"
        />
      </div>

      <div>
        <label htmlFor={`r-source-${id}`} className="text-small font-medium">
          Source document
        </label>
        <select
          id={`r-source-${id}`}
          name="source"
          defaultValue={range?.source ?? ""}
          required
          className="mt-2 h-10 w-full rounded-sm border border-border bg-surface px-3 text-small"
        >
          <option value="">Choose a document…</option>
          {sources.map((source) => (
            <option key={source.slug} value={source.slug}>
              {source.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-sm bg-primary px-5 text-small font-medium text-white hover:bg-green-700 disabled:opacity-45"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-small text-text-muted underline underline-offset-4"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
