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
 */
export type SourceDocument =
  | "catalogue-2026"
  | "pricelist-q3-2026"
  | "fragrance-pricelist-q3-2026"
  | "vision-statement"
  | "logo"
  | "website-ceriumchemicals.co.ke";

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
  /** Short editorial line. Only present where Cerium has supplied wording. */
  description?: string;
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
  /** Applications this product is supplied for, per Cerium documents. */
  applications?: string[];
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
