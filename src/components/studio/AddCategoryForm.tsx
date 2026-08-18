"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Field,
  Fieldset,
  ImageField,
  Notice,
  Select,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/studio/fields";
import { slugify } from "@/lib/slug";

export interface CategoryOption {
  slug: string;
  name: string;
  depth: number;
}

/**
 * Add a product range.
 *
 * The slug is derived from the name and shown live, because the slug becomes a
 * public URL — it should never be a surprise after the fact.
 */
export function AddCategoryForm({ options }: { options: CategoryOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [parentSlug, setParentSlug] = useState("");
  const [image, setImage] = useState({ src: "", alt: "" });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<
    { tone: "success" | "error"; message: string } | null
  >(null);

  const slug = slugify(name);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    try {
      const response = await fetch("/api/studio/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "category",
          name,
          summary,
          parentSlug: parentSlug || undefined,
          imageSrc: image.src,
          imageAlt: image.alt,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save.");

      setResult({
        tone: "success",
        message: `Added "${name}". It is live at /products/${data.slug} once it has products or sub-ranges.`,
      });
      setName("");
      setSummary("");
      setImage({ src: "", alt: "" });
      router.refresh();
    } catch (caught) {
      setResult({
        tone: "error",
        message: caught instanceof Error ? caught.message : "Could not save.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      <Field label="Range name" required>
        {(id) => (
          <TextInput
            id={id}
            required
            value={name}
            placeholder="Spice oils and oleoresins"
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>

      {slug && (
        <p className="-mt-3 text-caption text-text-muted">
          URL: <code className="font-mono text-text">/products/{slug}</code>
        </p>
      )}

      <Field
        label="Summary"
        hint="One or two sentences. Use Cerium's own wording — do not write claims."
      >
        {(id) => (
          <TextArea
            id={id}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        )}
      </Field>

      <Field
        label="Sits under"
        hint="Leave as a top-level family unless it belongs inside an existing range."
      >
        {(id) => (
          <Select
            id={id}
            value={parentSlug}
            onChange={(event) => setParentSlug(event.target.value)}
          >
            <option value="">Top-level family</option>
            {options.map((option) => (
              <option key={option.slug} value={option.slug}>
                {"— ".repeat(option.depth)}
                {option.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <ImageField src={image.src} alt={image.alt} onChange={setImage} />

      <Fieldset legend="Save">
        {result && <Notice tone={result.tone}>{result.message}</Notice>}
        <div>
          <SubmitButton pending={pending}>Add range</SubmitButton>
        </div>
      </Fieldset>
    </form>
  );
}
