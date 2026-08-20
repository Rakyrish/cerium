# Phase 2.1A — Catalogue / Data Boundary Exploration

**Type:** exploration, plus the Stage 1b remediation it recommended.
The exploration itself was read-only; Stage 1b (§17) was subsequently
implemented and is marked inline throughout.
**Repository state audited:** working tree at commit `687827b`, 20 Aug 2026.
**Method:** direct inspection of `src/data/`, `src/lib/`, `src/types/`,
`src/config/`, `src/app/`, `src/components/`, plus static analysis of the
import graph and execution of the actual data modules to count records and
relationships.

> ### Revision note — §4 and §5 were rewritten
>
> This document was **first written against commit `9feb8b6`**. Commit
> `687827b` then landed the boundary work recommended in
> `docs/data-layer-boundary.md`, which **resolved the central finding of the
> original §4**: the catalogue no longer reaches the client bundle.
>
> §4 and §5 have been rewritten against the current tree. §2's diagram, §13.2,
> §13.3, §14 and §17 have been corrected to match. Sections 3, 6–12, 15 and 16
> were re-verified against `687827b` and stand as written, with the relationship
> figures in §7.2/§8.3 refined (the two copies are in a **containment**
> relationship, not a mutual contradiction — see §8.3).
>
> **Line references throughout now point at `687827b`.** They differ from the
> original text because `lib/content.ts` and `navigation.ts` were substantially
> rewritten by that commit.
>
> ### Second revision — Stage 1b implemented
>
> The four Stage 1b items this document recommended (§17) have since been
> **implemented and verified**: `server-only` guards on the catalogue modules,
> the Studio's hardcoded `source` replaced by a required operator choice, the
> `applications` → `formats` rename, and the removal of `Category.description`.
>
> Affected sections are marked with a status line rather than rewritten, so the
> finding and the reasoning behind the fix stay together. See §5.4, §8.5, §9.4
> and §17 Stage 1b. **Line numbers cited in those sections describe the state at
> audit and no longer resolve.**

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

**The single migration blocker identified in the original edition of this
document has since been fixed.** Commit `687827b` removed the catalogue from the
client bundle and completed the seam. That changes the shape of the remaining
work substantially: what is left is **data and schema debt, not code-structure
debt**.

### What is now resolved (verified at `687827b`)

1. **The catalogue no longer reaches client JavaScript.** No client component
   imports any catalogue module. `navigation.ts` was converted from module-scope
   derived constants into pure builders, and `Header` / `MobileNavigation` /
   `SearchOverlay` now receive finished link structures as props from a server
   parent. Verified: **0 of 13 `"use client"` modules import catalogue data**
   (§4.1).
2. **The seam is complete for every path a component uses.** 18 `fetch*`
   functions, up from 13; `fetchProduct(slug)`, `fetchApplicationFormats()` and
   three navigation accessors were added. **Catalogue reads that bypass the seam:
   0, down from 3** (§5).

### What remains open

3. **The Category↔Application relationship is stored twice, in opposite
   directions, and the two copies do not match on 20 of 46 pairs.** Refined from
   the original finding: this is **containment, not contradiction** — every pair
   the application side declares is also declared by the category side
   (26 ⊂ 46), so the category side is simply broader. That makes it a
   *curation* question rather than a data corruption, but it still means the two
   directions answer the same question differently (§8.3).
4. **There is no Product→Application relationship at all.** It is derived
   category-wide, so Skin Care resolves to **48% of the entire catalogue**
   (59 of 122 products) and Hair Care to 38% (§8.4).
5. **Provenance is 100% in practice but 0% enforced.** `source` is optional on
   all four catalogue types, and the Content Studio writes a hardcoded
   `source: "website-ceriumchemicals.co.ke"` on everything it creates regardless
   of origin (`api/studio/catalogue/route.ts:104,146`) (§9).
6. **The bundle fix is unenforced.** Nothing marks `lib/content.ts` or the
   `src/data/*` catalogue modules `import "server-only"`, so a single future
   `"use client"` silently restores the problem that was just fixed. This is the
   one **new** finding of this revision (§5.4).
7. **`/products/food-ingredients` is a thin page that `isPublishable()` lets
   through** — 0 products, and all 6 of its sub-ranges are themselves
   unpublishable, so it renders six non-clickable cards (§11.2).
8. **One code path is dead.** `industries/[industry]/page.tsx:60` looks up a
   product family by industry slug; no industry slug is a category slug, so the
   branch has never fired (§8.6).

Items 3–5 and 7 are content and schema concerns that belong to the Django
schema work, not to the frontend. Item 6 is a ten-line change available
immediately (§17, Stage 1).

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
                        │  navigation.ts    7 KB  PURE BUILDERS — imports
                        │                         types only, no data
                        └──────────────┬───────────────────────┘
                                       │
                 ┌─────────────────────┼──────────────────────┐
                 │                     │                      │
        ┌────────▼────────┐   ┌────────▼────────┐   ┌─────────▼─────────┐
        │ src/lib/        │   │ DIRECT IMPORTS  │   │ src/config/site.ts│
        │ content.ts      │   │ predicates (4)  │   │ env + contact     │
        │ 18 async fetch* │   │ company/media(9)│   └─────────┬─────────┘
        │ ⚠ NOT           │   │ legalNav    (1) │             │
        │  server-only    │   │ Studio      (4) │             │
        └────────┬────────┘   └────────┬────────┘             │
                 │                     │                      │
    ┌────────────┴─────────────────────┴──────────────────────┴──────────┐
    │                        src/app/  — 9 public routes                 │
    │  SERVER COMPONENTS (default)          │  CLIENT COMPONENTS         │
    │  page.tsx, products/, applications/,  │  Header ────────┐          │
    │  industries/, about, contact,         │  MobileNavigation│ props   │
    │  sitemap.ts, robots.ts, Footer,       │  SearchOverlay   │ ONLY ✓  │
    │  layout.tsx ── resolves nav ──────────┼─→MegaMenu ───────┘          │
    │                                       │  (zero @/data imports)     │
    └───────────────────────────────────────┴────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │  Static HTML + RSC payload  │
                        │  + client JS chunk carrying │
                        │  ~12 labels and hrefs only  │
                        └─────────────────────────────┘
