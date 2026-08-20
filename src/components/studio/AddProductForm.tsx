"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryOption } from "@/components/studio/AddCategoryForm";
import {
  Field,
  Fieldset,
  ImageField,
  Notice,
  Select,
  SourceField,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/studio/fields";

/**
 * Add a product to a range.
 *
 * Fields mirror `ProductSummary` exactly. There is deliberately no field for
 * specifications, CAS number, INCI name, price or stock — those arrive with the
 * Django schema in later phases, and offering a free-text box for them now is
 * how unverified technical claims end up on a chemical supplier's website.
 */
export function AddProductForm({ options }: { options: CategoryOption[] }) {
  const router = useRouter();
  const [categorySlug, setCategorySlug] = useState(options[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [benefit, setBenefit] = useState("");
  const [olfactive, setOlfactive] = useState("");
  const [formats, setFormats] = useState("");
  const [source, setSource] = useState("");
  const [image, setImage] = useState({ src: "", alt: "" });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<
    { tone: "success" | "error"; message: string } | null
  >(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    try {
      const response = await fetch("/api/studio/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "product",
          name,
          categorySlug,
          benefit,
          olfactive,
          source,
          formats: formats
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          imageSrc: image.src,
          imageAlt: image.alt,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save.");

      setResult({ tone: "success", message: `Added "${name}".` });
      // `source` is deliberately NOT reset. Entries are typically added in
      // runs from one document, and re-selecting it every time invites the
      // operator to reach for whatever is quickest rather than what is true.
      // It stays visible in the form, so it cannot go stale unnoticed.
      setName("");
      setBenefit("");
      setOlfactive("");
      setFormats("");
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

  if (options.length === 0) {
    return (
      <Notice tone="error">
        There are no ranges to add a product to. Create a range first.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      <Field label="Range" required>
        {(id) => (
          <Select
            id={id}
            required
            value={categorySlug}
            onChange={(event) => setCategorySlug(event.target.value)}
          >
            {options.map((option) => (
              <option key={option.slug} value={option.slug}>
                {"— ".repeat(option.depth)}
                {option.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Product name" required>
        {(id) => (
          <TextInput
            id={id}
            required
            value={name}
            placeholder="Jojoba Oil"
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>

      <Field
        label="Benefit"
        hint="Copy Cerium's wording from the catalogue or price list. Do not paraphrase it into a claim."
      >
        {(id) => (
          <TextArea
            id={id}
            value={benefit}
            onChange={(event) => setBenefit(event.target.value)}
          />
        )}
      </Field>

      <Field label="Olfactive family" hint="Fragrances only, e.g. Fruity | Floral | Musky.">
        {(id) => (
          <TextInput
            id={id}
            value={olfactive}
            onChange={(event) => setOlfactive(event.target.value)}
          />
        )}
      </Field>

      <Field
        label="End-product formats"
        hint="Comma separated, e.g. Shampoo, Shower gel, Body lotion. These are formats a customer formulates, not the six site Applications."
      >
        {(id) => (
          <TextInput
            id={id}
            value={formats}
            placeholder="Shampoo, Shower gel"
            onChange={(event) => setFormats(event.target.value)}
          />
        )}
      </Field>

      <SourceField value={source} onChange={setSource} />

      <ImageField src={image.src} alt={image.alt} onChange={setImage} />

      <Fieldset legend="Save">
        {result && <Notice tone={result.tone}>{result.message}</Notice>}
        <div>
          <SubmitButton pending={pending}>Add product</SubmitButton>
        </div>
      </Fieldset>
    </form>
  );
}
