# Phase 2.1B — Content & Data Model Specification

**Status:** specification only. No models, tables, migrations, APIs, frontend
changes or data migrations were produced.
**Inputs:** `docs/phase-2.1a-website-architecture-discovery.md`, plus a direct
re-audit of `src/data/`, `src/types/content.ts`, `src/lib/`, `src/config/site.ts`.
**Repository state audited:** working tree at commit `9feb8b6`, 20 Aug 2026.

---

## 1. Purpose

This document answers one question:

> **What information does the Cerium website need to store, how is that
> information related, and where does each piece of information come from?**

It is the contract that Phase 2.1C (and the Django implementation after it)
builds against. It defines entities, fields, cardinalities, provenance rules,
publication gating and the authority hierarchy for sources.

It deliberately does **not** define storage types, indexes, table names, API
shapes or serializers. Those are implementation decisions that follow from this
document, not part of it.

### 1.1 Conventions used here

| Tag | Meaning |
|---|---|
| **FACT** | Verified in this repository or in supplied Cerium material. Checkable. |
| **OBSERVATION** | Inference drawn from those facts. |
| **RECOMMENDATION** | A proposal for the future system. |
| **DATA REQUIRED** | The model defines the field; Cerium has supplied no value. Never inferred, never generated. |
| **BUSINESS DECISION REQUIRED** | Not ours to resolve. Recorded, not answered. |

### 1.2 Correction to Phase 2.1A

**FACT** — Phase 2.1A originally stated that **82 of 122** products "have a name and
nothing else". That figure counted only `benefit` copy. A precise re-count
against `src/data/taxonomy.ts` gives:

| Products carrying… | Count |
|---|---|
| `benefit` copy | 40 |
| `olfactive` notes | 14 |
| `applications` (end-product formats) | 14 |
| **Any content beyond a name** | **54** |
| **Name only** | **68** |

**OBSERVATION** — the 14 fragrance products carry olfactive notes *and* format
lists, which is real content, so they are not name-only. The correct figure is
**68 name-only products, not 82**. Everything 2.1A concluded from that figure
still holds — the thin-page risk is real and the conditional-publishing
recommendation is unchanged — but the publication threshold in §10 is
calibrated against 68.

**RESOLVED, 20 Aug 2026** — `docs/phase-2.1a-website-architecture-discovery.md`
has been amended to match. Its §2.2 table now carries the full derivation
(`40 + 14 = 54`; `122 − 54 = 68`) so the miscount cannot recur.

---

## 2. Core entities

Each candidate entity was assessed against evidence in the supplied data. An
entity is created only where it carries its own identity, its own fields, or a
relationship that a plain attribute cannot express.

| # | Entity | Verdict | Rows available today |
|---|---|---|---|
| 1 | **Product** | Create | 122 |
| 2 | **Category** | Create (self-referential) | 30 |
| 3 | **Application** | Create | 6 |
| 4 | **Industry** | Create | 2 |
| 5 | **Function** | Create — **empty at launch** | 0 · DATA REQUIRED |
| 6 | **Format** | Create | 12 |
| 7 | **OlfactiveNote** | Create | 17 |
| 8 | **Document** | Create — structure only | 0 · supplied later |
| 9 | **Principal** (brand / manufacturer) | Create — relationship blocked | 3 |
| 10 | **SourceDocument** | Create (promote from enum) | 6 |
| 11 | **MediaAsset** | Create | 2 (logos only) |
| 12 | **Article** | Create — **empty at launch** | 0 |
| 13 | **CompanyProfile** | Create (singleton) | 1 |

### 2.1 Entities deliberately NOT created

| Not created | Why |
|---|---|
| `ProductFamily`, `Subcategory` | Depth-0 and depth-1 `Category`. Separate types triple the schema for a presentation label. Phase 2.1A §4.1. |
| `Price`, `PriceList` | Prices exist in the supplied Q3 2026 lists and are deliberately not modelled. Commercial decision — §13.3. |
| `StockLevel`, `Inventory` | No data, no stated requirement. A wrong stock figure on a chemicals site is worse than none. |
| `ProductVariant` / grade | **OBSERVATION:** plausible for a chemicals catalogue, but **no supplied document shows a single product with multiple grades or pack sizes**. Do not assume a relationship without evidence. Revisit when technical data arrives. |
| `Customer`, `Account` | No gated area is proposed. Phase 2.1A §3.8. |
| `Enquiry` | Phase 11. Forward-declared in §5.6 so product pages built earlier carry the right context, but out of scope for this schema. |
| `Collection` (Personal Care / Home Care as browsable product groups) | **BUSINESS DECISION REQUIRED** — §13.5. The model accommodates it without restructuring; do not build it speculatively. |

---

## 3. Entity definitions

### 3.1 Product

- **Purpose:** the material Cerium supplies. The atomic unit of the catalogue.
- **Why it exists:** 122 exist as data and none has a URL. Phase 2.1A found this
  to be the largest gap on the site and the entire SEO long tail.
- **Key fields:** see §4 for the full field table.
- **Relationships:** one primary `Category`; many `Application`, `Function`,
  `Format`, `OlfactiveNote`, `Document`; optional `Principal`.
- **Source:** 2026 catalogue (130 records), Q3 2026 fragrance price list (12),
  Q3 2026 price list (3), live website (7).

### 3.2 Category

- **Purpose:** how **Cerium organises its catalogue**. Owns the canonical URL of
  every product beneath it.
- **Why it exists:** it is the browse structure the printed catalogue already
  uses, and Journey 2 ("knows the ingredient type") is the best-served journey
  on the site because of it.
- **Key fields:** `slug`, `name`, `summary`, `description`, `parent`,
  `image`, `status`, SEO fields, provenance.
- **Relationships:** self-referential parent (nullable, **max depth 2**); one-to-many
  `Product`; many-to-many `Application` (editorial — see §5.4).
- **Source:** 2026 catalogue; Food Ingredients sub-ranges from the live website.

**FACT** — all 30 category slugs are distinct, and no category slug collides
with any product slug, application slug or industry slug today.

### 3.3 Application

- **Purpose:** **what the product is used for** — the end-use area a customer is
  formulating in.
- **Why it exists:** it is a genuinely different question from Category, it has
  its own verbatim descriptions, and it is a distinct customer journey (Journey 3).
- **Key fields:** `slug`, `name`, `description`, `industry`, `image`, `status`,
  SEO fields, provenance.
- **Relationships:** many-to-one `Industry`; many-to-many `Product`; many-to-many
  `Category` (editorial); one-to-many `Format`.
