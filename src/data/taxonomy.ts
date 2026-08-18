/**
 * Cerium product taxonomy — PROVISIONAL.
 *
 * SOURCE OF TRUTH: 2026 product catalogue, Q3 2026 price list, Q3 2026
 * fragrance price list. Category descriptions are verbatim from the catalogue.
 * Product benefit copy is verbatim from the catalogue or price list.
 *
 * ---------------------------------------------------------------------------
 * RULES FOR THIS FILE
 * ---------------------------------------------------------------------------
 * 1. This grouping is PROVISIONAL and is replaced by the Phase 2 database
 *    taxonomy. No component may hardcode a category — always render from data.
 * 2. Product entries carry NAME and, where supplied, BENEFIT copy. Nothing
 *    else. No CAS numbers, INCI names, specifications, certifications, origins,
 *    stock or prices — none of that has been supplied, and none is inferred.
 * 3. Prices exist in the supplied price lists but are deliberately NOT modelled
 *    here. Publishing quarterly B2B pricing is a commercial decision for Cerium,
 *    not a Phase 1 default.
 *
 * ---------------------------------------------------------------------------
 * KNOWN GAP
 * ---------------------------------------------------------------------------
 * The supplied catalogue PDF is a set of photographs of the printed booklet and
 * is missing photographs of catalogue pages 12 and 13. Any products listed only
 * on those pages are therefore absent below. A small number of entries on
 * photographed pages were partly obscured by glare and were omitted rather than
 * guessed.
 */

import type { Category, ProductSummary } from "@/types/content";
import { slugify } from "@/lib/slug";
import { applyOverrides } from "@/data/overrides";

/** Compact product constructor. Keeps this data file readable. */
function p(
  name: string,
  extra: Omit<ProductSummary, "slug" | "name"> = {},
): ProductSummary {
  return { slug: slugify(name), name, ...extra };
}

/* -------------------------------------------------------------------------- */
/* INFORMATION-ARCHITECTURE NOTE — deviation from the provisional taxonomy     */
/* -------------------------------------------------------------------------- */
/*
 * The brief's provisional taxonomy lists "Personal Care" and "Home Care" as
 * product families alongside Natural / Functional / Fragrances, mirroring the
 * catalogue's "Our Products" page.
 *
 * They are NOT modelled as product families here, for two concrete reasons:
 *
 * 1. EMPTY PAGES. The catalogue describes Personal Care and Home Care but lists
 *    no products under them — every actual product appears under an ingredient
 *    type (extracts, actives, oils, fragrances). Modelling them as families
 *    produces eight category pages with zero products.
 *
 * 2. DUPLICATE URLS. Their sub-groups (Skin Care, Hair Care, Bath & Shower,
 *    Fabric Care, Surface Care, Air Care) are exactly the six applications. As
 *    families they would create /products/skin-care AND /applications/skin-care
 *    — two URLs, same name, same intent, competing with each other in search
 *    while one of them is empty.
 *
 * They are instead modelled where they carry real meaning and real content:
 *   - Personal Care / Home Care  -> industries  (src/data/applications.ts)
 *   - Skin Care, Fabric Care, …  -> applications (src/data/applications.ts)
 *
 * This gives each URL one job:
 *   /products/*      what the material IS
 *   /applications/*  what it is FOR
 *   /industries/*    who it is for
 *
 * FOR PHASE 2 REVIEW: if Cerium wants Personal Care and Home Care as browsable
 * product families, the clean way is a separate "collection" concept that
 * canonicalises to the ingredient families, rather than a third set of
 * near-duplicate category pages.
 */

/* -------------------------------------------------------------------------- */
/* NATURAL INGREDIENTS                                                         */
/* -------------------------------------------------------------------------- */

