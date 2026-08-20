# Phase 2.1A — Website Architecture Discovery

**Status:** discovery only. No code, data, routes, schema or UI were changed.
**Repository state audited:** working tree at commit `9feb8b6`, 20 Aug 2026.
**Scope:** understand what exists, and propose the high-level information
architecture of the future Cerium website. Nothing here is implemented.

---

## How to read this document

Every substantive statement is tagged:

| Tag | Meaning |
|---|---|
| **FACT** | Verified in this repository or in Cerium-supplied material transcribed into it. Checkable. |
| **OBSERVATION** | An inference or judgement drawn from those facts. Reasonable, but not itself supplied by Cerium. |
| **RECOMMENDATION** | A proposal for the future site. Not decided, not built. |

Where a question belongs to Cerium rather than to us it is marked
**BUSINESS DECISION REQUIRED** and is not answered here.

---

## 1. Current website structure

### 1.1 Routes that exist today

**FACT** — the App Router tree contains exactly these public routes:

| Route | Type | Source file |
|---|---|---|
| `/` | static | `src/app/page.tsx` |
| `/products` | static | `src/app/products/page.tsx` |
| `/products/[category]` | dynamic, `generateStaticParams` | `src/app/products/[category]/page.tsx` |
| `/applications` | static | `src/app/applications/page.tsx` |
| `/applications/[application]` | dynamic, `generateStaticParams` | `src/app/applications/[application]/page.tsx` |
| `/industries` | static | `src/app/industries/page.tsx` |
| `/industries/[industry]` | dynamic, `generateStaticParams` | `src/app/industries/[industry]/page.tsx` |
| `/about` | static | `src/app/about/page.tsx` |
| `/contact` | static, reads `?product=` | `src/app/contact/page.tsx` |

Plus non-page routes: `sitemap.ts`, `robots.ts`, `manifest.ts`,
`opengraph-image.tsx`, `not-found.tsx`, `error.tsx`.

**FACT** — `/studio` and `/api/studio/*` also exist. They are the local
Content Studio, hard-disabled outside development by
`src/lib/studio-guard.ts`, unauthenticated by design, and never public.

**FACT** — **there is no product detail route.** `ProductCard` states this
explicitly and does not link a product name; the only actionable element on a
product card is `/contact?product=<slug>`.

**FACT** — `robots.ts` disallows `/*?product=`, so the enquiry deep-link is
deliberately non-indexable.

### 1.2 The deliberate three-axis URL split

**FACT** — documented at the top of `src/data/taxonomy.ts`:

```
/products/*      what the material IS
/applications/*  what it is FOR
/industries/*    who it is FOR
```

**FACT** — the catalogue's own "Our Products" page lists Personal Care and Home
Care as product families. Phase 1 deliberately did **not** model them as
families, for two recorded reasons: they contain no products of their own (eight
empty category pages), and their sub-groups are name-for-name identical to the
six applications (`/products/skin-care` competing with `/applications/skin-care`).

**OBSERVATION** — this is the single most important structural decision in
Phase 1 and it is correct. It is the difference between one URL per intent and
three overlapping URL families competing for the same query.

### 1.3 Data and access layers

**FACT** — content is local typed TypeScript in `src/data/`. There is no
database, no ORM and no backend in this repository.

**FACT** — `src/lib/content.ts` is the data-access seam. All its `fetch*`
functions are `async` specifically so the Phase 2 API swap changes no component
signature.

**FACT** — `docs/data-layer-boundary.md` records that exactly three non-Studio
files bypass the seam for catalogue records (`SearchOverlay.tsx`,
`not-found.tsx`, `contact/page.tsx`), and that the **entire catalogue reaches
the client bundle** via `SearchOverlay` and `navigation.ts`.

**OBSERVATION** — the client-bundle path is not a payload problem in Phase 2, it
is a correctness problem: an API-backed catalogue cannot be a synchronous
module-scope import inside a client component. Those call sites must change
regardless of any architecture decision taken in this document.

### 1.4 Navigation as it stands

**FACT** — `src/data/navigation.ts` derives the mega-menu and footer from the
taxonomy rather than hardcoding it. Primary nav is **Products / Applications /
Industries / About**, with Contact as a button and a search trigger in the
header.

**FACT** — the footer already advertises four destinations that do not exist,
marked `upcoming: true` and rendered non-interactive: `/resources` (product
catalogue), `/resources` (technical documents), `/insights`, plus `/privacy` and
`/terms` in the legal row.

**OBSERVATION** — Phase 1 has already anticipated Resources and Insights in the
IA without committing to them. That anticipation is the right starting point for
this discovery, not a decision already taken.

### 1.5 Search

**FACT** — `SearchOverlay` is a UI shell only. It deliberately does not filter
local data, because a fake result list would set a false expectation of coverage
and would be thrown away. Phase 4 connects it to a real backend.

---

## 2. Cerium content and business understanding

### 2.1 The company

**FACT** — all company copy is transcribed from two supplied documents
(`VISION STATEMENT.docx` and the 2026 printed catalogue) into `src/data/company.ts`:

- **Vision:** "To be the leading supplier of specialty raw materials in East and
  Central Africa by delivering innovative and sustainable solutions."
- **Mission:** growth for customers through innovative raw material solutions,
  reliable supply, ethical sourcing, positive social impact.
- **About:** "a customer-oriented company focused on delivering raw material
  solutions to the personal care and home care industries."