- **Source:** 2026 catalogue "Our Products" page — descriptions are verbatim.
- **Rows:** Skin Care, Hair Care, Bath & Shower, Fabric Care, Surface Care, Air Care.

### 3.4 Industry

- **Purpose:** **who the product is for** — the market served.
- **Why it exists:** head-term SEO landing surface and commercial positioning.
- **OBSERVATION** — this is the thinnest entity in the model: two rows, each
  essentially a grouping of three applications. It earns its place as a
  *positioning* surface, not as a data dimension.
- **Key fields:** `slug`, `name`, `description`, `image`, `status`, SEO fields,
  provenance.
- **Relationships:** one-to-many `Application`. **No direct relationship to
  Product** — see §5.3.
- **Source:** 2026 catalogue. Rows: Personal Care, Home Care.
- **Note:** whether a third row (Food) exists is **BUSINESS DECISION REQUIRED** — §13.1.

### 3.5 Function

- **Purpose:** **what the ingredient does** in a formulation — preservative,
  emollient, surfactant, active, UV filter, antimicrobial, chelating agent.
- **Why it exists:** **FACT** — Phase 2.1A established that the current category
  tree mixes three axes (material origin, functional role, market segment)
  because a printed catalogue can only have one ordering. A product sits in
  exactly one place in one tree, so "all antimicrobials across the catalogue"
  cannot be answered. Function is the axis a single tree structurally cannot
  express, and it is the vocabulary formulators search in.
- **Key fields:** `slug`, `name`, `definition`, `status`, provenance.
- **Relationships:** many-to-many `Product`, through a join carrying its own
  provenance (§5.5).
- **Source:** **DATA REQUIRED.** Assigning a function to a chemical is a
  technical claim. It must come from a manufacturer TDS or Cerium technical
  documentation — never from the product name, never from category membership,
  never generated.
- **Rows at launch: zero.** The entity ships empty and the facet stays hidden
  until real assignments exist.

**OBSERVATION** — it is tempting to seed Function from the existing sub-range
names (Preservatives → preservative, Silicones → silicone). Resist this for two
reasons: it would assign a function to products by inheritance rather than by
evidence, and it would produce a facet that looks populated while being merely a
restatement of the tree — which is the exact problem Function exists to solve.

### 3.6 Format

- **Purpose:** the **end-product format** a material goes into — shampoo, fabric
  softener, after shave.
- **Why it exists:** **FACT** — `applicationFormats` in
  `src/data/applications.ts` lists twelve Cerium-named formats, and 14 fragrance
  products carry them as free-text strings. **FACT** — the 12 distinct strings
  used on products match the 12 in the list exactly. This is already a
  controlled vocabulary; it is simply stored as text.
- **OBSERVATION** — these are the most specific customer-language terms on the
  site ("what goes in a fabric softener"), and the highest-value facet Cerium
  already has real data for.
- **Relationships:** many-to-many `Product`; many-to-one `Application`.
- **Source:** Q3 2026 fragrance price list. **Sourced for fragrances only** —
  the other 108 products must not be back-filled by inference.

### 3.7 OlfactiveNote

- **Purpose:** the olfactive family of a fragrance.
- **Why it exists:** **FACT** — 14 products carry `olfactive` as a
  pipe-delimited string (`"Vanilla | Ambery | Floral"`). **FACT** — that resolves
  to **17 distinct notes** (Fruity 6, Aromatic 5, Woody 3, Musky 3, Fougère 3,
  Floral 3, Ambery 3, Oriental 2, and nine appearing once).
- **OBSERVATION** — this is a multi-value controlled vocabulary stored in a
  single string field. Splitting it into a real many-to-many is a lossless
  structural change that makes fragrance browse possible.
- **Relationships:** many-to-many `Product`. Applies to fragrances only.
- **Source:** Q3 2026 fragrance price list.

### 3.8 Document

- **Purpose:** a supplied file attached to products or to the site — TDS, SDS,
  certificate, brochure, catalogue.
- **Why it exists:** Phase 2.1A proposed a `/resources` section whose entire
  value is product-attached documents. The model must be ready before the files
  arrive so ingestion is not a schema change.
- **Rows at launch: zero.** Structure only — see §8.
- **Source:** manufacturer / principal documentation (Tier 1 — §7.2).
- **Status:** **DATA REQUIRED**, and whether documents may be published at all
  is **BUSINESS DECISION REQUIRED** — §13.2.

### 3.9 Principal (brand / manufacturer)

- **Purpose:** the global supplier whose material Cerium distributes.
- **Why it exists:** **FACT** — Cerium is a distributor, not a manufacturer. The
  2026 catalogue names three principals with verbatim descriptions (Provital,
  Givaudan, Umang) and the About page already renders them. For a distributor,
  the principal is a large part of what a customer is buying.
- **Key fields:** `slug`, `name`, `description`, `logo`, `status`, provenance.
- **Relationships:** optional many-to-one from `Product` — **populated only if
  Cerium authorises it.**
- **Source:** 2026 catalogue "Global Partners in Innovation".
- **Blocked:** the *product → principal mapping* is **BUSINESS DECISION
  REQUIRED** — §13.2. The entity is safe to create; the foreign key stays null.

**OBSERVATION** — the entity and the relationship are separable, and separating
them is what lets the About page keep working while the commercially sensitive
mapping stays unpublished.

### 3.10 SourceDocument

- **Purpose:** the provenance backbone. Identifies which supplied Cerium
  document a piece of content came from.
- **Why it exists:** **FACT** — `SourceDocument` is already a union type in
  `src/types/content.ts` with six members, and **FACT** — all 152 catalogue
  entities (122 products + 30 categories) carry a `source`. Provenance coverage
  is currently 100% and must not regress.
- **Why promote enum → entity:** an enum cannot carry the document's own title,
  date, revision, custodian or file, and cannot record that pages 12–13 are
  missing from one of them. Those are exactly the facts a provenance audit needs.
- **Key fields:** `key`, `title`, `type`, `issued_on`, `received_on`,
  `authority_tier` (§7.2), `file`, `notes`.
- **Rows:** `catalogue-2026`, `pricelist-q3-2026`, `fragrance-pricelist-q3-2026`,
  `vision-statement`, `logo`, `website-ceriumchemicals.co.ke`.

### 3.11 MediaAsset

- **Purpose:** an image, referenced by any entity.
- **Why it exists:** **FACT** — `ImageRef` already carries `cloudinaryId`, `src`,
  `alt`, `width`, `height`, `focal`, and Cloudinary is wired but unconfigured.
  **FACT** — no data entry uses `cloudinaryId`; no production photography has
  been supplied.
