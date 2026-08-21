/**
 * Site-wide configuration.
 *
 * ---------------------------------------------------------------------------
 * EVERY VALUE HERE COMES FROM THE ROOT .env. NOTHING IS HARDCODED.
 * ---------------------------------------------------------------------------
 * There is one configuration file for the whole project, at the repository
 * root, shared by this application and the Django backend. If you are about to
 * type a domain, a phone number, an address or a colour into a source file,
 * add it to `.env.example` and read it here instead.
 *
 * ---------------------------------------------------------------------------
 * WHY EVERY KEY IS WRITTEN OUT LITERALLY
 * ---------------------------------------------------------------------------
 * `siteConfig` is imported by client components (`MobileNavigation`,
 * `error.tsx`), so these values have to survive into the browser bundle. Next
 * does that by textually replacing occurrences of `process.env.NEXT_PUBLIC_X`
 * at build time — which only works on a LITERAL member expression.
 *
 * A dynamic lookup like `process.env[name]` is not replaced. It compiles fine,
 * passes typecheck, works in every server component, and then silently
 * evaluates to `undefined` in the browser. That failure mode is why the block
 * below is a boring list of literal reads rather than a tidy loop, and why it
 * must stay that way.
 *
 * The `NEXT_PUBLIC_` prefix also means these are inlined when the image is
 * BUILT, not read when the container starts. Changing one requires a rebuild.
 */

const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,

  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME,
  companyTagline: process.env.NEXT_PUBLIC_COMPANY_TAGLINE,
  companyDescription: process.env.NEXT_PUBLIC_COMPANY_DESCRIPTION,
  companyStrapline: process.env.NEXT_PUBLIC_COMPANY_STRAPLINE,
  companyAreaServed: process.env.NEXT_PUBLIC_COMPANY_AREA_SERVED,

  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE,
  contactPhoneE164: process.env.NEXT_PUBLIC_CONTACT_PHONE_E164,
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL,

  addressStreet: process.env.NEXT_PUBLIC_ADDRESS_STREET,
  addressLocality: process.env.NEXT_PUBLIC_ADDRESS_LOCALITY,
  addressRegion: process.env.NEXT_PUBLIC_ADDRESS_REGION,
  addressCountry: process.env.NEXT_PUBLIC_ADDRESS_COUNTRY,
  addressCountryCode: process.env.NEXT_PUBLIC_ADDRESS_COUNTRY_CODE,

  openingHours: process.env.NEXT_PUBLIC_OPENING_HOURS,

  socialFacebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
  socialInstagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
  socialLinkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,

  brandThemeColor: process.env.NEXT_PUBLIC_BRAND_THEME_COLOR,
  brandOnDarkColor: process.env.NEXT_PUBLIC_BRAND_ON_DARK_COLOR,
  brandBackgroundColor: process.env.NEXT_PUBLIC_BRAND_BACKGROUND_COLOR,
  brandLogo: process.env.NEXT_PUBLIC_BRAND_LOGO,
  brandLogoInverse: process.env.NEXT_PUBLIC_BRAND_LOGO_INVERSE,
  brandLogoWidth: process.env.NEXT_PUBLIC_BRAND_LOGO_WIDTH,
  brandLogoHeight: process.env.NEXT_PUBLIC_BRAND_LOGO_HEIGHT,

  siteLocale: process.env.NEXT_PUBLIC_SITE_LOCALE,
  siteLanguage: process.env.NEXT_PUBLIC_SITE_LANGUAGE,
} as const;

/**
 * Read a value that the site cannot honestly render without.
 *
 * Throwing is the point. The alternative — a plausible-looking default — is
 * how a build ships with someone else's phone number or the wrong canonical
 * domain, and neither is visible by looking at the page. A missing variable
 * should stop the build with the name of the variable in the message.
 */
function required(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `${name} is not set. Every configuration value comes from the root .env — ` +
        `copy .env.example to .env and fill it in. Note that NEXT_PUBLIC_* values ` +
        `are inlined at build time, so this must be set when the image is BUILT.`,
    );
  }
  return trimmed;
}