const naturalExtracts: Category = {
  slug: "natural-extracts",
  name: "Natural Extracts",
  source: "catalogue-2026",
  applicationSlugs: ["skin-care", "hair-care"],
  products: [
    p("Aloe Vera Extract", {
      benefit: "Soothing, calming sensitive/irritated skin/scalp",
      source: "catalogue-2026",
    }),
    p("Asiatic Centella Extract", {
      benefit:
        "Stimulates collagen production and skin firmness, reduces the appearance of hyperpigmentation & stretch marks, hydrating and soothing",
      source: "catalogue-2026",
    }),
    p("Calendula Extract", {
      benefit:
        "Skin repair, wound healing & acne prevention, soothing, anti-inflammatory",
      source: "catalogue-2026",
    }),
    p("Carrot Extract", {
      benefit:
        "Boosts collagen production, anti-aging, reduces hyperpigmentation and dark spots",
      source: "catalogue-2026",
    }),
    p("Chamomile Extract", {
      benefit: "Promotes skin healing, fights acne, soothing and moisturizing",
      source: "catalogue-2026",
    }),
    p("Coffee Extract", {
      benefit:
        "Reduces the appearance of dark circles and puffiness, tonifying and improves circulation",
      source: "catalogue-2026",
    }),
    p("Cranberry Extract", {
      benefit:
        "Dual anti-aging benefits, skin firming and improves skin texture, brightens and fades hyperpigmentation and blemishes",
      source: "catalogue-2026",
    }),
    p("Cucumber Extract", {
      benefit:
        "Provides deep hydration, cooling and soothing properties, helps tighten pores and revitalizes tired looking skin",
      source: "catalogue-2026",
    }),
    p("Ginseng Extract", {
      benefit:
        "Reduces fine lines & wrinkles, boosts collagen and elastin, skin brightening and even tone, regulates sebum production",
      source: "catalogue-2026",
    }),
    p("Green Tea Extract", {
      benefit:
        "Anti-aging, brightens and evens skin tone, UV protection, intense hydration, fights acne and soothes irritation",
      source: "catalogue-2026",
    }),
    p("Lemon Fruit Extract", {
      benefit:
        "Promotes cell renewal and even skin tone, exfoliating and clarifying excess oil, pore minimizing and sebum control",
      source: "catalogue-2026",
    }),
    p("Licorice Extract", {
      benefit:
        "Brightens skin and reduces hyperpigmentation, promotes collagen production, balances oil production, reduces inflammation and skin soothing",
      source: "catalogue-2026",
    }),
    p("Oat Extract", {
      benefit:
        "Moisturizing, enhances skin's firmness and elasticity, enhances the skin's barrier function",
      source: "catalogue-2026",
    }),
    p("Onion Extract", {
      benefit:
        "Stimulates hair growth, dandruff reduction, hair shine, wound healing and scar reduction",
      source: "catalogue-2026",
    }),
    p("Rosemary Extract", {
      benefit:
        "Promotes hair growth and strength, reduces dandruff and improves overall scalp health, adds shine and luster to hair",
      source: "catalogue-2026",
    }),
    p("Saw Palmetto Extract", {
      benefit:
        "Promotes hair growth and increases hair density and thickness, reduces hair loss and supports scalp health, anti-acne and reduces skin inflammation",
      source: "catalogue-2026",
    }),
    p("Tomato Extract", {
      benefit:
        "Cell renewal stimulation (exfoliation), refreshing and revitalizing agent, skin soothing and wound healing",
      source: "pricelist-q3-2026",
    }),
    p("Turmeric Extract", {
      benefit:
        "A powerful natural antioxidant and anti-inflammatory active that brightens the skin, evens out tone, and helps reduce blemishes for a radiant, healthy glow",
      source: "catalogue-2026",
    }),
    p("Witch Hazel Extract", {
      benefit:
        "Reduces pore size and oil control, fights acne, soothes irritation and improves skin barrier health",
      source: "catalogue-2026",
    }),
  ],
};

const milkExtracts: Category = {
  slug: "milk-extracts",
  name: "Milk Extracts",
  source: "catalogue-2026",
  applicationSlugs: ["skin-care", "bath-and-shower"],
  products: [
    p("Coconut Milk Extract", {
      benefit:
        "Nourishing, moisturizing & soothes dry, sensitive skin, gentle cleanser/exfoliator, improves skin barrier protection",
      source: "catalogue-2026",
    }),
    p("Oat Milk Extract", {
      benefit:
        "Best for soothing dry, sensitive skin, improves skin barrier protection",
      source: "catalogue-2026",
    }),
  ],
};

