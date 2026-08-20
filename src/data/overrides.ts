/**
 * Catalogue overrides — content added through the Content Studio (`/studio`).
 *
 * WHY THIS IS SEPARATE FROM `taxonomy.ts`
 *
 * `taxonomy.ts` holds catalogue data that was transcribed from Cerium's supplied
 * documents and checked line by line, with a `source` on every entry. That file
 * is reviewed code and should stay that way — a tool writing to it would mean
 * machine-generated edits landing in the middle of verified content, and the
 * provenance would rot within a phase or two.
 *
 * So the Studio writes here instead, and this layer is merged on top at load.
 * Reviewed data is never rewritten, and everything added through the UI is
 * visible in one small JSON file that is easy to read in a diff before it ships.
 *
 * This file is bundled at build time. Content added in development must be
 * committed and deployed like any other change — the Studio does not edit a
 * live site. That is a property of Phase 1 being a statically generated
 * frontend, not a limitation of the tool; the production CMS arrives with
 * Django in Phase 2.
 */

/*
 * SERVER ONLY.
 *
 * The catalogue was removed from the client bundle in commit `687827b`, and
 * until now nothing enforced that. A single `"use client"` on a component that
 * imports this module would have put all 122 product records back into the
 * browser with no type error, no lint error and no build failure — a
 * regression visible only to someone re-probing the emitted chunks.
 *
 * This turns that convention into a build error. Client components receive
 * catalogue-derived data as props from a server parent; see the navigation
 * accessors in `src/lib/content.ts`.
 */
import "server-only";

import type { Category, ImageRef, ProductSummary, SourceDocument } from "@/types/content";
import overridesData from "@/data/catalogue.overrides.json";

export interface CategoryOverride {
  slug: string;
  name: string;
  summary?: string;
  /** Attach beneath an existing category. Omit for a new top-level family. */
  parentSlug?: string;
  image?: ImageRef;
  /**
   * Required, unlike on `Category` itself.
   *
   * The reviewed catalogue in `taxonomy.ts` has 100% provenance coverage by
   * discipline rather than by type. Studio-authored content has no such
   * discipline behind it — it is written through a form — so the one place a
   * missing source can actually enter the catalogue is the one place the
   * compiler insists on it.
   */
  source: SourceDocument;
}

export interface ProductOverride {
  slug: string;
  name: string;
  /** Slug of the category this product belongs to. Must already exist. */
  categorySlug: string;
  benefit?: string;
  olfactive?: string;
  /** End-product formats, not `Application` slugs. See `ProductSummary.formats`. */
  formats?: string[];
  image?: ImageRef;
  source: SourceDocument;
}

export interface CatalogueOverrides {
  categories: CategoryOverride[];
  products: ProductOverride[];
}

export const overrides = overridesData as CatalogueOverrides;

/** Deep copy so merging never mutates the module-level taxonomy objects. */
function cloneCategory(category: Category): Category {
  return {
    ...category,
    products: category.products ? [...category.products] : undefined,
    children: category.children?.map(cloneCategory),
  };
}

function findCategory(nodes: Category[], slug: string): Category | undefined {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = node.children && findCategory(node.children, slug);
    if (found) return found;
  }
  return undefined;
}

/**
 * Merge Studio content into the reviewed taxonomy.
 *
 * Categories are applied before products so a product can be added to a
 * category created in the same session. Anything pointing at a parent that does
 * not exist is skipped rather than silently dropped at top level — a typo in a
 * slug should not quietly restructure the catalogue.
 */
export function applyOverrides(
  base: Category[],
  data: CatalogueOverrides = overrides,
): Category[] {
  const tree = base.map(cloneCategory);

  for (const entry of data.categories) {
    if (findCategory(tree, entry.slug)) continue; // never shadow existing data

    const category: Category = {
      slug: entry.slug,
      name: entry.name,
      summary: entry.summary,
      image: entry.image,
      source: entry.source,
      products: [],
    };

    if (!entry.parentSlug) {
      tree.push(category);
      continue;
    }

    const parent = findCategory(tree, entry.parentSlug);
    if (!parent) continue;
    parent.children = [...(parent.children ?? []), category];
  }

  for (const entry of data.products) {
    const parent = findCategory(tree, entry.categorySlug);
    if (!parent) continue;
    if (parent.products?.some((product) => product.slug === entry.slug)) continue;

    const product: ProductSummary = {
      slug: entry.slug,
      name: entry.name,
      benefit: entry.benefit,
      olfactive: entry.olfactive,
      formats: entry.formats,
      image: entry.image,
      source: entry.source,
    };

    parent.products = [...(parent.products ?? []), product];
  }

  return tree;
}
