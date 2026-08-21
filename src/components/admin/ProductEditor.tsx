"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct, saveProduct } from "@/app/admin/actions";
import { cn } from "@/lib/cn";

export interface AdminProduct {
  id: number;
  slug: string;
  name: string;
  benefit: string;
  olfactive: string;
  published: boolean;
  categorySlug: string;
  categoryName: string;
  source: string;
  formats: string;
}

interface Props {
  products: AdminProduct[];
  categories: Array<{ slug: string; name: string }>;
  sources: Array<{ slug: string; title: string }>;
}

/**
 * Product list and editor.
 *
 * One row expands into a form rather than navigating to a detail route. With
 * 122 short records the round trip per edit is the slow part of the job, and a
 * list that stays put keeps the operator's place after each save.
 */
export function ProductEditor({ products, categories, sources }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q),
    );
  }, [products, query]);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveProduct(formData);
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
      const result = await deleteProduct(id);
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="product-filter" className="text-caption text-text-muted">
            Filter
          </label>
          <input
            id="product-filter"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or range…"
            className="h-9 w-64 rounded-sm border border-border bg-surface px-3 text-small"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditing(editing === "new" ? null : "new")}
          className="inline-flex h-10 items-center rounded-sm bg-primary px-5 text-small font-medium text-white hover:bg-green-700"
        >
          {editing === "new" ? "Cancel" : "Add product"}
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
          <h2 className="text-h4 font-semibold">New product</h2>
          <ProductForm
            categories={categories}
            sources={sources}
            pending={pending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {filtered.map((product) => (
          <li key={product.id} className="rounded-sm border border-border bg-surface">
            <div className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium text-text">
                  {product.name}
                  {!product.published && (
                    <span className="ml-2 rounded-xs bg-surface-sunken px-2 py-0.5 text-caption text-text-muted">
                      Hidden
                    </span>
                  )}
                </p>
                <p className="truncate text-caption text-text-muted">
                  {product.categoryName} · /{product.slug}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(editing === product.id ? null : product.id)}
                  className="text-small font-medium text-primary underline underline-offset-4"
                >
                  {editing === product.id ? "Close" : "Edit"}
                  <span className="sr-only"> {product.name}</span>
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(product.id, product.name)}
                  className="text-small text-text-muted underline underline-offset-4 hover:text-error disabled:opacity-50"
                >
                  Delete
                  <span className="sr-only"> {product.name}</span>
                </button>
              </div>
            </div>

            {editing === product.id && (
              <div className="border-t border-border p-5">
                <ProductForm
                  product={product}
                  categories={categories}
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

      {filtered.length === 0 && (
        <p className="text-small text-text-muted">Nothing matches “{query}”.</p>
      )}
    </div>
  );
}

function ProductForm({
  product,
  categories,
  sources,
  pending,
  onSubmit,
  onCancel,
}: {
  product?: AdminProduct;
  categories: Array<{ slug: string; name: string }>;
  sources: Array<{ slug: string; title: string }>;
  pending: boolean;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <Field label="Name" htmlFor={`name-${product?.id ?? "new"}`}>
        <input
          id={`name-${product?.id ?? "new"}`}
          name="name"
          defaultValue={product?.name}
          required
          className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-small"
        />
      </Field>

      {product ? (
        <p className="text-caption text-text-muted">
          Web address: <code className="font-mono text-text">/{product.slug}</code> —
          fixed when the product was created, so renaming never breaks an
          existing link.
        </p>
      ) : (
        <Field
          label="Web address (optional)"
          htmlFor="slug-new"
          hint="Derived from the name if left blank. It cannot be changed later."
        >
          <input
            id="slug-new"
            name="slug"
            placeholder="aloe-vera-extract"
            className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-small font-mono"
          />
        </Field>
      )}

      <Field label="Range" htmlFor={`category-${product?.id ?? "new"}`}>
        <select
          id={`category-${product?.id ?? "new"}`}
          name="categorySlug"
          defaultValue={product?.categorySlug ?? ""}
          required
          className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-small"
        >
          <option value="">Choose a range…</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Benefit copy"
        htmlFor={`benefit-${product?.id ?? "new"}`}
        hint="The wording as it appears in the Cerium document. Do not paraphrase it into a stronger claim."
      >
        <textarea
          id={`benefit-${product?.id ?? "new"}`}
          name="benefit"
          rows={3}
          defaultValue={product?.benefit}
          className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-small"
        />
      </Field>

      <Field
        label="Olfactive family"
        htmlFor={`olfactive-${product?.id ?? "new"}`}
        hint="Fragrances only, e.g. Vanilla | Ambery | Floral"
      >
        <input
          id={`olfactive-${product?.id ?? "new"}`}
          name="olfactive"
          defaultValue={product?.olfactive}
          className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-small"
        />
      </Field>

      <Field
        label="End-product formats"
        htmlFor={`formats-${product?.id ?? "new"}`}
        hint="Comma separated, e.g. Shampoo, Shower gel. These are what the material is supplied FOR — not the site's Applications."
      >
        <input
          id={`formats-${product?.id ?? "new"}`}
          name="formats"
          defaultValue={product?.formats}
          className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-small"
        />
      </Field>

      <Field
        label="Source document"
        htmlFor={`source-${product?.id ?? "new"}`}
        hint="Which Cerium document this content came from. Required — provenance is what makes the catalogue defensible."
      >
        <select
          id={`source-${product?.id ?? "new"}`}
          name="source"
          defaultValue={product?.source ?? ""}
          required
          className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-small"
        >
          <option value="">Choose a document…</option>
          {sources.map((source) => (
            <option key={source.slug} value={source.slug}>
              {source.title}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-center gap-2 text-small">
        <input
          type="checkbox"
          name="published"
          defaultChecked={product ? product.published : true}
        />
        Visible on the public site
      </label>

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

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-small font-medium text-text">
        {label}
      </label>
      {hint && <p className="mt-1 max-w-[72ch] text-caption text-text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