const essentialOils: Category = {
  slug: "essential-oils",
  name: "Essential Oils",
  source: "catalogue-2026",
  applicationSlugs: ["skin-care", "hair-care", "bath-and-shower", "air-care"],
  products: [
    p("Bergamot Oil", { source: "catalogue-2026" }),
    p("Cedarwood Oil", { source: "catalogue-2026" }),
    p("Citronella Oil", { source: "catalogue-2026" }),
    p("Eucalyptus Oil", { source: "catalogue-2026" }),
    p("Frankincense Oil", { source: "catalogue-2026" }),
    p("Grapeseed Oil", { source: "catalogue-2026" }),
    p("Green Tea Oil", { source: "catalogue-2026" }),
    p("Lavender Oil", { source: "catalogue-2026" }),
    p("Lemongrass Oil", { source: "catalogue-2026" }),
    p("Mint Oil", { source: "catalogue-2026" }),
    p("Peppermint Oil", { source: "catalogue-2026" }),
    p("Rosemary Oil", { source: "catalogue-2026" }),
    p("Tea Tree Oil", { source: "catalogue-2026" }),
    p("Vanilla Oil", { source: "catalogue-2026" }),
  ],
};

const carrierOils: Category = {
  slug: "carrier-oils",
  name: "Carrier Oils",
  source: "catalogue-2026",
  applicationSlugs: ["skin-care", "hair-care"],
  products: [
    p("Aloe Vera Oil", { source: "catalogue-2026" }),
    p("Argan Oil", { source: "catalogue-2026" }),
    p("Avocado Oil", { source: "catalogue-2026" }),
    p("Black Seed Oil", { source: "catalogue-2026" }),
    p("Carrot Seed Oil", { source: "catalogue-2026" }),
    p("Olive Oil (Extra Virgin)", { source: "catalogue-2026" }),
    p("Olive Oil Pomace", { source: "catalogue-2026" }),
    p("Papaya Seed Oil", { source: "catalogue-2026" }),
    p("Rose Petal Oil", { source: "pricelist-q3-2026" }),
    p("Rosehip Oil", { source: "catalogue-2026" }),
    p("Turmeric Oil", { source: "pricelist-q3-2026" }),
  ],
};

const naturalButters: Category = {
  slug: "natural-butters",
  name: "Natural Butters",
  source: "catalogue-2026",
  applicationSlugs: ["skin-care", "hair-care"],
  products: [
    p("Cocoa Butter", { source: "catalogue-2026" }),
    p("Mango Butter", { source: "catalogue-2026" }),
    p("Shea Butter", { source: "catalogue-2026" }),
  ],
};

const naturalScrubs: Category = {
  slug: "natural-scrubs",
  name: "Natural Scrubs",
  source: "catalogue-2026",
  applicationSlugs: ["skin-care", "bath-and-shower"],
  products: [
    p("Almond Scrubs", { source: "catalogue-2026" }),
    p("Apricot Scrubs", { source: "catalogue-2026" }),
    p("Argan Scrubs", { source: "catalogue-2026" }),
    p("Avocado Scrubs", { source: "catalogue-2026" }),
    p("Multi Coloured Cellulose Scrubs", { source: "catalogue-2026" }),
    p("Olive Scrubs", { source: "catalogue-2026" }),
    p("Peach Scrubs", { source: "catalogue-2026" }),
    p("Pumice Scrubs", { source: "catalogue-2026" }),
    p("Sea Salt Scrubs", { source: "catalogue-2026" }),
    p("Walnut Scrubs", { source: "catalogue-2026" }),
  ],
};

const naturalIngredients: Category = {
  slug: "natural-ingredients",
  name: "Natural Ingredients",
  summary:
    "Botanical extracts, oils, butters and exfoliants sourced for formulators working with natural claims.",
  source: "catalogue-2026",
  applicationSlugs: ["skin-care", "hair-care", "bath-and-shower"],
  children: [
    naturalExtracts,
    milkExtracts,
    essentialOils,
    carrierOils,
    naturalButters,
    naturalScrubs,
  ],
};

