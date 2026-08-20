# Decisions required from Cerium

Open questions that **cannot be resolved in code**. Each one is a business or
content decision for Cerium. Guessing at any of them would put unverified
information about a chemicals supplier on a public website.

Nothing in this file is a bug, and none of it should be "fixed" by picking the
answer that makes the code tidier.

---

## 1. Food Ingredients — blocking for taxonomy finalization

**Two supplied sources disagree, and both are current.**

| Source | What it says | Where it landed in code |
|---|---|---|
| 2026 product catalogue ("About Us") | Cerium serves **personal care and home care**. Food is not mentioned. | `src/config/site.ts` — `siteConfig.description` excludes food |
| Live site, ceriumchemicals.co.ke | Lists a **Food Ingredients** range with six sub-ranges | `src/data/taxonomy.ts` — `foodIngredients` category, sourced `website-ceriumchemicals.co.ke` |

Phase 1 deliberately did not reconcile these. Both entries carry an accurate
`source`, and the divergence is recorded in a comment in `site.ts`.

**Why it must be Cerium's call**

Food-contact raw materials carry a different regulatory and liability profile
from cosmetic ones. Whether Cerium presents itself as a food-ingredients
supplier is a positioning and compliance decision, not an editorial one.

**What is blocked until it is answered**

- Final product taxonomy, and therefore the Phase 2 database schema
- The company description used in metadata, JSON-LD `Organization`, and the
  homepage
- Whether `/products/food-ingredients` and its six sub-ranges are indexable
- Navigation and mega-menu structure

**The question to put to Cerium**

> Does Cerium currently supply food ingredients, and should the website present
> food as a product range alongside personal care and home care? If yes, the
> company description needs updating to match. If no, the Food Ingredients range
> should come off the site.

**Note:** the six Food Ingredients sub-ranges currently have no published
product names anywhere in the supplied material, so `isPublishable()` gives them
no pages of their own. The range is therefore low-visibility today, but it is
still in the navigation and the sitemap.

---

## 2. Social profile handles

Facebook, Instagram and LinkedIn are listed in `siteConfig.social` with
`href: undefined`, so they do not render. Only the WhatsApp URL could be derived
with certainty (from the supplied phone number).

Needed: the exact profile URLs. These also feed the `sameAs` array in the
`Organization` JSON-LD, where a wrong URL is worse than an absent one.

---

## 3. Pricing

Quarterly B2B prices exist in the supplied Q3 2026 price lists and were
deliberately not modelled. Publishing them is a commercial decision.

Needed: confirmation of whether any pricing is public, and at what granularity.

---

## 4. Missing catalogue source pages

The supplied catalogue PDF is a set of photographs of the printed booklet, and
**pages 12–13 are missing**. A small number of entries on other pages were
obscured by glare and were omitted rather than guessed.

Needed: clean copies of those pages, so the catalogue can be completed without
inference.

---

## 5. Photography

No production imagery has been supplied. Every image slot renders a labelled
"Image pending" placeholder. Stock photography is not an acceptable substitute
where it would imply it shows Cerium's own products, facilities, team or
customers.

Needed: real photography, or a decision to commission it.

---

## 6. Product technical data

CAS numbers, INCI names, specifications, certifications, origins and stock
levels are entirely absent and are out of scope until Phase 3–5. None of it has
been inferred.

Needed: a source document per product before any of it is published.
