/**
 * Site imagery — the one-off editorial images that are not attached to a
 * category, application, industry or product.
 *
 * ---------------------------------------------------------------------------
 * HOW TO ADD AN IMAGE
 * ---------------------------------------------------------------------------
 * 1. Drop the file into `frontend/public/images/` (see the README there).
 * 2. Fill in `src` and `alt` below. That is the whole job — no component needs
 *    to be edited.
 *
 *    hero: {
 *      src: "/images/hero-warehouse.jpg",
 *      alt: "Drums of raw materials in the Cerium warehouse, Nairobi",
 *    },
 *
 * 3. Delete the `placeholder` line once a real image is set — it only feeds the
 *    "Image pending" development placeholder.
 *
 * Leave an entry empty and its slot keeps rendering the labelled placeholder.
 * Both states are safe; nothing breaks either way.
 *
 * Once Cloudinary is set up, use `cloudinaryId` instead of `src` and the same
 * entries deliver AVIF/WebP at responsive widths automatically.
 * ---------------------------------------------------------------------------
 *
 * ALT TEXT: describe what is in the picture and why it is there, not the
 * filename. If an image is purely decorative, use `alt: ""` — never omit the
 * field and never write "image of…".
 */

import type { ImageRef } from "@/types/content";

/** An image slot that may not be filled yet. */
interface MediaSlot {
  /** Undefined until Cerium supplies a real asset. */
  image?: ImageRef;
  /** Description of the intended shot, shown on the dev placeholder. */
  placeholder: string;
}

export const siteMedia = {
  /**
   * Homepage hero background.
   *
   * Setting this switches the hero from its typographic treatment to a
   * full-bleed image with a scrim — the layout and contrast already handle it.
   * Needs to be wide and dark-tolerant; text sits over the left half.
   * Recommended: 2400×1350 or larger, landscape.
   */
  hero: {
    image: undefined,
    placeholder: "Wide hero image — ingredients, laboratory or warehouse",
  } satisfies MediaSlot,

  /** Homepage "Who we are" portrait, beside the vision and mission. */
  companyIntro: {
    image: undefined,
    placeholder: "Cerium team or Nairobi warehouse operations",
  } satisfies MediaSlot,

  /** About page portrait, beside vision, mission and the company metrics. */
  aboutPortrait: {
    image: undefined,
    placeholder: "Cerium warehouse, Industrial Area, Nairobi",
  } satisfies MediaSlot,
} as const;
