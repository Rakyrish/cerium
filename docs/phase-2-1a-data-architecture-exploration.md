# Phase 2.1A — Catalogue / Data Boundary Exploration

**Type:** read-only exploration. No code, data, taxonomy, routes, UI or
dependencies were changed.
**Repository state audited:** working tree at commit `9feb8b6`, 20 Aug 2026.
**Method:** direct inspection of `src/data/`, `src/lib/`, `src/types/`,
`src/config/`, `src/app/`, `src/components/`, plus static analysis of the
import graph and the catalogue records themselves.

> **Note on scope overlap.** `docs/` already contains two Phase 2.1 documents —
> `phase-2.1a-website-architecture-discovery.md` (information architecture) and
> `phase-2.1b-content-data-model.md` (content model specification). This
> document is deliberately different: it examines the **code and data
> architecture** — module graph, bundling, the `lib/content.ts` seam, migration
> contracts and performance — not the IA or the target content model. Where the
> three overlap, the earlier documents are referenced rather than restated.
> Its filename follows the convention given in the brief (`phase-2-1a-…`),
> which differs from the existing files (`phase-2.1a-…`).

**Evidence convention.** Claims cite `path/to/file.ts:line` and name the
relevant function, type or component. Anything that could not be determined from
the repository is marked **CANNOT DETERMINE**.

---

## 1. Executive summary

The Phase 1 catalogue architecture is coherent and unusually well documented,
and its central design decision — an `async` data-access seam at
`src/lib/content.ts` so that a future API swap touches no component — is sound
and worth keeping. The exploration found no architectural dead end.

It did find five things that materially affect Phase 2:

1. **The seam is a partial abstraction, not a boundary.** 8 files read through
   `lib/content.ts`; 3 non-Studio files bypass it for catalogue records. More
   importantly, the seam has *no accessors at all* for products by slug,
   navigation, company content or media — so those paths cannot migrate through
   it as written.
2. **The entire catalogue is compiled into client JavaScript**, along two
   independent paths, to render roughly ten short navigation links.
   ~23 KB of code-only catalogue data ships to every visitor for ~400 bytes of
   actual use. In Phase 2 this stops being a payload question and becomes a
   correctness blocker.
3. **The Category↔Application relationship is stored twice, in opposite
   directions, and the two copies disagree on 20 of 46 pairs** — a user-visible
   asymmetry in which following a link and coming back gives a different answer.
4. **Provenance is 100% in practice but 0% enforced**, the Content Studio
   writes a hardcoded and usually false `source` value, and company content
   (vision, mission, values, partners) carries no machine-readable provenance at
   all.
5. **One code path is dead.** `industries/[industry]/page.tsx:60` looks up a
   product family by industry slug; no industry slug is a category slug, so the
   branch has never fired.

None of these are bugs in the sense of broken output. They are the specific
places where the current shape will resist the Django migration, and they are
the right targets for Phase 2 sequencing (§17).

---

## 2. Current architecture diagram

```
                        ┌──────────────────────────────────────┐
  BUILD TIME            │  src/data/  (the Phase 1 "database")  │
  (static generation)   │                                      │
                        │  taxonomy.ts     30 KB  122 products  │
                        │    └─ overrides.ts ← catalogue.overrides.json
                        │  applications.ts  5 KB  6 apps / 2 industries
                        │  company.ts       5 KB  vision, values, partners
                        │  media.ts         2 KB  3 empty image slots
                        │  navigation.ts    5 KB  DERIVED from the above
                        └──────────────┬───────────────────────┘
                                       │
                 ┌─────────────────────┼──────────────────────┐
                 │                     │                      │
        ┌────────▼────────┐   ┌────────▼────────┐   ┌─────────▼─────────┐
        │ src/lib/        │   │ DIRECT IMPORTS  │   │ src/config/site.ts│
        │ content.ts      │   │ (bypass seam)   │   │ env + contact     │
        │ 13 async fetch* │   │ 26 call sites   │   └─────────┬─────────┘
        └────────┬────────┘   └────────┬────────┘             │
                 │                     │                      │
    ┌────────────┴─────────────────────┴──────────────────────┴──────────┐
    │                        src/app/  — 9 public routes                 │
    │  SERVER COMPONENTS (default)          │  CLIENT COMPONENTS         │
    │  page.tsx, products/, applications/,  │  Header ──┐                │
    │  industries/, about, contact,         │  MobileNav┼─→ navigation.ts│
    │  sitemap.ts, robots.ts, Footer        │  SearchOverlay ─→ taxonomy │
    │                                       │  MegaMenu (props only ✓)   │
    └───────────────────────────────────────┴────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │  Static HTML + RSC payload  │
                        │  + client JS chunk that     │
                        │    CONTAINS THE CATALOGUE   │
                        └─────────────────────────────┘
```

**FACT** — there is no backend, no ORM, no database and no runtime data
fetching in this repository. `src/lib/api` is referenced in comments
(`src/types/content.ts:6`, `src/config/site.ts:96`) but **does not exist**;
`apiConfig` (`src/config/site.ts:100`) is exported and never consumed.

---

## 3. Current data flow

### 3.1 Where the data originates (brief §2 items 1–2)

| Data | Origin file | Notes |
|---|---|---|
| Products | `src/data/taxonomy.ts` | 122 records, built by the `p()` helper at `taxonomy.ts:38` |
| Category tree | `src/data/taxonomy.ts:735` (`reviewedCategories`) | 4 top-level families |
| Studio additions | `src/data/catalogue.overrides.json` | Currently `{categories: [], products: []}` — empty |
| Merged catalogue | `taxonomy.ts:744` — `applyOverrides(reviewedCategories)` | The exported `categories` const |
| Applications / Industries | `src/data/applications.ts:14` / `:135` | 6 and 2 records |
| End-product formats | `src/data/applications.ts:100` (`applicationFormats`) | 12 strings |
| Company content | `src/data/company.ts` | vision, mission, values, metrics, partners |
| Media slots | `src/data/media.ts:44` (`siteMedia`) | 3 slots, all `image: undefined` |
| Site/contact/env | `src/config/site.ts` | The only place `process.env` is read |
| Navigation | `src/data/navigation.ts` | **Derived**, not authored — see §3.3 |

**FACT** — the merge order at `src/data/overrides.ts:78` applies categories
before products, and skips any entry whose parent slug does not resolve
(`overrides.ts:93`, `:107`) rather than silently re-parenting it.

### 3.2 How the entities relate (brief §2 items 3–5)

| Relationship | Mechanism | Location |
|---|---|---|
| Product → Category | **Structural containment.** A product literally lives inside `Category.products[]`. There is no foreign key. | `taxonomy.ts` throughout |
| Product → Category (label) | Injected at read time by `getProductsInCategory()` — sets `categorySlug`/`categoryName` from the containing node | `taxonomy.ts:775` |
| Category → Category | `Category.children[]` — array nesting, no parent pointer | `types/content.ts:79` |
| Category → Application | `Category.applicationSlugs[]` — 46 pairs | `types/content.ts:81` |
| Application → Category | `Application.categorySlugs[]` — 26 pairs, **a second copy of the same relationship** | `types/content.ts:126` |
| Application → Industry | `Application.groupSlug` — single parent | `types/content.ts:124` |
| Industry → Application | `Industry.applicationSlugs[]` — **a second copy again** | `types/content.ts:137` |

**OBSERVATION** — every relationship in the model is expressed as an array of
slug strings resolved by `Array.find`/`Set.has` at read time. There are no
identifiers, no referential integrity, and three of the relationships are stored
redundantly in both directions. That is entirely reasonable for a hand-authored
TypeScript catalogue; it is precisely the set of things a relational database
would take over.

