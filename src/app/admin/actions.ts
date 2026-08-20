"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { requireUserForAction } from "@/lib/admin-guard";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "@/lib/cloudinary-upload";
import { slugify } from "@/lib/slug";

/**
 * Admin mutations.
 *
 * ---------------------------------------------------------------------------
 * EVERY ACTION AUTHORISES ITSELF
 * ---------------------------------------------------------------------------
 * A Server Action compiles to a POST endpoint with a stable id. It can be
 * invoked without ever rendering the page it appears on, so the layout's
 * session check does not protect it. `requireUserForAction()` is the first
 * statement in every exported function here, and that is not a style choice.
 *
 * ---------------------------------------------------------------------------
 * FIELDS ARE REBUILT, NEVER SPREAD
 * ---------------------------------------------------------------------------
 * Values are read out of the FormData one at a time and validated. Nothing is
 * spread into an update, so a caller cannot set a column the form does not
 * expose — `published`, `status` or `source_id` cannot be smuggled in.
 *
 * ---------------------------------------------------------------------------
 * PUBLISHED PAGES ARE REVALIDATED ON WRITE
 * ---------------------------------------------------------------------------
 * The public site is statically generated, so an edit is invisible until the
 * affected page is rebuilt. Each action revalidates what it touched. This is
 * the mechanism that makes a database-backed admin work on a static site at
 * all — without it, saving would appear to do nothing.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

function text(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Rebuild the public surfaces a catalogue change can affect.
 *
 * Deliberately broad. A product's name appears on its own page, its range
 * page, every ancestor listing, the A-Z index on /products, any application
 * page whose ranges include it, and the sitemap. Enumerating those precisely
 * would be a second copy of the routing rules that silently rots; revalidating
 * the layout rebuilds them together and costs a few seconds of regeneration on
 * a site this size.
 */
function revalidateCatalogue() {
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

export async function uploadMedia(formData: FormData): Promise<ActionResult> {
  const user = await requireUserForAction();

  const db = getDb();
  if (!db) return { ok: false, error: "No database configured." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { ok: false, error: "No file was received." };

  let uploaded = 0;
  for (const file of files) {
    try {
      const asset = await uploadToCloudinary(file);
      await db
        .insert(schema.mediaAssets)
        .values({
          cloudinaryId: asset.cloudinaryId,
          originalFilename: file.name,
          format: asset.format,
          width: asset.width,
          height: asset.height,
          bytes: asset.bytes,
          uploadedById: Number(user.id) || null,
        })
        .onConflictDoNothing();
      uploaded += 1;
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Upload failed.",
      };
    }
  }

  revalidatePath("/admin/media");
  return { ok: true, message: `Uploaded ${uploaded} image${uploaded === 1 ? "" : "s"}.` };
}

export async function deleteMedia(mediaId: number): Promise<ActionResult> {
  await requireUserForAction();
  const db = getDb();
  if (!db) return { ok: false, error: "No database configured." };

  const [asset] = await db
    .select({ cloudinaryId: schema.mediaAssets.cloudinaryId })
    .from(schema.mediaAssets)
    .where(eq(schema.mediaAssets.id, mediaId))
    .limit(1);

  if (!asset) return { ok: false, error: "That image no longer exists." };

  // Rows referencing it use ON DELETE SET NULL, so anything using the image
  // falls back to the placeholder rather than breaking.
  await db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, mediaId));
  await deleteFromCloudinary(asset.cloudinaryId);

  revalidatePath("/admin/media");
  revalidateCatalogue();
  return { ok: true, message: "Image deleted." };
}

/**
 * Attach an image to a product, a range, or an editorial slot.
 *
 * `mediaId === null` clears the assignment.
 */
