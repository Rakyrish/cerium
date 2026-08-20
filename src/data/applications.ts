/**
 * Applications and industries.
 *
 * SOURCE OF TRUTH: 2026 catalogue ("Our Products" page) and the Q3 2026
 * fragrance price list (which states the application for each fragrance).
 *
 * Application descriptions are verbatim from the catalogue. The `formats` list
 * contains only end-product formats Cerium itself names in the fragrance price
 * list — nothing has been added to round out the list.
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

import type { Application, Industry } from "@/types/content";

export const applications: Application[] = [
  {
    slug: "skin-care",
    name: "Skin Care",
    description:
      "Active ingredients and natural extracts that support hydration, protection, and a healthy glow.",
    groupSlug: "personal-care",
    categorySlugs: [
      "skin-care-actives",
      "natural-extracts",
      "milk-extracts",
      "carrier-oils",
      "natural-butters",
      "natural-scrubs",
      "sunscreen-actives",
      "emollients",
    ],
    source: "catalogue-2026",
  },
  {
    slug: "hair-care",
    name: "Hair Care",
    description:
      "Functional and nourishing materials designed to strengthen, condition, and enhance hair vitality.",
    groupSlug: "personal-care",
    categorySlugs: [
      "hair-care-actives",
      "natural-extracts",
      "carrier-oils",
      "conditioning-agents",
      "silicones",
      "anti-dandruff",
    ],
    source: "catalogue-2026",
  },
  {
    slug: "bath-and-shower",
    name: "Bath & Shower",
    description:
      "Mild surfactants, exfoliants, and sensorial ingredients for refreshing and luxurious cleansing experiences.",
    groupSlug: "personal-care",
    categorySlugs: [
      "natural-scrubs",
      "milk-extracts",
      "personal-care-fragrances",
      "anti-bacterial",
      "preservatives",
    ],
    source: "catalogue-2026",
  },
  {
    slug: "fabric-care",
    name: "Fabric Care",
    description:
      "Ingredients that protect fibers, boost freshness, and improve fabric softness and longevity.",
    groupSlug: "home-care",
    categorySlugs: [
      "fabric-care-fragrances",
      "encapsulated-fragrances",
      "multi-purpose-fragrances",
    ],
    source: "catalogue-2026",
  },
  {
    slug: "surface-care",
    name: "Surface Care",
    description:
      "Powerful cleaning agents and additives that deliver spotless, hygienic, and streak-free results.",
    groupSlug: "home-care",
    categorySlugs: ["multi-purpose-fragrances", "anti-bacterial"],
    source: "catalogue-2026",
  },
  {
    slug: "air-care",
    name: "Air Care",
    description:
      "Fragrance ingredients and odor-neutralizing solutions that create pleasant, long-lasting freshness.",
    groupSlug: "home-care",
    categorySlugs: ["multi-purpose-fragrances", "essential-oils"],
    source: "catalogue-2026",
  },
];

/**
 * End-product formats Cerium names in the Q3 2026 fragrance price list.
 *
 * These are display-only in Phase 1. They become filterable once product data
 * is ingested and the Product -> Application relationship exists in the
 * database (Phase 2-4).
 */
export const applicationFormats: ReadonlyArray<string> = [
  "Shampoo",
  "Conditioner",
  "Hair gel",
  "Shower gel",
  "Handwash",
  "Body lotion",
  "Body creams",
  "Body splash",
  "After shave",
  "Fabric softener",
  "Liquid laundry",
  "Liquid multipurpose",
];

export function getApplicationBySlug(slug: string): Application | undefined {
  return applications.find((application) => application.slug === slug);
}

/* -------------------------------------------------------------------------- */
/* Industries                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Industries Cerium states it serves.
 *
 * Deliberately limited to the two named in the 2026 catalogue: "raw material
 * solutions to the personal care and home care industries".
 *
 * NOTE FOR REVIEW: the current ceriumchemicals.co.ke site also lists a Food
 * Ingredients range. The 2026 catalogue does not mention food, so it is not
 * represented here. If food is still an active line it should be added — the
 * routing and components already support additional industries with no code
 * changes.
 */
export const industries: Industry[] = [
  {
    slug: "personal-care",
    name: "Personal Care",
    description:
      "Premium ingredients crafted to help brands develop safe, effective, and high-performing personal care products.",
    applicationSlugs: ["skin-care", "hair-care", "bath-and-shower"],
    source: "catalogue-2026",
  },
  {
    slug: "home-care",
    name: "Home Care",
    description:
      "High-quality ingredients that empower brands to create effective, safe, and sustainable cleaning and freshening solutions.",
    applicationSlugs: ["fabric-care", "surface-care", "air-care"],
    source: "catalogue-2026",
  },
];

export function getIndustryBySlug(slug: string): Industry | undefined {
  return industries.find((industry) => industry.slug === slug);
}