/* -------------------------------------------------------------------------- */
/* FUNCTIONAL INGREDIENTS                                                      */
/* Includes the catalogue's Skin Care / Hair Care active ingredient sections.  */
/* -------------------------------------------------------------------------- */

const skinCareActives: Category = {
  slug: "skin-care-actives",
  name: "Skin Care Actives",
  source: "catalogue-2026",
  applicationSlugs: ["skin-care"],
  products: [
    p("Affipore", {
      benefit:
        "Targets oily and acne prone skin, balances sebum secretion, diminishes the size and number of visible pores, improves skin texture and smoothness, long-lasting matte finish",
      source: "catalogue-2026",
    }),
    p("Gladback", {
      benefit:
        "Well aging active, restores youthful radiance, increases the skin density, visible anti-wrinkle effect, stimulates microcirculation leading to firm, glowing skin",
      source: "catalogue-2026",
    }),
    p("Homeostatine", {
      benefit:
        "Reduction of wrinkles, increases collagen and skin thickness, improves firmness and elasticity, restores hydration",
      source: "catalogue-2026",
    }),
    p("Hydrafence", {
      benefit:
        "Long lasting skin hydration, strengthens skin barrier, improves softness and texture, stimulates synthesis of ceramides, skin repair",
      source: "catalogue-2026",
    }),
    p("Melavoid", {
      benefit:
        "Skin brightening active, evens out the skin tone, smooth and uniform complexion, reduces hyperpigmentation spots, provides a radiant appearance",
      source: "catalogue-2026",
    }),
    p("Nelupure", {
      benefit:
        "Targets oily and acne prone skin, regulates excess sebum, reduces all types of blemishes/spots, minimizes pores, enhances skin appearance and smoothness",
      source: "catalogue-2026",
    }),
    p("Pomarage", {
      benefit:
        "Well aging active, boosts collagen and hyaluronic acid synthesis, reduces inflammation and aging markers, smoother, firmer and more elastic skin",
      source: "catalogue-2026",
    }),
    p("Striover", {
      benefit:
        "Reduces the appearance of stretchmarks, improves the skin thickness and texture, increases firmness and elasticity",
      source: "catalogue-2026",
    }),
    p("Tens Up", {
      benefit:
        "Immediate lifting and firming effect, visibly smoothes out wrinkles and expression lines, increases collagen synthesis",
      source: "catalogue-2026",
    }),
  ],
};

const hairCareActives: Category = {
  slug: "hair-care-actives",
  name: "Hair Care Actives",
  source: "catalogue-2026",
  applicationSlugs: ["hair-care"],
  products: [
    p("Amaprot", {
      benefit:
        "Nourishes and conditions the hair, improves detangling and wet and dry combing properties, less breakage and restores softness",
      source: "catalogue-2026",
    }),
    p("Baicapil", {
      benefit:
        "Hair growth active, increases hair density and thickness, prevents hair loss, visibly improves hair volume and appearance",
      source: "catalogue-2026",
    }),
    p("Hydrolyzed Cereals", {
      benefit:
        "Blend of soy, wheat and maize proteins, restructures the hair shaft, softens the hair, provides shine, provides a protective film on hair",
      source: "catalogue-2026",
    }),
    p("Hydrolyzed Oat Protein", {
      benefit:
        "Protects hair from environmental damage, repairs and conditions hair, reduces hair breakage and increases elasticity",
      source: "catalogue-2026",
    }),
    p("Keramare", {
      benefit:
        "Heat protection properties, deep reconstruction of hair keratin fibers, hair strengthening and elasticity, provides shine and hydration",
      source: "catalogue-2026",
    }),
    p("Keranutri", {
      benefit:
        "Increases hair thickness, strength and volume, repairs dry and weak hair, prevents breakage, anti-frizz and brightens hair",
      source: "catalogue-2026",
    }),
    p("Kerascalp", {
      benefit:
        "Dual active for a healthy scalp and stronger hair, acts on signs of scalp ageing, rebalances the scalp for revitalized hair, reduces and prevents premature hair greying, prevents hair loss and weakening",
      source: "catalogue-2026",
    }),
    p("Keratrix", {
      benefit:
        "Repairs inner hair structure, reduces breakages and split ends, improves elasticity and resilience, shields against external damage",
      source: "catalogue-2026",
    }),
    p("Nori Complex", {
      benefit:
        "A seaweed-derived active that strengthens hair, prevents frizz, is rich in proteins and amino acids, and has a long-lasting effect",
      source: "catalogue-2026",
    }),
  ],
};