### 3.3 How navigation obtains its data (brief §2 item 6)

**FACT** — `src/data/navigation.ts` is derived, not authored. `productColumns()`
(`navigation.ts:26`) maps the top-level `categories`; `applicationColumns()`
(`navigation.ts:36`) groups `applications` by `industry.slug`. Both run **at
module scope**, so importing anything from this file evaluates the whole
derivation.

**FACT** — `footerNavigation` (`navigation.ts:120`) is a separate structure, not
a subset of `primaryNavigation`, and it hardcodes four `upcoming: true`
destinations (`/resources` ×2, `/insights`, plus `/privacy`, `/terms`).

### 3.4 How search obtains its data (brief §2 item 7)

**FACT** — `SearchOverlay` imports `categories` and `applications` at module
scope (`SearchOverlay.tsx:6-7`) and uses them for a **browse fallback only**
(`SearchOverlay.tsx:174` and `:182`), reading `category.name`, `category.slug`,
`application.name`, `application.slug`. It performs **no filtering** — see §12.

### 3.5 How the sitemap obtains its data (brief §2 item 8)

**FACT** — `src/app/sitemap.ts` reads through the seam (`fetchCategories`,
`fetchApplications`, `fetchIndustries` at `:38-40`) but *also* imports
`flattenCategories` and `isPublishable` directly (`sitemap.ts:8`). Under the
refined rule in `docs/data-layer-boundary.md` that is compliant — those are
predicates, not a data source.

**FACT** — `sitemap.ts` deliberately emits **no `lastModified`**
(documented at `sitemap.ts:22-33`): the only timestamp available is build time,
and stamping it on every URL would tell crawlers the whole site changed on every
image rebuild.

### 3.6 How metadata obtains catalogue information (brief §2 item 9)

**FACT** — every indexable page builds metadata through `buildMetadata()`
(`src/lib/seo.ts:24`), which always sets `alternates.canonical`
(`seo.ts:34`). Dynamic pages resolve their entity inside `generateMetadata`
via the seam — e.g. `products/[category]/page.tsx:39`,
`applications/[application]/page.tsx:30`, `industries/[industry]/page.tsx:30` —
and return a `noindex` variant when the entity is missing
(`products/[category]/page.tsx:43`).

### 3.7 Which pages are generated from catalogue data (brief §2 item 10)

| Route | Source | Params |
|---|---|---|
| `/` | `fetchCategories`, `fetchApplications`, `fetchIndustries` | static |
| `/products` | `fetchCategories` + per-category counts | static |
| `/products/[category]` | `fetchAllCategorySlugs()` → **24 pages** | `generateStaticParams`, `products/[category]/page.tsx:33` |
| `/applications` | `fetchApplications` | static |
| `/applications/[application]` | **6 pages** | `applications/[application]/page.tsx:24` |
| `/industries` | `fetchIndustries` | static |
| `/industries/[industry]` | **2 pages** | `industries/[industry]/page.tsx:24` |
| `/about` | `company.ts` directly | static, **not** catalogue-derived |
| `/contact` | `getAllProducts()` directly, for `?product=` lookup | static + searchParams |

**FACT** — 24 category pages, not 30. `fetchAllCategorySlugs()`
(`lib/content.ts:52`) filters by `isPublishable`, which withholds a page from
any category with neither products nor children (`taxonomy.ts:762`). The six
Food Ingredients sub-ranges are the categories this excludes.

### 3.8 Data duplicated or transformed between layers (brief §2 item 15)

| Duplication | Where | Consequence |
|---|---|---|
| Category↔Application, stored in both directions | `taxonomy.ts` + `applications.ts` | **Disagree on 20/46 pairs** — §8.3 |
| Industry↔Application, stored in both directions | `applications.ts:124` + `:137` | Consistent today; same structural risk |
| Category label copied onto every product at read time | `getProductsInCategory()`, `taxonomy.ts:775` | Transform, not duplication — harmless |
| Navigation derived from taxonomy at module scope | `navigation.ts:26` | Derivation is correct; the *bundling* is the problem — §4 |
| The catalogue itself, in both server render and client JS | §4 | The real duplication |

---

## 4. Client bundle / data-flow problem

### 4.1 The client boundary, precisely

**FACT** — exactly 13 modules declare `"use client"`:

| Module | Imports catalogue data? |
|---|---|
| `src/components/layout/Header.tsx` | **Yes** — `primaryNavigation` (`:10`) |
| `src/components/layout/MobileNavigation.tsx` | **Yes** — `primaryNavigation` (`:6`) |
| `src/components/search/SearchOverlay.tsx` | **Yes** — `categories` (`:6`), `applications` (`:7`) |
| `src/components/layout/MegaMenu.tsx` | **No — props only** (`item: NavItem`, `:22`) |
| `src/components/motion/Reveal.tsx` | No |
| `src/app/error.tsx` | No |
| `src/hooks/useDialog.ts` | No |
| `src/components/studio/*` (6 files) | No — `OverridesList.tsx:5` is `import type`, erased at compile time |

**OBSERVATION** — `MegaMenu` is the important row. It is a client component that
receives its navigation data as a prop from `Header` and imports no data module.
**The correct pattern already exists in this codebase** — it simply is not
applied one level up, at `Header` itself.

### 4.2 The two paths, and why tree-shaking cannot help

```
PATH 1 — navigation
  Header.tsx ("use client")
    └─ import { primaryNavigation } from "@/data/navigation"
         └─ navigation.ts  → import { categories }   from "@/data/taxonomy"
                           → import { applications, industries } from "@/data/applications"
                                └─ taxonomy.ts → overrides.ts → catalogue.overrides.json
                                              → lib/slug.ts

  MobileNavigation.tsx ("use client") — same import, same graph

PATH 2 — search
  SearchOverlay.tsx ("use client")
    └─ import { categories }   from "@/data/taxonomy"     ← same module, independent path
    └─ import { applications } from "@/data/applications"
```

**FACT** — `navigation.ts:29` calls `categories.map(...)` at module scope, and
`taxonomy.ts:744` builds `categories` by calling `applyOverrides(reviewedCategories)`
at module scope. Both execute on import.

**OBSERVATION — the whole catalogue ships, not a subset.** Tree-shaking removes
*unused exports*, not unused *object properties*. `categories` is a single
exported const whose value is a deeply nested object graph containing all 122
product records with their benefit copy. Because `navigation.ts` and
`SearchOverlay` both reference that const, the bundler must include the entire
literal. There is no mechanism by which `product.benefit` could be dropped while
`category.name` is retained.

**FACT** — the modules are deduplicated by the bundler, so the catalogue appears
**once** in the client chunk, not twice. The two paths matter for a different
reason: **removing either one alone changes nothing.** Both must be cut.

### 4.3 Payload measured

| Module | Raw bytes | Code-only (comments/blank stripped) |
|---|---|---|
| `src/data/taxonomy.ts` | 30,256 | **19,987** |
| `src/data/applications.ts` | 5,018 | **3,143** |
| `src/data/navigation.ts` | 5,313 | **3,311** |
| **Total reaching the client** | 40,587 | **≈ 23,100** |

**FACT** — of that, ~5,846 bytes is `benefit` copy on 40 products
(`grep -c 'benefit:'` → 40), none of which any client component reads.

**What the client components actually consume:**

| Consumer | Fields used | Records | Approx. useful bytes |
|---|---|---|---|
| `Header` / `MobileNavigation` | `label`, `href`, `description` for 4 families + 6 applications + 2 industries | 12 | ~1,200 |
| `SearchOverlay` browse fallback | `name`, `slug` for 4 top-level categories + 6 applications | 10 | ~400 |

