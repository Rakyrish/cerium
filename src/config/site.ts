/**
 * Site-wide configuration.
 *
 * Contact details, address and hours are taken from supplied Cerium material
 * (2026 catalogue back cover, Q3 2026 fragrance price list footer, and the
 * current ceriumchemicals.co.ke site). Nothing here is invented.
 *
 * Anything environment-specific reads from process.env so no deployment detail
 * is baked into source.
 */

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://ceriumchemicals.co.ke";

export const siteConfig = {
  name: "Cerium Chemicals",
  /** Tagline is part of the supplied logo lockup. */
  tagline: "Sourcing made easy",
  /**
   * Legal/company descriptor, taken verbatim from the 2026 catalogue "About Us".
   * Note: the current WordPress site also lists food ingredients. The 2026
   * catalogue does not, so food is deliberately excluded pending confirmation.
   */
  description:
    "Cerium Chemicals is a customer-oriented company focused on delivering raw material solutions to the personal care and home care industries.",
  url: rawSiteUrl,
  locale: "en_KE",
  language: "en",

  contact: {
    // Catalogue back cover + fragrance price list footer
    phoneDisplay: "+254 724 532 892",
    phoneHref: "tel:+254724532892",
    email: "hello@ceriumchemicals.co.ke",
    emailHref: "mailto:hello@ceriumchemicals.co.ke",
    whatsappHref: "https://wa.me/254724532892",
  },

  address: {
    // Catalogue back cover
    street: "Bamburi Road, Building 22, Off Enterprise Road",
    locality: "Industrial Area",
    region: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
  },

  /** Opening hours as published on the current ceriumchemicals.co.ke site. */
  hours: [
    { days: "Monday – Friday", time: "8:30 AM – 6:00 PM" },
    { days: "Saturday", time: "8:30 AM – 2:00 PM" },
  ],

  /**
   * Social profiles.
   *
   * The current site links Facebook, Instagram and WhatsApp. Only WhatsApp has
   * a URL that can be derived with certainty from the supplied phone number, so
   * the others are left without `href` until Cerium confirms the exact handles.
   * `SocialLinks` renders only entries that have an href.
   */
  social: [
    { name: "WhatsApp", href: "https://wa.me/254724532892" },
    { name: "Facebook", href: undefined },
    { name: "Instagram", href: undefined },
    { name: "LinkedIn", href: undefined },
  ] as ReadonlyArray<{ name: string; href?: string }>,

  brand: {
    logo: {
      src: "/brand/cerium-logo.png",
      alt: "Cerium Chemicals",
      width: 800,
      height: 250,
    },
    /** Monochrome reversal of the supplied logo, for dark surfaces. */
    logoInverse: {
      src: "/brand/cerium-logo-white.png",
      alt: "Cerium Chemicals",
      width: 800,
      height: 250,
    },
  },
} as const;

/**
 * Cloudinary. Unset in Phase 1 — `CeriumImage` falls back to a labelled
 * development placeholder whenever no real asset is available.
 */
export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
  get isConfigured() {
    return this.cloudName.length > 0;
  },
} as const;

/**
 * Cloudinary server credentials — signing uploads from the admin.
 *
 * SERVER ONLY. These have no `NEXT_PUBLIC_` prefix, so Next will not inline
 * them into the client bundle; referencing this object from a client component
 * yields empty strings rather than leaking the secret. Uploads are signed on
 * the server and the browser never sees the API secret.
 *
 * Kept separate from `cloudinaryConfig` above precisely so the public delivery
 * name and the secret key cannot be confused for one another at a call site.
 */
export const cloudinaryServerConfig = {
  cloudName:
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    "",
  apiKey: process.env.CLOUDINARY_API_KEY ?? "",
  apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  get isConfigured() {
    return (
      this.cloudName.length > 0 &&
      this.apiKey.length > 0 &&
      this.apiSecret.length > 0
    );
  },
} as const;

/**
 * Retained only so an existing `.env` does not break.
 *
 * This pointed at a planned separate Django service. The admin is now part of
 * this Next.js application and reads Postgres directly, so nothing consumes
 * this value. See `CLAUDE.md` for the decision that changed it.
 */
export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  get isConfigured() {
    return this.baseUrl.length > 0;
  },
} as const;

/** Absolute URL helper — required for canonicals, OG tags and sitemaps. */
export function absoluteUrl(path = "/"): string {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
