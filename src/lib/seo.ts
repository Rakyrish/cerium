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
  items: Array<{ name: string }>,
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
    })),
  };
}

/** Serialises JSON-LD safely for inline injection. */
export function jsonLd(schema: object): string {
  // Escaping `<` prevents a `</script>` inside any string from closing the tag.
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