**OBSERVATION** — roughly **23 KB of catalogue data is compiled into client
JavaScript to produce about 1.5 KB of navigation links.** Gzip will compress the
repetitive structure well (a realistic estimate is 5–7 KB over the wire, though
**CANNOT DETERMINE** precisely without a production build — the local Node 18.19.1
is below Next 16's floor, per `CLAUDE.md`). The uncompressed cost is paid twice
regardless: once in transfer, once in parse/execute on every page load, on every
route, including routes that never open the menu or the search overlay.

### 4.4 Why this is a Phase 2 correctness problem, not a payload preference

**OBSERVATION** — an API-backed catalogue cannot be a synchronous module-scope
import inside a client component. `import { categories } from "@/data/taxonomy"`
has no asynchronous equivalent that a client component can evaluate at module
scope. When `lib/content.ts` gains a `fetch()`, these three call sites break
outright — they do not merely get slower.

This is the single finding in this document that is load-bearing for the
migration, and it is independent of every open business decision.

---

## 5. `src/lib/content.ts` boundary analysis

### 5.1 Verdict: a **partial abstraction**

Not a true boundary, and more than an intended future seam. Three distinct
reasons:

1. **It is bypassed for catalogue records by 3 non-Studio files** (§5.3.B, C).
2. **It is incomplete.** It exposes 13 `fetch*` functions covering categories,
   applications and industries — but has **no accessor for a single product by
   slug**, and none at all for navigation, company content or media. Callers
   that need those things have no compliant option.
3. **Its own stated rule overstates itself.** `lib/content.ts:6` says pages
   "MUST … never import from `src/data` directly", which is stricter than the
   codebase has ever been and stricter than it needs to be. The rule that
   matters — catalogue *records* only — is stated correctly in
   `docs/data-layer-boundary.md`.

### 5.2 What the seam does provide

**FACT** — 13 exported functions, all `async`, all currently resolving against
local data (`lib/content.ts:38-127`): `fetchCategories`, `fetchCategory`,
`fetchAllCategorySlugs`, `fetchProductsInCategory`, `fetchProductCount`,
`fetchTotalProductCount`, `fetchApplications`, `fetchApplication`,
`fetchProductsForApplication`, `fetchCategoriesForApplication`,
`fetchIndustries`, `fetchIndustry`, `fetchApplicationsForIndustry`.

**OBSERVATION** — the `async` signatures are the seam's real value. They mean
adding an HTTP call behind any function changes no caller signature and makes no
component newly suspending. That decision was correct and should be preserved.

### 5.3 Every important caller, categorised

#### A. Server-side callers (through the seam) — compliant

| File | Functions used |
|---|---|
| `src/app/page.tsx:41-57` | `fetchCategories`, `fetchApplications`, `fetchIndustries`, `fetchProductCount`, `fetchApplicationsForIndustry` |
| `src/app/products/page.tsx:26-38` | `fetchCategories`, `fetchTotalProductCount`, `fetchProductCount` |
| `src/app/products/[category]/page.tsx:39-75` | `fetchCategory`, `fetchProductCount`, `fetchProductsInCategory`, `fetchApplications` |
| `src/app/applications/page.tsx:21` | `fetchApplications` |
| `src/app/applications/[application]/page.tsx:30-58` | `fetchApplication`, `fetchProductsForApplication`, `fetchCategoriesForApplication` |
| `src/app/industries/page.tsx:19-23` | `fetchIndustries`, `fetchApplicationsForIndustry` |
| `src/app/industries/[industry]/page.tsx:30-60` | `fetchIndustry`, `fetchApplicationsForIndustry`, `fetchCategory` |

**Migration impact:** lowest risk in the codebase. These are Server Components
already awaiting async functions. When `lib/content.ts` gains `fetch()`, **none
of these files changes.** This is the seam working exactly as designed.

#### B. Client-side callers — **none use the seam; all bypass it**

| File | Import | Migration impact |
|---|---|---|
| `src/components/search/SearchOverlay.tsx:6-7` | `categories`, `applications` | **Breaks.** Must receive `{name, slug}` lists as props from a server parent, or fetch from a search endpoint (§12). |
| `src/components/layout/Header.tsx:10` | `primaryNavigation` | **Breaks.** Navigation must be resolved on the server and passed down — the pattern `MegaMenu` already uses. |
| `src/components/layout/MobileNavigation.tsx:6` | `primaryNavigation` | **Breaks.** Same fix as `Header`. |

**OBSERVATION** — the seam has no client story at all, by design. That is
defensible, but it means "migrate to the API" is not a `lib/content.ts` change
for these three files; it is a component-signature change. They should be fixed
*before* the API exists, while the behaviour can still be verified against static
data.

#### C. Build-time / static-generation callers

| File | Path | Compliance |
|---|---|---|
| `src/app/sitemap.ts:38-40` | `fetchCategories/Applications/Industries` + direct `flattenCategories`, `isPublishable` (`:8`) | Compliant under the refined rule |
| `src/app/products/[category]/page.tsx:33` | `fetchAllCategorySlugs()` in `generateStaticParams` | Compliant |
| `src/app/applications/[application]/page.tsx:24` | `fetchApplications()` | Compliant |
| `src/app/industries/[industry]/page.tsx:24` | `fetchIndustries()` | Compliant |
| `src/app/not-found.tsx:6` | **`categories` directly** | **Bypass.** Server component; mechanical fix to `await fetchCategories()` |
| `src/app/contact/page.tsx:8` | **`getAllProducts()` directly** | **Bypass.** Needs a `fetchProduct(slug)` accessor that does not exist |

**Migration impact:** `generateStaticParams` becomes a real network call at
build time. This is the point at which build duration becomes coupled to API
availability — see §10.6.

#### D. API / Studio callers — exempt by design

| File | Import |
|---|---|
| `src/app/api/studio/catalogue/route.ts:7` | `CatalogueOverrides` types from `@/data/overrides` |
| `src/app/api/studio/upload/route.ts` | `lib/studio-images`, `lib/studio-guard` |
| `src/app/studio/page.tsx:6` | `categories`, `countProducts`, `isPublishable` |
| `src/app/studio/products/page.tsx:1` | `categories` |

**FACT** — Studio is hard-disabled outside development (`src/lib/studio-guard.ts`)
and has no authentication by design.

**Migration impact:** the entire Studio is **superseded** by the authenticated
Django admin. It is not migrated — it is retired, and
`catalogue.overrides.json` is merged into the database as part of the data
migration.

#### E. Non-catalogue direct imports — 14 call sites, currently out of scope

**FACT** — `company.ts` (7 sites), `media.ts` (3), `navigation.ts` (3),
`applications.ts` `applicationFormats` (2). The seam has no accessors for any of
these.

**OBSERVATION** — this is the ambiguity flagged as item 5 in
`docs/data-layer-boundary.md`, and it is still unresolved. It needs an explicit
decision (§14.4), because 14 of the 26 direct imports depend on the answer.

---

## 6. Current conceptual entities

Assessed against what is actually in the repository today. Field references are
to `src/types/content.ts`.

| Concept | Exists? | Where | Fields | Canonical? | First-class backend entity later? |
|---|---|---|---|---|---|
| **Product** | **Yes** | `ProductSummary`, `types/content.ts:99` | `slug`, `name`, `benefit?`, `categorySlug?`, `categoryName?`, `applications?`, `olfactive?`, `image?`, `source?` | Yes — 122 records | **Yes.** Needs a stable identity and a URL; has neither. |
| **Product family** | **Partly** | A depth-0 `Category` | Same type as any category | No — a position, not a type | **No.** Derive from depth. |
| **Category** | **Yes** | `Category`, `types/content.ts:73` | `slug`, `name`, `description?`, `summary?`, `image?`, `children?`, `applicationSlugs?`, `products?`, `source?` | Yes — 30 nodes | **Yes**, with a real parent FK instead of array nesting. |
| **Subcategory** | **Partly** | A depth-1 `Category` | Same type | No | **No.** Same argument as family. |
| **Application** | **Yes** | `Application`, `types/content.ts:120` | `slug`, `name`, `description?`, `image?`, `groupSlug?`, `categorySlugs?`, `source?` | Yes — 6 records | **Yes.** |
| **Industry** | **Yes** | `Industry`, `types/content.ts:133` | `slug`, `name`, `description?`, `image?`, `applicationSlugs?`, `source?` | Yes — 2 records | **Yes**, though thin. |
| **Brand / Manufacturer** | **Partial — company-level only** | `Partner`, `types/content.ts:155`; 3 records in `company.ts:96` | `name`, `description`, `logo?` | Yes for the 3 partners | **Yes** — but **no product↔partner link exists anywhere in the data.** Creating one is a business decision. |
| **Product source (provenance)** | **Yes** | `SourceDocument` union, `types/content.ts:22`; `Sourced`, `:28` | 6 string members | Yes | **Yes** — promote from enum to entity (§9.5). |
| **Product image** | **Type only** | `ImageRef`, `types/content.ts:46` | `cloudinaryId?`, `src?`, `alt?`, `width?`, `height?`, `focal?` | Type is canonical; **zero populated instances** | **Yes.** |
| **Document (TDS/SDS)** | **No** | — | — | — | **Yes**, later. Nothing exists today. |
| **Function / role** | **No** | — | Implied by category names only (Preservatives, Silicones, Emollients) | — | **Yes.** The axis a single tree cannot express. |
| **Product relationship** | **No** | — | No product↔product link of any kind | — | Only if a real requirement appears. No evidence today. |
| **Search metadata** | **No** | — | No keywords, synonyms or index fields anywhere | — | **Yes**, when search becomes real (§12). |
| **SEO metadata** | **Derived only** | `buildMetadata()`, `lib/seo.ts:24` | Title/description computed per page; **no stored SEO fields on any entity** | Not stored | **Yes** — per-entity `seo_title`, `meta_description`, `og_image`. |
| **Format (end-product)** | **Yes, as loose strings** | `applicationFormats`, `applications.ts:100`; `ProductSummary.applications` | 12 values; on 14 products | Semi — a de-facto controlled vocabulary stored as text | **Yes.** |
| **Olfactive family** | **Yes, as a delimited string** | `ProductSummary.olfactive` | `"Vanilla \| Ambery \| Floral"` on 14 products | No — multi-value packed into one field | **Yes**, as a controlled vocabulary. |
| **Price / stock** | **No — deliberately** | — | — | — | Business decision (§15.3). |

---

## 7. Current product / taxonomy relationships

### 7.1 Resolution mechanics

**FACT** — all traversal is linear scanning over a rebuilt array:

| Function | Location | Behaviour |
|---|---|---|
| `flattenCategories()` | `taxonomy.ts:768` | Depth-first walk, **allocates a new array on every call** |
| `getCategoryBySlug()` | `taxonomy.ts:772` | `flattenCategories().find(...)` — full walk per lookup |
| `getProductsInCategory()` | `taxonomy.ts:775` | Flattens the subtree, copies each product, injects category label |
| `getAllProducts()` | `taxonomy.ts:786` | `categories.flatMap(getProductsInCategory)` |
| `countProducts()` | `taxonomy.ts:791` | `getProductsInCategory(category).length` — **builds the full product array to return a number** |
| `isPublishable()` | `taxonomy.ts:762` | `products.length > 0 \|\| children.length > 0` |

**OBSERVATION** — `src/app/products/page.tsx:31-40` awaits `fetchProductCount`
for 4 families and every child, and `fetchTotalProductCount` once. Each call
re-flattens and re-copies. At 122 products this is free at build time and
entirely appropriate for Phase 1. It is worth noting only because these are
exactly the call sites that become network round-trips in Phase 2 (§10.6), where
"count" must become a projection rather than a materialised list.

### 7.2 The relationship graph as it exists

```
Industry (2)
   │  Industry.applicationSlugs[]   ─┐
   ▼                                 │ both directions stored
Application (6)                      │ consistent today
   │  Application.groupSlug         ─┘
   │
   │  Application.categorySlugs[]  (26 pairs) ─┐
   ▼                                           │ both directions stored
Category (30, 2 levels)                        │ DISAGREE on 20/46
   │  Category.applicationSlugs[]  (46 pairs) ─┘
   │
   │  structural containment (no key)
   ▼
Product (122)
```

**FACT** — there is **no Product→Application relationship in the data.**
`fetchProductsForApplication()` (`lib/content.ts:88`) derives it: it takes
`application.categorySlugs`, filters the flattened tree, and returns every
product in those categories. Product-level application data exists only as the
free-text `ProductSummary.applications` on 14 fragrance records, and that field
holds **end-product formats** ("Shampoo", "Fabric softener"), not application
slugs — it is never used for resolution.

---

## 8. Data integrity findings

Reported only. **Nothing was corrected.**

### 8.1 Identifiers — clean

| Check | Result |
|---|---|
| Duplicate product names | **None.** 122 names, 122 distinct |
| Duplicate product slugs | **None.** All slugify without collision |
| Duplicate category slugs | **None.** 30 distinct |
| Product slug vs category slug collision | **None** |
| Product/category slug vs application/industry slug collision | **None** |
| Dangling `applicationSlugs` references | **None** — all 46 resolve |
| Dangling `categorySlugs` references | **None** — all 26 resolve |
| Dangling `Industry.applicationSlugs` | **None** — all 6 resolve |

**OBSERVATION** — referential integrity is currently perfect and maintained
entirely by hand. That is a testament to care, not to structure; nothing in the
type system or the build enforces it.

### 8.2 Missing fields

| Finding | Detail |
|---|---|
| Categories without `summary` | **26 of 30.** All 4 top-level families have one; every sub-range lacks one. `summary` feeds the mega-menu `description` (`navigation.ts:31`) and the products page — the mega-menu is unaffected because it only renders top-level families. |
| Products without `benefit` | **82 of 122** |
| Products with no content beyond a name | **68 of 122** (40 have `benefit`; 14 fragrances have `olfactive` + formats) |
| Images anywhere in catalogue data | **Zero.** `taxonomy.ts` and `applications.ts` contain no `image:` key at all; all 3 `siteMedia` slots are explicitly `undefined` (`media.ts:52,61,68`) |
| `source` on catalogue entities | **152 of 152 — 100%** |

### 8.3 Inconsistent relationship assignments — the significant one

**FACT** — the Category↔Application relationship is stored twice and the two
copies disagree:

| Direction | Pairs |
|---|---|
| `Category.applicationSlugs` (category side) | **46** |
| `Application.categorySlugs` (application side) | **26** |
| Agreed by both | 26 |
| **Present on the category side only** | **20** |
| Present on the application side only | 0 |

The 20 one-sided pairs:

```
essential-oils           -> skin-care, hair-care, bath-and-shower
natural-butters          -> hair-care
natural-ingredients      -> skin-care, hair-care, bath-and-shower
functional-ingredients   -> skin-care, hair-care, bath-and-shower
preservatives            -> skin-care, hair-care
silicones                -> skin-care
mosquito-repellents      -> skin-care
fragrances               -> fabric-care, bath-and-shower, hair-care, air-care
personal-care-fragrances -> hair-care, skin-care
```

**OBSERVATION — this is user-visible.** `products/[category]/page.tsx:201`
renders "related applications" from `category.applicationSlugs`, while
`applications/[application]/page.tsx` resolves through
`application.categorySlugs`. So `/products/essential-oils` links to Skin Care,
but `/applications/skin-care` does not list Essential Oils. Following a link and
attempting to return the same way produces a different answer.

### 8.4 Inconsistent application assignments — over-broad derivation

**FACT** — `skin-care.categorySlugs` includes `natural-extracts`
(`applications.ts:22`), so all **19** Natural Extracts render on
`/applications/skin-care`.

**FACT** — of those 19, the supplied benefit copy for **Onion Extract** and
**Rosemary Extract** is exclusively about hair and scalp:

> Rosemary Extract — "Promotes hair growth and strength, reduces dandruff and
> improves overall scalp health, adds shine and luster to hair"

**OBSERVATION** — the relationship is category-granular where the underlying
truth is product-granular. On a site whose governing rule is that it must not
overstate what a material does, that is a data-integrity issue and not only a
relevance one. (Saw Palmetto Extract also appears, but its copy does mention
anti-acne and skin inflammation, so it legitimately serves both.)

### 8.5 Shape and naming inconsistencies

| Finding | Detail |
|---|---|
| **Empty array vs omitted key** | `food-ingredients` has `applicationSlugs: []` (`taxonomy.ts:691`); its six children omit the key entirely. Both are valid against `applicationSlugs?: Slug[]` and behave identically, but they are two encodings of one state. |
| **Casing split** | 24 categories are Title Case ("Natural Extracts"); the 6 Food sub-ranges are sentence case ("Seasoning powder blends", "Whey powder"). Faithful to their different sources — catalogue vs live website — but visually inconsistent in the UI. |
| **US/UK spelling split** | `"Natural colors and extracts"` (US, website source) alongside `"Multi Coloured Cellulose Scrubs"` (UK, catalogue source). Both verbatim. |
| **Punctuation in names** | `"Olive Oil (Extra Virgin)"` → `olive-oil-extra-virgin`; `"Phenoxyethanol & Ethylhexylglycerin"` → `phenoxyethanol-and-ethylhexylglycerin` (`lib/slug.ts:20` expands `&`). Both slugs are stable and correct; noted because Phase 2 persists slugs. |

### 8.6 Dead code path

**FACT** — `src/app/industries/[industry]/page.tsx:60` calls
`fetchCategory(industry.slug)` to find a matching product family, commented
"Industry slugs mirror the top-level product family slugs".

**FACT** — they do not. Industry slugs are `personal-care` and `home-care`;
neither is a category slug (the top-level families are `natural-ingredients`,
`functional-ingredients`, `fragrances`, `food-ingredients`). **The lookup
returns `null` for both industries, so the branch has never rendered.**

**OBSERVATION** — the code is correctly guarded, so this produces no bug. The
premise was presumably true under an earlier taxonomy shape and stopped being
true when Personal Care / Home Care were moved from families to industries
(the decision documented at `taxonomy.ts:41-75`). It is stale, not broken.

### 8.7 Fields that may need stronger rules later

| Field | Today | Concern |
|---|---|---|
| `source?` | Optional on all four catalogue types | 100% populated by convention; **nothing enforces it** (§9.2) |
| `ImageRef.alt?` | Optional | The stated rule is that `alt: ""` is only for decorative images — unenforceable while `alt` is optional |
| `ProductSummary.applications?` | `string[]` free text | A de-facto controlled vocabulary of 12 values |
| `ProductSummary.olfactive?` | Single delimited string | 17 distinct notes packed into one field |
| `Category.applicationSlugs?` | `Slug[]` | No FK; hand-maintained; already drifted (§8.3) |
| `ProductSummary.categorySlug?` | Optional, injected at read time | Absent in stored data; derived by `getProductsInCategory` |

### 8.8 Cannot determine from the repository

- Whether any product has multiple grades, pack sizes or MOQs — **no such field exists**.
- Whether the 3 partners map to specific products — **no link exists in any file**.
- Actual gzipped client bundle size — requires a production build; the local
  Node (18.19.1) is below Next 16's floor per `CLAUDE.md`, so this was not run.
- Whether the live ceriumchemicals.co.ke content is current — external to the repo.

---

## 9. Provenance analysis

### 9.1 Coverage

**FACT** — every catalogue entity carries a `source`:

| Source value | Occurrences in `taxonomy.ts` |
|---|---|
| `catalogue-2026` | 130 |
| `fragrance-pricelist-q3-2026` | 12 |
| `website-ceriumchemicals.co.ke` | 7 |
| `pricelist-q3-2026` | 3 |
| **Total** | **152** = 122 products + 30 categories |

### 9.2 Provenance is convention, not constraint

**FACT** — `Sourced` (`types/content.ts:28`) declares `source: SourceDocument`
as **required**, but it is extended by exactly **one** type: `CompanyMetric`
(`types/content.ts:165`).

**FACT** — `Category`, `ProductSummary`, `Application` and `Industry` each
declare `source?: SourceDocument` — **optional** (`types/content.ts:86, 111,
128, 138`).

**OBSERVATION** — so 100% coverage is a discipline the authors maintained, not a
property the compiler guarantees. A new entry with no `source` compiles, lints
and renders cleanly. This is the single cheapest integrity improvement available
in Phase 2: make it required in the schema.

### 9.3 Two union members are declared but never used

**FACT** — `vision-statement` and `logo` appear in the `SourceDocument` union
(`types/content.ts:22`) and **nowhere else in `src/`**.

**FACT** — `src/data/company.ts` documents its origin in a file comment
("SOURCE OF TRUTH: VISION STATEMENT.docx and the 2026 product catalogue",
`company.ts:4`) but carries **no machine-readable `source` on any export**
except `companyMetrics`. `vision`, `mission`, `aboutSummary`, `catalogueIntro`,
`brandStatement`, `coreValues`, `partners`, `partnersIntro` and
`partnersStatement` have none — `CoreValue` (`types/content.ts:147`) and
`Partner` (`:155`) do not extend `Sourced`.

**OBSERVATION** — provenance coverage is therefore **100% for the catalogue and
0% for company content**, even though company content includes the exact
material most likely to be quoted back to Cerium (vision, mission, values).

### 9.4 The Content Studio writes false provenance

**FACT** — `src/app/api/studio/catalogue/route.ts:104` and `:146` **hardcode**
`source: "website-ceriumchemicals.co.ke"` on every category and product the
Studio writes. The value is not derived from user input and not validated
against the actual origin of the content.

**OBSERVATION** — anything authored through the Studio is attributed to the live
website regardless of where it truly came from. Since `catalogue.overrides.json`
is currently empty (`{"categories": [], "products": []}`), **no incorrect
provenance has shipped yet.** But the mechanism is live, and the moment the
Studio is used the provenance chain records a source that is very likely wrong —
in a system whose entire integrity model rests on that field.

This is the most consequential provenance finding in the exploration.

### 9.5 Can provenance support future document traceability?

**Yes, with three changes** — all recorded, none made:

1. **Make `source` required** in the schema rather than optional (§9.2).
2. **Promote `SourceDocument` from enum to entity.** A union member cannot carry
   the document's title, revision, issue date, custodian, the file itself, or a
   coverage note — and a coverage note is exactly what is needed to record the
   known gap that catalogue pages 12–13 are missing (`taxonomy.ts:24-28`).
3. **Add provenance below record level** for the claims that carry liability —
   product↔application and product↔function assignments, and technical fields.
   **FACT:** record-level provenance is *already* slightly lossy — 3 products
   take their `benefit` from `pricelist-q3-2026` while their category is sourced
   `catalogue-2026`, and 12 fragrance entries mix `catalogue-2026` with
   `fragrance-pricelist-q3-2026`.

### 9.6 Distinguishing authoritative from AI-generated content later

**FACT** — the current model has no mechanism for this. `SourceDocument` has six
members, all of which denote supplied Cerium material; there is no tier, no
confidence, no "generated" marker, and no approval state.

**RECOMMENDATION (recorded, not implemented)** — an authority tier on the source
entity, plus a rule that content at the lowest tier cannot reach a published
state without recorded human approval. The detailed proposal is in
`docs/phase-2.1b-content-data-model.md` §7. It is noted here only because this
exploration confirms the *current* model cannot express it at all.

---

## 10. Future Django / API migration considerations

### 10.1 The transition

```
CURRENT                          FUTURE
────────                         ──────
Next.js                          Next.js  (rendering, routing, SEO output)
   ↓ import                         ↓ fetch (server-side)
TypeScript catalogue             Django REST API
(build-time, in-process)            ↓ ORM
                                 PostgreSQL  (persistence, taxonomy, slugs, search)
```

**FACT** — `CLAUDE.md` states the Django API goes in a **separate service**, and
the frontend consumes it solely through `lib/content.ts` + `apiConfig.baseUrl`.
Django owns persistence, taxonomy, slugs-as-stored-fields, search and the
authenticated admin. Next.js owns rendering, routing, SEO output and
presentation.

### 10.2 Contracts the frontend already needs

**OBSERVATION** — the frontend has already published its contract, and it is the
`fetch*` signature list in §5.2. Any API that can satisfy those thirteen
functions requires no component change. Concretely the API must support:

| Frontend need | Current function | API requirement |
|---|---|---|
| Full category tree | `fetchCategories` | Nested serialisation, or flat + client-side assembly in the seam |
| One category by slug | `fetchCategory` | Slug lookup |
| Publishable slugs only | `fetchAllCategorySlugs` | **Server-side `isPublishable` filtering** — must not be a frontend concern |
| Products in a category subtree | `fetchProductsInCategory` | Recursive/descendant query |
| Counts | `fetchProductCount`, `fetchTotalProductCount` | **Aggregate projection, not a materialised list** (§7.1) |
| Products for an application | `fetchProductsForApplication` | A **real** join, replacing today's derivation (§8.4) |
| Categories for an application | `fetchCategoriesForApplication` | Join |
| Applications, industries, and their pairings | remaining functions | Straightforward |

**Missing from the contract today:** `fetchProduct(slug)`. `contact/page.tsx:39`
needs it and currently calls `getAllProducts().find(...)` instead. Any product
detail page needs it too.

### 10.3 What should become API DTOs

**RECOMMENDATION (recorded)** — `Category`, `ProductSummary` (widening to a full
`Product`), `Application`, `Industry` and `ImageRef` are already the DTO shapes;
`types/content.ts:1-11` says exactly this. Two adjustments will be needed:

- **`ProductSummary.categorySlug`/`categoryName`** are injected at read time
  (`taxonomy.ts:775`), not stored. The API should return them explicitly so the
  seam is not doing joins in JavaScript.
- **Nested `Category.children`** works for a 30-node tree. Whether the API
  returns nested or flat-with-parent-id is an implementation choice for 2.1C;
  the seam can adapt either way without touching components.

### 10.4 What should remain frontend-only

| Stays in the frontend | Why |
|---|---|
| `lib/seo.ts` — `buildMetadata`, JSON-LD builders | SEO output is a rendering concern |
| `lib/cn.ts`, all `src/components/ui/*` | Presentation |
| `Reveal` / motion | Presentation |
| `src/config/site.ts` env plumbing | Deployment concern |
| `navigation.ts` **derivation logic** | Shape of the menu is a presentation decision; only its *data* comes from the API |
| `isPublishable` as a **predicate** | But the *filtering* must also exist server-side (§10.2) |

### 10.5 What should remain build-time vs server-side vs never in the browser

| Tier | Content |
|---|---|
| **Build-time** (`generateStaticParams`, sitemap) | The route manifest — publishable category slugs, application slugs, industry slugs, and eventually publishable product slugs |
| **Server-side per request/render** | All catalogue reads; navigation resolution; metadata generation |
| **Client** | Only the small `{name, slug, href}` lists the menu and search fallback actually render — passed as props |
| **Never in the browser** | The full catalogue; any admin/Studio surface; `apiConfig` credentials or internal API hostnames; anything gated by `access: on_request` |

**FACT** — `import "server-only"` is currently used in exactly two files
(`lib/studio-guard.ts`, `lib/studio-images.ts`). **OBSERVATION** — it is the
natural enforcement mechanism for the boundary above, and applying it to the
future API client module would turn "the catalogue must not reach the client"
from a convention into a build error.

### 10.6 Caching

**OBSERVATION** — recorded, not decided; the right choice depends on how often
Cerium edits the catalogue, which is unknown.

- **Static generation stays the default.** The catalogue is small (122 products,
  38 URLs) and changes rarely. Full static generation at build remains the
  fastest and most crawlable option, and `CLAUDE.md` states this explicitly.
- **Build coupling is the new risk.** `generateStaticParams` becomes a network
  call, so an API outage becomes a build failure. A cached fallback or a
  build-time snapshot is worth considering.
- **ISR / on-demand revalidation** becomes available once Django can send a
  webhook on publish. This is the natural fit for a CMS-backed catalogue, but it
  requires deciding who triggers it.
- **`updated_at` from the database** finally makes an honest sitemap
  `lastModified` possible — the reason it is currently omitted
  (`sitemap.ts:22-33`).

### 10.7 Where Server Components should be preferred

**OBSERVATION** — everywhere the catalogue is read. All seven §5.3.A callers are
already Server Components awaiting async functions, which is why they need no
change. The three client components in §5.3.B are the entire problem surface,
and two of them (`Header`, `MobileNavigation`) are client-side only because of
**interaction state** (menu open/closed), not because they need data at runtime.

### 10.8 Where client-side fetching is actually justified

**OBSERVATION** — exactly one place: **search-as-you-type** (§12). A search
query is user input that occurs after hydration and cannot be statically
generated. Everything else on this site — navigation, category browse,
application browse, product listing, metadata — is known at build time and has
no legitimate reason to fetch from the browser.

---

## 11. SEO architectural implications

**Not an SEO implementation phase.** These are the architectural decisions that
must be settled *before* the SEO phase.

### 11.1 What is already correct and must be preserved

| Mechanism | Location | Why it matters |
|---|---|---|
| Canonical on every indexable page | `lib/seo.ts:34` | No exceptions currently exist |
| `generateStaticParams` + `notFound()` | all three dynamic routes | No soft-404s |
| Sitemap generated from the same data as the routes | `sitemap.ts` | Cannot list a page that does not exist |
| `robots.ts` disallows everything unless `NEXT_PUBLIC_ALLOW_INDEXING=true` | `robots.ts:17` | An indexed staging site is far worse than a temporarily blocked production one |
| `ItemList` rather than `Product` JSON-LD | `lib/seo.ts:127` | No offer data exists; claiming `Product` produces invalid markup |
| No `lastModified` in the sitemap | `sitemap.ts:22-33` | Build time is not a content modification date |

### 11.2 `isPublishable()` — the thin-content protection that already works

**FACT** — `taxonomy.ts:762`. A category earns a URL only when it has products
or children. This is why 24 of 30 categories have pages, and why the six Food
sub-ranges do not.

**OBSERVATION** — this single predicate is the site's entire thin-content
defence, and it is well designed: it is derived from data, so adding one product
to an empty sub-range causes its page, sitemap entry and card link to appear
automatically. **The architectural question for Phase 2 is whether the same
principle governs products** — 68 of 122 products currently have a name and
nothing else (§8.2), so publishing all of them would ship 68 near-empty pages.

### 11.3 Decisions required before the SEO phase

| # | Decision | Why it must be settled first |
|---|---|---|
| 1 | **Do products get URLs, and under what path?** | The single largest indexable surface. Nested (`/products/[category]/[product]`) vs flat changes the redirect strategy and the slug uniqueness constraint. |
| 2 | **What is the product publication threshold?** | Determines whether the long tail is an asset or 68 thin pages. |
| 3 | **Are filters/facets query parameters or paths?** | Facet URLs are the classic way a catalogue site generates thousands of near-duplicates. `robots.ts:31` already disallows `/*?product=`, showing the intent. |
| 4 | **Is pagination needed?** | At 122 products, probably not — but the answer must precede the product listing design. |
| 5 | **What is the canonical/redirect policy when a product is recategorised?** | Only matters under nested URLs; must be decided with #1. |
| 6 | **Does `updated_at` drive sitemap `lastModified` once the DB provides it?** | Recommended, but it is a real commitment to accurate timestamps. |

**FACT** — `robots.ts:31` also disallows `/*?product=`, which becomes redundant
once product pages exist and enquiry context comes from the product URL.

---

## 12. Search architectural implications

### 12.1 What exists today

**FACT** — `SearchOverlay` (`src/components/search/SearchOverlay.tsx`) is a
complete UI shell: trigger, modal, focus management via `useDialog`, labelled
input, results region with a live-region announcement, and a browse fallback.

**FACT** — it performs **no filtering**. The `query` state
(`SearchOverlay.tsx:32`) is read only to decide which of two help strings to
show (`:146-147`). It is passed to `SearchResults` (`:120`), which renders the
browse groups regardless of its value.

**FACT** — the file documents this as deliberate (`SearchOverlay.tsx:13-18`): a
fake result list would set a false expectation of coverage and would have to be
thrown away.

### 12.2 Its current data requirement

**FACT** — it imports the entire catalogue (§4.2) and uses **`name` and `slug`
of 4 top-level categories and 6 applications** — about 400 bytes of the ~23 KB
it pulls in. It does not touch products at all.

**OBSERVATION** — search is therefore the **cheapest of the three client-bundle
paths to fix**, because its actual data requirement is trivially small and
entirely static.

### 12.3 What the future architecture will require

**OBSERVATION** — recorded, not designed:

- **Search belongs in PostgreSQL, not the browser.** Shipping 122 products to
  the client to filter them is the shape the current architecture accidentally
  has; it should not become the deliberate design. It also cannot answer
  cross-cutting queries the tree cannot express (§6, Function).
- **The endpoint must respect the publication gate.** An unpublished or
  incomplete product must not surface in results even though it exists in the
  database — otherwise search becomes a bypass around thin-content protection.
- **Search metadata does not exist today** (§6). Synonyms matter here more than
  most catalogues: a formulator may search an INCI name, a trade name, a CAS
  number or a common name for the same material — and only trade names exist
  in the data today.
- **This is the one justified client-side fetch** (§10.8).
- **The browse fallback should survive.** It is genuinely useful and works
  without JavaScript-side data once the lists are passed as props.
- **A `/search` results page** is needed for shareable, linkable queries — with
  `noindex`, since search result pages are the textbook duplicate-content trap.

---

## 13. Performance implications

### 13.1 Current profile

**OBSERVATION** — this is a small, statically generated, image-free site with 4
runtime dependencies. Its performance profile is strong by construction, and
nothing found in this exploration is a user-visible performance problem today.

| Dimension | State |
|---|---|
| Rendering | Static-first; 38 pages generated at build |
| Runtime deps | 4 — `next`, `react`, `react-dom`, `server-only` |
| Images | **Zero real images.** Every slot renders a placeholder |
| Fonts | Two families via `next/font/google` — self-hosted, no external request |
| Motion | CSS-only, one shared `IntersectionObserver` (`Reveal`) — no animation library |
| Client JS | Header, MobileNavigation, MegaMenu, SearchOverlay, Reveal, error boundary |

### 13.2 The one measurable issue

**FACT** — ~23 KB of code-only catalogue data in the client bundle for ~1.5 KB
of rendered navigation (§4.3), on every route, whether or not the menu is opened.

**OBSERVATION** — in isolation this is a modest cost, and on a fast connection it
is imperceptible. It matters for three reasons that are not about kilobytes:

1. It is paid on **every page**, including the ones a crawler weighs.
2. It is **parse and execute** cost, not just transfer — the object graph is
   reconstructed in the browser on every load.
3. It is a **correctness blocker** for Phase 2 (§4.4), which is the real reason
   to fix it.

### 13.3 Highest-value architectural improvements

Ranked by value, **recorded not performed**:

| # | Improvement | Value | Risk |
|---|---|---|---|
| 1 | Pass `{name, slug, href}` lists into `SearchOverlay`, `Header`, `MobileNavigation` as props from a server parent | Removes the catalogue from client JS **and unblocks the migration** | Low — `MegaMenu` already demonstrates the pattern |
| 2 | Move `not-found.tsx` and `contact/page.tsx` onto the seam (needs a new `fetchProduct(slug)`) | Completes the boundary for server callers | Low — both are Server Components |
| 3 | Make counts a projection rather than a materialised list (§7.1) | Free now; prevents N round-trips per page in Phase 2 | Low |
| 4 | Cloudinary activation before real photography arrives | Images are currently zero — this is the largest *future* payload | Low; already wired |
| 5 | Relocate `isPublishable`/`flattenCategories` to `src/lib/` | Removes 4 confusing `@/data` imports | Cosmetic |

**OBSERVATION** — items 1 and 2 are the same two changes
`docs/data-layer-boundary.md` recommends as the opening work of Phase 2. This
exploration independently confirms them from the bundling and migration angles.

---

## 14. Engineering decisions available to us

Decidable without Cerium. Listed for decision, **not decided or implemented here**.

| # | Decision | Recommendation | Blocked by |
|---|---|---|---|
| 1 | Correct the overstated rule wording in `lib/content.ts:6` | Narrow to "catalogue records" per `docs/data-layer-boundary.md` | Nothing |
| 2 | Remove the catalogue from the client bundle | Props from a server parent | Nothing |
| 3 | Add `fetchProduct(slug)` to the seam | Needed by `contact/page.tsx` today and any product page later | Nothing |
| 4 | Whether `company.ts`, `media.ts`, `navigation.ts` get seam accessors | Decide explicitly — 14 of 26 direct imports depend on it | Nothing |
| 5 | Collapse Category↔Application into one relationship | One join, read both ways | Nothing structural |
| 6 | Make `source` required rather than optional | Cheapest integrity win available | Nothing |
| 7 | Nested vs flat category serialisation from the API | Either; the seam absorbs it | Nothing |
| 8 | Caching strategy — static / ISR / on-demand | Needs Cerium's edit frequency, which is a *question*, not a decision | §15.7 |
| 9 | Whether the Studio is retired at migration or runs alongside during it | Retire; Django admin supersedes | Nothing |
| 10 | Remove or repair the dead `relatedFamily` branch (§8.6) | Either; it is inert | Nothing |
| 11 | Whether `import "server-only"` guards the future API client | Recommended — turns convention into a build error | Nothing |

**OBSERVATION** — items 1, 2, 3 and 6 are independent of every open business
decision and de-risk everything downstream. They are the natural first
implementation work of Phase 2.

---

## 15. Decisions requiring Cerium

Sourced from `docs/pending-cerium-decisions.md` and confirmed against the
repository. **Nothing here was guessed or resolved.**

### 15.1 Food Ingredients — BUSINESS DECISION REQUIRED

**FACT** — two current supplied sources disagree. `src/config/site.ts:25`
describes Cerium as serving "personal care and home care industries" (2026
catalogue). `taxonomy.ts:686` carries a `Food Ingredients` family with six
sub-ranges, sourced `website-ceriumchemicals.co.ke`. Both carry accurate
`source` markers; the divergence is commented at `site.ts:19-22` and
`applications.ts:127-133`.

**FACT** — no product names are published for that range anywhere in the
supplied material, so all six sub-ranges have zero products and
`isPublishable()` gives them no pages. The range is nonetheless in the
navigation and the sitemap.

**Blocks:** final taxonomy and therefore the Phase 2 schema; the company
description used in metadata and `Organization` JSON-LD; whether
`/products/food-ingredients` is indexable; whether Food becomes a third
Industry.

### 15.2 Product classification

**FACT** — four sub-ranges are named by application or market rather than
material: `skin-care-actives`, `hair-care-actives`, `personal-care-fragrances`,
`fabric-care-fragrances`. **OBSERVATION** — this faithfully mirrors the printed
catalogue, so whether to keep Cerium's own naming is Cerium's call, not a
modelling decision. Related: whether Personal Care / Home Care should become
browsable product *collections* (`taxonomy.ts:70-74`).

### 15.3 Commercial / pricing visibility

**FACT** — quarterly B2B prices exist in the supplied Q3 2026 price lists and
are deliberately not modelled (`taxonomy.ts:22-25`). **Blocks:** whether
`Product` JSON-LD can ever replace `ItemList` (`lib/seo.ts:122-126`); product
page content; whether MOQs and pack sizes are publishable.

### 15.4 Product technical information

**FACT** — no CAS numbers, INCI names, specifications, certifications or origins
exist anywhere, and none has been inferred (`taxonomy.ts:16-21`). **Blocks:**
product pages, the Function facet, search quality, `/resources`.

### 15.5 Source authority

**Needs Cerium's confirmation:** which document wins when the catalogue and the
live site disagree (this is the Food conflict in general form); whether staff
statements can become an authoritative source; and whether AI-drafted
non-technical copy is acceptable at all. **FACT** — the current model cannot
express any of this (§9.6).

### 15.6 Missing catalogue pages

**FACT** — catalogue pages 12–13 are missing from the supplied PDF and some
glare-obscured entries were omitted rather than guessed (`taxonomy.ts:24-28`).
Clean copies are needed before the catalogue can be completed without inference.

### 15.7 Additional questions this exploration raises

| Question | Why it is Cerium's | Blocks |
|---|---|---|
| **How often will the catalogue actually be edited?** | Only Cerium knows their publishing rhythm | The caching strategy (§10.6) — static vs ISR vs on-demand |
| **May the site state which principal supplies which product?** | Commercially sensitive | Product↔partner linking; there is no such link in the data today |
| **Will technical documents be public or on request?** | Depends on principal agreements | Whether `/resources` exists |
| Social profile URLs | `site.ts:66-68` — three are `undefined` | `sameAs` in `Organization` JSON-LD |
| Photography | No production imagery supplied | Every image slot |

---

## 16. Risks

| # | Risk | Severity | Evidence | Mitigation (recorded) |
|---|---|---|---|---|
| 1 | **Client-component catalogue imports break outright at migration** | **High** | §4.4; `Header.tsx:10`, `MobileNavigation.tsx:6`, `SearchOverlay.tsx:6-7` | Fix before the API exists, while verifiable against static data |
| 2 | **Studio writes false provenance** | **High** | `api/studio/catalogue/route.ts:104,146` | No bad data has shipped yet (overrides file is empty); fix or retire before first use |
| 3 | **Category↔Application drift is already user-visible** | Medium-high | §8.3 — 20/46 disagreement | One join table; reconcile explicitly during migration |
| 4 | **Application→product relationships are approximations presented as fact** | Medium-high | §8.4 — Onion and Rosemary Extract on `/applications/skin-care` | Import as `inherited`, never `stated`; verify from documents |
| 5 | **`source` is optional, so provenance can silently regress** | Medium | §9.2 | Make required in the schema |
| 6 | **68 of 122 products would produce thin pages if published unconditionally** | Medium | §8.2 | Extend the `isPublishable` principle to products |
| 7 | **Build becomes coupled to API availability** | Medium | §10.6 — `generateStaticParams` becomes a network call | Cached fallback or build-time snapshot |
| 8 | **No tests anywhere** | Medium | `CLAUDE.md` — lint + typecheck only | Every migration change is verified by inspection alone; the relationship reconciliation is the riskiest such change |
| 9 | **Local Node 18.19.1 cannot build** | Low-medium | `CLAUDE.md`; pinned via `engines`, `.nvmrc`, `engine-strict` | Build via `docker compose build web`; bundle claims here are static estimates, not measurements |
| 10 | **Company content has no machine-readable provenance** | Low-medium | §9.3 | Extend `Sourced` to `CoreValue`, `Partner` and the standalone exports |
| 11 | **Stale premise in a live code path** | Low | §8.6 — `industries/[industry]/page.tsx:60` | Inert today; remove or repair |
| 12 | Naming/spelling inconsistencies surface in the UI | Low | §8.5 | Content decision — both variants are verbatim from their sources |

---

## 17. Recommended Phase 2 sequence

Ordered so that each step de-risks the next, and so that nothing blocked by a
business decision sits on the critical path.

### Stage 0 — Ask Cerium (parallel, starts now)

Put §15.1 (Food), §15.7 (principal attribution, document access, edit
frequency) to Cerium. None of Stage 1 waits on the answers; the schema work in
Stage 2 does.

### Stage 1 — Frontend de-risking (no backend, no business decisions)

1. Correct the seam rule wording in `lib/content.ts:6`.
2. **Cut the catalogue out of the client bundle** — props from a server parent
   for `SearchOverlay`, `Header`, `MobileNavigation`. *The highest-value change
   in the entire migration, and the only one that is a correctness blocker.*
3. Add `fetchProduct(slug)`; move `not-found.tsx` and `contact/page.tsx` onto
   the seam.
4. Decide the non-catalogue question (§14.4) and write the answer down.

**Verification available:** `npm run typecheck`, `npm run lint`,
`docker compose build web`. **FACT** — there are no tests, so a visual check of
the menu, mobile drawer and search overlay is the only behavioural verification
that exists.

### Stage 2 — Schema and contract (specification, then implementation elsewhere)

5. Settle the product URL policy and the publication threshold (§11.3).
6. Reconcile Category↔Application into one relationship, and decide how the 20
   one-sided pairs are resolved.
7. Finalise the Django schema — in the **separate service**, not this repo.

### Stage 3 — API integration

8. Implement `lib/content.ts` against `apiConfig.baseUrl`, keeping local data as
   the fallback. **No component should change in this step** — if one does, the
   seam was not doing its job and that is the signal to stop and reassess.
9. Decide and implement the caching strategy (needs the Stage 0 answer on edit
   frequency).
10. Migrate `catalogue.overrides.json` into the database; retire the Studio.

### Stage 4 — What the migration unlocks

11. Product pages (gated on the Stage 2 threshold decision).
12. Real search against PostgreSQL.
13. Real product↔application relationships replacing the derivation.
14. Sitemap `lastModified` from real `updated_at`.

---

## Appendix — verification

**FACT** — this exploration was read-only. No formatters, no automatic fixes, no
dependency or generated-file commands were run. The only writes were this
document and temporary analysis scripts in the session scratchpad, outside the
repository.

- No application code modified.
- No product data or taxonomy modified.
- No routes, navigation, UI or SEO changed.
- No Django, PostgreSQL, models or API routes created.
- No dependencies installed.
- Business decisions documented, **not resolved**.