export async function assignMedia(input: {
  scope: "product" | "category" | "application" | "industry" | "site";
  key: string;
  mediaId: number | null;
  alt: string;
  decorative: boolean;
}): Promise<ActionResult> {
  await requireUserForAction();
  const db = getDb();
  if (!db) return { ok: false, error: "No database configured." };

  const alt = input.decorative ? "" : input.alt.trim();

  // Alt text is required unless the operator explicitly says the image carries
  // no information. Defaulting to empty would ship unlabelled content images.
  if (input.mediaId !== null && !input.decorative && alt.length === 0) {
    return {
      ok: false,
      error:
        "Describe what the image shows, or mark it decorative if it carries no information.",
    };
  }

  if (input.scope === "site") {
    await db
      .insert(schema.siteMedia)
      .values({ slot: input.key, mediaId: input.mediaId, alt, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.siteMedia.slot,
        set: { mediaId: input.mediaId, alt, updatedAt: new Date() },
      });
  } else {
    const table =
      input.scope === "product"
        ? schema.products
        : input.scope === "category"
          ? schema.categories
          : input.scope === "application"
            ? schema.applications
            : schema.industries;

    await db
      .update(table)
      .set({ mediaId: input.mediaId, mediaAlt: alt })
      .where(eq(table.slug, input.key));
  }

  revalidatePath("/admin/media");
  revalidateCatalogue();
  return { ok: true, message: input.mediaId ? "Image assigned." : "Image removed." };
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export async function saveProduct(formData: FormData): Promise<ActionResult> {
  await requireUserForAction();
  const db = getDb();
  if (!db) return { ok: false, error: "No database configured." };

  const idRaw = text(formData.get("id"));
  const id = idRaw ? Number(idRaw) : null;

  const name = text(formData.get("name"));
  if (!name) return { ok: false, error: "A product name is required." };

  const categorySlug = text(formData.get("categorySlug"));
  if (!categorySlug) return { ok: false, error: "Choose the range this belongs to." };

  const sourceSlug = text(formData.get("source"));
  if (!sourceSlug) {
    return {
      ok: false,
      error:
        "Choose the Cerium document this came from. Provenance is not optional.",
    };
  }

  const [category] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(eq(schema.categories.slug, categorySlug))
    .limit(1);
  if (!category) return { ok: false, error: "That range no longer exists." };

  const [source] = await db
    .select({ id: schema.sourceDocuments.id })
    .from(schema.sourceDocuments)
    .where(eq(schema.sourceDocuments.slug, sourceSlug))
    .limit(1);
  if (!source) return { ok: false, error: "Unknown source document." };

  const benefit = text(formData.get("benefit")) ?? null;
  const olfactive = text(formData.get("olfactive")) ?? null;
  const published = formData.get("published") === "on";

  /*
   * The slug is set once, on creation, and never changed by an edit.
   *
   * It is the public URL. Renaming a product must not silently 404 every
   * inbound link and every search result pointing at the old address; changing
   * an address is a redirect problem, not a form field.
   */
  const slug = id ? undefined : slugify(text(formData.get("slug")) ?? name);

  if (slug !== undefined) {
    const clash = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, slug))
      .limit(1);
    if (clash.length > 0) {
      return { ok: false, error: `A product with the URL "${slug}" already exists.` };
    }
  }

  let productId: number;

  if (id) {
    await db
      .update(schema.products)
      .set({
        name,
        benefit,
        olfactive,
        categoryId: category.id,
        sourceId: source.id,
        published,
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, id));
    productId = id;
  } else {
    const [row] = await db
      .insert(schema.products)
      .values({
        slug: slug!,
        name,
        benefit,
        olfactive,
        categoryId: category.id,
        sourceId: source.id,
        published,
        // Human-entered content is not "authoritative" unless it came from a
        // document; the operator picked a source, so it did.
        status: "authoritative",
      })
      .returning({ id: schema.products.id });
    productId = row.id;
  }

  // Formats — replace the set rather than diff it.
  const formatNames = (text(formData.get("formats")) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await db
    .delete(schema.productFormats)
    .where(eq(schema.productFormats.productId, productId));

  for (const [index, formatName] of formatNames.entries()) {
    const formatSlug = slugify(formatName);
    const [format] = await db
      .insert(schema.formats)
      .values({ slug: formatSlug, name: formatName })
      .onConflictDoUpdate({
        target: schema.formats.slug,
        set: { name: formatName },
      })
      .returning({ id: schema.formats.id });

    await db
      .insert(schema.productFormats)
      .values({ productId, formatId: format.id, position: index })
      .onConflictDoNothing();
  }

  revalidateCatalogue();
  return { ok: true, message: `Saved “${name}”.` };
}