const functionalIngredients: Category = {
  slug: "functional-ingredients",
  name: "Functional Ingredients",
  summary:
    "Actives, preservatives, conditioning agents and performance materials that make a formulation work.",
  source: "catalogue-2026",
  applicationSlugs: ["skin-care", "hair-care", "bath-and-shower"],
  children: [
    skinCareActives,
    hairCareActives,
    {
      slug: "preservatives",
      name: "Preservatives",
      source: "catalogue-2026",
      applicationSlugs: ["skin-care", "hair-care", "bath-and-shower"],
      products: [
        p("Phenoxyethanol & Ethylhexylglycerin", { source: "catalogue-2026" }),
        p("DMDM Hydantoin", { source: "catalogue-2026" }),
      ],
    },
    {
      slug: "conditioning-agents",
      name: "Conditioning Agents",
      source: "catalogue-2026",
      applicationSlugs: ["hair-care"],
      products: [
        p("BTMS 50", { source: "catalogue-2026" }),
        p("PQ 10", { source: "catalogue-2026" }),
      ],
    },
    {
      slug: "silicones",
      name: "Silicones",
      source: "catalogue-2026",
      applicationSlugs: ["hair-care", "skin-care"],
      products: [
        p("Dimethicone 350", { source: "catalogue-2026" }),
        p("Cyclopentasiloxane", { source: "catalogue-2026" }),
        p("Cyclopentasiloxane & Dimethicone", { source: "catalogue-2026" }),
      ],
    },
    {
      slug: "emollients",
      name: "Emollients",
      source: "catalogue-2026",
      applicationSlugs: ["skin-care"],
      products: [
        p("Caprylic Capric Triglyceride", { source: "catalogue-2026" }),
      ],
    },
    {
      slug: "anti-dandruff",
      name: "Anti-dandruff",
      source: "catalogue-2026",
      applicationSlugs: ["hair-care"],
      products: [
        p("Climbazole", { source: "catalogue-2026" }),
        p("Piroctone Olamine", { source: "catalogue-2026" }),
      ],
    },
    {
      slug: "anti-bacterial",
      name: "Anti-bacterial",
      source: "catalogue-2026",
      applicationSlugs: ["bath-and-shower", "surface-care"],
      products: [p("PCMX", { source: "catalogue-2026" })],
    },
    {
      slug: "sunscreen-actives",
      name: "Sunscreen Actives",
      source: "catalogue-2026",
      applicationSlugs: ["skin-care"],
      products: [
        p("Avobenzone", { source: "catalogue-2026" }),
        p("Benzophenone 3", { source: "catalogue-2026" }),
        p("Benzophenone 4", { source: "catalogue-2026" }),
        p("Ethyl Hexyl Triazone", { source: "catalogue-2026" }),
      ],
    },
    {
      slug: "mosquito-repellents",
      name: "Mosquito Repellents",
      source: "catalogue-2026",
      applicationSlugs: ["skin-care"],
      products: [
        p("Citriodiol", {
          benefit:
            "A natural plant-based insect repellant safe for the whole family and environment with scientifically proven effectiveness",
          source: "catalogue-2026",
        }),
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* FRAGRANCES                                                                  */
/* Olfactive families and applications from the Q3 2026 fragrance price list.  */
/* -------------------------------------------------------------------------- */

const fragrances: Category = {
  slug: "fragrances",
  name: "Fragrances",
  summary:
    "Fragrance oils and encapsulated fragrances for personal care, fabric care and multi-purpose applications.",
  source: "catalogue-2026",
  applicationSlugs: ["fabric-care", "bath-and-shower", "hair-care", "air-care"],
  children: [
    {
      slug: "personal-care-fragrances",
      name: "Personal Care Fragrances",
      source: "catalogue-2026",
      applicationSlugs: ["bath-and-shower", "hair-care", "skin-care"],
      products: [
        p("All the Time", {
          olfactive: "Vanilla | Ambery | Floral",
          applications: [
            "Shampoo",
            "Conditioner",
            "Hair gel",
            "Body creams",
            "Body splash",
          ],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Angel Wings", {
          olfactive: "Oriental | White floral",
          applications: [
            "Shampoo",
            "Conditioner",
            "Hair gel",
            "Body creams",
            "Body splash",
          ],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Bella Rouge", {
          olfactive: "Aromatic | Ambery | Fruity",
          applications: ["Shampoo", "Shower gel", "Body lotion", "Handwash"],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Berry Splash", {
          olfactive: "Fruity | Berries",
          applications: ["Handwash", "Body lotion", "Shower gel"],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Black Suit", { source: "catalogue-2026" }),
        p("All Sports", { source: "catalogue-2026" }),
        p("Boss Energy", {
          olfactive: "Fougère | Aromatic | Woody",
          applications: [
            "Body lotion",
            "Shower gel",
            "After shave",
            "Body splash",
          ],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Mad Love", {
          olfactive: "Floral | Musky | Powdery",
          applications: [
            "Shampoo",
            "Conditioner",
            "Hair gel",
            "Body creams",
            "Body splash",
          ],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Mr. Right", {
          olfactive: "Fougère | Oriental | Ambery",
          applications: [
            "Body lotion",
            "Shower gel",
            "After shave",
            "Body splash",
          ],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Ocean Escape", {
          olfactive: "Aromatic | Fougère | Marine",
          applications: ["Handwash", "Shower gel", "Liquid laundry"],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Sweet Marshmallow", {
          olfactive: "Fruity | Gourmand",
          applications: [
            "Shampoo",
            "Conditioner",
            "Hair gel",
            "Body creams",
            "Body splash",
          ],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Tropical Delight", {
          olfactive: "Fruity | Floral | Musky",
          applications: ["Shampoo", "Shower gel", "Body lotion", "Handwash"],
          source: "fragrance-pricelist-q3-2026",
        }),
      ],
    },
    {
      slug: "fabric-care-fragrances",
      name: "Fabric Care Fragrances",
      source: "catalogue-2026",
      applicationSlugs: ["fabric-care"],
      products: [
        p("Angel Wings 62", { source: "catalogue-2026" }),
        p("Bella Rouge 99", { source: "catalogue-2026" }),
        p("Blue Azure 51", { source: "catalogue-2026" }),
        p("Blue Bouquet 05", {
          olfactive: "Chypre | Aromatic | Fruity",
          applications: ["Fabric softener", "Handwash", "Shower gel"],
          source: "catalogue-2026",
        }),
        p("Classic Blue 51", { source: "catalogue-2026" }),
        p("Fresh Blue", {
          olfactive: "Citrus | Woody | Musky",
          applications: ["Fabric softener", "Handwash", "Shower gel"],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Lavenbud 26", {
          olfactive: "Fruity | Herbal",
          applications: ["Fabric softener", "Handwash", "Shower gel"],
          source: "catalogue-2026",
        }),
        p("Lavender Life 07", { source: "catalogue-2026" }),
        p("Relaxing Lavender 16", { source: "catalogue-2026" }),
        p("Royal Blush 51", { source: "catalogue-2026" }),
      ],
    },
    {
      slug: "encapsulated-fragrances",
      name: "Encapsulated Fragrances",
      source: "catalogue-2026",
      applicationSlugs: ["fabric-care"],
      products: [
        p("Prestige LF HD Caps", { source: "catalogue-2026" }),
        p("Rising Star HD Caps", { source: "catalogue-2026" }),
        p("Spark HD Caps", { source: "catalogue-2026" }),
      ],
    },
    {
      slug: "multi-purpose-fragrances",
      name: "Multi-purpose Fragrances",
      source: "catalogue-2026",
      applicationSlugs: ["surface-care", "fabric-care", "air-care"],
      products: [
        p("Citrus Delight", { source: "catalogue-2026" }),
        p("Fraise Burst", { source: "catalogue-2026" }),
        p("Lavender Fresh", {
          olfactive: "Aromatic | Woody",
          applications: ["Liquid multipurpose", "Handwash"],
          source: "fragrance-pricelist-q3-2026",
        }),
        p("Lavender Protect", { source: "catalogue-2026" }),
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* FOOD INGREDIENTS                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Food Ingredients.
 *
 * SOURCE: the current ceriumchemicals.co.ke site. This range is NOT in the 2026
 * catalogue — it was confirmed from two pages of the live site, which lists the
 * six sub-ranges below and the summary copy verbatim.
 *
 * NO PRODUCT NAMES ARE PUBLISHED for this range anywhere in the supplied
 * material or on the live site, so none are listed here. The sub-ranges
 * therefore have no product pages of their own yet — see `isPublishable` below.
 * Add products to a sub-range and its page appears automatically.
 */
const foodIngredients: Category = {
  slug: "food-ingredients",
  name: "Food Ingredients",
  summary:
    "Through global partners we have access to various raw materials that have various applications in the food industry such as in baking, dairy, beverage, tea and coffee, confectionaries, noodles and gravy seasonings, fats and oils and flour milling.",
  source: "website-ceriumchemicals.co.ke",
  applicationSlugs: [],
  children: [
    {
      slug: "seasoning-powder-blends",
      name: "Seasoning powder blends",
      source: "website-ceriumchemicals.co.ke",
    },
    {
      slug: "whey-powder",
      name: "Whey powder",
      source: "website-ceriumchemicals.co.ke",
    },
    {
      slug: "natural-colors-and-extracts",
      name: "Natural colors and extracts",
      source: "website-ceriumchemicals.co.ke",
    },
    {
      slug: "spice-oils-and-oleoresins",
      name: "Spice oils and oleoresins",
      source: "website-ceriumchemicals.co.ke",
    },
    {
      slug: "vitamins-and-minerals",
      name: "Vitamins and minerals",
      source: "website-ceriumchemicals.co.ke",
    },
    {
      slug: "specialty-ingredients",
      name: "Specialty ingredients",
      source: "website-ceriumchemicals.co.ke",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* EXPORTS                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Top-level product families, in the order they are presented on the site.
 * See the information-architecture note above for why Personal Care and Home
 * Care are modelled as industries rather than families.
 */
/**
 * Reviewed catalogue, transcribed from Cerium's supplied documents.
 * Every entry here has been checked against a source document.
 */
const reviewedCategories: Category[] = [
  naturalIngredients,
  functionalIngredients,
  fragrances,
  foodIngredients,
];

/**
 * The catalogue the site renders: reviewed data with Content Studio additions
 * merged on top. See `src/data/overrides.ts` for why the two are kept apart.
 */
export const categories: Category[] = applyOverrides(reviewedCategories);

/**
 * Should this category get a page of its own?
 *
 * A category earns a URL when it has something on it: its own products, or
 * sub-ranges to send visitors to. A leaf with neither would be a thin page —
 * a heading and a contact button — which is bad for visitors and a real risk
 * of being treated as thin content by search engines.
 *
 * This is why the six Food Ingredients sub-ranges have no pages yet: Cerium
 * publishes no product names for them anywhere. They still render as content on
 * the Food Ingredients page. Add one product to a sub-range and its page,
 * sitemap entry and card link all appear automatically.
 */
export function isPublishable(category: Category): boolean {
  return (category.products?.length ?? 0) > 0 || (category.children?.length ?? 0) > 0;
}

/** Depth-first walk of the whole tree. */
export function flattenCategories(nodes: Category[] = categories): Category[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children ?? [])]);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return flattenCategories().find((category) => category.slug === slug);
}

/** Every product beneath a category, including nested sub-families. */
export function getProductsInCategory(category: Category): ProductSummary[] {
  return flattenCategories([category]).flatMap((node) =>
    (node.products ?? []).map((product) => ({
      ...product,
      categorySlug: product.categorySlug ?? node.slug,
      categoryName: product.categoryName ?? node.name,
    })),
  );
}

/** All products across the catalogue. */
export function getAllProducts(): ProductSummary[] {
  return categories.flatMap(getProductsInCategory);
}

/** Count used for honest "N products" labels — derived, never hardcoded. */
export function countProducts(category: Category): number {
  return getProductsInCategory(category).length;
}
