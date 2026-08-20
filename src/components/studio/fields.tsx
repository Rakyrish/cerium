"use client";

import { useId, useState, type ReactNode } from "react";
import { SOURCE_DOCUMENTS, type SourceDocument } from "@/types/content";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Shared Studio form primitives                                               */
/* Plain labelled inputs — every field has a real <label> tied to its control. */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: (id: string, describedBy?: string) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-text">
        {label}
        {required && (
          <span className="ml-1 text-error" aria-hidden="true">
            *
          </span>
        )}
        {!required && (
          <span className="ml-2 text-caption font-normal text-text-muted">
            optional
          </span>
        )}
      </label>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="text-caption text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

const controlClass =
  "w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-body text-text " +
  "outline-none transition-colors placeholder:text-text-light focus:border-primary";

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea {...props} className={cn(controlClass, "min-h-24", props.className)} />
  );
}

export function Select(props: React.ComponentProps<"select">) {
  return <select {...props} className={cn(controlClass, props.className)} />;
}

/**
 * Human-readable names for the supplied Cerium documents.
 *
 * Keyed by `SourceDocument` so a new union member is a type error here rather
 * than a missing option in the dropdown.
 */
const SOURCE_LABELS: Record<SourceDocument, string> = {
  "catalogue-2026": "2026 product catalogue",
  "pricelist-q3-2026": "Q3 2026 price list",
  "fragrance-pricelist-q3-2026": "Q3 2026 fragrance price list",
  "vision-statement": "Vision statement document",
  logo: "Supplied logo lockup",
  "website-ceriumchemicals.co.ke": "Live site — ceriumchemicals.co.ke",
};

/**
 * Provenance selector. Required on every Studio form.
 *
 * There is no default and no "unknown" option, both deliberately. A default
 * would be guessed provenance wearing the same clothes as recorded provenance,
 * which is the failure this field was added to remove; an "unknown" option
 * would let unattributed content into a catalogue whose integrity model assumes
 * every entry is traceable to a document.
 *
 * If the content is not in one of these documents, it should not be entered
 * here yet — that is the honest answer, and the empty option enforces it by
 * blocking the submit.
 */
export function SourceField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field
      label="Source document"
      required
      hint="Which supplied Cerium document this content is taken from. If it is not in one of these, do not add it yet."
    >
      {(id) => (
        <Select
          id={id}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select the source document…</option>
          {SOURCE_DOCUMENTS.map((document) => (
            <option key={document} value={document}>
              {SOURCE_LABELS[document]}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: ReactNode;
  pending?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-6 text-button font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

/** Result banner. `role="status"` so outcomes are announced, not just shown. */
export function Notice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: ReactNode;
}) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-sm border px-4 py-3 text-small",
        tone === "success"
          ? "border-green-200 bg-primary-soft text-green-700"
          : "border-error/25 bg-error/5 text-error",
      )}
    >
      {children}
    </p>
  );
}

export function Fieldset({
  legend,
  description,
  children,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-5 border-t border-border pt-6">
      <legend className="sr-only">{legend}</legend>
      <div>
        <h3 className="text-h4 font-semibold">{legend}</h3>
        {description && (
          <p className="mt-1.5 max-w-[70ch] text-small text-text-muted">
            {description}
          </p>
        )}
      </div>
      {children}
    </fieldset>
  );
}

/**
 * Image chooser.
 *
 * Uploads to `public/images/` and fills in the path, or accepts a path typed by
 * hand. Alt text sits next to it rather than in a separate step, because an
 * image added without alt text is an accessibility defect that is very easy to
 * never come back and fix.
 */
export function ImageField({
  src,
  alt,
  onChange,
}: {
  src: string;
  alt: string;
  onChange: (next: { src: string; alt: string }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/studio/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");
      onChange({ src: data.src, alt });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Fieldset
      legend="Image"
      description="Leave empty to keep the labelled 'Image pending' placeholder."
    >
      <Field label="Upload a file" hint="JPG, PNG, WebP, AVIF or SVG. Max 8MB.">
        {(id) => (
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
            className="w-full text-small text-text-muted file:mr-3 file:rounded-sm file:border file:border-border file:bg-surface file:px-4 file:py-2 file:text-small file:font-medium file:text-text hover:file:border-primary"
          />
        )}
      </Field>

      {uploading && <p className="text-caption text-text-muted">Uploading…</p>}
      {error && <Notice tone="error">{error}</Notice>}

      <Field label="Image path" hint="Filled in automatically after an upload.">
        {(id) => (
          <TextInput
            id={id}
            value={src}
            placeholder="/images/example.jpg"
            onChange={(event) => onChange({ src: event.target.value, alt })}
          />
        )}
      </Field>

      {src && (
        <>
          <Field
            label="Alt text"
            required
            hint="Describe what is in the picture. Leave empty only if it is purely decorative."
          >
            {(id) => (
              <TextInput
                id={id}
                value={alt}
                placeholder="Amber bottles of carrier oils on a workbench"
                onChange={(event) => onChange({ src, alt: event.target.value })}
              />
            )}
          </Field>

          {/* eslint-disable-next-line @next/next/no-img-element -- local preview
              of an arbitrary path; next/image would need config per source. */}
          <img
            src={src}
            alt=""
            className="h-40 w-auto rounded-sm border border-border object-cover"
          />
        </>
      )}
    </Fieldset>
  );
}
