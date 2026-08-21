import type { Metadata } from "next";
import type { Breadcrumb } from "@/types/content";
import { absoluteUrl, siteConfig } from "@/config/site";

/**
 * SEO helpers.
 *
 * Two rules this file exists to enforce:
 * 1. Every indexable page declares a canonical URL. Duplicate-content dilution
 *    is the most common self-inflicted SEO wound and it is trivially avoidable.
 * 2. Descriptions are written from real Cerium information. Nothing here
 *    generates keyword-stuffed filler.
 */

interface PageMetaOptions {
  title: string;
  description: string;
  /** Site-root-relative path, e.g. "/products/fragrances". */
  path: string;
  /** Set false for pages that should not be indexed. */
  index?: boolean;
}

/**
 * The site-wide social share image.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS HAS TO BE STATED HERE
 * ---------------------------------------------------------------------------
 * `src/app/opengraph-image.tsx` generates the image, but Next only attaches it
 * automatically in two situations, and every other route fell through the gap
 * between them. Measured: 158 of 162 routes were sharing as a bare text card.
 *
 * The file convention is *segment-scoped*. Next injects it while resolving the
 * segment the file sits in — `app/` — and only when that segment's own metadata
 * has not already declared `openGraph.images`
 * (`mergeStaticMetadata` in next/dist/lib/metadata/resolve-metadata.js). Child
 * segments have no such file, so nothing re-injects it further down the tree.
 * What a child inherits instead is the *resolved* parent object — and a child
 * that exports its own `openGraph` REPLACES that object wholesale rather than
 * merging into it (`case 'openGraph'` in `mergeMetadata`, an assignment).
 *
 * So the image survived on exactly two kinds of route:
 *   - `/`, because `app/page.tsx` shares the root segment with the image file;
 *   - `/search`, because it declared no `openGraph` at all and inherited the
 *     root's resolved object intact — which is also precisely why it advertised
 *     the site root as its own `og:url`. That bug and this one were the same
 *     bug seen from two ends.
 *
 * Every other page goes through this helper, which does export `openGraph` —
 * and so dropped the image. Naming it here restores it for all of them at once,
 * and is the only place that can be done without repeating an image definition
 * across 158 pages.
 *
 * `twitter:image` is deliberately NOT set alongside it: Next back-fills
 * `twitter.images` from `openGraph.images` whenever the twitter object does not
 * declare its own (`postProcessMetadata`). Stating it twice would be two things
 * to keep in step for no gain.
 *
 * The dimensions duplicate the `size` export in `opengraph-image.tsx`. That
 * file is the source of truth and is deliberately not modified; if its size
 * ever changes, change it here too.
 */
const OG_IMAGE = {
  url: absoluteUrl("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} — ${siteConfig.tagline}`,
} as const;

export function buildMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetaOptions): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      url,
      siteName: siteConfig.name,
      title: `${title} | ${siteConfig.name}`,
      description,
      locale: siteConfig.locale,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Structured data                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Organization schema.
 *
 * Only properties backed by supplied material are emitted. No founding date,
 * employee count, rating or award is asserted — inventing structured data is
 * both dishonest and a manual-action risk.
 */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: siteConfig.name,
    url: siteConfig.url,
    slogan: siteConfig.tagline,
    description: siteConfig.description,
    logo: absoluteUrl(siteConfig.brand.logo.src),
    telephone: siteConfig.contact.phoneDisplay,
    email: siteConfig.contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.locality,
      addressRegion: siteConfig.address.region,
      addressCountry: siteConfig.address.countryCode,
    },
    areaServed: {
      "@type": "Place",
      name: "East and Central Africa",
    },
    sameAs: siteConfig.social
      .map((item) => item.href)
      .filter((href): href is string => Boolean(href)),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: siteConfig.url,
    name: siteConfig.name,
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: siteConfig.language,
  };
}

export function breadcrumbSchema(items: Breadcrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

/**
 * A collection of products, used on category pages.
 *
 * Emitted as ItemList rather than Product because Cerium has not supplied the
 * offer data (price, availability, SKU) that Product schema expects. Claiming
 * Product without it produces invalid markup and no rich result.
 */
export function itemListSchema(
  name: string,
  items: Array<{ name: string; path?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      /*
       * `url` is emitted whenever the caller can supply one.
       *
       * A ListItem carrying only a name tells a crawler that a list exists and
       * nothing about where its entries live, which wastes the one signal this
       * markup is good for. It stays optional because the shape is also used
       * for lists whose items have no page of their own — and a `url` pointing
       * at a route that does not exist is worse than no `url` at all.
       */
      ...(item.path ? { url: absoluteUrl(item.path) } : {}),
    })),
  };
}

/**
 * Product schema for a single product page.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY ABSENT, AND WHY
 * ---------------------------------------------------------------------------
 * `offers`, `sku`, `gtin`, `brand`, `manufacturer`, `aggregateRating` and
 * `review` are all omitted. Cerium has supplied none of them: prices exist in
 * the quarterly price lists but publishing them is a commercial decision that
 * has not been taken, there are no SKUs in any supplied document, and Cerium
 * distributes materials it does not necessarily manufacture — so naming a brand
 * or manufacturer would be a guess about a third party.
 *
 * The consequence is accepted knowingly: without `offers` this does not qualify
 * for a product rich result, and Search Console will report the recommended
 * field as missing. That is the correct trade. Fabricated offer data is a
 * manual-action risk and, for a chemicals supplier, a liability question rather
 * than a marketing one. The fields below are every property the supplied
 * material actually supports; the schema grows when real data arrives, not
 * before.
 *
 * `category` is the range name from Cerium's own taxonomy, not a guessed
 * industry classification.
 */
export function productSchema({
  name,
  path,
  description,
  category,
  image,
}: {
  name: string;
  path: string;
  description?: string;
  category?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url: absoluteUrl(path),
    ...(description ? { description } : {}),
    ...(category ? { category } : {}),
    ...(image ? { image: absoluteUrl(image) } : {}),
  };
}

/**
 * Trim source copy to a sensible meta-description length.
 *
 * Cuts on a word boundary so a truncated benefit never ends mid-word. This
 * shortens Cerium's own wording; it never rewrites or embellishes it, which is
 * the line that matters — a paraphrased benefit becomes a new claim, a
 * truncated one stays a quotation.
 */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max - 1);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > 0 ? cut.slice(0, boundary) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

/** Serialises JSON-LD safely for inline injection. */
export function jsonLd(schema: object): string {
  // Escaping `<` prevents a `</script>` inside any string from closing the tag.
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