- **Key fields:** `cloudinary_id`, `src`, `alt`, `width`, `height`, `focal`,
  `is_decorative`, provenance.
- **RECOMMENDATION** — `alt` is required unless `is_decorative` is true. This
  encodes the existing rule (`alt: ""` only for genuinely decorative images) as a
  constraint rather than a convention.
- **RECOMMENDATION** — an unset asset must keep rendering the labelled
  "Image pending" placeholder. Never substitute stock imagery that implies it
  shows Cerium's own products, facilities, team or customers.

### 3.12 Article

- **Purpose:** editorial content (Insights), nested under Resources.
- **Rows at launch: zero.** Phase 2.1A recommended nesting rather than a
  top-level section precisely because there is no content and no named owner.
- **Source:** Cerium-authored. **BUSINESS DECISION REQUIRED** — §13.4.

### 3.13 CompanyProfile

- **Purpose:** the singleton holding company-level content currently hardcoded in
  `src/config/site.ts` and `src/data/company.ts` — description, vision, mission,
  address, contact, hours, social profiles, core values, metrics.
- **Why it exists:** **FACT** — `siteConfig.description` currently states Cerium
  serves "personal care and home care industries", which is one half of the Food
  Ingredients conflict. **OBSERVATION** — while that sentence is a source
  literal, resolving the Food decision requires a code change and a rebuild.
  Moving it into data makes the decision a content edit.
- **RECOMMENDATION** — `CompanyMetric` keeps its `as_stated` field verbatim
  ("100+", "10+", "80+") so a claim Cerium makes about itself is never rounded,
  recomputed or restated.

---

## 4. Product fields

The conceptual `Product` record. **TYPE** is conceptual, not a database type.

### 4.1 Identity and copy

| Field | Type | Req. | Source | Description | Notes |
|---|---|---|---|---|---|
| `id` | opaque id | Required | System | Internal identifier | **Never appears in a URL.** |
| `slug` | slug | Required | Derived, then persisted | URL segment | **FACT:** all 122 product names are distinct and slugify without collision. Phase 1 derives slugs from names; from Phase 2 the slug is a **stored field** so renaming a product does not break its URL. |
| `name` | short text | Required | Catalogue / price lists | Display name | Verbatim. e.g. "Aloe Vera Extract", "Baicapil". |
| `benefit` | long text | Optional | Catalogue / price lists | Benefit copy **verbatim** | **FACT:** present on 40 of 122. Never paraphrased into a claim — see §7.3. |
| `short_description` | text ≤160 | Optional | Cerium-authored | One-line summary for cards and meta | **DATA REQUIRED.** Distinct from `benefit`: `benefit` is quoted source, this is editorial. Do not auto-derive by truncating `benefit`. |
| `full_description` | rich text | Optional | Cerium-authored / principal | Long-form body | **DATA REQUIRED.** |

### 4.2 Taxonomy and relationships

| Field | Type | Req. | Source | Description | Notes |
|---|---|---|---|---|---|
| `primary_category` | FK → Category | **Required** | Catalogue | The one category that owns this product | **FACT:** every one of the 122 products appears in exactly one category today. Drives canonical URL and breadcrumb. |
| `applications` | M2M → Application | Optional | Catalogue / price lists | End uses this product serves | Currently **derived from category membership** and therefore over-broad — §5.2. |
| `functions` | M2M → Function | Optional | TDS / technical docs | What it does in a formulation | **DATA REQUIRED.** Zero rows at launch. |
| `formats` | M2M → Format | Optional | Fragrance price list | End-product formats | **FACT:** populated for 14 fragrance products only. |
| `olfactive_notes` | M2M → OlfactiveNote | Optional | Fragrance price list | Olfactive family | Fragrances only; 14 products, 17 notes. |
| `principal` | FK → Principal | Optional | Cerium | Supplying manufacturer | **BLOCKED** — §13.2. Stays null until authorised. |
| `industries` | — | **Not stored** | — | — | **Derived** through Application → Industry. See §5.3. |

### 4.3 Technical fields

**All of §4.3 is DATA REQUIRED.** Every field here is a technical claim about a
chemical. None may be generated, inferred from a product name, or copied from a
third-party website.

| Field | Type | Req. | Source | Description | Notes |
|---|---|---|---|---|---|
| `inci_name` | text | Optional | TDS / principal doc | INCI name | Tier 1 source only. Must carry its own provenance (§11.3). |
| `cas_number` | text | Optional | TDS / principal doc | CAS registry number | Tier 1 only. Format-validated on entry; a malformed CAS is worse than an absent one. |
| `einecs_number` | text | Optional | TDS / principal doc | EINECS / EC number | Include only if Cerium's documents carry it. |
| `appearance` | text | Optional | TDS | Physical appearance | Verbatim from the sheet. |
| `physical_form` | controlled | Optional | TDS | Liquid / powder / solid / paste | Small controlled vocabulary once documents arrive. |
| `solubility` | text | Optional | TDS | Solubility | Verbatim. |
| `usage_rate` | text | Optional | TDS | Recommended use level | **Verbatim, including units and range.** Never normalised — a re-expressed dose rate is a new claim. |
| `ph_range` | text | Optional | TDS | Working pH | Verbatim. |
| `storage_conditions` | text | Optional | TDS / SDS | Storage and handling | Verbatim. |
| `shelf_life` | text | Optional | TDS | Stated shelf life | Verbatim. |
| `certifications` | M2M → Certification | Optional | Certificates | COSMOS, ECOCERT, halal, kosher… | **Entity deferred** until at least one real certificate exists. Do not create a table for zero rows with no evidence of which schemes apply. |
| `country_of_origin` | text | Optional | Principal doc | Origin | **OBSERVATION:** commercially sensitive for a distributor — confirm publishability before use. |

**RECOMMENDATION** — do **not** add technical fields beyond this list
speculatively. Every field above is one a TDS or SDS routinely carries, so each
has a genuine reason to exist. Adding fields with no document behind them
creates empty columns that later invite being filled by guesswork.

### 4.4 Media, documents, commercial

