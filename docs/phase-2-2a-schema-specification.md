# Cerium Chemicals — Conceptual Data Schema

**Phase 2.2A.** Design and exploration only. **No Django, no migrations, no
PostgreSQL, no dependencies, no application code, no data, taxonomy, route or
URL changes.**

**Repository state:** commit `687827b` plus the Phase 2.1A Stage 1b remediation.
20 Aug 2026.
**Method:** `docs/phase-2-1a-data-architecture-exploration.md` re-read in full,
plus direct inspection of `src/types/`, `src/data/`, `src/lib/content.ts`,
`src/app/`, and **execution of the data modules** to measure every cardinality
reported here. No cardinality in this document is assumed.

> **Supersedes** `docs/phase-2-2a-data-schema-specification.md`, an inferred
> draft written against a truncated brief in the previous session. It has been
> removed; its content is carried forward here under the specified structure.

## Classification

Every recommendation carries exactly one label. They are not blurred.

| Label | Meaning |
|---|---|
| **EXISTING** | Already represented in the current repository |
| **REQUIRED** | Necessary for the agreed future architecture |
| **PROPOSED** | A design recommendation that still requires review |
| **BLOCKED** | Cannot safely be decided until Cerium provides information |

Supporting markers: `MEASURED` = computed from the data this session.
`CANNOT DETERMINE` = not answerable from the repository.

---

## 1. Executive summary

The catalogue's relational shape is clean — zero duplicate identifiers, zero
dangling references, a strictly two-level tree — but it is **structurally
under-specified** in three ways that matter for a backend.

**The headline finding of this phase is new.** The two Category ↔ Application
representations are not two copies of one relationship. **They operate at
different levels of the tree:**

- `Category.applicationSlugs` (A) declares pairs at **both depths** — 10 at
  family level, 36 at range level.
- `Application.categorySlugs` (B) declares pairs at **leaf level only** — 0 of
  its 26 pairs names a top-level family.

`MEASURED` — 10 of the 20 A-only pairs are therefore **structurally
inexpressible in B**. The remaining 10 are leaf-level pairs B could have
declared and did not. This reframes the question from "which copy is stale" to
"these are two different relationships wearing one name" (§6).

It has a concrete consequence. `MEASURED` — **exactly one product, Citriodiol,
is reachable from no application page at all**, because `mosquito-repellents` is
the single product-bearing category that B never names, even though A records it
as serving Skin Care.

The other two gaps:

1. **There is no authoritative Product → Application relationship.** It is
   derived category-wide, which is why Skin Care resolves to 59 of 122 products.
   The schema is a join table; **the data does not exist in any supplied
   document**, so this is a content dependency on Cerium, not a migration task
   (§7).
2. **Publication is computed, never stored**, and it conflates two independent
   axes — editorial lifecycle and search indexability — that the backend must
   separate (§10).

The most consequential *design* judgement here is restraint: **most current
TypeScript interfaces should not become tables.** Product Family is a tree
position; `formats` and `olfactive` are controlled vocabularies whose string
encoding hides that fact; SEO metadata should stay derived.

---

## 2. Domain model

```
                         Industry
                             △
                             │ many-to-one (exactly 1)          §5.4
                             │
                        Application ──────────────┐
                        △        △                │
       A: many-to-many  │        │  B: many-to-many│  DERIVED (provisional)
       both tree levels │        │  LEAF ONLY      │  via Category
                 §6     │        │      §6         │        §7
                        │        │                 │
                     Category ───┘                 │
                        △ │                        │
     many-to-one (0..1) │ │ one-to-many            │
     self-referencing   └─┘                        │
                        △                          │
                        │ many-to-one (exactly 1)  │
                        │              §5.1        │
                     Product ──────────────────────┘
                        │
                        ├── many-to-many ──▷ Format          (0..N)   §5.6
                        ├── many-to-many ──▷ OlfactiveNote   (0..N)   §5.6
                        ├── one-to-many  ──▷ MediaAsset      (0 today) §12
                        └── many-to-many ──▷ Document        (none today) §9

     Product ⇢ Industry           DERIVED — never stored            §5.5
     Product Family               DERIVED — parent IS NULL          §5.2
```

**EXISTING** — every solid edge above except Product↔Document and
Product↔MediaAsset.
**REQUIRED** — Product↔Application as a stored relation; Document; explicit
publication state.
**BLOCKED** — the Category↔Application reconciliation (§6); Product↔Principal
(§3).

---

## 3. Entity inventory

### 3.1 Entities that exist and should persist

| Entity | Status | Records | Where today | Notes |
|---|---|---|---|---|
| **Product** | **EXISTING** | 122 | `ProductSummary`, `data/taxonomy.ts` | Core entity. `MEASURED` — 122 distinct names, 122 distinct slugs, zero collisions |
| **Category** | **EXISTING** | 30 | `Category`, `data/taxonomy.ts` | `MEASURED` — 4 roots, 26 children, max depth 1 |
| **Application** | **EXISTING** | 6 | `data/applications.ts:29` | Has own URL, copy, provenance |
| **Industry** | **EXISTING** | 2 | `data/applications.ts:154` | Thin but publishable; see §5.4 |
| **Format** | **EXISTING as strings** → **REQUIRED as entity** | 12 | `applicationFormats`, `data/applications.ts:119` | §5.6 |
| **OlfactiveNote** | **EXISTING as a delimited string** → **PROPOSED as entity** | 17 | `ProductSummary.olfactive` | §5.6 |
| **SourceDocument** | **EXISTING as enum** → **REQUIRED as entity** | 6 members | `SOURCE_DOCUMENTS`, `types/content.ts:26` | §8 |
| **Principal** (supplier) | **EXISTING as `Partner`** | 3 | `data/company.ts:96` | Provital, Givaudan, Umang. **Product relation is BLOCKED** |

### 3.2 Concepts that must NOT become entities

| Concept | Verdict | Reason |
|---|---|---|
| **Product Family** | **Derive** | `MEASURED` — a family is exactly "a Category with no parent". A second table would need syncing for a distinction the tree already encodes |
| **Subcategory** | **Derive** | Same argument |
| **Product → Industry** | **Derive** | Reachable via Application. Storing it would create a third copy of a relationship already stored twice (§5.5) |
| **SEO metadata entity** | **Derive** | A 1:1 table with an entity that always has exactly one is a join for nothing (§11) |
| **Category relationship** | **Self-FK, not an entity** | A parent pointer, not a join |
| **Industry relationship** | **FK, not an entity** | `MEASURED` — fully consistent both ways (§5.4) |

### 3.3 Entities that do not exist yet

| Entity | Status | Blocking |
|---|---|---|
| **Document** (TDS/SDS/CoA/brochure) | **REQUIRED** | Visibility model is **BLOCKED** (§9) |
| **MediaAsset** | **REQUIRED** | Nothing — but zero instances exist today (§12) |
| **PublicationState** | **REQUIRED** | Threshold for products is **BLOCKED** (§10) |
| **EnquiryRequest** | **PROPOSED** | Phase 11; boundary defined in §13 |
| **ContentBlock / provenance state** | **PROPOSED** | §14 |
| **RedirectRule** | **REQUIRED** if slugs become stored | §15 |
| **Search index / synonyms** | **PROPOSED** | No search metadata exists anywhere |

---

## 4. Product model

### 4.1 Identity