/** Read a value whose absence is a legitimate state, not an error. */
function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function requiredNumber(value: string | undefined, name: string): number {
  const parsed = Number(required(value, name));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number, got "${value}".`);
  }
  return parsed;
}

/**
 * Parse the packed opening-hours string.
 *
 * Format: `<days>|<time>` entries separated by `;`. Packed rather than one
 * variable per row because the number of rows is editorial — Cerium may
 * publish two lines or four — and a fixed set of DAY_1/TIME_1 variables would
 * cap it at whatever we guessed today.
 *
 * An empty value yields no rows, which publishes no hours. That is correct:
 * inventing opening hours is exactly the class of guess this codebase refuses.
 */
function parseOpeningHours(
  value: string | undefined,
): ReadonlyArray<{ days: string; time: string }> {
  if (!value?.trim()) return [];

  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [days, time] = entry.split("|").map((part) => part.trim());
      if (!days || !time) {
        throw new Error(
          `NEXT_PUBLIC_OPENING_HOURS entry "${entry}" is malformed. ` +
            `Expected "<days>|<time>", entries separated by ";".`,
        );
      }
      return { days, time };
    });
}

const phoneE164 = required(
  env.contactPhoneE164,
  "NEXT_PUBLIC_CONTACT_PHONE_E164",
).replace(/[^\d]/g, "");

const email = required(env.contactEmail, "NEXT_PUBLIC_CONTACT_EMAIL");

/** No trailing slash, so `absoluteUrl` never produces a double slash. */
const rawSiteUrl = required(env.siteUrl, "NEXT_PUBLIC_SITE_URL").replace(
  /\/$/,
  "",
);

export const siteConfig = {
  name: required(env.companyName, "NEXT_PUBLIC_COMPANY_NAME"),
  tagline: required(env.companyTagline, "NEXT_PUBLIC_COMPANY_TAGLINE"),
  description: required(
    env.companyDescription,
    "NEXT_PUBLIC_COMPANY_DESCRIPTION",
  ),
  /** The line drawn on the generated social share image. */
  strapline: required(env.companyStrapline, "NEXT_PUBLIC_COMPANY_STRAPLINE"),
  areaServed: required(
    env.companyAreaServed,
    "NEXT_PUBLIC_COMPANY_AREA_SERVED",
  ),

  url: rawSiteUrl,
  locale: required(env.siteLocale, "NEXT_PUBLIC_SITE_LOCALE"),
  language: required(env.siteLanguage, "NEXT_PUBLIC_SITE_LANGUAGE"),

  contact: {
    phoneDisplay: required(env.contactPhone, "NEXT_PUBLIC_CONTACT_PHONE"),
    // Derived, not configured separately. Two variables for one number is two
    // things that can disagree, and the one people notice is the dialled one.
    phoneHref: `tel:+${phoneE164}`,
    email,
    emailHref: `mailto:${email}`,
    whatsappHref: `https://wa.me/${phoneE164}`,
  },

  address: {
    street: required(env.addressStreet, "NEXT_PUBLIC_ADDRESS_STREET"),
    locality: required(env.addressLocality, "NEXT_PUBLIC_ADDRESS_LOCALITY"),
    region: required(env.addressRegion, "NEXT_PUBLIC_ADDRESS_REGION"),
    country: required(env.addressCountry, "NEXT_PUBLIC_ADDRESS_COUNTRY"),
    countryCode: required(
      env.addressCountryCode,
      "NEXT_PUBLIC_ADDRESS_COUNTRY_CODE",
    ),
  },

  hours: parseOpeningHours(env.openingHours),

  /**
   * Social profiles.
   *
   * WhatsApp is derived from the phone number, so it is always present and
   * always consistent. The rest are `undefined` until Cerium confirms the
   * exact handles — `SocialLinks` renders only entries that have an href, and
   * `organizationSchema` omits them from `sameAs`. A guessed profile URL in
   * `sameAs` is a factual claim about an account that may not be Cerium's.
   */
  social: [
    { name: "WhatsApp", href: `https://wa.me/${phoneE164}` },
    { name: "Facebook", href: optional(env.socialFacebook) },
    { name: "Instagram", href: optional(env.socialInstagram) },
    { name: "LinkedIn", href: optional(env.socialLinkedin) },
  ] as ReadonlyArray<{ name: string; href?: string }>,

  brand: {
    /**
     * Must equal `--color-green-600` in `app/globals.css`.
     *
     * CSS cannot read the .env, so the design token is declared there and the
     * value is declared here for the consumers that are not CSS: the browser
     * theme colour, the web manifest and the generated social image. That is
     * the one duplication this file cannot remove, and globals.css carries a
     * matching note at the token.
     */
    themeColor: required(
      env.brandThemeColor,
      "NEXT_PUBLIC_BRAND_THEME_COLOR",
    ),
    /** Light tint for text on the brand-green social image. */
    onDarkColor: required(
      env.brandOnDarkColor,
      "NEXT_PUBLIC_BRAND_ON_DARK_COLOR",
    ),
    /** Splash/background colour for the installed web app. */
    backgroundColor: required(
      env.brandBackgroundColor,
      "NEXT_PUBLIC_BRAND_BACKGROUND_COLOR",
    ),
    logo: {
      src: required(env.brandLogo, "NEXT_PUBLIC_BRAND_LOGO"),
      alt: required(env.companyName, "NEXT_PUBLIC_COMPANY_NAME"),
      width: requiredNumber(env.brandLogoWidth, "NEXT_PUBLIC_BRAND_LOGO_WIDTH"),
      height: requiredNumber(
        env.brandLogoHeight,
        "NEXT_PUBLIC_BRAND_LOGO_HEIGHT",
      ),
    },
    /** Monochrome reversal of the supplied logo, for dark surfaces. */
    logoInverse: {
      src: required(env.brandLogoInverse, "NEXT_PUBLIC_BRAND_LOGO_INVERSE"),
      alt: required(env.companyName, "NEXT_PUBLIC_COMPANY_NAME"),
      width: requiredNumber(env.brandLogoWidth, "NEXT_PUBLIC_BRAND_LOGO_WIDTH"),
      height: requiredNumber(
        env.brandLogoHeight,
        "NEXT_PUBLIC_BRAND_LOGO_HEIGHT",
      ),
    },
  },
} as const;

