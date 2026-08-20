import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CatalogueOverrides,
  CategoryOverride,
  ProductOverride,
} from "@/data/overrides";
import { isSourceDocument } from "@/types/content";
import { isStudioEnabled, studioDisabledResponse } from "@/lib/studio-guard";
import { slugify } from "@/lib/slug";

/**
 * Content Studio persistence.
 *
 * Reads and writes `src/data/catalogue.overrides.json`. Development only — see
 * `lib/studio-guard.ts`.
 *
 * Everything written here is validated and rebuilt field by field. The request
 * body is never spread into the stored object, so an unexpected key cannot end
 * up in the data file.
 */

const OVERRIDES_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "catalogue.overrides.json",
);

async function readOverrides(): Promise<CatalogueOverrides> {
  const raw = await readFile(OVERRIDES_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<CatalogueOverrides>;
  return {
    categories: parsed.categories ?? [],
    products: parsed.products ?? [],
  };
}

async function writeOverrides(data: CatalogueOverrides): Promise<void> {
  await writeFile(OVERRIDES_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Trim, collapse whitespace, and treat empty strings as absent. */
function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : undefined;
}

function imageFrom(body: Record<string, unknown>) {
  const src = text(body.imageSrc);
  if (!src) return undefined;
  return {
    src,
    alt: text(body.imageAlt) ?? "",
  };
}

export async function GET() {
  if (!isStudioEnabled) return studioDisabledResponse();
  return Response.json(await readOverrides());
}

export async function POST(request: Request) {
  if (!isStudioEnabled) return studioDisabledResponse();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const kind = body.kind;
  const name = text(body.name);

  if (!name) {
    return Response.json({ error: "A name is required." }, { status: 400 });
  }

  const slug = text(body.slug) ? slugify(String(body.slug)) : slugify(name);
  if (!slug) {
    return Response.json(
      { error: "Could not derive a URL slug from that name." },
      { status: 400 },
    );
  }

  /*
   * Provenance is supplied by the operator, not assumed.
   *
   * This used to hardcode `source: "website-ceriumchemicals.co.ke"` on every
   * entry the Studio wrote, regardless of where the content actually came from.
   * On a site whose entire integrity model rests on this field, a value that is
   * always present and usually wrong is worse than one that is absent — it
   * looks like an answer. The form now asks, and the answer is validated
   * against the union rather than trusted.
   */
  const source = body.source;
  if (!isSourceDocument(source)) {
    return Response.json(
      {
        error:
          "Choose the Cerium document this content came from. Provenance is not optional.",
      },
      { status: 400 },
    );
  }

  const data = await readOverrides();

  if (kind === "category") {
    if (data.categories.some((entry) => entry.slug === slug)) {
      return Response.json(
        { error: `A category with the slug "${slug}" already exists.` },
        { status: 409 },
      );
    }

    const category: CategoryOverride = {
      slug,
      name,
      summary: text(body.summary),
      parentSlug: text(body.parentSlug),
      image: imageFrom(body),
      source,
    };

    data.categories.push(category);
    await writeOverrides(data);
    return Response.json({ ok: true, slug, kind: "category" });
  }

  if (kind === "product") {
    const categorySlug = text(body.categorySlug);
    if (!categorySlug) {
      return Response.json(
        { error: "Choose the range this product belongs to." },
        { status: 400 },
      );
    }

    if (
      data.products.some(
        (entry) => entry.slug === slug && entry.categorySlug === categorySlug,
      )
    ) {
      return Response.json(
        { error: `"${name}" already exists in that range.` },
        { status: 409 },
      );
    }

    // End-product formats ("Shampoo", "Fabric softener") — not Application
    // slugs. See `ProductSummary.formats`.
    const formats = Array.isArray(body.formats)
      ? body.formats
          .map((value) => text(value))
          .filter((value): value is string => Boolean(value))
      : undefined;

    const product: ProductOverride = {
      slug,
      name,
      categorySlug,
      benefit: text(body.benefit),
      olfactive: text(body.olfactive),
      formats: formats?.length ? formats : undefined,
      image: imageFrom(body),
      source,
    };

    data.products.push(product);
    await writeOverrides(data);
    return Response.json({ ok: true, slug, kind: "product" });
  }

  return Response.json(
    { error: 'kind must be "category" or "product".' },
    { status: 400 },
  );
}

export async function DELETE(request: Request) {
  if (!isStudioEnabled) return studioDisabledResponse();

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const slug = searchParams.get("slug");
  const categorySlug = searchParams.get("categorySlug");

  if (!slug || (kind !== "category" && kind !== "product")) {
    return Response.json({ error: "kind and slug are required." }, { status: 400 });
  }

  const data = await readOverrides();

  if (kind === "category") {
    data.categories = data.categories.filter((entry) => entry.slug !== slug);
    // Remove products that belonged to it, or they would be orphaned.
    data.products = data.products.filter((entry) => entry.categorySlug !== slug);
  } else {
    data.products = data.products.filter(
      (entry) =>
        !(entry.slug === slug && (!categorySlug || entry.categorySlug === categorySlug)),
    );
  }

  await writeOverrides(data);
  return Response.json({ ok: true });
}