- **Cover statement:** Innovate · Enrich · Beautify. **Tagline:** "Sourcing made easy".
- **Six core values**, each carrying a scripture reference in the source document.
- **Self-stated metrics:** 100+ happy clients, 10+ years of experience, 80+
  products in catalogue — stored with `asStated` so they are never rounded or
  restated.
- **Three named global partners:** Provital (Spain, botanical actives),
  Givaudan (Switzerland, fragrances and actives), Umang (encapsulation).

**FACT** — location, contact and hours are in `src/config/site.ts`: Bamburi
Road, Building 22, Off Enterprise Road, Industrial Area, Nairobi, Kenya;
+254 724 532 892; hello@ceriumchemicals.co.ke; Mon–Fri 08:30–18:00, Sat
08:30–14:00.

**OBSERVATION** — Cerium is a **distributor / sourcing agent for global
principals**, not a manufacturer. The vision ("leading supplier … in East and
Central Africa"), the partner page, and the tagline all say the same thing. That
matters for IA: the site's job is to make a third-party catalogue findable and
enquirable, not to present proprietary technology.

**OBSERVATION** — the stated market is **East and Central Africa**, wider than
Kenya. Nothing on the site currently reflects a multi-country footprint.

### 2.2 The catalogue as modelled

**FACT** — counts derived from `src/data/taxonomy.ts`:

| Measure | Count |
|---|---|
| Product entries | **122** |
| Category nodes (all depths) | **30** |
| Top-level families | **4** |
| Categories that earn a page (`isPublishable`) | **24** |
| Applications | **6** |
| Industries | **2** |
| Products carrying benefit copy | **40** of 122 |
| Products carrying an olfactive family | **14** of 122 |
| Products carrying end-product formats | **14** of 122 |
| **Products carrying any content beyond a name** | **54** of 122 |
| **Products with a name and nothing else** | **68** of 122 |

The last two rows are the ones the product architecture in section 4 depends
on. Benefit copy alone is not the test — the 14 fragrance products carry
olfactive notes and format lists instead, which is real content, so they are not
name-only. `40 + 14 = 54` with no overlap; `122 − 54 = 68`.

**FACT** — products by family:

| Family | Products | Sub-ranges |
|---|---|---|
| Natural Ingredients | 59 | Natural Extracts (19), Milk Extracts (2), Essential Oils (14), Carrier Oils (11), Natural Butters (3), Natural Scrubs (10) |
| Functional Ingredients | 34 | Skin Care Actives (9), Hair Care Actives (9), Preservatives (2), Conditioning Agents (2), Silicones (3), Emollients (1), Anti-dandruff (2), Anti-bacterial (1), Sunscreen Actives (4), Mosquito Repellents (1) |
| Fragrances | 29 | Personal Care (12), Fabric Care (10), Encapsulated (3), Multi-purpose (4) |
| Food Ingredients | **0** | six named sub-ranges, no published product names |

**OBSERVATION** — Cerium's own catalogue claims "over 80 products"; 122 are
modelled. The two are consistent (the claim is a floor), and the site never
prints a hardcoded count — every "N products" label is derived.

### 2.3 What we hold per product

**FACT** — the entire product record today is: `slug`, `name`, optional
`benefit` (verbatim), optional `applications` (fragrances only, end-product
formats), optional `olfactive` (fragrances only), optional `image`, `source`.

**FACT** — there are **no** CAS numbers, INCI names, specifications,
certifications, origins, pack sizes, MOQs, stock levels, prices, or documents.
None have been inferred. Prices exist in the supplied Q3 2026 price lists and
were deliberately not modelled.

**FACT** — the original supplied documents (catalogue PDF, price lists, vision
statement) are **not in this repository**. Only their transcription is, with a
`source: SourceDocument` marker on each entry.

**FACT** — recorded source gap: catalogue pages 12–13 are missing from the
supplied PDF, and some glare-obscured entries were omitted rather than guessed.

**OBSERVATION** — 68 of 122 products currently have a name and nothing else.
Any architecture that depends on rich per-product content will produce 68 thin
pages on day one. This is the central constraint on the product architecture in
section 4, and it is a **content supply problem, not a modelling problem**.

### 2.4 Media

**FACT** — no production photography has been supplied. Every image slot renders
a labelled "Image pending" placeholder. Cloudinary is wired but unconfigured; no
data entry uses `cloudinaryId`. Only the two logo files are real assets.

---

## 3. Proposed high-level website structure

**RECOMMENDATION** — the future site has **six** top-level sections. Four exist,
two are new and both are gated on content Cerium has not yet supplied.

The prompt's candidate list included Insights as a separate section from
Resources. This proposal **merges Insights into Resources** — see 3.5.

### 3.1 Home — `/`

- **Purpose:** state what Cerium is in one screen and route each of the five
  customer journeys within one click.
- **Content:** positioning, the four routes into the catalogue (search, by
  material, by application, by industry), derived catalogue counts, partners,
  values, enquiry CTA.
- **Audience:** everyone; disproportionately first-time visitors arriving on a
  brand query.
- **Connection to Products:** it is the top of every funnel. Its only job with
  respect to Products is to hand off quickly and honestly.
- **Verdict:** exists, structurally sound.

### 3.2 Products — `/products`

- **Purpose:** the canonical answer to *what the material is*. This is the
  commercial heart of the site and the largest indexable surface.
- **Content:** family → sub-range → product. Per product: name, benefit copy,
  the applications it serves, the category it sits in, and — as data arrives —
  INCI/CAS, function, physical form, documents.
- **Audience:** formulators, R&D chemists, procurement — anyone who already
  knows ingredient vocabulary.
- **Connection to Products:** it *is* Products.
- **Verdict:** exists as far as category level. Product level does not exist.

### 3.3 Applications — `/applications`

- **Purpose:** the answer to *what it is for*. Entry point for a customer who
  thinks in finished products, not ingredients.
- **Content:** the six end-use areas (Skin Care, Hair Care, Bath & Shower,
  Fabric Care, Surface Care, Air Care), each listing the categories and products
  that serve it, and the end-product formats within it.
- **Audience:** brand owners, product developers, contract manufacturers, and a
  large share of Google traffic ("ingredients for shampoo").
- **Connection to Products:** it is a **cross-cut** of the same product set,
  never a second copy of it. Every application page must link into
  `/products/*`, and products must never be duplicated at an `/applications/*`
  URL.
- **Verdict:** exists; the product↔application relationship underneath it is an
  approximation (see 5.2).

### 3.4 Industries — `/industries`

- **Purpose:** the answer to *who it is for*. Positioning and market-level
  landing pages.
- **Content:** Personal Care, Home Care (and, subject to the open decision,
  Food). Each states what Cerium supplies to that market and routes down to its
  applications.
- **Audience:** commercial and procurement audiences, partners, and broad
  head-term search.
- **Connection to Products:** indirect, and it should stay indirect —
  Industry → Applications → Products. An industry page is a **grouping and
  positioning surface**, not a third catalogue.
- **Verdict:** exists but is the thinnest section on the site: two entries,
  each essentially a list of three applications.

### 3.5 Resources — `/resources`

- **Purpose:** everything a customer needs *around* the product — documents,
  downloads, and editorial that supports formulation and buying decisions.
- **Content (each item gated on supply):**
  - the downloadable catalogue and current price-list policy;
  - technical documents per product — TDS, SDS, CoA, allergen/regulatory
    statements;
  - formulation guidance and starter formulations, if Cerium's principals allow
    redistribution;
  - editorial / insight articles (see below).
- **Audience:** customers mid-evaluation and post-enquiry; regulatory and QA
  staff; also a strong long-tail search surface ("SDS for …").
- **Connection to Products:** documents attach **to products**, and are surfaced
  both on the product page and in a filterable document index. The index is a
  second view of product-owned data, never a separate content silo.
- **Verdict:** does not exist. Already advertised in the footer as `upcoming`.

**RECOMMENDATION — merge Insights into Resources rather than creating
`/insights`.** Two reasons: there is currently **zero** editorial content and no
named owner for it, and a thin, irregularly-updated blog on a B2B supplier site
is a liability rather than an asset. `/resources/insights/` as a sub-section can
be promoted to a top-level `/insights` later without breaking anything if
volume ever justifies it. The reverse — retiring an empty top-level section — is
visible and awkward.

### 3.6 About — `/about`

- **Purpose:** credibility. For a distributor this is load-bearing: the
  principals Cerium represents are a large part of what a customer is buying.
- **Content:** who Cerium is, vision and mission, the six core values,
  the global partners, and — when supplied — real photography of the Nairobi
  facility, team, and any certifications.
- **Audience:** first-time buyers assessing whether Cerium is a real supplier;
  potential principals; recruits.
- **Connection to Products:** it underwrites them. A named principal
  (Provital, Givaudan, Umang) is a trust signal that should link to the products
  sourced from them — once Cerium confirms the product↔principal mapping, which
  is not in any supplied document.
- **Verdict:** exists and is well-sourced.

### 3.7 Contact / Enquiry — `/contact`

- **Purpose:** convert. For a distributor there is no cart — the enquiry **is**
  the conversion.
- **Content:** real enquiry form with product context attached, plus the
  channels that already work (phone, WhatsApp, email), address, hours, map.
- **Audience:** everyone who got what they came for.
- **Connection to Products:** every product and category page must be able to
  start an enquiry that arrives with the product already attached.
- **Verdict:** exists as a routing page with a pre-composed `mailto:`. There is
  deliberately no form — the enquiry system is Phase 11.

### 3.8 Sections deliberately NOT proposed

**RECOMMENDATION** — do not create these, and record why:

| Not proposed | Why |
|---|---|
| `/insights` as top level | No content, no owner. Nest under Resources until volume justifies promotion. |
| A fourth category axis (e.g. `/markets`, `/solutions`) | Directly reintroduces the duplicate-URL problem Phase 1 solved. |
| `/news`, `/events` | Nothing supplied; a stale news feed actively damages credibility. |
| `/careers` | Nothing supplied. Add when there is a real vacancy to post. |
| E-commerce / cart / public pricing | Pricing is an unresolved commercial decision. Not an IA question. |
| Customer login / gated portal | No requirement stated; gating documents suppresses exactly the search traffic Resources exists to capture. |

---

## 4. Product architecture

### 4.1 Which concepts are genuinely needed

The prompt lists six candidate concepts. Assessed against what Cerium actually
has:

| Concept | Verdict | Reasoning |
|---|---|---|
| **Product** | **REQUIRED — must be built** | 122 exist as data; none has a URL. This is the single largest gap in the current site. |
| **Category (recursive)** | **REQUIRED — keep as one recursive type** | Already modelled and working. |
| **Product Family** | **NOT a separate type** | "Family" is simply a depth-0 Category. A separate entity duplicates the model for a presentation label. |
| **Subcategory** | **NOT a separate type** | Same argument. A depth-1 Category. |
| **Application** | **REQUIRED — keep** | Distinct axis, distinct customer intent, real content. |
| **Industry** | **KEEP, but demote** | Real, but thin. Useful for positioning and head-term SEO; not a data dimension products should carry. |

**RECOMMENDATION — model Category once, recursively, and derive "family" and
"sub-range" from depth.** The current `Category` type already does exactly this
via `children`. Introducing `ProductFamily` and `Subcategory` as distinct
entities would triple the schema surface, and every rendering component would
need to know which of three types it had been handed.

**RECOMMENDATION — constrain the tree to a maximum of two levels** (family →
sub-range) as a documented rule in Phase 2. The data is already two levels
everywhere. Uncapped depth invites a third level that would make breadcrumbs,
URLs and the mega-menu all ambiguous, with no content that needs it.

### 4.2 Two new concepts the current data implies but does not model

**OBSERVATION — the category tree currently mixes three different axes.** Read
the sub-ranges as a list and this is visible:

| Sub-range | The axis it actually expresses |
|---|---|
| Natural Extracts, Essential Oils, Carrier Oils, Butters, Scrubs | **material origin / physical form** |
| Preservatives, Silicones, Emollients, Conditioning Agents, Anti-dandruff, Sunscreen Actives | **functional role in a formulation** |
| Personal Care Fragrances, Fabric Care Fragrances | **market segment** |
| Skin Care Actives, Hair Care Actives | **application** |

**OBSERVATION** — this is not sloppiness; it faithfully mirrors how the printed
catalogue is organised, and a printed catalogue can only have one ordering. A
website is not so constrained. The cost of leaving it as-is is that "show me all
preservatives" and "show me all natural materials" cannot both be answered,
because a product sits in exactly one place in one tree.

**RECOMMENDATION — introduce `Function` as a separate, flat, many-to-many
facet** in Phase 2 (preservative, emollient, surfactant, active, conditioning
agent, fragrance, UV filter, antimicrobial …). This is the vocabulary
formulators actually search in, it is the axis a single tree cannot express, and
it is the natural filter on `/products`. **It must be populated from supplied
documentation, not inferred** — assigning a function to a chemical is a
technical claim.

**RECOMMENDATION — promote `Format` (end-product format) to a real entity.**
**FACT:** `applicationFormats` in `src/data/applications.ts` already lists twelve
Cerium-named formats (Shampoo, Conditioner, Hair gel, Shower gel, Handwash, Body
lotion, Body creams, Body splash, After shave, Fabric softener, Liquid laundry,
Liquid multipurpose), and 14 fragrance products carry a per-product
`applications: string[]` of exactly these. **OBSERVATION:** these are free-text
strings today, and they are the most specific customer-language search terms on
the whole site — but they are sourced **only for fragrances**. Model them as
first-class and relate them to products; do **not** back-fill formats for the
other 108 products by inference.

**RECOMMENDATION — keep `olfactive family` as a product attribute, not a
category.** It applies to 14 products, all fragrances. It is a facet on the
fragrance listing, not a branch of the tree.

### 4.3 Proposed entity model (conceptual — not a schema)

```
Product ──┬─ belongs to 1 ── Category  (primary; drives canonical URL + breadcrumb)
          ├─ has many ────── Function  (facet: preservative, emollient, active …)   [NEW]
          ├─ has many ────── Application (skin care, fabric care …)                 [make real]
          ├─ has many ────── Format   (shampoo, fabric softener …)                  [NEW, fragrance-sourced only]
          ├─ has many ────── Document (TDS / SDS / CoA)                             [Phase 3–5, gated on supply]
          ├─ has 0..1 ────── Principal / supply partner                             [gated on Cerium confirming mapping]
          └─ has attributes  benefit, INCI, CAS, olfactive, physical form …         [only where sourced]

Category ─┬─ has 0..1 parent Category      (max depth 2)
          └─ has many Products

Application ─── belongs to 1 Industry (grouping)
Industry ────── has many Applications
```

**RECOMMENDATION — Product has exactly one primary Category** (which owns its
canonical URL and breadcrumb) and unlimited secondary relationships. Multiple
parents make the canonical URL undecidable, which is precisely the duplicate-URL
failure Phase 1 avoided at category level.

**RECOMMENDATION — Industry attaches to Application, not to Product.** It is
already modelled that way (`Application.groupSlug`, `Industry.applicationSlugs`)
and it is correct: a product's market is a consequence of its uses, not an
independent property to maintain per product.

### 4.4 The thin-page problem, stated plainly

**FACT** — 68 of 122 products have a name and no other content.

**OBSERVATION** — publishing 122 product pages today means publishing 68 pages
whose entire body is a name, a category label and an enquiry button. That is
thin content by any definition, it is a manual-action risk for a site that is
also making health-adjacent ingredient claims, and it would dilute the 24
category pages that currently do carry real content.

**RECOMMENDATION — make product pages conditional on content, using the same
mechanism already proven for categories.** `isPublishable()` already withholds a
page from a category with nothing on it — that is why the six Food Ingredients
sub-ranges have no pages. Apply the identical rule to products: a product earns
a URL when it has enough to justify one (benefit copy, or a document, or
technical data), and until then it renders as a card inside its category page
and remains fully enquirable. **This is a policy proposal, not an
implementation** — the threshold itself is a Phase 2.1B decision.

---

## 5. Category / Application / Industry — the distinction

### 5.1 The three axes, with real Cerium examples

| | **CATEGORY** | **APPLICATION** | **INDUSTRY** |
|---|---|---|---|
| Answers | What **is** it? | What is it **for**? | Who is it **for**? |
| Basis | The material itself | The end product being formulated | The market being served |
| Cerium examples | Natural Extracts, Carrier Oils, Skin Care Actives, Preservatives, Encapsulated Fragrances | Skin Care, Hair Care, Bath & Shower, Fabric Care, Surface Care, Air Care | Personal Care, Home Care |
| Count | 30 nodes, 24 with pages | 6 | 2 |
| Cardinality to Product | one primary (the tree) | many-to-many | derived via Application |
| Owns canonical product URL | **Yes** | No | No |
| URL | `/products/*` | `/applications/*` | `/industries/*` |
| Typical searcher | "aloe vera extract supplier Kenya" | "ingredients for fabric softener" | "personal care raw materials Kenya" |
| Search intent | specific, high commercial | mid-funnel, discovery | head term, positioning |

### 5.2 Where the three currently blur — and how they should not

**FACT** — Aloe Vera Extract sits in Category *Natural Extracts*, serves
Applications *Skin Care* and *Hair Care*, which belong to Industry *Personal
Care*. Three different labels, three different questions, one product. That is
the model working.

**FACT** — but two sub-ranges are named for applications rather than materials:
**Skin Care Actives** and **Hair Care Actives**. And two are named for markets:
**Personal Care Fragrances** and **Fabric Care Fragrances**.

**OBSERVATION** — this creates near-collisions with the application axis:
`/products/skin-care-actives` and `/applications/skin-care` are adjacent in
meaning and will compete for overlapping queries. It is materially better than
the exact duplication Phase 1 avoided (`/products/skin-care` vs
`/applications/skin-care`), but it is the same tension in weaker form. It comes
from the printed catalogue's own naming, so it is a content decision, not a bug.

**FACT** — the application→product relationship is currently **derived, not
real**. `fetchProductsForApplication()` resolves `Application.categorySlugs`
and returns *every* product in those categories.

**OBSERVATION** — this means the Skin Care application page lists all 19 Natural
Extracts, including Onion Extract, Rosemary Extract and Saw Palmetto Extract,
whose supplied benefit copy is explicitly about **hair and scalp**. The
relationship is category-granular where the truth is product-granular. On a
site that must not overstate what a material does, that is a data-integrity
issue and not only a relevance one.

**RECOMMENDATION — replace the derived relationship with a real product↔application
many-to-many in Phase 2**, populated from supplied documents. Keep the
category-level relationship as an editorial default only where per-product data
is genuinely absent, and mark which is which.

**RECOMMENDATION — one rule that resolves all three axes:** *a product is
listed in many places and lives in exactly one.* Category pages list products
and own their canonical URLs. Application and industry pages are filtered views
that link inward. Cross-linking is mandatory in both directions;
duplication is forbidden in all of them.

**RECOMMENDATION — do not add a fourth axis.** If Cerium wants Personal Care and
Home Care as browsable *product* collections, implement them as **collections
that canonicalise to the ingredient families**, exactly as
`src/data/taxonomy.ts` already proposes — never as a third set of category pages.

---

## 6. Customer journeys

Assessed for each of the five journeys: what the customer does, what the site
must provide, and whether it does today.

### Journey 1 — Customer knows the exact product

*"Do you stock Baicapil?" / "Shea Butter price Nairobi"*

- **Needs:** working search with exact-name matching; a product URL that can be
  found, linked, bookmarked and shared; documents; a one-click enquiry
  pre-attached to that product.
- **FACT — today:** search is a non-functional shell; there is no product URL;
  the product is reachable only by knowing which of 24 category pages to open.
  Enquiry pre-attachment does work, via `/contact?product=<slug>`.
- **OBSERVATION:** this is the **worst-served journey on the site**, and it is
  the highest-intent one. A customer naming a product is close to buying.
- **RECOMMENDATION:** product pages + real search are jointly the top Phase 2
  priority. Neither is sufficient alone.

### Journey 2 — Customer knows the ingredient type

*"I need a preservative" / "what carrier oils do you have?"*

- **Needs:** a browsable material taxonomy, honest counts, and — critically —
  the ability to filter by **function**, which is how this customer thinks.
- **FACT — today:** the taxonomy exists, is browsable, and counts are derived.
  There is no function facet, so "all preservatives" can only be answered if
  "Preservatives" happens to be a sub-range (it is — with 2 products), while
  "all antimicrobials across the catalogue" cannot be answered at all.
- **OBSERVATION:** this is the **best-served journey today**, and it is the one
  the printed catalogue was already organised for.
- **RECOMMENDATION:** keep the tree exactly as it is; add the `Function` facet
  from 4.2 as the improvement.

### Journey 3 — Customer searches by application

*"ingredients for a fabric softener" / "what goes in a shampoo"*

- **Needs:** an application landing page that lists genuinely relevant materials,
  organised by the role each plays in that formulation, plus the end-product
  formats within it.
- **FACT — today:** six application pages exist with verbatim descriptions, but
  the product lists are category-derived and therefore over-broad (5.2).
- **RECOMMENDATION:** real product↔application relations; group the listing by
  function within the application ("Fabric Care → fragrance / encapsulated
  fragrance / antimicrobial"), which is the shape this customer is reasoning in.

### Journey 4 — Customer searches by industry

*"personal care raw material suppliers in Kenya"*

- **Needs:** a credible market-level landing page — what Cerium supplies to that
  market, which principals stand behind it, evidence of capability, and a clear
  route down into applications.
- **FACT — today:** each industry page renders a description, its three
  applications, and a coincidentally slug-matched product family. Two pages
  total.
- **OBSERVATION:** this is the section furthest from what a head-term landing
  page needs. It is also the journey most likely to arrive via a broad,
  competitive query, where a thin page converts poorly.
- **RECOMMENDATION:** treat industry pages as **positioning pages, not index
  pages** — real depth (market context, partners, capability, applications
  served), not a longer list.

### Journey 5 — Customer arrives from Google

*Lands anywhere, on any of the ~38 indexable URLs.*

- **Needs:** every page to work as a landing page — self-explanatory, canonical,
  breadcrumbed, with a route both up (context) and sideways (alternatives), and
  an enquiry path from wherever they landed.
- **FACT — today:** `buildMetadata()` guarantees a canonical on every indexable
  page; `BreadcrumbList` and `ItemList` JSON-LD are emitted per page;
  `sitemap.ts` is generated from the same data as the routes. **FACT:**
  `robots.ts` disallows everything unless `NEXT_PUBLIC_ALLOW_INDEXING=true`.
- **OBSERVATION:** the SEO *mechanics* are the strongest part of Phase 1. The
  weakness is **surface area**: 38 URLs, of which the 122 product names — the
  entire long tail, and the terms a chemicals buyer actually types — are
  currently unaddressable.
- **RECOMMENDATION:** product pages are the single largest SEO gain available.
  Section 4.4's conditional-publishing rule is what keeps that gain from turning
  into 68 thin pages.

### Journey summary

| Journey | Served today | Primary gap |
|---|---|---|
| 1. Knows the product | **Poor** | No product URL, no search |
| 2. Knows the ingredient type | **Good** | No function facet |
| 3. By application | **Partial** | Derived, over-broad relationships |
| 4. By industry | **Weak** | Thin positioning pages |
| 5. From Google | **Mechanically strong, thin in surface** | No long-tail product URLs |

---

## 7. Navigation concept

**RECOMMENDATION** — a high-level shape only. Not implemented, not designed.

```
HEADER
  Logo
  Products      ▾  families → sub-ranges, + "Browse by function" [new], + feature panel
  Applications  ▾  grouped by industry (Personal Care | Home Care)
  Industries    ▾  Personal Care | Home Care  [+ Food — BUSINESS DECISION REQUIRED]
  Resources     ▾  Catalogue | Technical documents | Insights   [gated on content]
  About
  ─────────
  Search  (persistent, prominent — it serves the highest-intent journey)
  Enquire (primary action)

FOOTER
  Company    · Products (families) · Applications · Resources · Contact · Legal
```

**RECOMMENDATION — keep navigation derived from the taxonomy.** Phase 1's
`navigation.ts` builds the mega-menu and footer from the data, so adding a
family updates every navigation surface at once. This property must survive the
Phase 2 migration.

**RECOMMENDATION — search moves from a header afterthought to a primary
element.** It is the only mechanism serving Journey 1, and it is the journey
closest to a sale.

**RECOMMENDATION — retain the `upcoming: true` convention.** Rendering a planned
destination as non-interactive rather than as a broken link is honest, and it
lets the IA be announced before it is built.

**OBSERVATION — the client-bundle constraint from 1.3 binds navigation
directly.** `Header` and `MobileNavigation` are client components that import
`navigation.ts`, which imports the whole taxonomy. Any Phase 2 navigation must
receive its links as props from a server parent.

---

## 8. URL concept

**RECOMMENDATION** — proposed shape. Not implemented.

```
/                                     home
/products                             all families, derived counts
/products/[category]                  family or sub-range          (unchanged, 24 today)
/products/[category]/[product]        product detail               [NEW]
/applications                         all applications
/applications/[application]           application detail
/industries                           all industries
/industries/[industry]                industry detail
/about                                company, values, partners
/resources                            document + editorial index   [NEW, gated]
/resources/[document-or-article]      individual resource          [NEW, gated]
/contact                              enquiry
/search                               results page                 [NEW, Phase 4]
/privacy  /terms                      legal                        [NEW]
```

### 8.1 Category URLs stay flat — keep

**RECOMMENDATION — keep `/products/[category]` as a single segment**, including
for sub-ranges (`/products/carrier-oils`, not
`/products/natural-ingredients/carrier-oils`). Slugs are unique and meaningful;
a flat URL survives re-parenting in the Phase 2 taxonomy without a redirect, and
breadcrumbs already carry the hierarchy for both users and `BreadcrumbList`.
This is what Phase 1 does and it should not change.

### 8.2 Product URLs — a real decision, not a formality

Two workable options. **This needs an explicit decision in Phase 2.1B.**

**Option A — nested under the primary category: `/products/carrier-oils/argan-oil`**

- Breadcrumb, URL and canonical agree with no extra machinery.
- Matches the convention of most B2B chemical distributor sites.
- Keeps the `/products/*` namespace unambiguous — one segment is a category,
  two is a product.
- **Cost:** re-categorising a product changes its URL. Phase 2 must own a
  redirect table. Since slugs become persisted database fields in Phase 2, this
  is a solved problem — but it must be *actually solved*, not assumed.

**Option B — flat: `/products/argan-oil`**

- Immune to re-categorisation.
- **Cost:** product and category slugs share one namespace, so a collision
  (`/products/essential-oils` as both a category and a hypothetical product) is
  a live risk that must be prevented by a uniqueness constraint spanning two
  tables — a subtler and more fragile failure than a redirect table.

**RECOMMENDATION — Option A**, with a persisted-slug redirect table owned by the
Phase 2 backend. The failure mode is visible, testable and recoverable; Option
B's is neither.

### 8.3 Rules that must hold whatever is chosen

**RECOMMENDATION:**

1. One canonical URL per product, on its primary category path. Every other
   listing links to it; none duplicates it.
2. Slugs remain meaningful strings, never numeric IDs (already the rule).
3. Filters and facets are **query parameters on the canonical listing**
   (`/products?function=preservative`), never new paths — and either
   `noindex` or canonicalised to the clean URL. Facet URLs are the classic way a
   catalogue site generates thousands of near-duplicate pages.
4. No page ships until it has content. `isPublishable()` already enforces this
   for categories; extend the principle, do not weaken it.
5. `sitemap.ts` stays generated from the same data that generates the routes.
   Never hand-maintained.
6. `/*?product=` can be retired from `robots.ts` once product pages exist and
   enquiry context comes from the product URL itself.

---

## 9. Current vs future comparison

Classification only. **No code was changed.**

### 9.1 Structure and routing

| Area | Verdict | Note |
|---|---|---|
| Products / Applications / Industries three-axis split | **KEEP** | The best decision in Phase 1. Do not revisit. |
| `/products/[category]` flat single-segment URLs | **KEEP** | Survives taxonomy re-parenting. |
| `generateStaticParams` + `notFound()` + `isPublishable` | **KEEP** | Thin pages cannot ship. Extend to products. |
| Product detail route | **BUILD NEW** | Largest single gap on the site. |
| `/resources` | **BUILD NEW** | Gated on Cerium supplying documents. |
| Insights | **BUILD NEW, nested** | Under `/resources`; no top-level section for empty content. |
| `/privacy`, `/terms` | **BUILD NEW** | Advertised in the footer, do not exist. |
| `/search` results page | **BUILD NEW** | Phase 4. |
| Industry pages | **MODIFY** | Positioning depth, not longer lists. |

### 9.2 Content model

| Area | Verdict | Note |
|---|---|---|
| Recursive `Category` type | **KEEP** | Add a documented two-level cap. |
| `ProductSummary` type | **MODIFY** | Becomes `Product`; fields added only as sourced. |
| `Application` / `Industry` types | **KEEP** | The distinction is correct. |
| Application → Product resolution | **REPLACE** | Derived via category today; must become a real relation. |
| `Function` facet | **BUILD NEW** | The axis a single tree cannot express. |
| `Format` (shampoo, fabric softener) | **MODIFY** | Free-text strings → real entity. Fragrance-sourced only. |
| `olfactive` | **KEEP** | Product attribute, not a category. |
| `source: SourceDocument` provenance | **KEEP — non-negotiable** | Must survive into the Phase 2 schema as a real column. |
| Documents (TDS / SDS / CoA) | **BUILD NEW** | Phase 3–5, gated on supply. |
| Pricing | **NOT MODELLED** | Commercial decision, unchanged. |

### 9.3 Platform and data access

| Area | Verdict | Note |
|---|---|---|
| `lib/content.ts` async seam | **KEEP** | The reason a Phase 2 swap does not touch presentation. |
| Wording of the seam rule | **MODIFY** | Overstates itself; correct to "catalogue records". See `docs/data-layer-boundary.md` item 1. |
| Catalogue in the client bundle | **REPLACE** | Correctness blocker for Phase 2, not a payload preference. Item 2 of the same doc. |
| `src/data/*.ts` as the store | **REPLACE** | Becomes the Django/PostgreSQL API. |
| Content Studio (`/studio`) | **REPLACE** | Superseded by the authenticated Django admin. |
| `catalogue.overrides.json` | **REPLACE** | Merged into the database at migration. |
| Derived navigation | **KEEP (MODIFY delivery)** | Keep derivation; pass links as props from a server parent. |
| Search backend | **REPLACE** | Shell → real search. Phase 4. |
| Enquiry | **REPLACE** | `mailto:` → real enquiry system. Phase 11. |

### 9.4 SEO, design, media

| Area | Verdict | Note |
|---|---|---|
| `buildMetadata()` canonical on every page | **KEEP** | No exceptions. |
| `Organization` + `WebSite` + `BreadcrumbList` + `ItemList` | **KEEP** | `ItemList` stays until real offer data exists. |
| Generated `sitemap.ts`, disallow-by-default `robots.ts` | **KEEP** | Both correct. |
| Design system, tokens, primitives, motion, a11y | **KEEP** | Not in scope for this phase and not a limiting factor. |
| `CeriumImage` + "Image pending" placeholders | **KEEP** | Honest. Never substitute stock imagery. |
| Cloudinary | **KEEP (activate)** | Wired, unconfigured. |
| Docker + Caddy deployment | **KEEP** | Extend to host the Django service alongside. |

---

## 10. Open business decisions

None of these may be resolved in code. Items 1–6 are already recorded in
`docs/pending-cerium-decisions.md`; items 7–12 are raised by this discovery.

### 10.1 BUSINESS DECISION REQUIRED — Food Ingredients

**Unchanged and unresolved. Not resolved here.**

**FACT** — two current, supplied sources disagree:

| Source | States |
|---|---|
| 2026 product catalogue ("About Us") | Cerium serves **personal care and home care**. Food is not mentioned. |
| Live site, ceriumchemicals.co.ke | Lists a **Food Ingredients** range with six named sub-ranges |

**FACT** — both are represented honestly in code with accurate `source` markers:
`siteConfig.description` excludes food; `taxonomy.ts` carries a `foodIngredients`
category sourced `website-ceriumchemicals.co.ke`. **FACT** — no product names
are published for that range anywhere in the supplied material, so all six
sub-ranges have zero products and `isPublishable()` gives them no pages.

**Why it must be Cerium's call:** food-contact raw materials carry a different
regulatory and liability profile from cosmetic ones. Whether Cerium presents
itself as a food-ingredients supplier is a positioning and compliance decision.

**Additionally blocked by this phase's findings:** whether **Food** becomes a
third **Industry** (and therefore a third branch of the applications tree, which
is currently entirely personal-care and home-care), and whether the company
description used in metadata and `Organization` JSON-LD must change.

**The question to put to Cerium** (verbatim from the standing document):

> Does Cerium currently supply food ingredients, and should the website present
> food as a product range alongside personal care and home care? If yes, the
> company description needs updating to match. If no, the Food Ingredients range
> should come off the site.

### 10.2 Carried forward from `docs/pending-cerium-decisions.md`

| # | Decision | Blocks |
|---|---|---|
| 2 | Social profile handles (Facebook, Instagram, LinkedIn) | `sameAs` in `Organization` JSON-LD |
| 3 | Whether any pricing is public, and at what granularity | Product page content; whether `Product` schema ever becomes appropriate |
| 4 | Clean copies of catalogue pages 12–13 and the glare-obscured entries | Catalogue completeness |
| 5 | Real photography, or a decision to commission it | Every image slot on the site |
| 6 | A source document per product for CAS / INCI / specifications | Product pages, Resources, search quality |

### 10.3 New decisions raised by this discovery

| # | Decision | Why it is Cerium's | Blocks |
|---|---|---|---|
| 7 | Will Cerium supply **technical documents** (TDS, SDS, CoA) for publication, and may they be published openly or must they be gated? | Depends on principal agreements Cerium holds | Whether `/resources` exists at all; product page depth |
| 8 | May Cerium name **which principal supplies which product**? | Commercial sensitivity — competitors read this | Product↔principal linking; About-page credibility |
| 9 | Is there an owner and a cadence for **editorial content**? | Requires a person, not a decision | Whether Insights is built or dropped |
| 10 | Does the site serve **East and Central Africa** as a whole, and does that imply country pages, multiple currencies or languages? | Follows Cerium's stated vision; needs commercial confirmation | Whole-site IA, domain and hreflang strategy |
| 11 | Should **Personal Care / Home Care** be browsable product *collections* as well as industries? | Presentation preference with real SEO consequences | Products IA; whether collections are needed |
| 12 | Are **MOQs, pack sizes and lead times** publishable? | Commercial | Product page content; enquiry form design |

**RECOMMENDATION** — put 7, 8 and 10 to Cerium **before** Phase 2.1B begins.
Each changes the entity model, not merely the copy.

---

## 11. Recommendations for Phase 2.1B

**RECOMMENDATION** — Phase 2.1B should remain **specification, not
implementation**. Its output is a content model, not a migration.

### 11.1 Proposed scope for 2.1B

1. **Entity and relationship specification.** Turn section 4.3 into a precise
   content model: every entity, every field, every cardinality, every field's
   required source document. Explicitly mark which fields exist today, which are
   awaiting supply, and which are deliberately out of scope.
2. **Decide the product URL policy** (8.2, Option A vs B) and write down the
   redirect strategy that goes with it.
3. **Decide the `Function` vocabulary** — the controlled list, and where each
   assignment comes from. This is a technical claim per product; it needs a
   source, not a judgement call.
4. **Define the product-page publication threshold** (4.4). What minimum content
   earns a URL. Make it a rule expressible in data, as `isPublishable()` already is.
5. **Field-level content inventory.** For all 122 products: what we hold, what a
   publishable page needs, what the gap is. This turns "we need more data" into a
   list Cerium can actually action.
6. **Specify the application↔product relationship** and how it is populated
   without inference, including what happens to products where only
   category-level information exists.
7. **Draft the enquiry data model** (Phase 11 is far off, but every product page
   built before it must already carry the context an enquiry will need).

### 11.2 Explicitly NOT in Phase 2.1B

- No Django models, migrations or ORM code — those belong in a **separate
  service**, and not in 2.1B.
- No API endpoints or contracts.
- No route changes, no product page, no component work.
- No UI or design work.
- No resolution of any section 10 decision.

### 11.3 Sequencing note carried forward

**FACT** — `docs/data-layer-boundary.md` recommends two changes as the opening
work of Phase 2, before any Django work:

1. Correct the wording of the rule in `lib/content.ts` to the
   catalogue-records scope (one comment edit, zero runtime risk).
2. Cut the catalogue out of the client bundle by passing `{ name, slug }` lists
   into `SearchOverlay` and the navigation components as props from a server
   parent.

**OBSERVATION** — item 2 is not optional and not cosmetic: an API-backed
catalogue cannot be a synchronous module-scope import inside a client component,
so those call sites change regardless of the architecture chosen here. It is
substantially easier to verify against static data than against a live API.

**RECOMMENDATION** — schedule both as the first implementation work of Phase 2,
after 2.1B's specification is agreed. Neither depends on any open business
decision, and both de-risk everything that follows.

### 11.4 Priority, if only three things are done

1. **Product pages** — closes the worst-served journey and the entire long tail.
2. **Real search** — the only mechanism serving a customer who names a product.
3. **Real product↔application relationships** — turns an approximation into
   something honest enough for a chemicals supplier to publish.

---

## Appendix — what this phase did not do

- No application code was modified.
- No data was modified.
- No routes were added, removed or changed.
- No database models, migrations or APIs were created.
- No dependencies were installed.
- No UI or design work was performed.
- The Food Ingredients conflict was **documented, not resolved**.