export async function deleteProduct(id: number): Promise<ActionResult> {
  await requireUserForAction();
  const db = getDb();
  if (!db) return { ok: false, error: "No database configured." };

  await db.delete(schema.products).where(eq(schema.products.id, id));
  revalidateCatalogue();
  return { ok: true, message: "Product deleted." };
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveCategory(formData: FormData): Promise<ActionResult> {
  await requireUserForAction();
  const db = getDb();
  if (!db) return { ok: false, error: "No database configured." };

  const idRaw = text(formData.get("id"));
  const id = idRaw ? Number(idRaw) : null;

  const name = text(formData.get("name"));
  if (!name) return { ok: false, error: "A range name is required." };

  const sourceSlug = text(formData.get("source"));
  if (!sourceSlug) {
    return { ok: false, error: "Choose the Cerium document this came from." };
  }

  const [source] = await db
    .select({ id: schema.sourceDocuments.id })
    .from(schema.sourceDocuments)
    .where(eq(schema.sourceDocuments.slug, sourceSlug))
    .limit(1);
  if (!source) return { ok: false, error: "Unknown source document." };

  const summary = text(formData.get("summary")) ?? null;
  const parentSlug = text(formData.get("parentSlug"));

  let parentId: number | null = null;
  if (parentSlug) {
    const [parent] = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.slug, parentSlug))
      .limit(1);
    if (!parent) return { ok: false, error: "That parent range no longer exists." };
    parentId = parent.id;
  }

  if (id) {
    // A category cannot become its own parent — that would detach the subtree
    // from the root and make the whole tree unrenderable.
    if (parentId === id) {
      return { ok: false, error: "A range cannot be its own parent." };
    }
    await db
      .update(schema.categories)
      .set({ name, summary, parentId, sourceId: source.id, updatedAt: new Date() })
      .where(eq(schema.categories.id, id));
  } else {
    const slug = slugify(text(formData.get("slug")) ?? name);
    const clash = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.slug, slug))
      .limit(1);
    if (clash.length > 0) {
      return { ok: false, error: `A range with the URL "${slug}" already exists.` };
    }

    await db
      .insert(schema.categories)
      .values({ slug, name, summary, parentId, sourceId: source.id });
  }

  revalidateCatalogue();
  return { ok: true, message: `Saved “${name}”.` };
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  await requireUserForAction();
  const db = getDb();
  if (!db) return { ok: false, error: "No database configured." };

  /*
   * Refuse rather than cascade.
   *
   * The foreign keys are ON DELETE RESTRICT, so Postgres would reject this
   * anyway — but a raw constraint violation is not something to show an
   * operator. Checking first turns it into a sentence explaining what to move.
   */
  const [{ products }] = await db
    .select({ products: sql<number>`count(*)::int` })
    .from(schema.products)
    .where(eq(schema.products.categoryId, id));

  if (products > 0) {
    return {
      ok: false,
      error: `That range still has ${products} product${products === 1 ? "" : "s"}. Move or delete them first.`,
    };
  }

  const [{ children }] = await db
    .select({ children: sql<number>`count(*)::int` })
    .from(schema.categories)
    .where(eq(schema.categories.parentId, id));

  if (children > 0) {
    return {
      ok: false,
      error: `That range still has ${children} sub-range${children === 1 ? "" : "s"}. Move or delete them first.`,
    };
  }

  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  revalidateCatalogue();
  return { ok: true, message: "Range deleted." };
}