| Field | Type | Req. | Source | Description | Notes |
|---|---|---|---|---|---|
| `image` | FK → MediaAsset | Optional | Cerium photography | Primary product image | **DATA REQUIRED** — no photography supplied. Renders "Image pending". |
| `gallery` | M2M → MediaAsset | Optional | Cerium photography | Additional images | Ordered. |
| `documents` | M2M → Document | Optional | Principal docs | Attached TDS/SDS/etc. | Zero rows at launch — §8. |
| `pack_sizes` | text[] | Optional | Cerium | Available pack sizes | **BUSINESS DECISION REQUIRED** — §13.6. |
| `minimum_order_quantity` | text | Optional | Cerium | MOQ | **BUSINESS DECISION REQUIRED** — §13.6. |
| `price` | — | **Not modelled** | — | — | Deliberate. §13.3. |
| `stock_level` | — | **Not modelled** | — | — | No data, no requirement. |

### 4.5 SEO, status, provenance, audit

| Field | Type | Req. | Source | Description | Notes |
|---|---|---|---|---|---|
| `seo_title` | text ≤60 | Optional | Cerium-authored | Overrides the default title | Falls back to `name`. §9. |
| `meta_description` | text ≤160 | Optional | Cerium-authored | Overrides the default description | §9.2 governs generation. |
| `og_image` | FK → MediaAsset | Optional | Cerium | Social share image | Falls back to `image`, then the site default. |
| `canonical_url` | url | Optional | System | Override only | Normally derived. §9.1. |
| `noindex` | boolean | Required | Editorial | Force exclusion from indexing | Default `false`. An explicit editorial override, separate from the completeness gate. |
| `status` | enum | Required | Editorial | draft / in_review / published / archived | §10. |
| `published_at` | datetime | Optional | System | First publication | — |
| `source_document` | FK → SourceDocument | **Required** | System | Where this record came from | **FACT:** 100% coverage today. Must not regress. §11. |
| `source_reference` | text | Optional | Editorial | Locator within the document | e.g. "catalogue p.7". |
| `last_verified_on` | date | Optional | Editorial | When a human last checked it against the source | §11.2. |
| `created_at` / `updated_at` | datetime | Required | System | Audit timestamps | **`updated_at` is what finally lets `sitemap.ts` emit an honest `lastModified`** — Phase 1 omits it deliberately because build time is not a content modification date. |

---

## 5. Relationships

### 5.1 Summary

| Relationship | Cardinality | Required | Evidence |
|---|---|---|---|
| Product → Category | **many-to-one** | Yes | **FACT:** each of the 122 products is defined under exactly one category. |
| Category → Category (parent) | **many-to-one**, self-ref, nullable | No | **FACT:** the tree is two levels everywhere today. |
| Product ↔ Application | **many-to-many** | No | Products serve multiple end uses; applications draw on many products. |
| Product ↔ Function | **many-to-many** | No | A material can be both preservative and antimicrobial. Zero rows today. |
| Product ↔ Format | **many-to-many** | No | **FACT:** fragrance entries list up to 5 formats each. |
| Product ↔ OlfactiveNote | **many-to-many** | No | **FACT:** `"Vanilla \| Ambery \| Floral"` — three notes, one product. |
| Product → Principal | **many-to-one**, nullable | No | Blocked — §13.2. |
| Product ↔ Document | **many-to-many** | No | Structural hedge — §5.7. |
| Application → Industry | **many-to-one** | Yes | **FACT:** each of the 6 applications has exactly one `groupSlug`. |
| Category ↔ Application | **many-to-many**, editorial | No | §5.4. Replaces two conflicting one-way lists. |
| Product → Industry | **derived, not stored** | — | §5.3. |

### 5.2 Product ↔ Application — replace the derivation

**FACT** — `fetchProductsForApplication()` resolves `Application.categorySlugs`
and returns *every* product in those categories.

**OBSERVATION** — so the Skin Care page lists all 19 Natural Extracts, including
Onion, Rosemary and Saw Palmetto Extract, whose supplied benefit copy is
explicitly about **hair and scalp**. The relationship is category-granular where
the truth is product-granular. On a site that must not overstate what a material
does, that is a data-integrity issue, not merely a relevance one.

**RECOMMENDATION** — a real join table, `ProductApplication`, carrying:

| Column | Purpose |
|---|---|
| `product`, `application` | The pair |
| `source_document`, `source_reference` | Where this specific claim comes from |
| `assertion` | `stated` (a document names this use) or `inherited` (category-level default, pending verification) |
| `last_verified_on` | Audit |

**RECOMMENDATION** — migrate today's derived pairs in as `inherited`, never as
`stated`. This preserves current site behaviour without laundering an
approximation into a verified fact, and it produces the exact worklist Cerium
needs in order to verify them.

### 5.3 Product ↔ Industry — derived, never stored

**RECOMMENDATION** — do **not** create a Product→Industry relationship.

**OBSERVATION** — a product's market is a *consequence* of its uses, not an
independent property. Storing it creates a second source of truth that will
drift from the applications, and it is already reachable as
`Product → Application → Industry`. Phase 1 models it this way
(`Application.groupSlug`) and it is correct.

**FACT** — this also makes the Food Ingredients decision cheap: adding a Food
industry does not touch a single product row. See §13.1.

### 5.4 Category ↔ Application — one table, not two

**FACT** — the same relationship is currently stored **twice, in two
directions**: `Category.applicationSlugs` (46 pairs) and
`Application.categorySlugs` (26 pairs).

**FACT** — the two disagree on **20 of 46 pairs**. The application side is a
strict subset of the category side; 20 category-side pairs have no application-side
counterpart, including:

```
essential-oils        -> skin-care, hair-care, bath-and-shower
preservatives         -> skin-care, hair-care
silicones             -> skin-care
mosquito-repellents   -> skin-care
natural-butters       -> hair-care
```

**OBSERVATION** — this is user-visible and asymmetric. `/products/essential-oils`
lists Skin Care under "related applications", but `/applications/skin-care` does
not list Essential Oils, because it reads the other list. A visitor who follows
a link and then tries to come back the same way gets a different answer. No
referential integrity is broken — **FACT:** all 78 cross-references resolve to
existing slugs — but the two hand-maintained directions have drifted apart,
which is precisely what a database relationship exists to prevent.

**RECOMMENDATION** — collapse both into one `CategoryApplication` join table,
read in both directions. Mark it **editorial curation, not fact**: its job is
navigation and internal linking, especially for categories where per-product
data does not yet exist. Default it to derived-from-products once §5.2 is
populated, with manual override retained.

### 5.5 Product ↔ Function — provenance on the join

**RECOMMENDATION** — `ProductFunction` carries `source_document`,
`source_reference` and `last_verified_on`, exactly like `ProductApplication`.

**OBSERVATION** — the claim "this product is a preservative" belongs to the
*pairing*, not to the product and not to the function. Provenance recorded only
at record level cannot express which document supports which assignment, and
these are the assignments that carry the most liability.

