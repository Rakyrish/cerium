# Data-layer boundary — status and recommendation

**Status:** **IMPLEMENTED, 20 Aug 2026.** Items 1–3 and 5 of the recommendation
below are done; item 4 was deliberately skipped. The analysis is retained
because it is the record of *why*.
**Originally audited at:** commit `9feb8b6`, 19 Aug 2026.

> **What changed.** The catalogue no longer reaches the client bundle, the rule
> has been narrowed to what it actually means, `fetchProduct(slug)` exists, the
> two bypassing server components now read through the seam, and the
> non-catalogue question has an answer. Verified by production build: zero
> catalogue probes hit the client JS chunks. See "Outcome" at the foot of this
> document.

## The rule as written

`src/lib/content.ts` **used to** state:

> Pages and sections MUST read content through these functions and never import
> from `src/data` directly.

It now states the catalogue-records rule described below.

## What is actually true

26 direct `@/data/*` imports exist under `src/app` and `src/components`. That
raw number overstates the problem, because it counts four different kinds of
import that do not carry the same risk:

| Kind | Count | Example | Is this a violation? |
|---|---|---|---|
| Catalogue **record** reads | 4 | `categories`, `getAllProducts()` | **Yes** — these are what the seam exists for |
| Pure predicates / tree helpers | 4 | `isPublishable`, `flattenCategories` | No — logic, not a data source |
| Dev-only Content Studio | 4 | `src/app/studio/*`, `api/studio/*` | No — exempt by design |
| Non-catalogue content | 14 | `company.ts`, `media.ts`, `navigation.ts` | No — the seam has no accessors for these |

Excluding the exempt Studio files, exactly **three files** perform a catalogue
record read that bypasses `lib/content.ts`:

- `src/components/search/SearchOverlay.tsx` — `categories`, `applications`
- `src/app/not-found.tsx` — `categories`
- `src/app/contact/page.tsx` — `getAllProducts()`

`src/app/sitemap.ts` is a partial case: it reads through `fetch*` but also
imports `flattenCategories` and `isPublishable` directly. Under the refined rule
below that is compliant.

## Is the boundary still the intended architecture?

**Yes.** It should be kept, with its wording corrected.

The seam is the single reason a Phase 2 swap to the Django REST API does not
touch presentation code: every `fetch*` in `lib/content.ts` is already `async`,
so adding an HTTP call behind it changes no component signature and makes no
component newly-suspending. Nothing has been found in Phase 1 that weakens that
argument.

What is wrong is only the *scope* of the rule as written. It currently reads as
"never import from `src/data`", which is stricter than the codebase has ever
been and stricter than it needs to be. The rule that actually matters is:

> **Catalogue records** — categories, products, applications, industries — are
> read only through `lib/content.ts`. Pure predicates, non-catalogue content and
> the dev-only Studio are not covered.

## The real risk this exposes

Not the import count — the **client bundle**.

`SearchOverlay` is a client component that imports `categories` and
`applications` at module scope. `Header` and `MobileNavigation` are also client
components, and they import `primaryNavigation` from `src/data/navigation.ts`,
which itself imports `taxonomy.ts` and `applications.ts`.

So the entire catalogue — every category, every nested sub-range, all ~122
product records — is reachable from client components along two independent
paths, and is therefore shipped in client JavaScript. Today that is only a
payload cost. In Phase 2 it becomes a correctness problem: an API-backed
catalogue cannot be a synchronous module-scope import in a client component, so
these call sites must change regardless of whether the boundary rule exists.

`SearchOverlay` only ever uses `name` and `slug` from the top level of each
tree. It does not need the catalogue at all.

## Minimum safe change before the Phase 2 migration

Ordered by value. **Items 1, 2, 3 and 5 are now done; item 4 was skipped.**

1. **DONE — Correct the rule's wording** in `lib/content.ts` to the
   catalogue-records scope above, so the documented rule and the code stop
   disagreeing.
