/**
 * Cerium company content.
 *
 * SOURCE OF TRUTH: "VISION STATEMENT.docx" and the 2026 product catalogue.
 * Every string below is either verbatim or a faithful lightweight edit for
 * sentence case. No corporate claim, statistic, certification or credential has
 * been added. If it is not in a supplied document, it is not here.
 */

import type { CompanyMetric, CoreValue, Partner } from "@/types/content";

/** Verbatim from VISION STATEMENT.docx. */
export const vision =
  "To be the leading supplier of specialty raw materials in East and Central Africa by delivering innovative and sustainable solutions.";

/** Verbatim from VISION STATEMENT.docx. */
export const mission =
  "To drive growth for our customers by providing innovative raw material solutions, ensure reliable supply and sustainability by ethical sourcing and create a positive social impact in our community.";

/** Verbatim from the 2026 catalogue "About Us". */
export const aboutSummary =
  "We are a customer-oriented company focused on delivering raw material solutions to the personal care and home care industries.";

/** Verbatim from the 2026 catalogue "Our Products" opening. */
export const catalogueIntro =
  "With over 80 products in our catalogue, we bring you a wide variety of premium cosmetic and personal care ingredients designed to inspire innovation and quality in every formulation.";

/** The three-word statement on the 2026 catalogue cover. */
export const brandStatement = ["Innovate", "Enrich", "Beautify"] as const;

/**
 * Core values, verbatim from VISION STATEMENT.docx.
 * Each value carries a scripture reference in the source document; these are
 * retained because they are part of how Cerium states its values.
 */
export const coreValues: CoreValue[] = [
  {
    name: "Integrity",
    description:
      "We uphold honesty, transparency, and ethical practices in all our relationships and decisions.",
    reference: "Proverbs 10:9",
  },
  {
    name: "Excellence",
    description:
      "We strictly adhere to the best practices to assure our customers of consistent quality and set our goals to not only achieve but exceed existing industry standards.",
    reference: "Proverbs 22:29",
  },
  {
    name: "Innovation",
    description:
      "We challenge the norm and continuously develop to deliver cutting-edge, sustainable solutions.",
    reference: "Exodus 35:35",
  },
  {
    name: "Service",
    description:
      "We lead by inspiration to make our customer experiences memorable by offering the best services and customer support.",
    reference: "Colossians 3:23",
  },
  {
    name: "Stewardship",
    description:
      "We ensure responsible planning, management, and use of resources with the aim of ensuring their sustainability.",
    reference: "1 Peter 4:10",
  },
  {
    name: "Impact",
    description:
      "We aim to make a significant and positive difference to our customers, partners and community.",
    reference: "Matthew 5:16",
  },
];

/**
 * Metrics Cerium states about itself on the 2026 catalogue inside cover.
 * `asStated` preserves Cerium's exact wording. These are claims made by Cerium,
 * reproduced — not measurements made by us.
 */
export const companyMetrics: CompanyMetric[] = [
  { asStated: "100+", label: "Happy clients", source: "catalogue-2026" },
  { asStated: "10+", label: "Years of experience", source: "catalogue-2026" },
  { asStated: "80+", label: "Products in catalogue", source: "catalogue-2026" },
];

/**
 * Supply partners, verbatim from the 2026 catalogue "Global Partners in
 * Innovation". Partner names and marks are third-party trademarks.
 *
 * No partner logo files were supplied, so `logo` is intentionally absent and
 * the UI renders the partner name as type rather than a fabricated mark.
 */
export const partnersIntro =
  "At Cerium Chemicals, we partner with globally renowned suppliers to bring you the finest cosmetic and personal care ingredients — sustainably sourced, backed by science, and trusted by industry leaders worldwide.";

export const partners: Partner[] = [
  {
    name: "Provital",
    description:
      "Provital (Provital S.A.) is a Spain-based company specializing in natural active ingredients and botanical extracts for the cosmetic industry.",
  },
  {
    name: "Givaudan",
    description:
      "Givaudan S.A. is a Swiss multinational leader in flavours, fragrances, and active cosmetic ingredients.",
  },
  {
    name: "Umang",
    description:
      "Part of Umang Global Group, specializing in encapsulation technologies that protect and control the release of active ingredients in cosmetics, food, and nutraceuticals.",
  },
];

/** Closing line of the catalogue partners page. */
export const partnersStatement =
  "Together, we deliver quality, innovation, and reliability.";