### 5.6 Enquiry — forward declaration only

**RECOMMENDATION** — out of scope for this schema (Phase 11), but every product
page built before then must carry the context an enquiry will eventually need:
product identity, the category it was found in, and the application context the
visitor arrived from. Phase 1 already does a minimal version of this via
`/contact?product=<slug>`. Nothing needs building now; the point is not to
design product pages that make the context unrecoverable later.

### 5.7 Product ↔ Document — many-to-many, and why

**RECOMMENDATION** — model as many-to-many even though one-to-many would cover
every case we can currently demonstrate.

**OBSERVATION** — this is a deliberate structural hedge and is flagged as such
rather than presented as an evidenced relationship. **DATA REQUIRED:** whether
Cerium's documents are per-product or per-range is unknown. A single SDS
covering several grades is common in the industry, but no supplied Cerium
document demonstrates it. The join table costs almost nothing now; converting
one-to-many → many-to-many after documents are ingested is a migration with data
already in it.

---

## 6. Taxonomy rules

### 6.1 The conceptual test

| Entity | Answers | Cerium example |
|---|---|---|
| **Product** | What the product **is** | Aloe Vera Extract; Baicapil; Shea Butter |
| **Category** | How **Cerium organises** its catalogue | Natural Extracts; Carrier Oils; Preservatives |
| **Application** | What it is **used for** | Skin Care; Fabric Care; Air Care |
| **Industry** | **Which market** it serves | Personal Care; Home Care |
| **Function** | What the material **does** | preservative; emollient; UV filter |

**FACT** — the test holds for a real record: Aloe Vera Extract *is* a botanical
extract (Product), Cerium files it under Natural Extracts (Category), it is used
in skin care and hair care (Application), which serve Personal Care (Industry),
and it functions as a soothing agent (Function — **DATA REQUIRED**).

### 6.2 Where the real data does not fit the test

The brief asks that a different interpretation be documented if the real data
requires one. It does, in two places.

**FACT** — four sub-ranges are not named by material at all:

| Sub-range | Named by | Should be |
|---|---|---|
| Skin Care Actives | Application | Category (kept) + Function `active` |
| Hair Care Actives | Application | Category (kept) + Function `active` |
| Personal Care Fragrances | Industry | Category (kept) + Function `fragrance` |
| Fabric Care Fragrances | Industry | Category (kept) + Function `fragrance` |

**OBSERVATION** — this is not an error to correct. Category is defined as *how
Cerium organises its catalogue*, and this **is** how Cerium organises it — the
printed catalogue is the source of truth for that. The conceptual test describes
the axes; it does not license renaming Cerium's own ranges to make them tidier.

**RECOMMENDATION** — keep the category names exactly as Cerium uses them, and
let Function and Application carry the cross-cutting truth. This is the
difference between a taxonomy that reflects the business and one that reflects
a model.

**OBSERVATION** — one consequence must be accepted knowingly:
`/products/skin-care-actives` and `/applications/skin-care` are adjacent in
meaning and will compete for overlapping queries. It is materially better than
the exact duplication Phase 1 avoided, but it is the same tension in weaker
form, and it originates in Cerium's naming, not in the model.

### 6.3 Structural rules

1. **Category depth is capped at 2** (family → sub-range). **FACT:** the data is
   two levels everywhere. Uncapped depth makes breadcrumbs, URLs and the
   mega-menu ambiguous with no content that needs it.
2. **A product has exactly one primary category.** Multiple parents make the
   canonical URL undecidable — the precise failure Phase 1 avoided.
3. **Slugs are stored fields, unique within their entity, and never numeric.**
   **RECOMMENDATION:** enforce uniqueness across Category *and* Product if the
   flat product URL (Phase 2.1A §8.2, Option B) is ever chosen. Under the
   recommended nested URL it is not required — but **FACT:** no collision exists
   today in either scheme, so the constraint is free to add now and expensive to
   retrofit later.
4. **Renaming never changes a URL.** Slug changes are explicit and produce a
   redirect record.
5. **No category is ever hardcoded in application code.** Phase 1's rule,
   carried forward without exception.
6. **No fourth taxonomy axis.** Phase 2.1A §5.

---

## 7. Content and source rules

### 7.1 The hard rule, unchanged

> **Never invent product or technical information.**

No CAS numbers, INCI names, specifications, certifications, origins, stock
levels, prices, founding dates, employee counts, awards or ratings unless they
appear in a supplied Cerium document. For a chemicals supplier this is a safety
and liability matter, and fabricated structured data is a manual-action risk.

### 7.2 Source authority hierarchy

Every field's source resolves to one tier. A lower tier may **never** overwrite a
higher one.

| Tier | Source | Authoritative for | May be used for |
|---|---|---|---|
| **1** | Manufacturer / principal documentation — TDS, SDS, certificates | **All technical facts:** INCI, CAS, specifications, functions, usage rates, storage | Everything technical |
| **2** | Cerium supplied documents — 2026 catalogue, Q3 2026 price lists, vision statement | Catalogue structure, product names, benefit copy, company claims, applications, formats, olfactive notes | Commercial and editorial content |
| **3** | Live ceriumchemicals.co.ke | Contact details, opening hours, ranges not in the catalogue | Contextual only — **may be stale.** It is one half of the Food conflict (§13.1). Never overrides Tier 1 or 2. |
| **4** | Cerium staff statements (email, verbal) | Nothing until written down | Must be recorded as a dated `SourceDocument` before use |
| **5** | **AI-generated** | **Nothing. Never authoritative.** | See §7.4 |

### 7.3 Verbatim fields

**FACT** — Phase 1 stores benefit and summary copy verbatim, and forbids
paraphrasing it into a claim.

**RECOMMENDATION** — mark these fields verbatim in the model and protect them:
`Product.benefit`, `Category.summary`, `Application.description`,
`Industry.description`, `CompanyMetric.as_stated`, `Principal.description`, and
every technical field in §4.3.

Rules: light-touch edits for sentence case only; no rewriting for tone, length
or keywords; no restating a Cerium claim in stronger terms than the source; and
never summarising a technical value into a different unit or range.

### 7.4 AI-generated content

**Prohibited** for: any field in §4.3, `benefit`, function assignments,
application assignments, certifications, origins, company metrics, any
structured-data value, and any field whose source tier is 1 or 2.

**Permitted, with conditions,** for: draft `short_description`, `seo_title` and
`meta_description` on **non-technical** pages, and only when
(a) it restates information already present in a Tier 1–3 source,
(b) it is stored with `source_tier = 5` and `status = draft`,
(c) a human approves it before `status` moves to `published`, and
(d) it never becomes the source of a fact absent from the record.

