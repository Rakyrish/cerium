/**
 * Core content types for Cerium Chemicals.
 *
 * These describe the SHAPE the UI consumes. In Phase 1 they are satisfied by
 * the typed local data in `src/data`. From Phase 2 the same shapes will be
 * satisfied by the Django REST API via `src/lib/api`, so no UI component needs
 * to change when the data source moves.
 *
 * Every field is optional where Cerium has not yet supplied the information.
 * Components must degrade gracefully rather than render placeholder prose.
 */

/** A URL-safe identifier used in public routes. Never expose numeric IDs. */
export type Slug = string;

/**
 * Provenance marker. Records which supplied document a piece of copy came from
 * so nothing unattributed can quietly become "fact" later.
 *
 * The array is the source of truth and the type is derived from it, rather than
 * the other way round. A bare union cannot be iterated, so anything that has to
 * *offer* the choices — the Content Studio's source selector, and the API
 * validation behind it — would otherwise need a hand-maintained second copy of
 * this list, which is exactly how a provenance vocabulary drifts.
 */
export const SOURCE_DOCUMENTS = [
  "catalogue-2026",
  "pricelist-q3-2026",
  "fragrance-pricelist-q3-2026",
  "vision-statement",
  "logo",
  "website-ceriumchemicals.co.ke",
] as const;

export type SourceDocument = (typeof SOURCE_DOCUMENTS)[number];

/** Runtime guard, so untrusted input can be narrowed to the union. */
export function isSourceDocument(value: unknown): value is SourceDocument {
  return (
    typeof value === "string" &&
    (SOURCE_DOCUMENTS as ReadonlyArray<string>).includes(value)
  );
}

export interface Sourced {
  /** Which supplied Cerium document this content is taken from. */
  source: SourceDocument;
}

/* -------------------------------------------------------------------------- */
/* Imagery                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * An image reference.
 *
 * `cloudinaryId` is the forward path: once Cloudinary is populated the id is
 * set and `src` becomes unnecessary. Until then `src` may be omitted entirely,
 * in which case <CeriumImage> renders a clearly-labelled development
 * placeholder. Placeholder imagery is never presented as production content.
 */
export interface ImageRef {
  /** Cloudinary public id, once media has been uploaded. Preferred. */
  cloudinaryId?: string;
  /** Local/static path. Used for supplied brand assets. */
  src?: string;
  /** Required whenever a real image exists. Describes content, not filename. */
  alt?: string;
  width?: number;
  height?: number;
  /** Focal point for art-directed cropping, as CSS object-position. */
  focal?: string;
}

/* -------------------------------------------------------------------------- */
/* Taxonomy                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A product family (top level) or sub-family (nested).
 *
 * PROVISIONAL. The final taxonomy is decided in Phase 2 once product research
 * is complete. Nothing in the UI may assume a fixed set of categories — always
 * render from data.
 */
export interface Category {
  slug: Slug;
  name: string;
  /*
   * There is deliberately no `description` here.
   *
   * One previously existed alongside `summary` and was populated on none of the
   * 30 categories, while `summary` carried the real copy. Two free-text fields
   * with no rule distinguishing them is how a content model drifts: the second
   * one gets filled in inconsistently, or gets copied into the Phase 2 Django
   * schema as a column nobody can define. `Application` and `Industry` keep
   * `description` because theirs is populated and rendered.
   */
  /** Verbatim positioning copy from the 2026 catalogue, where available. */
  summary?: string;
  image?: ImageRef;
  /** Nested sub-families, e.g. Personal Care -> Skin Care. */
  children?: Category[];
  /** Application slugs this family commonly serves. Drives internal linking. */
  applicationSlugs?: Slug[];
  /**
   * Named products verified from supplied documents. Phase 1 lists names only —
   * technical data, specifications and documents arrive in later phases.
   */
  products?: ProductSummary[];
  source?: SourceDocument;
}

/**
 * Minimal product shape for Phase 1.
 *
 * Deliberately narrow. It carries only what the supplied documents actually
 * contain (name, benefit copy, application). Specifications, CAS numbers, INCI
 * names, documents and stock are explicitly out of scope until Phase 3-5, and
 * must not be invented to fill the card.
 */
export interface ProductSummary {
  slug: Slug;
  name: string;
  /** Benefit copy exactly as supplied by Cerium. Never paraphrased into claims. */
  benefit?: string;
  /** Category slug this product belongs to. */
  categorySlug?: Slug;
  /** Human-readable category label, for card display. */
  categoryName?: string;
  /**
   * End-product formats this material is supplied for, e.g. "Shampoo",
   * "Fabric softener". Drawn from `applicationFormats` in
   * `src/data/applications.ts`.
   *
   * NOT the same thing as an `Application`. This field was called
   * `applications` and held none of the six Application slugs — every value was
   * a format. Two entities behind one field name is a schema bug waiting to be
   * copied into PostgreSQL, so the field carries the name of what it actually
   * holds.
   */
  formats?: string[];
  /** Olfactive family — fragrances only. */
  olfactive?: string;
  image?: ImageRef;
  source?: SourceDocument;
}

/* -------------------------------------------------------------------------- */
/* Applications & industries                                                   */
/* -------------------------------------------------------------------------- */

/** An end-use format a customer formulates, e.g. Shampoo, Fabric Softener. */
export interface Application {
  slug: Slug;
  name: string;
  description?: string;
  image?: ImageRef;
  /** Parent grouping, e.g. "personal-care". */
  groupSlug?: Slug;
  /** Category slugs that supply this application. Drives Application -> Products. */
  categorySlugs?: Slug[];
  source?: SourceDocument;
}

/** A market Cerium serves. Kept separate from Application by design. */
export interface Industry {
  slug: Slug;
  name: string;
  description?: string;
  image?: ImageRef;
  applicationSlugs?: Slug[];
  source?: SourceDocument;
}

/* -------------------------------------------------------------------------- */
/* Company                                                                     */
/* -------------------------------------------------------------------------- */

export interface CoreValue {
  name: string;
  description: string;
  /** Scripture reference supplied alongside each value in the source document. */
  reference?: string;
}

export interface Partner {
  name: string;
  description: string;
  /** Partner marks are third-party trademarks; only used where supplied. */
  logo?: ImageRef;
}

/**
 * A company metric.
 *
 * Only figures Cerium states about itself. `asStated` records the exact wording
 * so it is never rounded, inflated or restated.
 */
export interface CompanyMetric extends Sourced {
  asStated: string;
  label: string;
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

export interface NavLink {
  label: string;
  href: string;
  /** Short description shown in mega-menu panels. */
  description?: string;
  /** Marks a link whose destination is planned but not yet built. */
  upcoming?: boolean;
}

export interface NavColumn {
  title?: string;
  links: NavLink[];
}

/**
 * The browse fallback rendered inside the search overlay.
 *
 * Deliberately narrow. `SearchOverlay` is a client component, so this is the
 * shape of the only catalogue-derived data that may cross into the browser —
 * labels and hrefs, never records.
 */
export interface BrowseLists {
  families: NavLink[];
  applications: NavLink[];
}

export interface NavItem {
  label: string;
  href: string;
  /** Presence of `columns` promotes this item to a mega-menu trigger. */
  columns?: NavColumn[];
  /** Optional editorial panel rendered beside the mega-menu columns. */
  feature?: {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
    linkLabel: string;
  };
}

/* -------------------------------------------------------------------------- */
/* SEO                                                                         */
/* -------------------------------------------------------------------------- */

export interface Breadcrumb {
  name: string;
  href: string;
}
