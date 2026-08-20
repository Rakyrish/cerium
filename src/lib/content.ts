/**
 * Content access layer — the seam between the UI and the data source.
 *
 * ---------------------------------------------------------------------------
 * THE RULE
 * ---------------------------------------------------------------------------
 * **Catalogue records — categories, products, applications, industries — are
 * read only through these functions.**
 *
 * That is narrower than the rule this file used to state ("never import from
 * `src/data` directly"), which was stricter than the codebase has ever been and
 * stricter than it needs to be. Three kinds of import are NOT covered and are
 * fine as direct imports:
 *
 *   - pure predicates and tree helpers (`isPublishable`, `flattenCategories`)
 *     — logic, not a data source;
 *   - non-catalogue content (`company.ts`, `media.ts`) — see the note below;
 *   - the development-only Content Studio, which is exempt by design.
 *
 * ---------------------------------------------------------------------------
 * NON-CATALOGUE CONTENT — a decided question, not an open one
 * ---------------------------------------------------------------------------
 * `company.ts` and `media.ts` stay as directly-imported build-time modules and
 * deliberately get no accessors here. They are small, editorial, change at the
 * pace of the brand rather than the catalogue, and nothing about the Phase 2
 * API migration requires them to move. If company content later becomes
 * API-backed, it gains accessors then — as a decision, not as drift.
 *
 * `navigation.ts` is the exception and has moved behind the seam, because it is
 * *derived from* catalogue records: `fetchPrimaryNavigation` and friends below.
 *
 * ---------------------------------------------------------------------------
 * WHY EVERY FUNCTION IS ASYNC
 * ---------------------------------------------------------------------------
 * Today they all resolve against the local typed data. When the Django REST API
 * arrives (Phase 2) only this file changes: each function gains a `fetch`
 * against `apiConfig.baseUrl` with the local data kept as the fallback. The
 * async signatures mean that swap requires no caller signature change and makes
 * no component newly-suspending.
 *
 * This only holds for *server* callers. A client component cannot await a
 * module-scope import, so client components receive what they need as props
 * from a server parent — see `fetchPrimaryNavigation` and `fetchBrowseLists`.
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

import { cache } from "react";

import type {
  Application,
  BrowseLists,
  Category,
  Industry,
  NavColumn,
  NavItem,
  ProductSummary,
} from "@/types/content";
/*
 * The reviewed local catalogue is now the FALLBACK, not the source. It is
 * imported for its records (the seed / outage floor) and for `isPublishable`,
 * which is a predicate rather than a data source and applies to whichever tree
 * resolved. The other tree helpers are re-implemented below against the
 * resolved tree — calling the originals would silently read local data and
 * bypass Postgres entirely.
 */
import { categories, isPublishable } from "@/data/taxonomy";
import { applicationFormats, applications, industries } from "@/data/applications";
import {
  buildBrowseLists,
  buildFooterNavigation,
  buildPrimaryNavigation,
} from "@/data/navigation";
import {
  dbFetchApplications,
  dbFetchCategoryTree,
  dbFetchIndustries,
} from "@/db/queries";

/* -------------------------------------------------------------------------- */
/* Source resolution — database first, reviewed local data as the floor        */
/* -------------------------------------------------------------------------- */

/**
 * The catalogue tree, from Postgres when there is one.
 *
 * ---------------------------------------------------------------------------
 * WHY THE LOCAL DATA IS STILL HERE
 * ---------------------------------------------------------------------------
 * It is tempting to delete `src/data/taxonomy.ts` once the database is seeded.
 * It stays, and is load-bearing, for three reasons:
 *
 *   1. `next build` runs inside a Docker build stage with no route to the `db`
 *      service. Every catalogue page would fail to prerender if a database
 *      were mandatory, so the build renders from the reviewed data and runtime
 *      serves from Postgres.
 *   2. A database outage should degrade a static marketing site to "slightly
 *      stale", not to a 500. Falling back keeps 122 product pages answering.
 *   3. It is the seed. `npm run db:seed` reads exactly this, so it is the
 *      documented way back to a known-good catalogue.
 *
 * The consequence to understand: pages built without a database show reviewed
 * content until something revalidates them. Admin writes call `revalidatePath`
 * precisely so that window closes the moment anyone edits.
 *
 * `cache` dedupes within a single render — one request reads the tree once, no
 * matter how many components ask for it.
 */