**RECOMMENDATION** — make this enforceable, not advisory: a record whose
`source_tier` is 5 cannot reach `published` without a recorded human approval.
A rule that only exists in a document will be forgotten within a phase.

### 7.5 Recorded gaps — preserve, do not fill

**FACT** — catalogue pages 12–13 are missing from the supplied PDF, and some
glare-obscured entries were omitted rather than guessed.

**RECOMMENDATION** — record this on the `SourceDocument` row for
`catalogue-2026` as a `coverage_note`. A known gap that is written down is
managed; a known gap that is not written down eventually gets filled by someone
who does not know it was a gap.

---

## 8. Technical document model

**No documents are created, imported or populated in this phase.**

### 8.1 Document

| Field | Type | Req. | Source | Notes |
|---|---|---|---|---|
| `id` | opaque id | Required | System | |
| `title` | text | Required | Document | Verbatim from the file. |
| `document_type` | enum | Required | Editorial | `tds`, `sds`, `certificate`, `brochure`, `catalogue`, `other`. |
| `file` | file | Required | Supplied | PDF expected. |
| `language` | code | Optional | Document | Default `en`. |
| `version` | text | Optional | Document | Verbatim revision label. |
| `issued_on` | date | Optional | Document | As printed on the document. |
| `expires_on` | date | Optional | Document | Certificates especially. |
| `issued_by` | FK → Principal | Optional | Document | Who authored it. |
| `products` | M2M → Product | Optional | Editorial | Empty for site-level documents. §5.7. |
| `access` | enum | Required | Editorial | `public` / `on_request`. **BUSINESS DECISION REQUIRED** — §13.2. Default `on_request` — the safe default. |
| `status` | enum | Required | Editorial | §10. |
| `source_document` | FK → SourceDocument | Required | System | §11. |

### 8.2 Rules

1. **A document is a supplied artefact.** It is never generated, never
   summarised into fields, and its text is never used to populate technical
   fields without a human transcribing and attributing them.
2. **`access` defaults to `on_request`.** Publishing an SDS Cerium's principal
   did not authorise is a commercial and legal problem; withholding one is
   merely a missing link.
3. **An expired certificate is never shown as current.** If `expires_on` has
   passed, the document is hidden and flagged for review rather than displayed
   with a date the visitor must interpret.
4. **A document with no attached product is a site-level resource** and appears
   only in the `/resources` index.

**OBSERVATION** — Phase 2.1A noted that gating documents suppresses exactly the
search traffic `/resources` exists to capture. That tension is real and it is
Cerium's to resolve (§13.2) — the model supports either answer per document,
which is why `access` sits on the document and not in configuration.

---

## 9. SEO content fields

**No SEO optimisation is performed in this phase.** This defines only what the
future system must be able to store.

### 9.1 Per-page fields

Applies to Product, Category, Application, Industry, Article.

| Field | Req. | Fallback | Notes |
|---|---|---|---|
| `seo_title` | Optional | Entity `name` | ≤60 chars. Site name appended by the template, never stored in the field. |
| `meta_description` | Optional | `short_description` | ≤160 chars. §9.2. |
| `canonical_url` | Optional (override) | **Derived from the route** | **FACT:** `buildMetadata()` already declares a canonical on every indexable page. Derivation stays the default; the field exists only for genuine exceptions. |
| `og_image` | Optional | Entity `image` → site default | **FACT:** a site-level `opengraph-image.tsx` already exists. |
| `noindex` | Required | `false` | Editorial override, independent of the completeness gate (§10.3). |
| `redirects_from` | Optional | — | Retired slugs. **Required** by the recommended nested product URL (Phase 2.1A §8.2, Option A). |
| `updated_at` | Required | — | Enables honest `lastModified` in the sitemap. |

### 9.2 Description rules

**FACT** — Phase 1's rule: descriptions come from real Cerium information; no
keyword stuffing, no generated filler.

**RECOMMENDATION** — a `meta_description` may restate supplied information but
may never introduce a fact absent from the record. Where none is written, fall
back to `short_description`; where that is also absent, emit the template
default rather than generating prose. **An absent description is a smaller
problem than an invented one.**

### 9.3 Structured data

| Schema | Where | Status |
|---|---|---|
| `Organization` | Root | **FACT:** emitted. Only supplied properties — no founding date, employee count, rating or award. |
| `WebSite` | Root | Emitted. |
| `BreadcrumbList` | Every deep page | Emitted, derived from the category path. |
| `ItemList` | Category, application pages | **FACT:** emitted **instead of `Product`**, because Cerium has supplied no offer data. |
| `Product` | Product pages | **Do not emit** until real price / availability / SKU exist. Claiming `Product` without them produces invalid markup and no rich result. Gated on §13.3. |

**FACT** — `Organization` already asserts `areaServed: "East and Central
Africa"`, taken from Cerium's vision statement. **OBSERVATION** — that is a
supplied claim and is safe, but it is also the only place the site currently
commits to a multi-country footprint, which connects to the open question in
§13.5.

**RECOMMENDATION** — `sameAs` continues to emit only social URLs that are
confirmed. **FACT:** three of four are `undefined` today. A wrong profile URL in
structured data is worse than an absent one.

---

## 10. Publishing and status model

### 10.1 Two independent gates

**OBSERVATION** — a single `status` field cannot do this job. An editor can mark
a product `published` while it is still a bare name, which is exactly the
accident the brief asks the model to prevent. Editorial *intent* and content
*completeness* are different facts and need separate gates.

```
publicly indexable  =  status == published
                       AND completeness_gate == pass
                       AND noindex == false
                       AND every ancestor category is itself published
```

### 10.2 Gate 1 — editorial status

| Status | Meaning | Visible | In sitemap |
|---|---|---|---|
| `draft` | Being written. Default for anything created by import or Studio. | No | No |
| `in_review` | Awaiting provenance / technical check. | No (preview only) | No |
| `published` | Editorially approved. | **Only if the completeness gate also passes** | Same condition |
| `archived` | Withdrawn. Content retained. | No — serves 410, or 301 where a successor exists | No |

**RECOMMENDATION** — `archived` must not delete. **FACT:** Phase 1 already
demonstrates the value of retaining unpublishable content — the six Food
Ingredients sub-ranges exist as data, render as content on their parent page,
and simply have no pages of their own. Archiving must behave the same way.

### 10.3 Gate 2 — completeness