2. **DONE — Cut the catalogue out of the client bundle.** `navigation.ts` was
   converted from module-scope derived constants into pure builders that take
   catalogue data as arguments, so it no longer imports the catalogue at all.
   `fetchPrimaryNavigation`, `fetchFooterNavigation` and `fetchBrowseLists` were
   added to the seam; `layout.tsx` resolves them on the server and passes them
   into `Header`, which forwards them to `MobileNavigation` and `SearchOverlay`.
   All three client components now take props and import no data module —
   the pattern `MegaMenu` already used.
3. **DONE — Move `not-found.tsx` and `contact/page.tsx` onto `fetch*`.** Both
   now `await` through the seam, and `fetchProduct(slug)` was added for the
   contact page. `fetchApplicationFormats()` was added at the same time, since
   `applicationFormats` is catalogue content by the same definition and was the
   last inconsistency with the narrowed rule.
4. **SKIPPED — Relocate the pure predicates.** `isPublishable` /
   `flattenCategories` are logic, not data, and moving them to `src/lib/` would
   remove four confusing `@/data/taxonomy` imports without touching behaviour.
   It was explicitly cosmetic and was not free at the time — it would have
   enlarged the diff of a change whose value is entirely in the bundle and the
   boundary. Still available whenever it is convenient.
5. **DONE — Decide the non-catalogue question explicitly.** The answer is
   recorded in the header comment of `src/lib/content.ts`:

   - **`navigation.ts` moves behind the seam** — it is *derived from* catalogue
     records, so it could not have stayed a synchronous module-scope constant
     once the catalogue becomes API-backed.
   - **`company.ts` and `media.ts` stay as directly-imported build-time
     modules** and deliberately get no accessors. They are small, editorial,
     change at the pace of the brand rather than the catalogue, and nothing
     about the Phase 2 migration requires them to move. If company content later
     becomes API-backed it gains accessors then — as a decision, not as drift.

## Why it was deferred at the time

Items 2 and 3 change component signatures and rendering boundaries. Doing that
in a *hardening* pass — with no test suite to catch a regression, and before the
Phase 2 information architecture was decided — spent risk for no benefit. Item 1
was safe in isolation but was left out to keep that pass strictly to its agreed
scope.

That reasoning expired once Phase 2 began and the architecture was settled. The
work was done as the opening change of Phase 2, before any Django work, exactly
as recommended.

---

## Outcome

**Verified by production build** (`docker compose build web`, node:22-alpine),
then by running the image and probing the emitted client chunks.

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| Production build | succeeds; 47 static pages generated |
| Sitemap URL count | 38 — unchanged |
| Routes smoke-tested | 13 × 200, 1 × 404 — all correct |
| **Catalogue product names in client JS** | **0 of 12 probes hit** |
| **Benefit copy in client JS** | **0 of 4 probes hit** |
| **Fragrance/olfactive data in client JS** | **0 of 3 probes hit** |

**Behaviour confirmed unchanged:** desktop nav, mobile drawer, footer columns,
404 family list, `?product=` enquiry resolution (valid slug, invalid slug and
no-param cases all correct), and application format badges on both surfaces.

### Remaining `@/data/*` imports, and why each is fine

| Kind | Count | Status |
|---|---|---|
| Pure predicates (`isPublishable`, `flattenCategories`) | 4 | Allowed by the rule — logic, not a data source. Item 4 above would tidy these. |
| Non-catalogue content (`company.ts`, `media.ts`) | 9 | Allowed — decided in item 5. |
| `legalNavigation` | 1 | Static; carries no catalogue data. |
| Dev-only Content Studio | 4 | Exempt by design. |
| **Catalogue record reads bypassing the seam** | **0** | Was 3. |

The only `@/data/*` import remaining in any client component is
`import type { CatalogueOverrides }` in the Studio's `OverridesList.tsx` — a
type-only import, erased at compile time, in a dev-only surface.

### What this does *not* fix

The bundle and boundary are fixed; the **data** problems found in
`docs/phase-2-1a-data-architecture-exploration.md` are untouched and remain
open — the Category↔Application two-sided disagreement (20 of 46 pairs), the
derived and over-broad application→product relationship, the Studio's hardcoded
`source` value, and `source` being optional rather than required. Those are
Stage 2 and schema concerns, not boundary concerns.