const resolveCategories = cache(async (): Promise<Category[]> => {
  try {
    const fromDb = await dbFetchCategoryTree();
    if (fromDb && fromDb.length > 0) return fromDb;
  } catch (error) {
    // Never let a database problem take a page down. Log loudly, serve the
    // reviewed catalogue, and the site stays up while someone investigates.
    console.error(
      "[content] database read failed, serving reviewed local catalogue:",
      error instanceof Error ? error.message : error,
    );
  }
  return categories;
});

const resolveApplications = cache(async (): Promise<Application[]> => {
  try {
    const fromDb = await dbFetchApplications();
    if (fromDb && fromDb.length > 0) return fromDb;
  } catch (error) {
    console.error(
      "[content] application read failed, using local data:",
      error instanceof Error ? error.message : error,
    );
  }
  return applications;
});

const resolveIndustries = cache(async (): Promise<Industry[]> => {
  try {
    const fromDb = await dbFetchIndustries();
    if (fromDb && fromDb.length > 0) return fromDb;
  } catch (error) {
    console.error(
      "[content] industry read failed, using local data:",
      error instanceof Error ? error.message : error,
    );
  }
  return industries;
});

/* -------------------------------------------------------------------------- */
/* Tree helpers that work on the RESOLVED tree                                 */
/* -------------------------------------------------------------------------- */

/**
 * These mirror the pure helpers in `data/taxonomy.ts` but operate on whichever
 * tree resolved above. The originals still exist and are still imported for
 * their predicate role; what changed is that anything reading *records* has to
 * walk the resolved tree, or the database would be bypassed.
 */
function flatten(nodes: Category[]): Category[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
}

function productsIn(category: Category): ProductSummary[] {
  return flatten([category]).flatMap((node) =>
    (node.products ?? []).map((product) => ({
      ...product,
      categorySlug: product.categorySlug ?? node.slug,
      categoryName: product.categoryName ?? node.name,
    })),
  );
}