**FACT** — `isPublishable()` already implements exactly this idea for
categories: a category earns a URL when it has its own products or sub-ranges to
send visitors to. That is why the six Food sub-ranges have no pages, and it is
why no thin category page can ship today.

**RECOMMENDATION** — extend the identical principle to products. A product earns
a URL when it has **at least one** of:

- `benefit` copy, or
- `short_description` or `full_description`, or
- at least one attached public `Document`, or
- at least two populated technical fields from §4.3, or
- at least one `stated` (not `inherited`) application or function assignment.

**FACT** — against today's data that threshold yields:

| | Count |
|---|---|
| Products that would earn a page | **54** |
| Products that would not (name only) | **68** |
| Total | 122 |

**OBSERVATION** — that is the point of the gate. Publishing all 122 today would
mean publishing 68 pages whose entire body is a name, a category label and an
enquiry button. The 68 remain fully visible as cards inside their category pages
and fully enquirable — they simply do not get their own indexable URL until
there is something on it.

**RECOMMENDATION** — the threshold must be **data-expressible and recomputed on
save**, never a manual checkbox. A product crossing the threshold should gain
its page, its sitemap entry and its internal links automatically — exactly as
adding one product to a Food sub-range would give it a page today.

### 10.4 Cascade

**RECOMMENDATION** — a child is never publicly reachable through an unpublished
parent. If a category is `draft` or `archived`, its products are not indexable
regardless of their own state. **FACT:** this makes the Food Ingredients
decision a single status change on one category row (§13.1).

---

## 11. Provenance model

### 11.1 Principle

**FACT** — every one of the 152 catalogue entities carries a `source` today.
Coverage is 100%. **RECOMMENDATION** — that must be a constraint in Phase 2, not
a convention: **a content record cannot be saved without a `source_document`.**

### 11.2 Record-level provenance

Every content entity carries:

| Field | Req. | Purpose |
|---|---|---|
| `source_document` | **Required** | FK → SourceDocument. Which supplied document. |
| `source_reference` | Optional | Locator within it — "catalogue p.7", "fragrance price list row 24". |
| `last_verified_on` | Optional | When a human last checked the value against the document. |
| `verified_by` | Optional | Who. |

### 11.3 Claim-level provenance — used sparingly

**RECOMMENDATION** — extend provenance below record level in exactly three
places, and no further:

1. `ProductApplication` — plus `assertion` (`stated` / `inherited`).
2. `ProductFunction` — the highest-liability assignment in the model.
3. **Technical fields (§4.3)** — as a small `FieldProvenance` record keyed by
   record + field name, used *only* for those fields.

**OBSERVATION** — the reasoning is proportionality. Per-field provenance on
every field of every entity is over-engineering: it triples the write path and
most fields share the record's source anyway. But **FACT:** provenance already
varies within a single record today — three products take their `benefit` from
`pricelist-q3-2026` while their category sits on `catalogue-2026`, and twelve
fragrance entries mix `catalogue-2026` with `fragrance-pricelist-q3-2026`. So
record-level alone is already slightly lossy, and it will become materially
lossy once a TDS supplies a CAS number for a product whose name came from the
catalogue. Restricting claim-level provenance to the liability-bearing fields
covers that without the cost.

### 11.4 SourceDocument fields

| Field | Req. | Notes |
|---|---|---|
| `key` | Required | Stable identifier — matches today's six union members. |
| `title` | Required | Full document title. |
| `type` | Required | catalogue / price list / statement / website / technical / brand asset. |
| `authority_tier` | Required | 1–5, per §7.2. |
| `issued_on`, `received_on` | Optional | — |
| `file` | Optional | The artefact itself. **FACT:** none of the source documents is currently in the repository — only their transcription. |
| `coverage_note` | Optional | Known gaps — e.g. "photographs of pages 12–13 missing; some entries glare-obscured and omitted rather than guessed". §7.5. |

**RECOMMENDATION** — store the source files themselves. Today the provenance
chain points at documents that exist only outside the system, which makes any
future audit dependent on someone still having the PDF.

---

## 12. Available now vs required later

### 12.1 Available now

| Content | Volume | Source | Tier |
|---|---|---|---|
| Product names | **122**, all distinct | Catalogue, price lists | 2 |
| Category tree | **30** nodes, 2 levels | Catalogue | 2 |
| Benefit copy | **40** products | Catalogue, price list | 2 |
| Olfactive notes | **14** products, 17 notes | Fragrance price list | 2 |
| End-product formats | **14** products, 12 values | Fragrance price list | 2 |
| Applications | **6**, verbatim descriptions | Catalogue | 2 |
| Industries | **2**, verbatim descriptions | Catalogue | 2 |
| Category ↔ Application links | 46 / 26 conflicting pairs | Hand-authored | 2 |
| Company profile | vision, mission, about, tagline | Vision statement, catalogue | 2 |
| Core values | **6**, with scripture references | Vision statement | 2 |
| Company metrics | **3**, stored `as_stated` | Catalogue | 2 |
| Principals | **3**, with descriptions | Catalogue | 2 |
| Contact, address, hours | complete | Catalogue, live site | 2 / 3 |
| Provenance markers | **152 of 152** — 100% | System | — |
| Brand assets | 2 logo files | Supplied | 2 |

### 12.2 Required later — DATA REQUIRED

| Content | Blocks | Source needed | Tier |
|---|---|---|---|
| INCI names | Product pages, search quality | Principal TDS | 1 |
| CAS numbers | Product pages, Journey 1 | Principal TDS | 1 |
| Specifications (§4.3) | Product pages | Principal TDS | 1 |
| **Function assignments** | The whole Function facet | Principal TDS | 1 |
| **Verified application assignments** | Fixing the over-broad derivation (§5.2) | Catalogue / TDS | 1–2 |
| Technical documents | `/resources` in its entirety | Principal | 1 |
| Certifications | Certification entity (deferred) | Certificates | 1 |
| Product photography | Every image slot | Cerium | 2 |
| `short_description` for 122 products | Meta descriptions, cards | Cerium-authored | 2 |
| Content for **68** name-only products | Their product pages | Cerium / principals | 1–2 |
| Catalogue pages 12–13 | Catalogue completeness | Cerium | 2 |
| Social profile URLs | `sameAs` in Organization | Cerium | 2 |
| Product ↔ principal mapping | Product provenance, About linking | Cerium | 2 |
| Editorial articles | Insights | Cerium | 2 |

### 12.3 What is deliberately absent, not missing