| Field | Status | Justification |
|---|---|---|
| `id` — surrogate PK | **REQUIRED** | Standard. **Never exposed in a URL** — `CLAUDE.md`: "Slugs are always meaningful strings, never numeric IDs" |
| `slug` — **stored**, unique | **REQUIRED** | `EXISTING` behaviour differs: the slug is **computed** at load by `slugify(name)` (`data/taxonomy.ts:50`). Computed slugs mean renaming a product silently changes its URL. `CLAUDE.md` states Django owns "slugs as stored fields" |
| `name` | **EXISTING** | Present on all 122 |

`MEASURED` — 122 distinct names → 122 distinct slugs; longest is
"Phenoxyethanol & Ethylhexylglycerin"; all slugs match `^[a-z0-9-]+$`.

**Slug namespace is a real constraint, not a formality** — see §15. If products
ever live at `/products/<slug>`, product slugs and category slugs share a
namespace and must be unique *across both*.

### 4.2 Commercial

**No commercial fields in the initial schema.**

| Candidate | Status | Reason |
|---|---|---|
| `price` | **BLOCKED** | Prices exist in supplied Q3 2026 price lists and are deliberately not modelled. Publishing B2B pricing is Cerium's commercial decision |
| `availability` / `stock` | **BLOCKED** | No stock data has ever been supplied. Inventing it would feed `Product` JSON-LD fabricated `offers` |
| `is_enquirable` | **PROPOSED — omit for now** | `EXISTING` — every `ProductCard` renders an enquiry link unconditionally. A column true for all 122 rows encodes nothing. Add it when a product is genuinely non-enquirable |
| `moq`, `pack_size` | **CANNOT DETERMINE** | No such field exists anywhere |

This section being empty is a finding, not an omission.

### 4.3 Technical

**No technical fields in the initial schema.**