```

**The dashed boundary is enforced by convention, not by the compiler.** See
§5.4 — no catalogue module imports `server-only`, so nothing fails the build if
a future client component imports one.

**FACT** — there is no backend, no ORM, no database and no runtime data
fetching in this repository. `src/lib/api` is referenced in comments
(`src/types/content.ts:6`, `src/config/site.ts:96`) but **does not exist**;
`apiConfig` (`src/config/site.ts:100`) is exported and never consumed.

---

## 3. Current data flow

### 3.1 Where the data originates (brief §2 items 1–2)

| Data | Origin file | Notes |
|---|---|---|
| Products | `src/data/taxonomy.ts` | 122 records, built by the `p()` helper at `taxonomy.ts:50` |
| Category tree | `src/data/taxonomy.ts:754` (`reviewedCategories`) | 4 top-level families |
| Studio additions | `src/data/catalogue.overrides.json` | Currently `{categories: [], products: []}` — empty |
| Merged catalogue | `taxonomy.ts:765` — `applyOverrides(reviewedCategories)` | The exported `categories` const |
| Applications / Industries | `src/data/applications.ts:29` / `:154` | 6 and 2 records |
| End-product formats | `src/data/applications.ts:119` (`applicationFormats`) | 12 strings |
| Company content | `src/data/company.ts` | vision, mission, values, metrics, partners |
| Media slots | `src/data/media.ts:44` (`siteMedia`) | 3 slots, all `image: undefined` |
| Site/contact/env | `src/config/site.ts` | The only place `process.env` is read |
| Navigation | `src/data/navigation.ts` | **Derived**, not authored — see §3.3 |

**FACT** — the merge order at `src/data/overrides.ts:78` applies categories
before products, and skips any entry whose parent slug does not resolve
(`overrides.ts:113`, `:107`) rather than silently re-parenting it.

### 3.2 How the entities relate (brief §2 items 3–5)

| Relationship | Mechanism | Location |
|---|---|---|
| Product → Category | **Structural containment.** A product literally lives inside `Category.products[]`. There is no foreign key. | `taxonomy.ts` throughout |
| Product → Category (label) | Injected at read time by `getProductsInCategory()` — sets `categorySlug`/`categoryName` from the containing node | `taxonomy.ts:794` |
| Category → Category | `Category.children[]` — array nesting, no parent pointer | `types/content.ts:103` |
| Category → Application | `Category.applicationSlugs[]` — 46 pairs | `types/content.ts:105` |
| Application → Category | `Application.categorySlugs[]` — 26 pairs, **a second copy of the same relationship** | `types/content.ts:162` |
| Application → Industry | `Application.groupSlug` — single parent | `types/content.ts:160` |
| Industry → Application | `Industry.applicationSlugs[]` — **a second copy again** | `types/content.ts:172` |

**OBSERVATION** — every relationship in the model is expressed as an array of
slug strings resolved by `Array.find`/`Set.has` at read time. There are no
identifiers, no referential integrity, and three of the relationships are stored
redundantly in both directions. That is entirely reasonable for a hand-authored
TypeScript catalogue; it is precisely the set of things a relational database
would take over.

### 3.3 How navigation obtains its data (brief §2 item 6)

**FACT** — `src/data/navigation.ts` is derived, not authored, and since `687827b`
it derives from **arguments rather than imports**. `productColumns()`
(`navigation.ts:45`) and `applicationColumns()` (`navigation.ts:56`) are private
functions taking `Category[]` / `Application[]` / `Industry[]` as parameters. The
module's only import is `import type { … } from "@/types/content"`
(`navigation.ts:27`) — **it imports no data module at all**, so importing it
evaluates nothing.

**FACT** — the three exported builders are `buildPrimaryNavigation`
(`navigation.ts:72`), `buildFooterNavigation` (`:153`) and `buildBrowseLists`
(`:210`). They are invoked from the seam — `fetchPrimaryNavigation`
(`lib/content.ts:228`), `fetchFooterNavigation` (`:222`), `fetchBrowseLists`
(`:231`) — which resolve the catalogue and pass it in.

**FACT** — the call sites are server components: `layout.tsx:83` resolves
`fetchPrimaryNavigation()` and `fetchBrowseLists()` in parallel and passes both
into `<Header navigation={…} browse={…} />` (`layout.tsx:105`); `Footer.tsx:5`
resolves `fetchFooterNavigation()` for itself.

**FACT** — `buildFooterNavigation` is a separate structure, not a subset of
`buildPrimaryNavigation`, and it hardcodes three `upcoming: true` destinations
(`navigation.ts:194-196` — `/resources` ×2, `/insights`), with two more in
`legalNavigation` (`:227` — `/privacy`, `/terms`). `legalNavigation` is the one
export of this module that is still a plain const, and it is correct as one: it
carries no catalogue data.

### 3.4 How search obtains its data (brief §2 item 7)

**FACT** — `SearchOverlay` imports **no data module**. Its only content input is
the `browse: BrowseLists` prop (`SearchOverlay.tsx:29-36`), forwarded from
`Header`, which received it from `layout.tsx`. `BrowseLists`
(`types/content.ts:230`) is two arrays of `NavLink` — label and href only, no
records.

**FACT** — it performs **no filtering** and queries nothing. `query` is local
state that is never applied to any dataset — see §12.

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
(`lib/content.ts:110`) filters by `isPublishable`, which withholds a page from
any category with neither products nor children (`taxonomy.ts:780`). The six
Food Ingredients sub-ranges are the categories this excludes.

### 3.8 Data duplicated or transformed between layers (brief §2 item 15)

| Duplication | Where | Consequence |
|---|---|---|
| Category↔Application, stored in both directions | `taxonomy.ts` + `applications.ts` | **26 of 46 pairs agree; 20 are category-side only** — §8.3 |
| Industry↔Application, stored in both directions | `types/content.ts:160` + `types/content.ts:172` | Consistent today; same structural risk |
| Category label copied onto every product at read time | `getProductsInCategory()`, `taxonomy.ts:779` | Transform, not duplication — harmless |
| Navigation derived from the catalogue, per request | `navigation.ts:72-224`, invoked from `lib/content.ts:228-252` | Derivation is correct and now happens **on the server only** — resolved, see §4 |
| ~~The catalogue itself, in both server render and client JS~~ | ~~§4~~ | **RESOLVED at `687827b`** — the client now receives ~12 labels and hrefs |

---

## 4. Client bundle / data-flow problem

> **Status: RESOLVED at commit `687827b`.** The original edition of this section
> documented the catalogue reaching client JavaScript along two independent
> paths. Both paths are gone. This section now records the verified current
> state and preserves the reasoning, because the *pattern* is what must be
> defended through Phase 2 — and §5.4 shows it currently is not.

### 4.1 The client boundary, precisely

**FACT** — exactly 13 modules declare `"use client"`. **None imports catalogue
data.**

| Module | Imports catalogue data? | How it gets content |
|---|---|---|
| `src/components/layout/Header.tsx` | **No** | Props: `navigation: NavItem[]`, `browse: BrowseLists` (`:26-30`) |
| `src/components/layout/MobileNavigation.tsx` | **No** | Props, forwarded from `Header` |
| `src/components/search/SearchOverlay.tsx` | **No** | Prop: `browse: BrowseLists` (`:29-36`) |
| `src/components/layout/MegaMenu.tsx` | **No** | Prop: `item: NavItem` |
| `src/components/motion/Reveal.tsx` | No | — |
| `src/app/error.tsx` | No | — |
| `src/hooks/useDialog.ts` | No | — |
| `src/components/studio/*` (6 files) | No | `OverridesList.tsx:5` is `import type`, erased at compile time |

**FACT** — a grep for `from "@/data/` across `src/app` and `src/components`
returns 18 hits, and **not one of them is in a client component** except the
type-only Studio import above. The remaining 18 break down as: pure predicates
(`isPublishable`, `flattenCategories`) ×4, `company.ts` ×5, `media.ts` ×3,
`legalNavigation` ×1, dev-only Studio ×4, plus `catalogueIntro` ×2 from
`company.ts`.

### 4.2 How the two paths were closed

```
BEFORE (9feb8b6)                     AFTER (687827b)
────────────────                     ───────────────
Header ("use client")                layout.tsx (SERVER, async)
  └→ @/data/navigation                 ├→ fetchPrimaryNavigation() ─┐
       └→ @/data/taxonomy   (122)      └→ fetchBrowseLists()  ──────┤
       └→ @/data/applications                                       │
                                       lib/content.ts (SERVER) ◄────┘
SearchOverlay ("use client")             └→ resolves catalogue
  └→ @/data/taxonomy      (122)          └→ navigation.ts builders
  └→ @/data/applications                      (pure, types only)
                                                    │
  ⇒ whole catalogue in client JS                    ▼ props
                                       Header ("use client")
                                         ├→ MobileNavigation
                                         ├→ SearchOverlay
                                         └→ MegaMenu
                                       ⇒ ~12 labels + hrefs
```

**FACT** — the mechanism was to make `navigation.ts` take the catalogue as an
**argument** instead of importing it (`navigation.ts:8-21` records the
rationale), and to resolve it on the server in `layout.tsx:83-86`. `Footer` is a
server component and resolves `fetchFooterNavigation()` itself (`Footer.tsx:5`).

**OBSERVATION** — the fix generalised the pattern `MegaMenu` already used, which
is what the original edition of this section predicted would happen. What now
crosses the client boundary is exactly `NavItem[]` and `BrowseLists`, both
declared in `types/content.ts:230-248` and both containing only labels, hrefs and
short descriptions.

### 4.3 What the boundary now costs

**FACT** — `docs/data-layer-boundary.md` records verification by production
build (`docker compose build web`, node:22-alpine) followed by probing the
emitted client chunks:

| Probe | Result |
|---|---|
| Catalogue product names in client JS | **0 of 12 hit** |
| Benefit copy in client JS | **0 of 4 hit** |
| Fragrance/olfactive data in client JS | **0 of 3 hit** |
| Static pages generated | 47 |
| Sitemap URL count | 38 — unchanged |

**FACT** — this exploration independently confirms the sitemap figure by
executing the data modules: 6 static + 24 publishable categories + 6
applications + 2 industries = **38**.

**OBSERVATION** — the ~23 KB of code-only catalogue data measured in the original
edition (`taxonomy.ts` 19,987 + `applications.ts` 3,143 code-only bytes) no
longer reaches the browser. The navigation payload is now proportional to the
number of *links*, not the number of *products* — which is the property that
matters, because the catalogue grows and the menu does not.

### 4.4 Why this was a Phase 2 correctness problem, not a payload preference

Retained because it is the reason the change was worth making, and the reason
the pattern must hold.

**OBSERVATION** — an API-backed catalogue cannot be a synchronous module-scope
import inside a client component. `import { categories } from "@/data/taxonomy"`
has no asynchronous equivalent a client component can evaluate at module scope.
When `lib/content.ts` gains a `fetch()`, such call sites break outright — they do
not merely get slower. Those three call sites no longer exist, so **the Phase 2
API swap is no longer blocked by the client boundary.**

**The residual risk is regression, not the original defect** — see §5.4.

---

## 5. `src/lib/content.ts` boundary analysis

### 5.1 Verdict: a **true abstraction for catalogue records, enforced only by convention**

This is an upgrade from the original edition's verdict of "partial abstraction".
All three reasons given there have been addressed:

| Original objection | State at `687827b` |
|---|---|
| Bypassed for catalogue records by 3 non-Studio files | **0 bypasses.** `not-found.tsx:6` and `contact/page.tsx:8` now read through the seam |
| Incomplete — no product-by-slug, no navigation accessors | **`fetchProduct(slug)` (`:123`), `fetchApplicationFormats()` (`:151`), `fetchPrimaryNavigation` (`:213`), `fetchFooterNavigation` (`:222`), `fetchBrowseLists` (`:231`) all added.** 13 → 18 functions |
| The stated rule overstated itself | **Rewritten** (`lib/content.ts:5-46`) to the catalogue-records scope, with the three exemptions named explicitly |

**But the abstraction has no teeth** — see §5.4. Every property above is
maintained by review, not by the type system or the build. That is the single
structural weakness remaining in the boundary, and it is new information
relative to the original edition, which had a larger problem in front of it.

### 5.2 What the seam does provide

**FACT** — 18 exported functions, all `async`, all currently resolving against
local data (`lib/content.ts:96-252`):

| Group | Functions |
|---|---|
| Categories | `fetchCategories` `:81`, `fetchCategory` `:85`, `fetchAllCategorySlugs` `:95`, `fetchProductsInCategory` `:99`, `fetchProductCount` `:105`, `fetchTotalProductCount` `:110`, **`fetchProduct` `:123`** |
| Applications | `fetchApplications` `:133`, `fetchApplication` `types/content.ts:172`, **`fetchApplicationFormats` `:151`**, `fetchProductsForApplication` `:162`, `fetchCategoriesForApplication` `:172` |
| Industries | `fetchIndustries` `:183`, `fetchIndustry` `:187`, `fetchApplicationsForIndustry` `:191` |
| Navigation (derived) | **`fetchPrimaryNavigation` `:213`, `fetchFooterNavigation` `:222`, `fetchBrowseLists` `:231`** |

Bold entries were added by `687827b`.

**OBSERVATION** — the `async` signatures are the seam's real value. They mean
adding an HTTP call behind any function changes no caller signature and makes no
component newly suspending. That decision was correct and should be preserved.

**OBSERVATION** — the navigation group is the architecturally interesting
addition. Navigation is not itself a catalogue record, but it is *derived from*
records, so it could not have remained a synchronous module-scope constant once
the catalogue becomes API-backed. Putting it behind the seam is what allows
`layout.tsx` to stay the only place that knows navigation is data at all.

### 5.3 Every important caller, categorised

#### A. Server-side callers (through the seam) — compliant

| File | Functions used |
|---|---|
| `src/app/page.tsx:41-57` | `fetchCategories`, `fetchApplications`, `fetchIndustries`, `fetchProductCount`, `fetchApplicationsForIndustry` |
| `src/app/products/page.tsx:26-38` | `fetchCategories`, `fetchTotalProductCount`, `fetchProductCount` |
| `src/app/products/[category]/page.tsx:39-75` | `fetchCategory`, `fetchProductCount`, `fetchProductsInCategory`, `fetchApplications` |
| `src/app/applications/page.tsx:9` | `fetchApplications`, `fetchApplicationFormats` |
| `src/app/applications/[application]/page.tsx:30-58` | `fetchApplication`, `fetchProductsForApplication`, `fetchCategoriesForApplication` |
| `src/app/industries/page.tsx:19-23` | `fetchIndustries`, `fetchApplicationsForIndustry` |
| `src/app/industries/[industry]/page.tsx:30-60` | `fetchIndustry`, `fetchApplicationsForIndustry`, `fetchCategory` |
| `src/app/layout.tsx:83-86` | `fetchPrimaryNavigation`, `fetchBrowseLists` — **new** |
| `src/components/layout/Footer.tsx:5` | `fetchFooterNavigation` — **new** |
| `src/app/not-found.tsx:6` | `fetchCategories` — **was a bypass, now compliant** |
| `src/app/contact/page.tsx:8` | `fetchProduct` — **was a bypass, now compliant** |

**FACT** — 12 files import from `@/lib/content`. **All 12 are server modules.**

**Migration impact:** lowest risk in the codebase. These are Server Components
already awaiting async functions. When `lib/content.ts` gains `fetch()`, **none
of these files changes.** This is the seam working exactly as designed.

#### B. Client-side callers — **none, in either direction**

**FACT** — no client component imports `@/lib/content`, and no client component
imports a catalogue data module. The three that previously did now take props:

| File | Prop received | Resolved by |
|---|---|---|
| `src/components/layout/Header.tsx:26-30` | `navigation: NavItem[]`, `browse: BrowseLists` | `layout.tsx:83-86` |
| `src/components/layout/MobileNavigation.tsx` | forwarded from `Header` | — |
| `src/components/search/SearchOverlay.tsx:29-36` | `browse: BrowseLists` | forwarded from `Header` |

**OBSERVATION** — the seam still has no client story, and it should not acquire
one. A client component cannot `await` a module-scope import, so the only correct
shapes are (a) props from a server parent, which is what all navigation now uses,
or (b) an explicit runtime fetch to an endpoint, which is what search will need
in Phase 4 and nothing else currently justifies (§10.8).

**Migration impact: none.** This category was the migration blocker in the
original edition and is now empty.

#### C. Build-time / static-generation callers

| File | Path | Compliance |
|---|---|---|
| `src/app/sitemap.ts:37-41` | `fetchCategories/Applications/Industries` + direct `flattenCategories`, `isPublishable` (`:8`) | Compliant under the refined rule |
| `src/app/products/[category]/page.tsx:33` | `fetchAllCategorySlugs()` in `generateStaticParams` | Compliant |
| `src/app/applications/[application]/page.tsx:24` | `fetchApplications()` | Compliant |
| `src/app/industries/[industry]/page.tsx:23-26` | `fetchIndustries()` | Compliant |
| `src/app/not-found.tsx:6` | `fetchCategories()` | Compliant — **was a bypass** |
| `src/app/contact/page.tsx:8` | `fetchProduct(slug)` | Compliant — **was a bypass** |

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

#### E. Non-catalogue direct imports — **decided, no longer an open question**

**FACT** — the ambiguity flagged as item 5 in `docs/data-layer-boundary.md` has
been resolved, and the answer is recorded in the header comment of
`lib/content.ts:35-46`:

| Module | Decision | Remaining direct call sites |
|---|---|---|
| `navigation.ts` | **Moved behind the seam** — it is derived from catalogue records, so it could not survive an API-backed catalogue as a module-scope constant | 1 (`legalNavigation`, static, carries no catalogue data) |
| `company.ts` | **Stays a directly-imported build-time module**, deliberately gets no accessors | 5 |
| `media.ts` | Same | 3 |
| `applicationFormats` | **Moved behind the seam** (`fetchApplicationFormats`) — it is catalogue content by the same definition | 0 |

**OBSERVATION** — the reasoning given for `company.ts` and `media.ts` is that
they are small, editorial, and change at the pace of the brand rather than the
catalogue. That is sound, and it is worth noting that it is stated as a
*decision with a trigger* ("if company content later becomes API-backed it gains
accessors then — as a decision, not as drift") rather than as a permanent rule.

#### F. Pure predicates — allowed by the rule

**FACT** — 4 direct imports of `isPublishable` / `flattenCategories` remain:
`sitemap.ts:8`, `products/[category]/page.tsx:19`, `cards/CategoryCard.tsx:5`,
`studio/page.tsx:6`. These are logic, not a data source, and are explicitly
exempted (`lib/content.ts:30-31`).

**OBSERVATION** — `docs/data-layer-boundary.md` item 4 proposed relocating them
to `src/lib/` and deliberately skipped it as cosmetic. That assessment holds.
The one non-cosmetic argument for moving them: `isPublishable` encodes a
**publication policy** (§11.2), and policy living in a data module is where it is
least likely to be found when the SEO phase needs to change it.

### 5.4 The boundary was unenforced — **fixed in Stage 1b**

> **Status: RESOLVED.** `import "server-only"` was added to `lib/content.ts`,
> `taxonomy.ts`, `applications.ts` and `overrides.ts`. The finding and its
> verification are retained below because the *limitation* in "What the guard
> does and does not catch" still applies.

**FACT (at audit)** — `grep -rn 'server-only' src/` returned exactly two hits:
`src/lib/studio-guard.ts:1` and `src/lib/studio-images.ts:1`.

**FACT (at audit)** — `src/lib/content.ts`, `src/data/taxonomy.ts`,
`src/data/applications.ts` and `src/data/overrides.ts` **did not import
`server-only`**, even though `server-only` is one of the project's four runtime
dependencies and was already used elsewhere for exactly this purpose.

**OBSERVATION** — everything §4 verifies is therefore true by review and by
nothing else. A single future `"use client"` on a component that imports
`@/data/taxonomy` silently restores the entire original defect: 122 product
records back in the browser, with no type error, no lint error, and no build
failure. The regression would be invisible until someone re-ran the chunk probes
described in `docs/data-layer-boundary.md`.

**OBSERVATION** — this was the cheapest structural improvement identified
anywhere in this document.

#### Verification that the guard has teeth

The guard was not assumed to work — it was **proved**, by deliberately
reintroducing the original defect and confirming the build rejects it.

**FACT** — adding `import { categories } from "@/data/taxonomy"` to
`Header.tsx` (a client component in the render graph) fails
`npm run build` with:

```
Error: You're importing a module that depends on "server-only".
  Client Component Browser:
    ./src/data/overrides.ts  →  ./src/data/taxonomy.ts  →  ./src/components/layout/Header.tsx
```

The error names the full import chain, so a future regression reports *where*
it entered, not merely that it exists. The probe was reverted; the build then
returned to 47 static pages.

**FACT** — the Studio's type-only import (`OverridesList.tsx:5`,
`import type { CatalogueOverrides }`) is erased at compile time and is
**unaffected**: the production build succeeds with all four guards in place.

#### What the guard does and does not catch — a real limitation

**FACT** — a client component that imports the catalogue but is **not reachable
from any page** does *not* fail the build. This was tested first, with an
orphaned probe component, and it compiled cleanly. The guard fires when the
module actually enters a client graph.

**OBSERVATION** — that is the correct boundary for this defect, because an
unreachable module ships nothing. But it means `server-only` is a
*bundle* guarantee, not a lint rule: it guarantees the catalogue cannot reach a
browser, and it does not guarantee nobody writes the import. Anyone reading
these guards should not over-read them into the second promise.

**FACT** — the guard also blocks Node scripts that import the data modules
outside a server runtime, which is how the figures in this document were
gathered. Such tooling must alias `server-only` to an empty module, as a server
runtime does. This is a cost of the change and is noted so it is not
rediscovered as a bug.

---

## 6. Current conceptual entities

Assessed against what is actually in the repository today. Field references are
to `src/types/content.ts`.

| Concept | Exists? | Where | Fields | Canonical? | First-class backend entity later? |
|---|---|---|---|---|---|
| **Product** | **Yes** | `ProductSummary`, `types/content.ts:122` | `slug`, `name`, `benefit?`, `categorySlug?`, `categoryName?`, `formats?`, `olfactive?`, `image?`, `source?` | Yes — 122 records | **Yes.** Needs a stable identity and a URL; has neither. |
| **Product family** | **Partly** | A depth-0 `Category` | Same type as any category | No — a position, not a type | **No.** Derive from depth. |
| **Category** | **Yes** | `Category`, `types/content.ts:86` | `slug`, `name`, `summary?`, `image?`, `children?`, `applicationSlugs?`, `products?`, `source?` | Yes — 30 nodes | **Yes**, with a real parent FK instead of array nesting. |
| **Subcategory** | **Partly** | A depth-1 `Category` | Same type | No | **No.** Same argument as family. |
| **Application** | **Yes** | `Application`, `types/content.ts:154` | `slug`, `name`, `description?`, `image?`, `groupSlug?`, `categorySlugs?`, `source?` | Yes — 6 records | **Yes.** |
| **Industry** | **Yes** | `Industry`, `types/content.ts:167` | `slug`, `name`, `description?`, `image?`, `applicationSlugs?`, `source?` | Yes — 2 records | **Yes**, though thin. |
| **Brand / Manufacturer** | **Partial — company-level only** | `Partner`, `types/content.ts:187`; 3 records in `company.ts:96` | `name`, `description`, `logo?` | Yes for the 3 partners | **Yes** — but **no product↔partner link exists anywhere in the data.** Creating one is a business decision. |
| **Product source (provenance)** | **Yes** | `SOURCE_DOCUMENTS`, `types/content.ts:26`; type derived at `:35`; `Sourced`, `:45` | 6 members | Yes | **Yes** — promote from enum to entity (§9.5). |
| **Product image** | **Type only** | `ImageRef`, `types/content.ts:62` | `cloudinaryId?`, `src?`, `alt?`, `width?`, `height?`, `focal?` | Type is canonical; **zero populated instances** | **Yes.** |
| **Document (TDS/SDS)** | **No** | — | — | — | **Yes**, later. Nothing exists today. |
| **Function / role** | **No** | — | Implied by category names only (Preservatives, Silicones, Emollients) | — | **Yes.** The axis a single tree cannot express. |
| **Product relationship** | **No** | — | No product↔product link of any kind | — | Only if a real requirement appears. No evidence today. |
| **Search metadata** | **No** | — | No keywords, synonyms or index fields anywhere | — | **Yes**, when search becomes real (§12). |
| **SEO metadata** | **Derived only** | `buildMetadata()`, `lib/seo.ts:24` | Title/description computed per page; **no stored SEO fields on any entity** | Not stored | **Yes** — per-entity `seo_title`, `meta_description`, `og_image`. |
| **Format (end-product)** | **Yes, as loose strings** | `applicationFormats`, `applications.ts:119`; `ProductSummary.formats` (renamed in Stage 1b) | 12 values; on 14 products | Semi — a de-facto controlled vocabulary stored as text | **Yes.** |
| **Olfactive family** | **Yes, as a delimited string** | `ProductSummary.olfactive` | `"Vanilla \| Ambery \| Floral"` on 14 products | No — multi-value packed into one field | **Yes**, as a controlled vocabulary. |
| **Price / stock** | **No — deliberately** | — | — | — | Business decision (§15.3). |

---

## 7. Current product / taxonomy relationships

### 7.1 Resolution mechanics

**FACT** — all traversal is linear scanning over a rebuilt array:

| Function | Location | Behaviour |
|---|---|---|
| `flattenCategories()` | `taxonomy.ts:785` | Depth-first walk, **allocates a new array on every call** |
| `getCategoryBySlug()` | `taxonomy.ts:789` | `flattenCategories().find(...)` — full walk per lookup |
| `getProductsInCategory()` | `taxonomy.ts:794` | Flattens the subtree, copies each product, injects category label |
| `getAllProducts()` | `taxonomy.ts:805` | `categories.flatMap(getProductsInCategory)` |
| `countProducts()` | `taxonomy.ts:810` | `getProductsInCategory(category).length` — **builds the full product array to return a number** |
| `isPublishable()` | `taxonomy.ts:780` | `products.length > 0 \|\| children.length > 0` |

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
Category (30, 2 levels)                        │ 26 ⊂ 46 — see §8.3
   │  Category.applicationSlugs[]  (46 pairs) ─┘
   │
   │  structural containment (no key)
   ▼
Product (122)
```

**FACT** — there is **no Product→Application relationship in the data.**
`fetchProductsForApplication()` (`lib/content.ts:177`) derives it: it takes
`application.categorySlugs`, filters the flattened tree, and returns every
product in those categories. Product-level application data exists only as the
free-text `ProductSummary.formats` on 14 fragrance records — the field
`ProductSummary.applications` was renamed in Stage 1b precisely because it held
**end-product formats** ("Shampoo", "Fabric softener") rather than application
slugs. It is never used for resolution.

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
| Categories without `summary` | **26 of 30.** All 4 top-level families have one; every sub-range lacks one. `summary` feeds the mega-menu `description` (`navigation.ts:49`) and the products page — the mega-menu is unaffected because it only renders top-level families. |
| Categories without `description` | **30 of 30 — the field was never used.** `Category.description?` was declared and populated nowhere; categories carry `summary` instead. `Application` and `Industry` do use `description`. **RESOLVED in Stage 1b — the field was removed** (§14.2). |
| Products without `benefit` | **82 of 122** |
| Products with no content beyond a name | **68 of 122** (40 have `benefit`; 14 fragrances have `olfactive` + formats) |
| Images anywhere in catalogue data | **Zero.** `taxonomy.ts` and `applications.ts` contain no `image:` key at all; all 3 `siteMedia` slots are explicitly `undefined` (`media.ts:52,61,68`) |
| `source` on catalogue entities | **152 of 152 — 100%** |

### 8.3 Inconsistent relationship assignments — the significant one

**FACT** — the Category↔Application relationship is stored twice, and the two
copies do not describe the same set. Re-verified at `687827b` by executing the
data modules:

| Direction | Pairs |
|---|---|
| `Category.applicationSlugs` (category side) | **46** |
| `Application.categorySlugs` (application side) | **26** |
| Agreed by both | 26 |
| **Present on the category side only** | **20** |
| Present on the application side only | **0** |

**REFINEMENT — this is containment, not contradiction.** The last row is the
important one. Because *no* pair exists only on the application side, the
application side is a strict subset of the category side (26 ⊂ 46). The two
copies never actively contradict each other; the category side simply claims 20
relationships the application side declines to.

**OBSERVATION** — that distinction matters for how it gets resolved. It is not
data corruption to be repaired by picking a winner; it reads like **two different
editorial intents** — "which applications could this material serve" (category
side, broad) versus "which categories should this application page feature"
(application side, curated). Whether the Phase 2 schema needs one relationship or
two — a link plus a `featured` flag — depends on which of those Cerium actually
means, and that is worth asking rather than assuming (§15.7).

**FACT** — all 46 pairs reference slugs that exist. There are **no dangling
references** in either direction, and none in `Industry.applicationSlugs`.

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

**FACT** — measured by running `fetchProductsForApplication`'s resolution
(`lib/content.ts:177`) over the real data, the derived Application→Product
relationship returns these breadths:

| Application | Categories claimed | Products resolved | Share of the 122-product catalogue |
|---|---|---|---|
| Skin Care | 8 | 59 | **48%** |
| Hair Care | 6 | 46 | **38%** |
| Bath & Shower | 5 | 27 | 22% |
| Air Care | 2 | 18 | 15% |
| Fabric Care | 3 | 17 | 14% |
| Surface Care | 2 | 5 | 4% |

**OBSERVATION** — an "application" that matches nearly half the catalogue is not
functioning as a filter. Skin Care and Hair Care together are not disjoint
either, so the two largest application pages overlap heavily. This is the
practical consequence of deriving a product-level relationship from a
category-level one.

**FACT** — `skin-care.categorySlugs` includes `natural-extracts`
(`applications.ts:36`), so all **19** Natural Extracts render on
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
| **Empty array vs omitted key** | `food-ingredients` has `applicationSlugs: []` (`taxonomy.ts:706`); its six children omit the key entirely. Both are valid against `applicationSlugs?: Slug[]` and behave identically, but they are two encodings of one state. |
| **Casing split** | 24 categories are Title Case ("Natural Extracts"); the 6 Food sub-ranges are sentence case ("Seasoning powder blends", "Whey powder"). Faithful to their different sources — catalogue vs live website — but visually inconsistent in the UI. |
| **US/UK spelling split** | `"Natural colors and extracts"` (US, website source) alongside `"Multi Coloured Cellulose Scrubs"` (UK, catalogue source). Both verbatim. |
| **Punctuation in names** | `"Olive Oil (Extra Virgin)"` → `olive-oil-extra-virgin`; `"Phenoxyethanol & Ethylhexylglycerin"` → `phenoxyethanol-and-ethylhexylglycerin` (`lib/slug.ts:20` expands `&`). Both slugs are stable and correct; noted because Phase 2 persists slugs. |
| **`applications` meant two different things** — **RESOLVED in Stage 1b** | `ProductSummary.applications?: string[]` was documented as "Applications this product is supplied for", but **none of its 12 distinct values matched any `Application.slug`.** Verified at audit: every value ("Shower gel" ×9, "Handwash" ×8, "Shampoo" ×6, "Body splash" ×6, …) is an *end-product format* from `applicationFormats` (`applications.ts:119`), not one of the 6 Application entities. One field name, two entities — a naming collision that would have misled whoever wrote the Django schema. **The field is now `ProductSummary.formats`** (`types/content.ts:142`), and the screen-reader heading in `ProductCard` changed with it. |

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
(the decision documented at `taxonomy.ts:58-92`). It is stale, not broken.

### 8.7 Fields that may need stronger rules later

| Field | Today | Concern |
|---|---|---|
| `source?` | Optional on `Category`, `ProductSummary`, `Application`, `Industry` | 100% populated by convention; **nothing enforces it there** (§9.2). **Stage 1b made it required on `CategoryOverride`/`ProductOverride`** — the one path where content is authored rather than reviewed |
| `ImageRef.alt?` | Optional | The stated rule is that `alt: ""` is only for decorative images — unenforceable while `alt` is optional |
| `ProductSummary.formats?` (was `applications?`) | `string[]` free text | A de-facto controlled vocabulary of 12 values. Renamed in Stage 1b; still an unconstrained `string[]` |
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

**FACT** — `Sourced` (`types/content.ts:45`) declares `source: SourceDocument`
as **required**, but it is extended by exactly **one** type: `CompanyMetric`
(`types/content.ts:200`).

**FACT** — `Category`, `ProductSummary`, `Application` and `Industry` each
declare `source?: SourceDocument` — **optional** (`types/content.ts:111, 146,
163, 173`).

**Partly addressed in Stage 1b.** `CategoryOverride` and `ProductOverride`
(`data/overrides.ts`) now declare `source` as **required**, so the Content
Studio — the one path where content is authored through a form rather than
reviewed line by line — cannot produce an unattributed entry. The four catalogue
types above are unchanged; tightening those is a schema decision (§10, §14.2).

**OBSERVATION** — so 100% coverage is a discipline the authors maintained, not a
property the compiler guarantees. A new entry with no `source` compiles, lints
and renders cleanly. This is the single cheapest integrity improvement available
in Phase 2: make it required in the schema.

### 9.3 Two union members are declared but never used

**FACT** — `vision-statement` and `logo` appear in `SOURCE_DOCUMENTS`
(`types/content.ts:26`, from which the `SourceDocument` type is derived) and
**nowhere else in `src/`** — with one exception added in Stage 1b: both are now
offered as options in the Content Studio's source selector, so they are
selectable even though no catalogue record uses them.

**FACT** — `src/data/company.ts` documents its origin in a file comment
("SOURCE OF TRUTH: VISION STATEMENT.docx and the 2026 product catalogue",
`company.ts:4`) but carries **no machine-readable `source` on any export**
except `companyMetrics`. `vision`, `mission`, `aboutSummary`, `catalogueIntro`,
`brandStatement`, `coreValues`, `partners`, `partnersIntro` and
`partnersStatement` have none — `CoreValue` (`types/content.ts:180`) and
`Partner` (`:189`) do not extend `Sourced`.

**OBSERVATION** — provenance coverage is therefore **100% for the catalogue and
0% for company content**, even though company content includes the exact
material most likely to be quoted back to Cerium (vision, mission, values).

### 9.4 The Content Studio writes false provenance

> **Status: RESOLVED in Stage 1b.** Retained because it is the record of what
> was wrong and why the replacement is shaped as it is.

**FACT (at audit)** — `src/app/api/studio/catalogue/route.ts:104` and `:146`
**hardcoded** `source: "website-ceriumchemicals.co.ke"` on every category and
product the Studio wrote. The value was not derived from user input and not
validated against the actual origin of the content.

**OBSERVATION** — anything authored through the Studio was attributed to the
live website regardless of where it truly came from. Because
`catalogue.overrides.json` was still empty (`{"categories": [], "products": []}`),
**no incorrect provenance ever shipped** — the fix landed inside the window in
which it cost nothing.

This was the most consequential provenance finding in the exploration.

**The fix, and why it is shaped this way.** The choice was between asking the
operator and dropping the field. Dropping it would have satisfied the letter of
the problem — no false assertion — while breaking the property that makes the
field worth having: that every catalogue entry is traceable. So the form asks,
with two deliberate refusals:

- **No default.** A pre-selected source is a guess wearing the same clothes as a
  record. The empty option blocks submission until a human chooses.
- **No "unknown" option.** If content is not in a supplied document, the honest
  action is not to enter it yet. The hint on the field says exactly that.

`source` is additionally **required** at the type level on `CategoryOverride`
and `ProductOverride` (`data/overrides.ts`), which is narrower than making it
required across all four catalogue types (§9.2) and deliberately so: the
reviewed catalogue's 100% coverage is maintained by review, whereas the Studio
is the one path where content is authored through a form, and therefore the one
path where the compiler should insist.

### 9.5 Can provenance support future document traceability?

**Yes, with three changes** — all recorded, none made:

1. **Make `source` required** in the schema rather than optional (§9.2).
2. **Promote `SourceDocument` from enum to entity.** A union member cannot carry
   the document's title, revision, issue date, custodian, the file itself, or a
   coverage note — and a coverage note is exactly what is needed to record the
   known gap that catalogue pages 12–13 are missing (`taxonomy.ts:21-27`).
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
`fetch*` signature list in §5.2. Any API that can satisfy those **18** functions
requires no component change. Concretely the API must support:

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

**`fetchProduct(slug)` was missing at audit and now exists** (`lib/content.ts:138`).
`contact/page.tsx:39` calls it for `?product=` resolution; any product detail
page will need it too. Its Phase 2 requirement is a **single indexed lookup**
rather than the full-catalogue scan it performs against local data today.

**Also added since the audit:** `fetchApplicationFormats()` and the three
navigation accessors (`fetchPrimaryNavigation`, `fetchFooterNavigation`,
`fetchBrowseLists`). The navigation accessors are the ones that matter for
migration — navigation is *derived from* catalogue records, so it could not have
survived an API-backed catalogue as a synchronous module-scope constant.

### 10.3 What should become API DTOs

**RECOMMENDATION (recorded)** — `Category`, `ProductSummary` (widening to a full
`Product`), `Application`, `Industry` and `ImageRef` are already the DTO shapes;
`types/content.ts:1-11` says exactly this. Two adjustments will be needed:

- **`ProductSummary.categorySlug`/`categoryName`** are injected at read time
  (`taxonomy.ts:794`), not stored. The API should return them explicitly so the
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

**FACT** — `import "server-only"` is now used in **six** files. Two are the
original Studio guards (`lib/studio-guard.ts`, `lib/studio-images.ts`); the four
added in Stage 1b are `lib/content.ts`, `data/taxonomy.ts`, `data/applications.ts`
and `data/overrides.ts`.

**OBSERVATION** — this is the enforcement mechanism for the tier table above, and
it has been verified to work: reintroducing the original defect (a client
component importing the catalogue) fails the build with the offending import
chain named (§5.4). **The future API client module must carry the same guard** —
it is the one module that will hold the catalogue once `lib/content.ts` fetches
rather than imports.

**Its limit, restated here because this table is where someone will rely on it:**
`server-only` is a *bundle* guarantee, not a lint rule. A client component that
imports the catalogue but is unreachable from any page does not fail the build
(§5.4).

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

**OBSERVATION** — everywhere the catalogue is read. All **12** §5.3.A callers are
Server Components awaiting async functions, which is why they need no change.

The three client components that were the entire problem surface at audit
(§5.3.B) no longer read data at all: they were client-side only because of
**interaction state** (menu open/closed), never because they needed data at
runtime, and Stage 1 resolved this by resolving their data on the server and
passing it as props. **§5.3.B is now empty**, so there is no client-side
rendering boundary left to move before the API arrives.

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

**FACT** — `taxonomy.ts:765`: `(products?.length ?? 0) > 0 || (children?.length ?? 0) > 0`.
A category earns a URL only when it has products or children. This is why 24 of
30 categories have pages, and why the six Food sub-ranges do not.

**OBSERVATION** — this single predicate is the site's entire thin-content
defence, and it is well designed: it is derived from data, so adding one product
to an empty sub-range causes its page, sitemap entry and card link to appear
automatically. **The architectural question for Phase 2 is whether the same
principle governs products** — 68 of 122 products currently have a name and
nothing else (§8.2), so publishing all of them would ship 68 near-empty pages.

#### The gap: `children > 0` is not the same test as `has content`

**FACT** — `/products/food-ingredients` **is publishable and is in the sitemap**,
because it has 6 children. But it has **0 products**, and all 6 of those children
are themselves unpublishable. Verified by executing the data:

```
food-ingredients            own=0  total=0  pub=Y   ← has a page, in the sitemap
  ├ seasoning-powder-blends own=0  total=0  pub=N   ← no page
  ├ whey-powder            own=0  total=0  pub=N
  ├ natural-colors-…       own=0  total=0  pub=N
  ├ spice-oils-…           own=0  total=0  pub=N
  ├ vitamins-and-minerals  own=0  total=0  pub=N
  └ specialty-ingredients  own=0  total=0  pub=N
```

**FACT** — `CategoryCard` correctly renders each unpublishable child as a plain
`<div>` rather than a link (`cards/CategoryCard.tsx:14-31`), so **there are no
dead links.** The result is a page consisting of a heading, an intro, and six
non-clickable cards naming ranges with no products.

**OBSERVATION** — this is precisely the thin page `isPublishable` exists to
prevent, admitted by the `children > 0` branch. The predicate tests for
*structure* where the intent is *content*. A recursive test — "has products, or
has a child that is itself publishable" — would exclude it, and would exclude
nothing else in the current data.

**This is not a bug to fix in isolation.** Whether `/products/food-ingredients`
should exist at all is the Food Ingredients question in §15.1, which is Cerium's
to answer. If food stays, the range needs product names and the page stops being
thin; if food goes, the page and its six children go with it. Changing the
predicate now would pre-empt that decision by quietly removing the page. Recorded
here so that whichever way §15.1 resolves, the predicate is reviewed alongside it.

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

**FACT** — since `687827b` it imports **no data at all**. Its entire content
input is the `browse: BrowseLists` prop (`SearchOverlay.tsx:29-36`) — label and
href for 4 top-level families and 6 applications, built by `buildBrowseLists`
(`navigation.ts:210`) and resolved on the server by `fetchBrowseLists`
(`lib/content.ts:246`). It does not touch products at all.

**OBSERVATION** — the shell's data requirement is now honest about its own size,
which matters for Phase 4: the component that will need a *runtime* data path is
already the one component with no *build-time* data path. Adding a fetch to it
changes nothing structural.

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

### 13.2 The measurable issue — resolved

**FACT** — the ~23 KB of code-only catalogue data that previously reached the
client bundle no longer does (§4.3). Verified by production build and chunk
probing: 0 of 19 catalogue probes hit the client JS.

**OBSERVATION** — with that gone, **this exploration found no user-visible
performance problem in the current architecture.** The remaining performance
notes below are all about the *future* shape, not the present one.

**FACT** — the traversal cost noted in §7.1 remains: `countProducts()`
(`taxonomy.ts:795`) builds the full product array in order to return its length,
and `products/page.tsx` calls it once per family plus once per child. At 122
products at build time this is genuinely free. It is listed only because these
call sites become network round-trips in Phase 2 (§10.6).

### 13.3 Highest-value architectural improvements

Ranked by value, **recorded not performed**. Items 1 and 2 of the original
edition are complete and are retained struck through, because the sequencing
argument they carried now applies to what replaced them.

| # | Improvement | Value | Risk |
|---|---|---|---|
| ~~1~~ | ~~Pass `{name, slug, href}` lists into `SearchOverlay`, `Header`, `MobileNavigation` as props~~ | **DONE at `687827b`** | — |
| ~~2~~ | ~~Move `not-found.tsx` and `contact/page.tsx` onto the seam~~ | **DONE at `687827b`** | — |
| ~~1~~ | ~~**Add `import "server-only"` to `lib/content.ts` and the catalogue data modules**~~ (§5.4) | **DONE in Stage 1b.** Verified by reintroducing the defect and confirming the build rejects it | — |
| 2 | Make counts a projection rather than a materialised list (§7.1) | Free now; prevents N round-trips per page in Phase 2 | Low |
| 3 | Cloudinary activation before real photography arrives | Images are currently **zero** — this is by far the largest *future* payload, and the only one that scales with the catalogue | Low; already wired (`lib/cloudinary.ts`), needs only `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` |
| ~~4~~ | ~~Rename `ProductSummary.applications` → `formats`~~ (§8.5) | **DONE in Stage 1b.** 14 records, 1 render site, Studio form and API handler | — |
| 5 | Relocate `isPublishable`/`flattenCategories` to `src/lib/` | Removes 4 confusing `@/data` imports; more importantly moves *publication policy* out of a data module (§5.3.F) | Cosmetic |

**OBSERVATION** — item 3 deserves more weight than its position suggests. The
site currently ships zero images, so every measurement in this document reflects
a best case that will not survive real photography arriving. Activating
Cloudinary *before* the assets land means the first real image is delivered
through `f_auto,q_auto` rather than becoming a regression to diagnose later.

---

## 14. Engineering decisions available to us

Decidable without Cerium. Listed for decision, **not decided or implemented here**.

### 14.1 Settled since the original edition

| # | Decision | How it was settled |
|---|---|---|
| ~~1~~ | Correct the overstated rule wording in `lib/content.ts` | **DONE** — narrowed to catalogue records (`lib/content.ts:5-46`) |
| ~~2~~ | Remove the catalogue from the client bundle | **DONE** — props from a server parent (§4.2) |
| ~~3~~ | Add `fetchProduct(slug)` to the seam | **DONE** — `lib/content.ts:138` |
| ~~4~~ | Whether `company.ts`, `media.ts`, `navigation.ts` get seam accessors | **DECIDED** — `navigation.ts` and `applicationFormats` moved behind the seam; `company.ts` and `media.ts` stay direct, with a stated trigger for revisiting (§5.3.E) |

### 14.2 Still open

| # | Decision | Recommendation | Blocked by |
|---|---|---|---|
| ~~1~~ | ~~`import "server-only"` on `lib/content.ts` and the catalogue data modules~~ | **DONE in Stage 1b** — §5.4 | — |
| 2 | Collapse Category↔Application into one relationship | One join, read both ways — **but first establish whether the 20 one-sided pairs encode "could serve" vs "featured on"** (§8.3). If they do, the answer is one join plus a flag, not one join | §15.7 for the intent; the mechanics are ours |
| ~~3~~ | ~~Rename `ProductSummary.applications` → `formats`~~ | **DONE in Stage 1b** — §8.5 | — |
| 4 | Make `source` required rather than optional | **PARTLY DONE in Stage 1b:** required on `CategoryOverride`/`ProductOverride`, so Studio-authored content cannot omit it. Still optional on `Category`/`ProductSummary`/`Application`/`Industry` — tightening those is a schema decision for Stage 2 (§9.2) | Nothing blocking |
| ~~5~~ | ~~Whether `Category.description` is removed or populated~~ | **DONE in Stage 1b — removed.** `summary` already carried the copy; a second undefined free-text field would have become an undefinable Django column (§8.2) | — |
| 6 | Nested vs flat category serialisation from the API | Either; the seam absorbs it | Nothing |
| 7 | Whether `isPublishable` becomes recursive | Recommended, but **review alongside §15.1** rather than before it — the only page it currently affects is `/products/food-ingredients` (§11.2) | §15.1 |
| 8 | Caching strategy — static / ISR / on-demand | Needs Cerium's edit frequency, which is a *question*, not a decision | §15.7 |
| 9 | Whether the Studio is retired at migration or runs alongside during it | Retire; Django admin supersedes | Nothing |
| 10 | Remove or repair the dead `relatedFamily` branch (§8.6) | Either; it is inert. If repaired, note that the comment's premise is false and should go with it | Nothing |
| ~~11~~ | ~~Fix the Studio's hardcoded `source`~~ (§9.4) | **DONE in Stage 1b — the form now asks.** A required `SourceField` with no default and no "unknown" option; the API validates against `SOURCE_DOCUMENTS` and rejects anything else with a 400 | — |

**OBSERVATION** — items 1, 3, 4 and 11 are independent of every open business
decision, are individually small, and each closes a path by which a correct
system quietly becomes an incorrect one. They are the natural first
implementation work now that the boundary itself is done.

---

## 15. Decisions requiring Cerium

Sourced from `docs/pending-cerium-decisions.md` and confirmed against the
repository. **Nothing here was guessed or resolved.**

### 15.1 Food Ingredients — BUSINESS DECISION REQUIRED

**FACT** — two current supplied sources disagree. `src/config/site.ts:25`
describes Cerium as serving "personal care and home care industries" (2026
catalogue). `taxonomy.ts:685` carries a `Food Ingredients` family with six
sub-ranges, sourced `website-ceriumchemicals.co.ke`. Both carry accurate
`source` markers; the divergence is commented at `site.ts:19-22` and
`applications.ts:148-152`.

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
browsable product *collections* (`taxonomy.ts:87-91`).

### 15.3 Commercial / pricing visibility

**FACT** — quarterly B2B prices exist in the supplied Q3 2026 price lists and
are deliberately not modelled (`taxonomy.ts:21-27`). **Blocks:** whether
`Product` JSON-LD can ever replace `ItemList` (`lib/seo.ts:122-126`); product
page content; whether MOQs and pack sizes are publishable.

### 15.4 Product technical information

**FACT** — no CAS numbers, INCI names, specifications, certifications or origins
exist anywhere, and none has been inferred (`taxonomy.ts:9-19`). **Blocks:**
product pages, the Function facet, search quality, `/resources`.

### 15.5 Source authority

**Needs Cerium's confirmation:** which document wins when the catalogue and the
live site disagree (this is the Food conflict in general form); whether staff
statements can become an authoritative source; and whether AI-drafted
non-technical copy is acceptable at all. **FACT** — the current model cannot
express any of this (§9.6).

### 15.6 Missing catalogue pages

**FACT** — catalogue pages 12–13 are missing from the supplied PDF and some
glare-obscured entries were omitted rather than guessed (`taxonomy.ts:21-27`).
Clean copies are needed before the catalogue can be completed without inference.

### 15.7 Additional questions this exploration raises

| Question | Why it is Cerium's | Blocks |
|---|---|---|
| **How often will the catalogue actually be edited?** | Only Cerium knows their publishing rhythm | The caching strategy (§10.6) — static vs ISR vs on-demand |
| **May the site state which principal supplies which product?** | Commercially sensitive | Product↔partner linking; there is no such link in the data today |
| **Will technical documents be public or on request?** | Depends on principal agreements | Whether `/resources` exists |
| **Do the two Category↔Application arrays mean the same thing?** | It is an editorial intent, not a data error — the two sets are nested, not conflicting (§8.3) | Whether the schema needs one relationship or a relationship plus a `featured` flag; Stage 2 item 6 |
| **Which applications does each *product* actually serve?** | Only Cerium can confirm per-product suitability, and the site's governing rule forbids inferring it | Replacing the category-wide derivation that puts 48% of the catalogue on `/applications/skin-care` (§8.4) |
| Social profile URLs | `site.ts:64-66` — three are `undefined` | `sameAs` in `Organization` JSON-LD |
| Photography | No production imagery supplied | Every image slot |

---

## 16. Risks

| # | Risk | Severity | Evidence | Mitigation (recorded) |
|---|---|---|---|---|
| ~~1~~ | ~~**Client-component catalogue imports break outright at migration**~~ | ~~High~~ | **RESOLVED at `687827b`** — §4 | Superseded by risk 1a below |
| **1a** | **The bundle fix can regress silently** | **High** | §5.4 — no `server-only` guard on `lib/content.ts` or any catalogue data module | Add `import "server-only"`; until then, re-run the chunk probes in `docs/data-layer-boundary.md` before each release |
| 2 | **Studio writes false provenance** | **High** | `api/studio/catalogue/route.ts:104,146` | No bad data has shipped yet (overrides file is empty); fix or retire before first use |
| 3 | **Category↔Application copies diverge** | Medium-high | §8.3 — 26 ⊂ 46, 20 category-side-only | One join table; **establish the intent first** — the containment pattern suggests two meanings, not one broken one |
| 4 | **Application→product relationships are approximations presented as fact** | Medium-high | §8.4 — Onion and Rosemary Extract on `/applications/skin-care` | Import as `inherited`, never `stated`; verify from documents |
| 5 | **`source` is optional, so provenance can silently regress** | Medium | §9.2 | Make required in the schema |
| 6 | **68 of 122 products would produce thin pages if published unconditionally** | Medium | §8.2 | Extend the `isPublishable` principle to products |
| 7 | **Build becomes coupled to API availability** | Medium | §10.6 — `generateStaticParams` becomes a network call | Cached fallback or build-time snapshot |
| 8 | **No tests anywhere** | Medium | `CLAUDE.md` — lint + typecheck only | Every migration change is verified by inspection alone; the relationship reconciliation is the riskiest such change |
| 9 | **Build environment drift** | Low-medium | `CLAUDE.md` records the local box at Node 18.19.1, below Next 16's floor; the machine auditing this revision reports **Node 20.20.1**, which is above it | Pinned via `engines`, `.nvmrc`, `engine-strict`. `docker compose build web` (node:22-alpine) remains the authoritative build regardless of what the local box happens to be |
| 10 | **Company content has no machine-readable provenance** | Low-medium | §9.3 | Extend `Sourced` to `CoreValue`, `Partner` and the standalone exports |
| 11 | **`/products/food-ingredients` is a thin page in the sitemap** | Low-medium | §11.2 — 0 products, 6 unpublishable children | Resolve with §15.1 rather than by silently changing the predicate |
| 12 | **Stale premise in a live code path** | Low | §8.6 — `industries/[industry]/page.tsx:60`, and the false comment at `:58-59` | Inert today; remove or repair |
| 13 | **`applications` names two different entities** | Low now, medium at schema time | §8.5 | Rename to `formats` before the Django schema is written |
| 14 | Naming/spelling inconsistencies surface in the UI | Low | §8.5 | Content decision — both variants are verbatim from their sources |

---

## 17. Recommended Phase 2 sequence

Ordered so that each step de-risks the next, and so that nothing blocked by a
business decision sits on the critical path.

### Stage 0 — Ask Cerium (parallel, starts now)

Put §15.1 (Food), §15.7 (principal attribution, document access, edit
frequency) to Cerium. None of Stage 1 waits on the answers; the schema work in
Stage 2 does.

### Stage 1 — Frontend de-risking — **COMPLETE**

Delivered by commit `687827b`, in the order recommended:

1. ~~Correct the seam rule wording~~ — `lib/content.ts:5-46`.
2. ~~**Cut the catalogue out of the client bundle**~~ — `navigation.ts` converted
   to pure builders; `layout.tsx` resolves and passes props.
3. ~~Add `fetchProduct(slug)`; move `not-found.tsx` and `contact/page.tsx` onto
   the seam~~ — plus `fetchApplicationFormats()`.
4. ~~Decide the non-catalogue question~~ — recorded at `lib/content.ts:35-46`.

Verified by `npm run typecheck`, `npm run lint`, `docker compose build web`, and
chunk probing (`docs/data-layer-boundary.md`, "Outcome").

### Stage 1b — Close what Stage 1 left unguarded — **COMPLETE**

Each item was small, independent of every open business decision, and prevented
a correct system from quietly becoming an incorrect one.

1. **DONE — `import "server-only"` in `lib/content.ts`, `taxonomy.ts`,
   `applications.ts`, `overrides.ts`** (§5.4). Verified by reintroducing the
   original defect: a client component importing the catalogue now fails the
   build with the offending import chain named. Reverted after proving it.
2. **DONE — the Studio's hardcoded `source` is gone** (§9.4). Both forms carry a
   required `SourceField` with **no default and no "unknown" option**; the API
   validates against `SOURCE_DOCUMENTS` and returns 400 otherwise. `source` is
   now **required** on `CategoryOverride` and `ProductOverride`, so the compiler
   enforces it on the one path where content is authored rather than reviewed.
3. **DONE — `ProductSummary.applications` → `formats`** (§8.5). 14 records, the
   `ProductOverride` type, the API handler, the Studio form and `ProductCard`.
   The screen-reader heading changed with it, from "Applications for X" to
   "End-product formats for X", because it was describing the wrong
   relationship.
4. **DONE — `Category.description` removed** (§8.2). Populated on none of the 30
   categories while `summary` carried the copy.

Two supporting changes were needed and are worth recording:

- **`SourceDocument` is now derived from a `SOURCE_DOCUMENTS` array** rather
  than declared as a bare union (`types/content.ts:26`). A union cannot be
  iterated, so the Studio selector and the API validation would each have needed
  a hand-maintained copy of the vocabulary — the standard way a controlled list
  drifts. A new member now reaches the dropdown, the validator and the label map
  at once, and a missing label is a type error.
- **`isSourceDocument()`** (`types/content.ts:38`) narrows untrusted request
  input, keeping the route's existing "rebuild the body field by field, never
  spread user input" discipline.

**Verified:** `npm run typecheck` clean, `npm run lint` clean, `npm run build`
succeeds with **47 static pages — unchanged**, and the same route set (24
category, 6 application, 2 industry paths). Catalogue re-executed after the
rename: **122 products, 122 distinct slugs, 30 categories, 24 publishable, 14
with `formats`, 12 distinct format values, 0 residual `applications`, 0 missing
`source`, 0 categories with `description`.**

**FACT** — there are still no tests, so the menu, mobile drawer, search overlay
and Studio forms have not been exercised behaviourally. Item 3 touches a render
path (`ProductCard`) and item 2 changes a form contract; both warrant a visual
pass before this ships.

**Note for whoever runs data tooling:** the `server-only` guards mean any Node
script importing `src/data/*` must alias `server-only` to an empty module, as a
server runtime does. Not a defect — a consequence, recorded so it is not
rediscovered as one.

### Stage 2 — Schema and contract (specification, then implementation elsewhere)

5. Settle the product URL policy and the publication threshold (§11.3).
6. Reconcile Category↔Application. **Establish the intent behind the 20
   one-sided pairs first** (§8.3) — the containment pattern suggests the two
   arrays may encode "could serve" and "featured on", in which case the target
   is one join plus a flag, not one join.
7. Review `isPublishable` alongside the Food Ingredients answer (§11.2, §15.1).
8. Finalise the Django schema — in the **separate service**, not this repo —
   with `source` required (§9.2) and promoted from enum to entity (§9.5).

### Stage 3 — API integration

9. Implement `lib/content.ts` against `apiConfig.baseUrl`, keeping local data as
   the fallback. **No component should change in this step** — if one does, the
   seam was not doing its job and that is the signal to stop and reassess.
   Stage 1 is what makes this test meaningful: before it, three components would
   have had to change, and the seam's failure would have looked like ordinary
   migration work.
10. Decide and implement the caching strategy (needs the Stage 0 answer on edit
    frequency).
11. Migrate `catalogue.overrides.json` into the database; retire the Studio.

### Stage 4 — What the migration unlocks

12. Product pages (gated on the Stage 2 threshold decision).
13. Real search against PostgreSQL — `SearchOverlay` already takes props and
    imports nothing, so this is an addition rather than a rewrite (§12.2).
14. Real product↔application relationships replacing the derivation, which is
    what fixes Skin Care matching 48% of the catalogue (§8.4).
15. Sitemap `lastModified` from real `updated_at`.

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

### Method for this revision

Counts and relationship figures in §7, §8, §9 and §11.2 were **not estimated**.
The actual data modules were loaded with the project's own `jiti` (already
present as a Next.js transitive dependency) from a script in the session
scratchpad, and `flattenCategories`, `getAllProducts`, `countProducts` and
`isPublishable` were executed against the real exports. That is how the 122/122
distinct slugs, the 46/26/26/20/0 relationship split, the per-application product
breadths, the 152 `source` values and the `food-ingredients` subtree were
established. No repository file was imported for writing, and nothing was
persisted outside the scratchpad.

Two figures are quoted from `docs/data-layer-boundary.md` rather than
re-measured, because they require a production build: the client-chunk probe
results and the 47-page build count. The 38-URL sitemap figure **was**
independently re-derived here and agrees.

**CANNOT DETERMINE** — actual gzipped client bundle size. `docker compose build
web` was not run, as it writes generated files and the brief restricts
verification to lightweight read-only checks.

### Repository state

`git status --short` in `frontend/` reports a **clean working tree** apart from
this document. Note that the repository root (`/home/john-mbugua/Desktop/cerium`)
is not itself a git repository — the git repository is `frontend/`, currently on
branch `dockerizing` at `687827b`.