| Not stored | Why |
|---|---|
| Prices | Commercial decision. §13.3. |
| Stock levels | No data, no requirement. |
| Product-level industry | Derived through Application. §5.3. |
| `Product` structured data | No offer data. §9.3. |
| Search index content | Phase 4. |
| Enquiry records | Phase 11. §5.6. |

---

## 13. Unresolved business decisions

### 13.1 Food Ingredients

**STATUS: BUSINESS DECISION REQUIRED. Not resolved in this document.**

**FACT** — two current supplied sources disagree. The 2026 catalogue's "About
Us" states Cerium serves personal care and home care and never mentions food.
The live site lists a Food Ingredients range with six named sub-ranges. Both are
represented honestly in code with accurate `source` markers, and no product
names are published for that range anywhere — so all six sub-ranges have zero
products and no pages.

**How the model accommodates either answer without restructuring:**

| If Cerium says… | Change required | Touches |
|---|---|---|
| **Yes — food is a current range** | Add one `Industry` row; add food applications; set `Category('food-ingredients').status = published`; update `CompanyProfile.description` | 1 industry row, N application rows, 1 category status, 1 company field |
| **No — food is discontinued** | Set `Category('food-ingredients').status = archived` | **1 field on 1 row** — children cascade (§10.4), content retained, nothing deleted |
| **Undecided** | Leave `status = draft` | Nothing. Current behaviour preserved. |

**Four properties of the model make this cheap, and all four are deliberate:**

1. Industry is an **entity, not an enum** — a third market is a row, not a
   migration.
2. Product carries **no industry** (§5.3) — no product row is touched either way.
3. **Status cascades** (§10.4) — archiving the parent removes the whole branch
   from public view in one edit.
4. The company description lives in **`CompanyProfile`, not in source code**
   (§3.13) — so the half of the conflict that currently sits in
   `src/config/site.ts` becomes a content edit rather than a code change and a
   rebuild.

**The question for Cerium** (unchanged from Phase 1):

> Does Cerium currently supply food ingredients, and should the website present
> food as a product range alongside personal care and home care? If yes, the
> company description needs updating to match. If no, the Food Ingredients range
> should come off the site.

### 13.2 Technical documents and principal attribution

**BUSINESS DECISION REQUIRED.** Two linked questions:

- Will Cerium supply TDS / SDS / certificates for publication, and may each be
  public or on-request? — blocks `/resources` entirely, and blocks every
  technical field in §4.3.
- May the site state **which principal supplies which product**? — blocks
  `Product.principal`. Commercially sensitive: competitors read supplier
  attribution.

**Model impact:** none structurally. `Document.access` defaults to `on_request`
and `Product.principal` stays null. Both are populated by data entry, not by
schema change.

### 13.3 Pricing

**BUSINESS DECISION REQUIRED.** **FACT** — quarterly B2B prices exist in the
supplied Q3 2026 price lists and were deliberately not modelled.

**Model impact:** this also gates §9.3 — `Product` structured data requires
price, availability or SKU, so `ItemList` remains correct until this is answered.

### 13.4 Editorial ownership

**BUSINESS DECISION REQUIRED.** Is there an owner and a cadence for Insights?
**OBSERVATION** — this needs a person, not a decision. `Article` ships empty; if
no owner exists, the section is simply never surfaced, which costs nothing.

### 13.5 Market scope and product collections

**BUSINESS DECISION REQUIRED.** Two questions Phase 2.1A raised:

- Does the site serve **East and Central Africa** as a whole — implying country
  pages, currencies or languages? **FACT:** `Organization` already asserts
  `areaServed: "East and Central Africa"`, so the site makes the claim while
  reflecting none of its consequences.
- Should **Personal Care / Home Care** be browsable product *collections* as
  well as industries? If yes, build collections that canonicalise to the
  ingredient families — never a third set of category pages.

### 13.6 Commercial detail

**BUSINESS DECISION REQUIRED.** Are pack sizes, MOQs and lead times publishable?
Fields are defined in §4.4 and stay empty until answered.

### 13.7 Standing decisions carried forward

Social profile URLs (§12.2), photography (§12.2), and clean copies of catalogue
pages 12–13 (§7.5) remain open from Phase 1.

---

## 14. Recommended next step

### 14.1 Put three questions to Cerium first

**RECOMMENDATION** — §13.2 (documents and principal attribution) and §13.5
(market scope) should be asked **before** Phase 2.1C begins. Each changes the
entity model rather than merely the copy. §13.1 (Food) does not block 2.1C,
because §13.1 demonstrates the model absorbs any answer — but it does block
launch.

### 14.2 Amend Phase 2.1A — done

**COMPLETE, 20 Aug 2026** — the name-only figure was corrected from **82 to 68**
in `docs/phase-2.1a-website-architecture-discovery.md` (§2.2, §2.3, §4.4, §6),
and its §2.2 table now shows the derivation rather than the bare total. The
conclusions were unaffected; the number was. See §1.2.

### 14.3 Scope for Phase 2.1C

**RECOMMENDATION** — 2.1C should be the **field-level content inventory and
migration plan**, still not implementation:

1. A per-product audit of all 122 records: what exists, what the completeness
   gate needs, what is missing. This turns "we need more data" into a worklist
   Cerium can action, and it is the single highest-value artefact remaining
   before implementation.
2. A migration plan from `src/data/*.ts` + `catalogue.overrides.json` into the
   model above, including how the 46/26 conflicting Category↔Application pairs
   (§5.4) are reconciled and how derived application links are imported as
   `inherited` rather than `stated` (§5.2).
3. The controlled vocabulary for `Function`, with the source document required
   for each assignment — defined, not populated.
4. The redirect strategy that the nested product URL requires.

### 14.4 First implementation work, when it comes

**RECOMMENDATION** — unchanged from Phase 2.1A §11.3, and still independent of
every open business decision:

1. Correct the wording of the data-seam rule in `src/lib/content.ts` to the
   catalogue-records scope.
2. Cut the catalogue out of the client bundle by passing `{ name, slug }` lists
   into `SearchOverlay` and the navigation components as props from a server
   parent.

**OBSERVATION** — item 2 is a correctness blocker, not a payload preference: an
API-backed catalogue cannot be a synchronous module-scope import inside a client
component. It is far easier to verify against static data than against a live
API, which is why it belongs before the API rather than after it.

---

## Appendix — what this phase did not do

- No Django models, no SQL, no migrations, no tables.
- No APIs or endpoints.
- No frontend or application code changes.
- No existing product data modified or migrated.
- No dependencies installed.
- No documents imported or created.
- No missing technical information generated, inferred or estimated.
- The Food Ingredients conflict **documented, not resolved**.