`EXISTING` — CAS numbers, INCI names, specifications, certifications, origins
and grades are **entirely absent** by explicit rule (`CLAUDE.md`: "Never invent
product or technical information… for a chemicals supplier it is a safety and
liability matter").

**REQUIRED, when they arrive: technical values must be document-attributed, not
bare columns.** These are precisely the fields a customer may rely on for a
regulatory or formulation decision. A nullable `cas_number` column has nowhere
to record *which document says so, which revision, and on what date*. The
attribution mechanism is §8; the rule that AI may never author them is §14.

**BLOCKED** — `docs/pending-cerium-decisions.md` §6 requires "a source document
per product before any of it is published". Until then the correct number of
technical fields is zero.

### 4.4 Classification

| Concept | Kind | Cardinality | Status |
|---|---|---|---|
| Category | **Relationship** (FK) | **many-to-one, exactly 1** | **EXISTING** as containment |
| Application | **Relationship** (join) | **many-to-many** | **REQUIRED** — does not exist (§7) |
| Format | **Relationship** (join) | **many-to-many, optional** | **REQUIRED** — free-text today |
| Olfactive note | **Relationship** (join) | **many-to-many, optional** | **PROPOSED** — packed string today |
| Industry | **DERIVED** | — | **Never store** |
| Product family | **DERIVED** | — | **Never store** |

### 4.5 Content

| Field | Status | Evidence |
|---|---|---|
| `benefit` | **EXISTING** | `MEASURED` — on 40 of 122; 48–202 characters, mean 119. **A single short line, not rich text.** Plain text, no formatting |
| `benefit` attribution | **REQUIRED** | Verbatim supplied copy. `CLAUDE.md`: "Do not paraphrase it into a claim." Needs field-level provenance (§8) |
| `description` — longer copy | **PROPOSED — omit** | `MEASURED` — **68 of 122 products have a name and nothing else.** No product has copy beyond `benefit` |
| `usage` copy | **CANNOT DETERMINE** | Exists in no supplied document |

**A deliberate omission.** `Category.description` was removed in Stage 1b because
it duplicated `summary` and was populated on none of the 30 categories. Adding a
second undifferentiated free-text field to `Product` now would repeat that
mistake in the backend.

### 4.6 SEO fields on Product

**PROPOSED — none initially.** See §11 for the full boundary argument.

---

## 5. Taxonomy model — explicit cardinalities

Every cardinality below was **measured**, not assumed.

### 5.1 Product → Category — **many-to-one (exactly 1)**

`MEASURED` — 122 products, 122 owning category nodes recorded, **0 products
appearing in more than one node**. Every product has exactly one owner.

**EXISTING** as structural containment (`Category.products[]`), with
`categorySlug`/`categoryName` **injected at read time** by
`getProductsInCategory()` (`data/taxonomy.ts:794`), not stored.

**REQUIRED** — a real FK. **PROPOSED** — keep it single-valued. Nothing in the
data suggests cross-listing, and multi-valued primary categories create
competing canonical URLs. If Cerium later wants a material in two ranges, the
clean answer is the **collection** concept `data/taxonomy.ts:87-91` already
proposes.

### 5.2 Category → Category — **many-to-one (0..1), self-referencing**

`MEASURED` — 4 roots (`parent = null`), 26 with exactly one parent, max depth
**1**. Children per node: min 0, max 10, mean 0.87. 26 leaves, 4 containers.

`MEASURED` — **no category holds both products and children** (0 of 30). 20
categories hold products directly.

**PROPOSED — adjacency list** (nullable self-FK). Explicitly **not** MPTT,
nested sets or `ltree`: those exist to make deep or unbounded trees queryable,
and at 30 nodes and depth 1 they add migration weight, ordering complexity and a
rebuild step for a subtree query that is one join here.

**PROPOSED — do not enforce the container/leaf disjointness.** It is a property
of the current *data*, not the type (`products?` and `children?` are both
optional). It will likely break the first time a family gets a product of its
own, and nothing depends on it.

**Product family is DERIVED** — `parent IS NULL`.

### 5.3 Category → Product — **one-to-many**

The inverse of §5.1. `MEASURED` — 0–19 products per category directly; subtree
counts reach 59.

### 5.4 Application → Industry — **many-to-one (exactly 1)** · Industry → Application — **one-to-many**

`MEASURED` — all 6 applications carry `groupSlug`; all 6 resolve to an existing
Industry. Each Industry declares exactly 3 applications; 6 claimed, 6 distinct,
**zero overlap**.

`MEASURED` — the two directions are **fully consistent**: every application's
`groupSlug` is mirrored in that industry's `applicationSlugs`, and every
industry's claims mirror back. Unlike Category↔Application, there is no
divergence.

**PROPOSED — collapse to a single FK on Application**, with the reverse as a
related-name query. Unambiguous: the copies agree, so nothing is lost.

**Industry as an entity — the weakest case in the model.** With 2 records and
one description each it is close to an `Application.industry` enum. What earns
it a table: it has its own URL and copy, carries provenance, and the set is
expected to change (`data/applications.ts:148-152` notes the routing already
supports more industries with no code change; Food Ingredients is plausibly a
third). **PROPOSED — keep as an entity**, recorded as a decision that could
reasonably be revisited.

### 5.5 Product → Industry — **DERIVED**

Reachable as Product → Application → Industry. **Never store.** A third stored
copy of a relationship already stored twice is exactly the failure mode §6
documents.

### 5.6 Product → Format and Product → OlfactiveNote — **many-to-many, optional**

| | Format | OlfactiveNote |
|---|---|---|
| Vocabulary size | **12** | **17** |
| Products carrying it | 14 | 14 |
| Per product | min 2, max 5, mean 3.79 | min 2, max 3, mean 2.64 |
| Total assignments | 72 | 37 |
| Encoding today | `string[]` | **single delimited string** (`"Vanilla \| Ambery \| Floral"`) |

`MEASURED` — **the format vocabulary is perfectly closed**: the 12 declared and
the 12 used are the same 12 — zero used-but-undeclared, zero
declared-but-unused. A hand-maintained list with no drift in either direction is
not what free text looks like. **REQUIRED — controlled vocabulary entity.**

`MEASURED` — olfactive values are recognised **fragrance families** (Fougère,
Chypre, Oriental, Ambery, Citrus, Gourmand, Marine…), an industry
classification. **PROPOSED — controlled vocabulary entity.** Packing a
multi-value classification into a delimited string is the clearest data smell in
the model: it cannot be filtered, counted or renamed, and nothing prevents a
typo becoming an 18th note.

**BLOCKED — does olfactive order carry meaning?** `CANNOT DETERMINE`. In
perfumery an ordered family list normally runs primary → secondary → tertiary by
prominence. If Cerium's ordering is meaningful the join needs a `position`; if
incidental it does not.

**Applicability — do not model these as a fragrance subtype.** `MEASURED` —
both appear only on products in the three fragrance categories. But the
relationship is legitimately meaningful for non-fragrances (a preservative is
used in shampoo too); it simply has not been recorded. Once both are
many-to-many there are no nullable columns to justify a subtype, and an empty
set is the correct representation of "not yet recorded".

### 5.7 Cardinality summary

| Relationship | Cardinality | Status |
|---|---|---|
| Product → Category | **many-to-one (exactly 1)** | EXISTING |
| Category → parent Category | **many-to-one (0..1)** | EXISTING |
| Category → child Categories | **one-to-many** | EXISTING |
| Application → Industry | **many-to-one (exactly 1)** | EXISTING |
| Industry → Applications | **one-to-many** | EXISTING |
| Category ↔ Application (A) | **many-to-many**, both tree levels | EXISTING §6 |
| Application ↔ Category (B) | **many-to-many**, leaf level only | EXISTING §6 |
| **Product ↔ Application** | **DERIVED (provisional)** → **many-to-many** | §7 |
| Product ↔ Industry | **DERIVED** | never store |
| Product family | **DERIVED** | never store |
| Product ↔ Format | **many-to-many (0..N)** | REQUIRED |
| Product ↔ OlfactiveNote | **many-to-many (0..N)** | PROPOSED |
| Product ↔ Document | **many-to-many** | REQUIRED §9 |
| Product → MediaAsset | **one-to-many** | REQUIRED §12 |
| Record → SourceDocument | **many-to-one** (record) / **many-to-many** (field-level) | REQUIRED §8 |

---

## 6. Category / Application relationship analysis

**Both representations are described. Neither is merged. Neither is deleted.**

### 6.1 Representation A — `Category.applicationSlugs[]`

**Cardinality: many-to-many.**

`MEASURED`:

| Measure | Value |
|---|---|
| Pairs | **46** |
| Categories declaring | 23 of 30 |
| Applications per category | min 1, max 4, mean 2.00 |
| **Declaring categories by depth** | **3 at depth 0, 20 at depth 1** |
| **Pairs by depth** | **10 at depth 0, 36 at depth 1** |

**What A appears to mean: "which applications does this node relate to?"** — an
outbound editorial link declared *from* the category, at **either** level of the
tree. A family may declare applications, and so may a range.

**Evidence of purpose:** `products/[category]/page.tsx:201` renders a "related
applications" block from `category.applicationSlugs`. It is a navigational and
topical signal on the category page.

### 6.2 Representation B — `Application.categorySlugs[]`

**Cardinality: many-to-many.**

`MEASURED`:

| Measure | Value |
|---|---|
| Pairs | **26** |
| Applications declaring | 6 of 6 |
| Categories per application | min 2, max 8, mean 4.33 |
| **Referenced categories by depth** | **0 at depth 0, 26 at depth 1** |

**What B appears to mean: "which ranges should this application page list?"** —
a curated inclusion list declared *from* the application, exclusively at **leaf**
level.

**Evidence of purpose:** B is the resolution path.
`fetchProductsForApplication()` (`lib/content.ts:177`) and
`fetchCategoriesForApplication()` both read `application.categorySlugs`. B
decides page contents; A does not.

### 6.3 The relationship between A and B

`MEASURED`:

| Measure | Value |
|---|---|
| \|A\| | 46 |
| \|B\| | 26 |
| A ∩ B | 26 |
| **A only** | **20** |
| **B only** | **0** |
| **B ⊆ A** | **true** |

**The sets are nested, not conflicting.** No pair exists only on the application
side. A never contradicts B; A simply claims 20 relationships B declines to.

**And the 20 split cleanly by tree depth** — this is the key structural finding:

| A-only pairs | Count | Meaning |
|---|---|---|
| **Depth 0 — top-level family** | **10** | **B cannot express these at all.** B references only leaf categories |
| **Depth 1 — leaf range** | **10** | B *could* express these and does not |

The 10 family-level pairs:

```
fragrances             -> air-care, bath-and-shower, fabric-care, hair-care
functional-ingredients -> bath-and-shower, hair-care, skin-care
natural-ingredients    -> bath-and-shower, hair-care, skin-care
```

The 10 leaf-level pairs:

```
essential-oils           -> skin-care, hair-care, bath-and-shower
personal-care-fragrances -> skin-care, hair-care
preservatives            -> skin-care, hair-care
silicones                -> skin-care
natural-butters          -> hair-care
mosquito-repellents      -> skin-care
```

**Restricted to the domain both can express (depth 1), A has 36 pairs and B has
26.** So even on common ground they differ by 10.

### 6.4 The user-visible consequence

`MEASURED` — **one product is reachable from no application page: Citriodiol**,
in `mosquito-repellents`. That category is the only product-bearing category B
never names, though A records it as serving Skin Care.

`MEASURED` — 121 of 122 products are reachable from at least one application;
applications per product (derived) run min 0, max 3, mean 1.41.

### 6.5 What Cerium must clarify — **BLOCKED**

Two readings remain open, and the schema differs between them:

| Reading | Schema consequence |
|---|---|
| **One relationship, maintained twice**; B is a stale or partial copy | **One join table.** Reconcile and move on |
| **Two distinct relationships** — A is "could serve / topically related", B is "featured on this application page" | **One join table plus a `featured` flag**, or two named relations |

**The depth evidence favours the second reading**, because A operates at a level
B structurally cannot, which is hard to explain as drift. But evidence is not
confirmation.

**Questions for Cerium:**

1. Should an application page list materials from a **whole family** (Natural
   Ingredients → Skin Care), or only from **specific ranges**? A says the former
   is meaningful; B implements only the latter.
2. Are the 10 leaf-level A-only pairs — Essential Oils, Preservatives,
   Silicones, Natural Butters, Personal Care Fragrances, Mosquito Repellents
   for Skin/Hair Care — **omissions from the application pages, or deliberate
   curation**?
3. **Should Citriodiol appear on the Skin Care page?** The concrete instance of
   question 2.

**Do not reconcile before these are answered.** Merging to 46 publishes
relationships Cerium may have deliberately excluded; merging to 26 deletes
editorial intent and leaves a product orphaned.

---

## 7. Product / Application relationship

**Current cardinality: DERIVED. Target cardinality: many-to-many. Status:
provisional — do not make it authoritative.**

`EXISTING` — `fetchProductsForApplication()` (`lib/content.ts:177`) takes
`application.categorySlugs` (representation B), filters the flattened tree, and
returns every product in those categories. **There is no product-level
application data anywhere in the repository.**

`MEASURED` — the breadth this produces:

| Application | Products | Share of 122 |
|---|---|---|
| Skin Care | 59 | **48%** |
| Hair Care | 46 | **38%** |
| Bath & Shower | 27 | 22% |
| Air Care | 18 | 15% |
| Fabric Care | 17 | 14% |
| Surface Care | 5 | 4% |

An application matching nearly half the catalogue is not filtering. Skin Care
and Hair Care also overlap heavily.

**The integrity problem, not just the relevance problem.** `EXISTING` — the
2.1A exploration records that Onion Extract and Rosemary Extract render on
`/applications/skin-care` while their supplied benefit copy is exclusively about
hair and scalp. On a site whose governing rule is not to overstate what a
material does, a category-granular relationship standing in for a
product-granular truth is a data-integrity issue.

**REQUIRED — a stored many-to-many, when the data exists.**
**BLOCKED — the data does not exist.** Per-product suitability appears in no
supplied document, and `CLAUDE.md` forbids inferring it. This sits on the
critical path for search, filtering and any honest application page.

**PROPOSED — seed with an explicit origin marker.** When the join is created,
seed it from the current derivation but record each row's origin:

| Origin | Meaning |
|---|---|
| `inherited` | Derived from the product's category via representation B. **Provisional** |
| `stated` | Confirmed by a Cerium document, with attribution (§8) |

Nothing may present an `inherited` row as fact, and the admin must show the
difference. This is the §14 authority argument applied to a relationship rather
than a claim.

---

## 8. Provenance and source model

### 8.1 What exists today — **EXISTING**

| | Detail |
|---|---|
| Mechanism | `SOURCE_DOCUMENTS` frozen array; `SourceDocument` type derived from it (`types/content.ts:26`) |
| Members | 6: `catalogue-2026`, `pricelist-q3-2026`, `fragrance-pricelist-q3-2026`, `vision-statement`, `logo`, `website-ceriumchemicals.co.ke` |
| Coverage | `MEASURED` — **152 of 152** catalogue records: `catalogue-2026` (130), `fragrance-pricelist-q3-2026` (12), `website-ceriumchemicals.co.ke` (7), `pricelist-q3-2026` (3) |
| Enforcement | **Optional** on `Category`, `ProductSummary`, `Application`, `Industry`; **required** on `CategoryOverride`/`ProductOverride` since Stage 1b |
| Granularity | **Record level only** |
| Unused members | `vision-statement` and `logo` are on no catalogue record |

**That is the whole of it.** A six-member string enum and a record-level marker.

### 8.2 What the future system needs — **REQUIRED**

A `SourceDocument` **entity**. None of the following exists today; none is
pretended to.

| Field | Status | Why it is needed |
|---|---|---|
| Source identity | **REQUIRED** | Stable key surviving a title change |
| Source type | **REQUIRED** | catalogue / price list / website / statement / supplier document — currently implied by the member name |
| Document title | **REQUIRED** | Human-readable; the enum member is a slug |
| **Revision / version** | **REQUIRED** | Two price lists a quarter apart are different documents. Today they collapse to one enum member |
| Publication date | **REQUIRED** | Which of two revisions was current when a claim was recorded |
| **Coverage** | **REQUIRED** | **The specific reason an entity is needed.** "Pages 12–13 are missing from the supplied PDF" is currently a code comment (`data/taxonomy.ts:21-27`). On a record, a query can find every entity whose source has a known gap |
| File / document location | **REQUIRED** | The supplied PDF is a real artefact nothing currently links to |
| Provenance notes | **PROPOSED** | Free-text editorial caveats — e.g. entries obscured by glare and omitted rather than guessed |
| Authority tier | **REQUIRED** | Prerequisite for §14 |
| Custodian | **PROPOSED** | Provenance that cannot name who supplied it is weak provenance |

### 8.3 Granularity — **REQUIRED**

`MEASURED` — record-level provenance is **already lossy**: 12 fragrance products
sit in categories sourced `catalogue-2026` while their own `benefit` and
`olfactive` come from `fragrance-pricelist-q3-2026`.

Harmless for marketing copy; unacceptable for a CAS number.

| Level | Cardinality | Status |
|---|---|---|
| Record → SourceDocument | many-to-one | **EXISTING** |
| Field/claim → SourceDocument | many-to-many via an attribution row | **REQUIRED** before any technical data ships |

**REQUIRED — `source` becomes non-nullable** on catalogue entities. 100%
coverage by discipline is not a guarantee.

---

## 9. Document model

### 9.1 The proposed chain, and a better alternative

The brief proposes:

```
Product ── ProductDocument ── SourceDocument
```

**PROPOSED — an alternative the repository evidence supports better:**

```
                      ┌──────────────────────────────┐
   Product ──many-to-many──▶  Document  ◀──many-to-many── Claim/Field
            (ProductDocument:          │      (Attribution: which document
             role, is_primary)         │       states this value)
                                       │
                            role flags: is_publishable
                                        authority_tier
```

**One `Document` entity, two roles** — *published artefact* and *cited source* —
rather than two entities.

**The evidence.** `EXISTING` — `data/navigation.ts:194` already declares a
planned footer destination `{ label: "Product catalogue", href: "/resources",
upcoming: true }`. The **2026 catalogue is simultaneously** the provenance for
130 records (`catalogue-2026`) **and** a planned customer download. Under the
brief's chain that one PDF is stored twice, and the two copies can drift in
revision.

**Counter-argument, recorded fairly:** the two roles genuinely differ in
audience, lifecycle and visibility (§9.4). Splitting them keeps each table
simple. **This is PROPOSED, not settled** — if most source documents are never
publishable and most published documents are never cited, the split is cheaper.
`CANNOT DETERMINE` which is true, because no product document exists yet.

### 9.2 Ownership — **PROPOSED**

Documents are **owned by Cerium or by a principal**, never by the website. A TDS
for a Givaudan fragrance originates with Givaudan; Cerium republishes it.
`Document.origin` should reference `Principal` where applicable, because
republishing a third party's technical document carries the third party's
liability and its update cadence.

### 9.3 Versioning — **REQUIRED**

`Document` is **versioned; `SourceDocument` attribution is immutable.** A claim
recorded from revision 3 must keep pointing at revision 3 even after revision 4
lands — otherwise provenance silently rewrites history. New revision → new row;
supersession is a link, not an overwrite.

### 9.4 Visibility and public/private status — **BLOCKED**

`docs/pending-cerium-decisions.md` leaves open whether technical documents are
public or supplied on request. This determines:

- whether `Document` needs an access dimension at all, or only `is_publishable`;
- whether `/resources` exists as a route;
- whether the API exposes a `DocumentSummary` publicly (§17).

**Three states are likely needed** — public, on-request, internal-only — but
**which documents fall where is Cerium's.** Internal-only is not optional: a
supplier price list must never be publicly reachable.

### 9.5 Product association — **many-to-many, REQUIRED**

Not one-to-many. One document may cover several products (a supplier TDS for a
whole range); one product has several documents (TDS + SDS + CoA). The join
carries `role` (tds / sds / certificate / brochure / catalogue) and
`is_primary`.

**Do not invent regulatory metadata.** No hazard classification, no UN number,
no GHS pictogram, no expiry — none has been supplied, and inventing regulatory
fields for a chemicals supplier is the highest-risk possible fabrication.

---

## 10. Publication model

### 10.1 What exists — **EXISTING**

`isPublishable(category)` (`data/taxonomy.ts:780`):

```
(category.products?.length ?? 0) > 0 || (category.children?.length ?? 0) > 0
```

`MEASURED` — 24 of 30 categories pass. There is **no** draft state, no archive,
no scheduled publication, and **no product-level publication concept at all**.

Site-wide indexing is a separate switch: `robots.ts:16` disallows everything
unless `NEXT_PUBLIC_ALLOW_INDEXING=true`.

### 10.2 The two axes are not the same thing — **REQUIRED**

**Lifecycle state** answers *"does this exist publicly?"*
**Indexability** answers *"should search engines list it?"*

They are independent. A published page may legitimately be `noindex` — a search
results page, a thin variant, a duplicate. An unpublished page is never
indexable. Conflating them means the only way to de-index something is to
unpublish it, which removes it from visitors too.

| Axis | Values | Status |
|---|---|---|
| **Lifecycle** | `draft` · `in_review` · `published` · `archived` | **REQUIRED** |
| **Indexability** | `indexable` · `noindex` | **REQUIRED** |
| **Completeness gate** | derived predicate — has content worth a URL | **EXISTING**, keep |

**`unpublished` and `incomplete` should not be lifecycle states.** `unpublished`
is the absence of `published`; `incomplete` is the completeness gate, which is
**derived from content** and must not be hand-set — otherwise an editor can
publish an empty page by ticking a box.

**PROPOSED resolution:**

```
publicly visible = lifecycle == published  AND  completeness gate passes
indexable        = publicly visible  AND  indexability == indexable
                                     AND  site-level indexing allowed
sitemap included = indexable                            (derived, never stored)
```

### 10.3 Two findings the backend must not inherit

**1 — the `children > 0` branch admits thin pages.**
`MEASURED` — `/products/food-ingredients` is publishable and in the sitemap with
**0 products and 6 unpublishable children**. It renders a heading and six
non-clickable cards. The predicate tests for *structure* where the intent is
*content*. A recursive test — "has products, or has a publishable descendant" —
would exclude it and nothing else in the current data.

**PROPOSED but deliberately not applied: this is entangled with the Food
Ingredients decision (§18).** Changing the predicate now would quietly delete a
page whose existence is Cerium's call.

**2 — products have no publication threshold. BLOCKED.**
`MEASURED` — **68 of 122 products have a name and nothing else.** If product
pages are created, publishing all 122 unconditionally ships 68 near-empty pages.
The threshold depends on what content Cerium supplies.

### 10.4 A product can exist without being indexed — **REQUIRED**

The model must support a product that is in the database, resolvable by the
admin and by internal search, and not publicly indexed — for materials being
catalogued before their copy is approved, and for anything Cerium supplies but
does not wish to advertise. This falls out of §10.2 and needs no extra
machinery.

---

## 11. SEO model

### 11.1 The boundary

| Canonical business data | Search-engine presentation metadata |
|---|---|
| `name`, `slug`, `summary`, `benefit` | `<title>`, `<meta description>` |
| Category / Application / Industry relationships | Open Graph title/description |
| Lifecycle state | `noindex` directive |
| Media (including the image used for OG) | OG image *selection* |
| `updated_at` | Sitemap `lastmod`, `changefreq`, `priority` |

**Recommended boundary: canonical business data lives in PostgreSQL; search
presentation is DERIVED in the frontend, with a narrow stored override.**

### 11.2 What must exist in the data model — **REQUIRED**

| SEO need | What the model must supply | Stored or derived |
|---|---|---|
| Title | `name` (+ entity type) | **Derived** |
| Meta description | `summary` / `benefit` | **Derived**, with fallback |
| **Canonical URL** | `slug` + entity type + **stable URL policy** (§15) | **Derived** |
| **Indexability** | the `indexability` axis (§10) | **Stored — REQUIRED** |
| Structured data | relationships, counts, breadcrumb ancestry | **Derived** |
| **Sitemap inclusion** | `indexable` | **Derived — never a stored flag** |
| **Sitemap `lastmod`** | **`updated_at`** | **Stored — REQUIRED** (§16) |
| Open Graph | title/description as above; image from Media | **Derived** + media FK |
| Landing pages | publishable Category / Application / Industry | **EXISTING** |

### 11.3 Why not an SEO entity — **PROPOSED**

| Option | Verdict |
|---|---|
| Separate SEO entity | **No.** A 1:1 table with an entity that always has exactly one is a join for nothing. It earns its place only with versioning or per-locale variants — neither exists or is planned |
| Fields directly on each entity | **Eventually, as nullable overrides.** Not initially |
| Derived in the frontend | **Yes, as the default** |

1. `EXISTING` — SEO output is already centralised in `buildMetadata()`
   (`lib/seo.ts:24`), which guarantees every indexable page declares a canonical
   (`lib/seo.ts:35`). `CLAUDE.md` makes that non-negotiable.
2. Stored SEO text invites keyword-stuffed filler, which `CLAUDE.md` forbids.
   Derived descriptions inherit real Cerium copy by construction.
3. **Nothing is lost by waiting.** Adding nullable overrides later is a
   non-breaking migration; removing a populated SEO entity is not.

**The exception: `indexability` must be stored.** It is an editorial decision
about a specific page and cannot be derived from content.

**Structured data constraint — EXISTING, preserve.** `itemListSchema`
(`lib/seo.ts`) emits `ItemList`, **not** `Product`, because Cerium has supplied
no offer data. The schema must not enable a `Product` upgrade until real
price/availability/SKU exist — which is **BLOCKED** (§4.2).

---

## 12. Media model

### 12.1 What exists — **EXISTING**

`ImageRef` (`types/content.ts:62`): `cloudinaryId?`, `src?`, `alt?`, `width?`,
`height?`, `focal?` — **embedded inline** on Category, Product, Application,
Industry.

`MEASURED` — **zero populated instances.** `taxonomy.ts` and `applications.ts`
contain no `image:` key at all; all 3 `siteMedia` slots are `undefined`.
Cloudinary is wired (`lib/cloudinary.ts`) but not configured; no entry uses
`cloudinaryId`.

`EXISTING` — `siteMedia` (`data/media.ts`) holds three **named site-level
roles**: `hero`, `companyIntro`, `aboutPortrait`, each with a `placeholder`
description of the intended shot.

### 12.2 Recommendation — **PROPOSED**

**A separate `MediaAsset` entity, associated through explicit typed
relationships. Not embedded. Not polymorphic.**

| Field | Status | Justification |
|---|---|---|
| `public_id` (Cloudinary) | **REQUIRED** | The forward path; `cloudinaryLoader` already builds URLs from it |
| `src` (local path) | **EXISTING** | Fallback for supplied brand assets; the Studio writes `/images/<file>` |
| `alt` | **REQUIRED** | Accessibility. `CLAUDE.md`: describes content and purpose, never the filename |
| `width`, `height` | **REQUIRED** | Prevents layout shift; `next/image` needs intrinsic dimensions |
| `focal` | **EXISTING** | Art-directed cropping; `ImageRef.focal` already exists |
| `mime_type` | **PROPOSED** | `studio-images.ts` already maintains an allow-list of 6 types |
| `role` | **PROPOSED** | See below |
| `owner` | via join | See below |

**Deliberately excluded:** file size, upload timestamp, EXIF, caption, credit,
usage rights — none is used by any surface today, and `CLAUDE.md` warns against
fields added because CMSs usually have them.

### 12.3 Why not embedded, and why not polymorphic

**Not embedded** — an embedded `ImageRef` cannot be reused. The same warehouse
photograph plausibly serves the About page and an industry page; embedding
stores it twice and lets the `alt` text diverge. It also cannot be managed:
there is no way to list orphaned assets.

**Not polymorphic** — Django's generic content-types would let one image attach
to any entity, but a generic FK **cannot be enforced by a PostgreSQL foreign
key**. That trades real referential integrity for flexibility the model does not
need, in a schema whose current integrity is perfect.

**PROPOSED — explicit joins per owner** (`ProductImage`, `CategoryImage`,
`ApplicationImage`, plus a small `SiteMedia` table keyed by role). More tables,
full integrity, and each join can carry what that relationship needs — `position`
for a product gallery, `role` for the named site slots.

**Cardinality:** Product → MediaAsset **one-to-many** (gallery); Category /
Application / Industry → MediaAsset **many-to-one** today (a single image slot),
modelled as one-to-many to avoid a migration if galleries arrive.

**EXISTING constraint to preserve.** `CLAUDE.md`: a slot with no image renders a
labelled "Image pending" placeholder, and stock imagery must never imply it
shows Cerium's products, facilities, team or customers. The model must therefore
treat "no image" as a **normal, permanent state**, never a validation error.

---

## 13. Enquiry boundary

### 13.1 What exists — **EXISTING**

There is **no persisted enquiry concept and no form**. `ProductCard` links to
`/contact?product=<slug>`; the contact page resolves it via `fetchProduct` and
pre-composes a `mailto:` subject and body. `contact/page.tsx:26-28` records the
reason: "a form that silently discards submissions is worse than no form".

`robots.ts:31` disallows `/*?product=` so the parameterised URLs do not compete
with clean ones.

### 13.2 The architectural boundary — **PROPOSED**

```
   PUBLIC CATALOGUE                    │        COMMERCIAL / CRM
   (Django + PostgreSQL)               │        (separate, later)
                                       │
   Product ──▶ EnquiryRequest ─────────┼──────▶ CRM ingests / polls
              (append-only intake)     │
                                       │
   ◀── catalogue NEVER reads back ─────┤
```

Three rules:

1. **The catalogue writes; it never reads.** No catalogue query result may
   depend on CRM state. A product's visibility must never turn on pipeline data.
2. **`EnquiryRequest` is an append-only intake record**, not a CRM object. It
   holds what the website captured; it does not model contacts, deals or stages.
3. **Reference the product by stored slug *and* a name snapshot, not only by
   FK.** An enquiry is a historical fact. If the product is renamed,
   recategorised or archived, the enquiry must still say what the customer
   actually asked about. A bare FK silently rewrites history; slug-plus-snapshot
   preserves it. (An optional FK alongside is fine for convenience.)

**PROPOSED — the catalogue service owns intake only.** Whether CRM lives in the
same Django project or a separate service is an implementation choice; the
boundary above holds either way.

**Not in scope, deliberately:** contact, company, deal, stage, owner,
follow-up. Phase 11. Modelling them now is the CRM the brief says not to build.

---

## 14. AI / content provenance model

### 14.1 The non-negotiable rule

**AI must never become the authority for chemical specifications.** This is not
a preference — `CLAUDE.md` treats fabricated technical data as a safety and
liability matter.

The schema enforces it in one place: **an authority tier on the source, and a
content state on the content**, with a constraint that AI-authored content
cannot occupy an authoritative tier.

### 14.2 The four states — **REQUIRED**

| State | Meaning | May publish? | May be cited as fact? |
|---|---|---|---|
| **Authoritative** | From a supplied Cerium/principal document, attributed (§8) | **Yes** | **Yes** |
| **Human-approved** | Written or edited by a person and explicitly approved | **Yes** | Only if document-backed |
| **AI-generated draft** | Machine-authored, intended for a human to edit | **No** | **No** |
| **AI-generated suggestion** | Advisory only — an SEO idea, an analytics reading | **Never publishable content** | **No** |

**The distinction between the last two matters.** A *draft* is content on a path
to publication; a *suggestion* never becomes content — it is a recommendation
about content. Storing them in one state loses the ability to say "this can be
promoted" versus "this can only be acted on by a human".

### 14.3 Constraints — **REQUIRED**

1. **Field-level, not record-level.** A product may carry an authoritative
   `benefit` and an AI-drafted long description simultaneously. State belongs on
   the content, not the row.
2. **Technical fields are tier-restricted.** Any field in the §4.3 technical
   group may hold only `authoritative` content with a `SourceDocument`
   attribution. No AI path may write them — enforced by constraint, not by
   convention.
3. **Publication requires a state transition, and transitions are recorded.**
   `ai_draft → human_approved` must capture who approved and when. Without that
   the tier is decorative.
4. **Never silently promote.** No process may upgrade AI content to approved by
   inference — for example because it was edited, or because time passed.

### 14.4 What exists today — **EXISTING**

**Nothing.** All 6 `SOURCE_DOCUMENTS` members denote supplied Cerium material;
there is no tier, no confidence, no generated marker and no approval state.

`EXISTING` — Stage 1b removed the nearest live risk: the Content Studio no
longer stamps a hardcoded `source` on everything it writes, and now requires the
operator to choose one with no default and no "unknown" option. That is the
correct shape for the AI case too — **absence of an answer must block, not
default.**

### 14.5 Data-model decisions that matter for AI later — **PROPOSED**

| Decision | Why it matters for AI |
|---|---|
| Content state per field (§14.2) | The single mechanism preventing AI content becoming authority |
| `SourceDocument` as an entity with a **coverage note** (§8.2) | Lets a model be told what a document does *not* cover — the guard against filling gaps 12–13 |
| Relationship origin `inherited`/`stated` (§7) | Stops derived relationships being treated as confirmed facts by a model reading the database |
| Controlled vocabularies (§5.6) | Constrained generation targets. A model may select from 12 formats; it may not invent a 13th |
| Immutable attribution (§9.3) | An audit trail that survives content regeneration |

---

## 15. URL strategy

**No URLs are changed by this document.**

### 15.1 What exists — **EXISTING**

| Route | Pages | Params |
|---|---|---|
| `/products` | 1 | static |
| `/products/[category]` | **24** | `fetchAllCategorySlugs()`, filtered by `isPublishable` |
| `/applications`, `/applications/[application]` | 1 + **6** | `generateStaticParams` |
| `/industries`, `/industries/[industry]` | 1 + **2** | `generateStaticParams` |
| `/about`, `/contact` | 2 | static |

`MEASURED` — 38 sitemap URLs. **There is no product URL today.**

The governing IA rule (`data/taxonomy.ts:82-85`): `/products/*` = what the
material **is**; `/applications/*` = what it is **for**; `/industries/*` = who
it is **for**. One job per URL.

### 15.2 Recommended canonical product URL — **PROPOSED**

**`/products/<product-slug>` — flat, with a shared slug namespace across
Category and Product.**

| Option | Assessment |
|---|---|
| **Nested** `/products/<category>/<product>` | Gives topical context and avoids namespace collisions. **Fatal flaw: it couples every product URL to a taxonomy the repository itself declares provisional** |
| **Flat** `/products/<product>` | Survives recategorisation untouched. Requires product and category slugs to be unique against each other |
| Separate segment `/materials/<product>` | Sidesteps the namespace question but adds a fourth top-level surface, against the one-job-per-URL rule |

**The decisive evidence** is in the data file itself. `data/taxonomy.ts:9-19`
states the grouping is **PROVISIONAL and will be replaced by the Phase 2
database taxonomy**. Nesting product URLs inside a hierarchy that is *known to
be changing* guarantees mass redirects at the moment the taxonomy is finalised —
precisely when the site can least afford to churn its most valuable URLs.

Recategorisation is not hypothetical here: the Food Ingredients question alone
(§18) could move seven categories.

**Requirements this creates — REQUIRED:**

1. **Stored slugs** (§4.1). A computed slug means renaming a product changes its
   URL with no redirect.
2. **A shared unique namespace** across Category and Product slugs.
   `MEASURED` — no collision exists today, but nothing prevents one.
3. **A `RedirectRule` entity** — old slug → current entity, `301`, retained
   permanently. Historical URLs must never 404.
4. **Slug changes are deliberate and logged**, never a side effect of renaming.
   A rename should offer to keep the slug by default.

### 15.3 Canonical URLs and pagination — **EXISTING / PROPOSED**

`EXISTING` — every indexable page declares a canonical via `buildMetadata()`.
Preserve without exception.

**PROPOSED** — filter and facet URLs (`?application=…`, `?format=…`) are
**query parameters, canonicalising to the clean page, and `noindex`**. Facet
URLs are the classic way a catalogue generates thousands of near-duplicates.
`robots.ts:31` already shows the intent by disallowing `/*?product=`.

**PROPOSED** — at 122 products, no pagination. Revisit past a few hundred.

---

## 16. PostgreSQL design principles

No SQL. Every recommendation carries a reason; none is included because CMSs
usually have it.

| # | Principle | Status | Reason |
|---|---|---|---|
| 1 | **Normalise the taxonomy and vocabularies** — Category, Application, Industry, Format, OlfactiveNote each get a table | **REQUIRED** | `MEASURED` — the format vocabulary is already closed and drift-free; normalising records what is already true |
| 2 | **Surrogate PK + separate stored slug** | **REQUIRED** | `CLAUDE.md` forbids numeric IDs in URLs; a slug that is also the PK cannot be changed without cascading |
| 3 | **FKs for every relationship currently held as a slug string** | **REQUIRED** | `MEASURED` — referential integrity is currently perfect and maintained **by hand**. FKs make that structural |
| 4 | **Explicit join tables for many-to-many, with attributes where needed** | **REQUIRED** | Product↔Application needs `origin` (§7); Category↔Application may need `featured` (§6); OlfactiveNote may need `position` (§5.6) |
| 5 | **Unique constraints:** slug per entity type; **shared namespace across Category and Product** | **REQUIRED** | §15.2 |
| 6 | **Check constraints** on lifecycle and content-state enums | **REQUIRED** | §10, §14 — a tier enforced only in application code is not enforced |
| 7 | **Indexes:** every slug; every FK; a **partial index on published rows** | **PROPOSED** | Slug lookup is the primary access pattern (`fetchCategory`, `fetchProduct`). Public queries always filter to published, so the partial index matches the real workload |
| 8 | **`updated_at` and `created_at`** | **REQUIRED** | Not boilerplate — **directly required by an existing decision.** `sitemap.ts:23-34` omits `lastModified` *because no per-entity modification date exists*, and states Phase 2 reinstates it from a real `updated_at` |
| 9 | **Explicit `position` ordering column** on categories, products within a category, and applications | **REQUIRED** | `EXISTING` — the array order in `taxonomy.ts` encodes a deliberate presentation order ("in the order they are presented on the site"). A relational table has **no inherent order**; without this column the catalogue's curation is lost on migration |
| 10 | **Soft deletion — for Product and Category only** | **PROPOSED** | Justified narrowly: a deleted product's URL must still resolve to a redirect (§15.2) and its enquiries must remain interpretable (§13). **Not** applied to vocabularies or join rows, where hard deletion is correct and soft deletion only accumulates confusion |
| 11 | **Publication state as explicit columns, not a computed view** | **REQUIRED** | §10.2 — lifecycle is editable, the completeness gate is derived. A view cannot hold an editor's decision |
| 12 | **`source` non-nullable on catalogue entities** | **REQUIRED** | `MEASURED` — 152/152 populated by discipline; the database is where that becomes a guarantee |
| 13 | **Attribution rows immutable** | **REQUIRED** | §9.3 — a mutable attribution silently rewrites provenance history |
| 14 | **No `order`/`meta`/`extra` JSON catch-all columns** | **PROPOSED** | A JSON grab-bag is where undesigned fields accumulate unqueryable. Every field in this document has a named reason; anything without one should not be stored yet |

**Deliberately not recommended:** MPTT/`ltree` (§5.2), generic content-types
(§12.3), a separate SEO table (§11.3), CRM tables (§13), regulatory metadata
(§9.5), full-text search columns (search is a later phase and needs synonyms
that do not exist).

---

## 17. API contract requirements

The frontend has already published its contract: the **18 `fetch*` signatures**
in `src/lib/content.ts`. Any API satisfying them requires no component change.

### 17.1 Public DTOs — **REQUIRED**

| DTO | Contains | Notes |
|---|---|---|
| `ProductSummary` | slug, name, benefit, category slug + name, formats, olfactive | `EXISTING` shape. `categorySlug`/`categoryName` must be **returned by the API**, not injected in the seam |
| `ProductDetail` | summary fields + applications, media, public documents | **REQUIRED** when product pages exist |
| `CategorySummary` | slug, name, summary, product count, image | Count must be an **aggregate projection** |
| `CategoryDetail` | summary + children, products, related applications | Descendant query must be server-side |
| `ApplicationSummary` / `Detail` | slug, name, description, industry; detail adds categories + products | Products via the **stored** join (§7) |
| `IndustrySummary` | slug, name, description, applications | |
| `SearchResult` | slug, name, type, snippet | **Must respect the publication gate** |
| `DocumentSummary` | title, role, file URL, revision | **Public documents only** — BLOCKED on §9.4 |

**Non-obvious requirements:**

| Need | Requirement |
|---|---|
| `fetchAllCategorySlugs` | **`isPublishable` filtering must run server-side.** It cannot stay a frontend predicate once the catalogue is remote |
| `fetchProductCount` / `fetchTotalProductCount` | **Aggregate projection, not a materialised list.** `countProducts()` currently builds the full array to return its length; over HTTP that becomes N round-trips per page |
| `fetchProductsInCategory` | **Recursive descendant query** — must include sub-range products |
| Navigation accessors | Navigation *shape* stays in the frontend (`data/navigation.ts` builders); only its *data* crosses |

### 17.2 Backend / admin-only — **REQUIRED**

**Never exposed on a public endpoint:**

| Data | Why |
|---|---|
| **`SourceDocument` records** | Internal provenance. Supplied price lists and the custodian chain are commercially sensitive |
| **Field-level attribution** | Same |
| **Internal notes / provenance notes** | Editorial |
| **Unpublished products and categories** | Must not be reachable by guessing a slug, and must not surface in search (§10.4) |
| **AI drafts and suggestions** | §14 — a draft on a public endpoint is one caching mistake from being indexed |
| **Analytics** | No public consumer |
| **CRM / enquiry records** | Personal data. §13 — the catalogue does not read these at all |
| **Principal ↔ product mapping** | **BLOCKED** — commercially sensitive (§18) |
| Prices, stock | **BLOCKED** (§4.2) |

**Enforcement principle — PROPOSED:** the public serializer is an **allow-list**,
never the model with fields excluded. A deny-list leaks every field added later
by default; an allow-list fails closed.

**EXISTING constraint to carry forward.** Stage 1b made
"the catalogue must not reach the browser" a build error via `server-only` on
the catalogue modules. **The future API client module must carry the same
guard** — it becomes the module holding the catalogue once `lib/content.ts`
fetches rather than imports.

---

## 18. Open Cerium decisions

**Nothing here is guessed or resolved.** Items 1–5 carry forward from
`docs/pending-cerium-decisions.md`; items 6–9 are raised by this specification.

| # | Question | Blocks |
|---|---|---|
| 1 | **Food Ingredients** — does Cerium supply food ingredients, and should the site present food as a range? The 2026 catalogue and the live site disagree; both are current, both are sourced | Final taxonomy and therefore the schema; the company description; whether `/products/food-ingredients` is indexable; the `isPublishable` change in §10.3 |
| 2 | **Pricing** — is any pricing public, and at what granularity? | Every commercial field (§4.2); whether `Product` JSON-LD can replace `ItemList` (§11.3) |
| 3 | **Technical documents** — public, on request, or internal? | `Document` visibility (§9.4); whether `/resources` exists; whether `DocumentSummary` is public (§17) |
| 4 | **Missing catalogue pages 12–13** and glare-obscured entries | Catalogue completeness; the `coverage` field's first real use (§8.2) |
| 5 | **Product technical data** — a source document per product | All of §4.3 |
| 6 | **Which applications does each *product* actually serve?** | **§7 — the largest gap in the model.** Cannot be inferred; `CLAUDE.md` forbids it. On the critical path for search and filtering |
| 7 | **Do the two Category ↔ Application representations mean the same thing?** Specifically: should an application page list a whole family, or only specific ranges? And are the 10 leaf-level A-only pairs omissions or curation? | §6 — one join versus one join plus a `featured` flag. Also decides whether **Citriodiol** should appear on the Skin Care page |
| 8 | **Is the olfactive family order meaningful?** | Whether the `OlfactiveNote` join needs `position` (§5.6) |
| 9 | **May the site state which principal supplies which product?** | Whether `Product.principal` exists at all (§3.1) |

---

## 19. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Category↔Application reconciled by picking the tidier set** before intent is known | **High** | §6.5. Merging to 46 publishes possibly-excluded relationships; merging to 26 deletes intent and orphans Citriodiol |
| 2 | **Derived Product↔Application rows presented as fact** once stored | **High** | §7 — `origin: inherited` vs `stated`, surfaced in the admin |
| 3 | **Technical fields land as bare nullable columns** without attribution | **High** | §4.3, §8.3 — attributed values or nothing |
| 4 | **AI content silently promoted to authoritative** | **High** | §14.3 — explicit recorded transitions; tier-restricted technical fields |
| 5 | **Product URLs nested in a provisional taxonomy**, forcing mass redirects when it is finalised | **High** | §15.2 — flat URLs + stored slugs + redirect rules |
| 6 | **Presentation order lost on migration** | Medium-high | §16.9 — explicit `position`. Relational tables have no inherent order and the current order is deliberate |
| 7 | Publication state **replaces** the completeness gate instead of supplementing it | Medium | §10.2 — both, for different reasons |
| 8 | `isPublishable` "fixed" recursively, quietly removing `/products/food-ingredients` before Cerium answers | Medium | §10.3 — explicitly deferred |
| 9 | Public serializer built as a deny-list, leaking future fields | Medium | §17.2 — allow-list, fails closed |
| 10 | Polymorphic media chosen for flexibility, losing FK integrity | Medium | §12.3 |
| 11 | **No test suite anywhere** — `CLAUDE.md`: lint + typecheck only | Medium | Every migration step verified by inspection; the relationship reconciliation is the riskiest |
| 12 | Build coupled to API availability once `generateStaticParams` becomes a network call | Medium | Cached fallback or build-time snapshot |
| 13 | `Partner` carries third-party trademark descriptions with **no machine-readable provenance** | Low-medium | Extend attribution to company content (§8) |

---

## 20. Recommended implementation order

Ordered so each step de-risks the next, and nothing blocked by a business
decision sits on the critical path.

### Stage 0 — Ask Cerium (starts now, parallel)

Put §18 items 6, 7 and 8 to Cerium alongside the four already outstanding.
Items 6 and 7 are **cheap to ask and expensive to discover late**; item 7 has a
single concrete test case (Citriodiol) that makes it easy to answer.

**No stage below waits on the answers except where marked.**

### Stage 1 — Specification, no code

1. Ratify the cardinalities in §5.7.
2. Decide the engineering-only items: adjacency list, vocabularies as entities,
   `SourceDocument` as an entity, derive family/industry, collapse
   Application→Industry to one FK.
3. **Decide the product URL policy (§15.2).** It gates slug storage, the shared
   namespace constraint and redirects — and it is decidable now.

### Stage 2 — Schema design (in the separate Django service)

4. Core entities and the taxonomy, with `position`, `updated_at` and
   non-nullable `source`.
5. Vocabularies: Format, OlfactiveNote.
6. Publication: lifecycle + indexability, completeness gate derived.
7. `SourceDocument` with coverage; attribution rows immutable.
8. **Category↔Application — REQUIRES Stage 0 item 7.** Design both shapes; build
   the one Cerium's answer selects.
9. Product↔Application join with `origin`, seeded `inherited`.

### Stage 3 — Migration

10. Import the 122 products, 30 categories, 6 applications, 2 industries with
    provenance intact and **presentation order preserved**.
11. Migrate `catalogue.overrides.json` (currently empty) and retire the Studio;
    the Django admin supersedes it.
12. Verify counts against §5 — 122/122 slugs, 38 sitemap URLs, 24 publishable
    categories — before anything reads from the API.

### Stage 4 — Frontend integration

13. Implement `lib/content.ts` against `apiConfig.baseUrl`, local data as
    fallback. **No component should change.** If one does, the seam was not
    doing its job — stop and reassess.
14. `server-only` on the API client module.
15. Sitemap `lastModified` from real `updated_at`.

### Stage 5 — What the migration unlocks

16. Product pages — **gated on §18 items 5 and 6** and on the publication
    threshold.
17. Documents and `/resources` — **gated on §18 item 3**.
18. Media, once Cloudinary is configured and real photography exists.
19. Real search against PostgreSQL, respecting the publication gate.
20. Enquiry intake (§13) — Phase 11.

---

## Appendix — verification

**This was an exploration task.** No Django, migrations, PostgreSQL,
dependencies, application code, product data, taxonomy, routes or URLs were
created or changed. No formatters were run. The only writes were this document
and the removal of the superseded draft named in the header.

Every cardinality reported here was **executed, not assumed**: the data modules
were loaded with the project's own `jiti` from a script in the session
scratchpad, with `server-only` aliased to an empty module as a server runtime
does.

| Measure | Value |
|---|---|
| Products / distinct slugs / distinct names | 122 / 122 / 122 |
| Products in more than one category node | **0** — Product→Category is exactly 1 |
| Categories: roots / children / max depth | 4 / 26 / **1** |
| Categories holding products / holding both products and children | 20 / **0** |
| Children per category | min 0, max 10, mean 0.87 |
| Applications with a resolving `groupSlug` | **6 of 6** |
| Applications per industry | exactly 3, zero overlap, bidirectionally consistent |
| **Rep A pairs — total / depth 0 / depth 1** | **46 / 10 / 36** |
| **Rep B pairs — total / depth 0 / depth 1** | **26 / 0 / 26** |
| A ∩ B / A-only / B-only / B ⊆ A | 26 / 20 / **0** / **true** |
| A-only pairs by depth | **10 family-level (inexpressible in B), 10 leaf-level** |
| Products reachable from no application | **1 — Citriodiol (`mosquito-repellents`)** |
| Applications per product (derived) | min 0, max 3, mean 1.41 |
| Formats: vocabulary / used / drift | 12 / 12 / **0 both directions** |
| Format assignments per product | min 2, max 5, mean 3.79 |
| Olfactive notes: vocabulary / per product | 17 / min 2, max 3, mean 2.64 |
| Products carrying `formats` or `olfactive` | 14 — all in the 3 fragrance categories |
| Dangling slug references, any direction | **0** |
| Catalogue records carrying `source` | **152 of 152** |
| Products with a name and nothing else | 68 of 122 |
| Benefit copy | 40 products, 48–202 chars, mean 119 |
| Populated image instances | **0** |