function pathTo(slug: string, nodes: Category[]): Category[] {
  for (const node of nodes) {
    if (node.slug === slug) return [node];
    const descent = pathTo(slug, node.children ?? []);
    if (descent.length > 0) return [node, ...descent];
  }
  return [];
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export async function fetchCategories(): Promise<Category[]> {
  return resolveCategories();
}

export async function fetchCategory(slug: string): Promise<Category | null> {
  const tree = await resolveCategories();
  return flatten(tree).find((category) => category.slug === slug) ?? null;
}

/**
 * Slugs that get a page — used for static params and the sitemap.
 *
 * Filtered by `isPublishable`, so a sub-range with no products and no children
 * never produces a thin page or a dead link.
 */
export async function fetchAllCategorySlugs(): Promise<string[]> {
  const tree = await resolveCategories();
  return flatten(tree).filter(isPublishable).map((category) => category.slug);
}

export async function fetchProductsInCategory(
  category: Category,
): Promise<ProductSummary[]> {
  return productsIn(category);
}

export async function fetchProductCount(category: Category): Promise<number> {
  return productsIn(category).length;
}

/** Total distinct products currently modelled. Derived, never hardcoded. */
export async function fetchTotalProductCount(): Promise<number> {
  const tree = await resolveCategories();
  return tree.flatMap(productsIn).length;
}

/**
 * The whole catalogue, each product carrying its owning range.
 *
 * Feeds the A-Z index on /products. Reasonable at 122 products rendered once on
 * the server; when the catalogue is large enough for that to stop being true,
 * this becomes a paginated query in Phase 2 and the seam is already in place.
 */
export async function fetchAllProducts(): Promise<ProductSummary[]> {
  const tree = await resolveCategories();
  return tree.flatMap(productsIn);
}

/**
 * A single product by slug.
 *
 * Phase 1 has no product detail route, so the only caller today is the contact
 * page resolving `?product=<slug>` for a pre-composed enquiry. It exists here
 * rather than as a `getAllProducts().find()` at the call site because that is a
 * catalogue record read, and because Phase 2 turns it into a single indexed
 * lookup instead of a full-catalogue scan.
 */
export async function fetchProduct(
  slug: string,
): Promise<ProductSummary | null> {
  const all = await fetchAllProducts();
  return all.find((product) => product.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Products — detail routing                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a product from its canonical `(category, product)` pair.
 *
 * The category is matched against the range that DECLARES the product, not any
 * ancestor that contains it, which is what keeps one product on one URL. Ask
 * for `/products/fragrances/all-the-time` and this returns null even though
 * "All the Time" really does sit somewhere beneath Fragrances — that path is a
 * duplicate of the canonical
 * `/products/personal-care-fragrances/all-the-time`, and serving the same
 * product on two URLs is exactly the self-inflicted duplication `lib/seo.ts`
 * exists to prevent. The route calls `notFound()` on null.
 */
export async function fetchProductInCategory(
  categorySlug: string,
  productSlug: string,
): Promise<ProductSummary | null> {
  const category = await fetchCategory(categorySlug);
  if (!category) return null;

  // Own products only — not the subtree. This is what keeps one product on one
  // canonical URL; see the note above.
  const own = (category.products ?? []).map((product) => ({
    ...product,
    categorySlug: product.categorySlug ?? category.slug,
    categoryName: product.categoryName ?? category.name,
  }));

  return own.find((product) => product.slug === productSlug) ?? null;
}

/**
 * Every canonical product route, for `generateStaticParams` and the sitemap.
 *
 * Derived by walking the tree and pairing each product with the range that
 * declares it, so the routes, the internal links and the sitemap are all
 * generated from one traversal and cannot disagree. A category that declares a
 * product is publishable by definition (`isPublishable`), so every parent
 * listing these pages link back to is guaranteed to exist.
 */
export async function fetchAllProductParams(): Promise<
  Array<{ category: string; product: string }>
> {
  const tree = await resolveCategories();
  return flatten(tree).flatMap((node) =>
    (node.products ?? []).map((product) => ({
      category: node.slug,
      product: product.slug,
    })),
  );
}

/**
 * Every category that has a page of its own, flattened.
 *
 * `fetchCategories` returns the tree, which is what page layouts need. Search
 * needs the flat set, and filtered by `isPublishable` so a result can never
 * link to a range with no route.
 */
export async function fetchPublishableCategories(): Promise<Category[]> {
  const tree = await resolveCategories();
  return flatten(tree).filter(isPublishable);
}

/** Ancestors of a category, root-first and inclusive. Drives breadcrumbs. */
export async function fetchCategoryPath(slug: string): Promise<Category[]> {
  const tree = await resolveCategories();
  return pathTo(slug, tree);
}

/**
 * Products shown alongside a product.
 *
 * ---------------------------------------------------------------------------
 * WHAT JUSTIFIES THE RELATIONSHIP
 * ---------------------------------------------------------------------------
 * Shared position in Cerium's own taxonomy — nothing else. No chemical
 * compatibility, formulation similarity, application suitability or technical
 * equivalence is inferred, because none of that has been supplied and inferring
 * it for a chemicals supplier is a safety matter, not a UX one. The caller
 * receives the `scope` category back so the section can be headed with the
 * relationship that actually holds ("More from Carrier Oils") instead of an
 * unsupported word like "alternatives" or "similar products".
 *
 * The scope starts at the product's own range and widens one ancestor at a
 * time only until enough siblings exist, so the tightest true relationship
 * always wins. Milk Extracts has two products, so its neighbours come from
 * Natural Ingredients and the heading says so.
 *
 * Selection is offset by the product's own position and wraps, which is
 * deterministic — identical on every build, so static output stays stable —
 * while still giving neighbouring products different neighbours instead of
 * pinning the same four items to all 122 pages.
 */
export interface RelatedProducts {
  /** The real ancestor the neighbours were drawn from. Never inferred. */
  scope: Category;
  products: ProductSummary[];
}

export async function fetchRelatedProducts(
  product: ProductSummary,
  limit = 4,
): Promise<RelatedProducts | null> {
  if (!product.categorySlug) return null;

  const tree = await resolveCategories();
  const path = pathTo(product.categorySlug, tree);
  if (path.length === 0) return null;

  // Leaf first, then each ancestor. `pathTo` returns root-first.
  const scopes = [...path].reverse();

  let widest: RelatedProducts | null = null;

  for (const scope of scopes) {
    const pool = productsIn(scope);
    const index = pool.findIndex((item) => item.slug === product.slug);

    // Rotate so each product sees a different slice of its own range.
    const rotated =
      index >= 0
        ? [...pool.slice(index + 1), ...pool.slice(0, index)]
        : pool;
    const siblings = rotated.filter((item) => item.slug !== product.slug);

    if (siblings.length === 0) continue;

    const candidate: RelatedProducts = {
      scope,
      products: siblings.slice(0, limit),
    };

    // The tightest scope that can fill the row wins outright.
    if (siblings.length >= limit) return candidate;

    // Otherwise remember the best partial and keep widening.
    if (!widest || candidate.products.length > widest.products.length) {
      widest = candidate;
    }
  }

  return widest;
}

/* -------------------------------------------------------------------------- */
/* Applications                                                                */
/* -------------------------------------------------------------------------- */

export async function fetchApplications(): Promise<Application[]> {
  return resolveApplications();
}

export async function fetchApplication(
  slug: string,
): Promise<Application | null> {
  const all = await resolveApplications();
  return all.find((application) => application.slug === slug) ?? null;
}

/**
 * End-product formats Cerium names in the Q3 2026 fragrance price list.
 *
 * Display-only today, and a plain string array — but it is catalogue content,
 * not site furniture, and it becomes a first-class entity when product data is
 * ingested. Reading it through the seam now means that promotion is a change to
 * this file rather than to the two pages that render it.
 */
export async function fetchApplicationFormats(): Promise<ReadonlyArray<string>> {
  return applicationFormats;
}

/*
 * There is deliberately no `fetchProductsForApplication` accessor.
 *
 * One existed and returned every product inside the categories an application
 * declares. The application page rendered the result under "Ingredients for
 * skin care", which asserted a per-product suitability claim derived from
 * nothing but containment — the same inference that removed the applications
 * block from the product page, in the opposite direction.
 *
 * `Product -> Application` is a stored many-to-many that does not exist
 * (`docs/phase-2-2a-schema-specification.md` §4.4). Category -> Application
 * does, and `fetchCategoriesForApplication` below returns it. Application pages
 * navigate to ranges; each range lists its own products, where the containment
 * relationship is the one being shown and is therefore true.
 *
 * Reinstate a product-level accessor when the join exists — not before, and
 * not by widening this one.
 */

/** Categories that supply an application. Drives internal linking. */
export async function fetchCategoriesForApplication(
  application: Application,
): Promise<Category[]> {
  const slugs = new Set(application.categorySlugs ?? []);
  const tree = await resolveCategories();
  return flatten(tree).filter((category) => slugs.has(category.slug));
}

/*
 * There is deliberately no `fetchApplicationsForCategory` accessor.
 *
 * One existed briefly and resolved a product's applications by walking up to
 * the nearest ancestor category that declared `applicationSlugs`. It was
 * removed because the product page was its only caller and the relationship it
 * produced is not one the data supports: Category -> Application is declared,
 * but Product -> Application is a stored many-to-many that does not exist
 * (`docs/phase-2-2a-schema-specification.md` §4.4, "REQUIRED — does not
 * exist"). Presenting the category's applications on a product page states
 * that a specific material is used in skin care on the strength of where it
 * sits in a provisional taxonomy — which is an inference, and for a raw
 * material it is a formulation claim.
 *
 * Category pages still show their own applications, because there the
 * relationship is the one that was actually declared. Restore a product-level
 * accessor when the join exists, not before.
 */

/* -------------------------------------------------------------------------- */
/* Industries                                                                  */
/* -------------------------------------------------------------------------- */

export async function fetchIndustries(): Promise<Industry[]> {
  return resolveIndustries();
}

export async function fetchIndustry(slug: string): Promise<Industry | null> {
  const all = await resolveIndustries();
  return all.find((industry) => industry.slug === slug) ?? null;
}

export async function fetchApplicationsForIndustry(
  industry: Industry,
): Promise<Application[]> {
  const slugs = new Set(industry.applicationSlugs ?? []);
  const all = await resolveApplications();
  return all.filter((application) => slugs.has(application.slug));
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

/*
 * Navigation is derived from catalogue records, so it belongs behind the seam
 * even though it is not itself a record.
 *
 * These are what keep the catalogue out of the browser. `Header`,
 * `MobileNavigation` and `SearchOverlay` are client components; they receive
 * the finished link structures as props from a server parent rather than
 * importing the data modules and deriving it themselves. What crosses the
 * boundary is roughly a dozen labels and hrefs instead of the whole tree.
 */

export async function fetchPrimaryNavigation(): Promise<NavItem[]> {
  const [cats, apps, inds] = await Promise.all([
    fetchCategories(),
    fetchApplications(),
    fetchIndustries(),
  ]);
  return buildPrimaryNavigation(cats, apps, inds);
}

export async function fetchFooterNavigation(): Promise<NavColumn[]> {
  const [cats, apps, inds] = await Promise.all([
    fetchCategories(),
    fetchApplications(),
    fetchIndustries(),
  ]);
  return buildFooterNavigation(cats, apps, inds);
}

/** The browse fallback inside the search overlay. Labels and hrefs only. */
export async function fetchBrowseLists(): Promise<BrowseLists> {
  const [cats, apps] = await Promise.all([
    fetchCategories(),
    fetchApplications(),
  ]);
  return buildBrowseLists(cats, apps);
}