/**
 * Cloudinary delivery.
 *
 * The cloud name is public — it appears in every image URL — so it carries the
 * NEXT_PUBLIC_ prefix. Unset is a supported state: `CeriumImage` falls back to
 * a visibly labelled development placeholder rather than a broken image.
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
 * SERVER ONLY, and read at runtime rather than inlined. No `NEXT_PUBLIC_`
 * prefix means Next will not put these in the client bundle; referencing this
 * object from a client component yields empty strings rather than leaking the
 * secret.
 *
 * Kept separate from `cloudinaryConfig` above precisely so the public delivery
 * name and the secret key cannot be confused at a call site.
 */
export const cloudinaryServerConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
  apiKey: process.env.CLOUDINARY_API_KEY ?? "",
  apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  folder: process.env.CLOUDINARY_FOLDER ?? "cerium",
  get isConfigured() {
    return (
      this.cloudName.length > 0 &&
      this.apiKey.length > 0 &&
      this.apiSecret.length > 0
    );
  },
} as const;

/**
 * The Django API.
 *
 * Server-side only and read at runtime, so it points at the compose service
 * name rather than the public domain — the request never leaves the container
 * network. Consumed from Phase 2.4C, when `lib/content.ts` moves off Drizzle.
 */
export const apiConfig = {
  baseUrl: (process.env.DJANGO_API_URL ?? "").replace(/\/$/, ""),
  get isConfigured() {
    return this.baseUrl.length > 0;
  },
} as const;

/**
 * The shared secret that proves a credential-verification request came from
 * this server.
 *
 * Server-side only and read at runtime — no `NEXT_PUBLIC_` prefix, so Next
 * cannot inline it into the browser bundle. It authenticates the *caller* of
 * `/api/admin/auth/verify/`, which is a password oracle and must not be
 * callable by anything else.
 *
 * Unset means sign-in refuses rather than proceeding unauthenticated. There is
 * no default: an empty expected token must never be read as "accept anything".
 */
export const adminAuthConfig = {
  serviceToken: process.env.ADMIN_AUTH_SERVICE_TOKEN ?? "",
  get isConfigured() {
    return this.serviceToken.length > 0;
  },
} as const;

/** Absolute URL helper — required for canonicals, OG tags and sitemaps. */
export function absoluteUrl(path = "/"): string {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
