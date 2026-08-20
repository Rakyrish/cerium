# CLAUDE.md — Cerium Chemicals

## Project

Marketing + catalogue website for **Cerium Chemicals** (Nairobi, Kenya), a
supplier of specialty raw materials for personal care and home care
formulators. Tagline: "Sourcing made easy".

Goal: an SEO-first, statically generated site that presents Cerium's real
catalogue honestly. Phase 1 (frontend, local typed data) is complete.

## Development workflow

**EXPLORE → PLAN → IMPLEMENT → VERIFY → REVIEW**

For any substantial change:

1. **Explore** the relevant code before proposing anything.
2. **Plan** — explain the implementation plan and get agreement.
3. **Implement** only the approved scope.
4. **Verify** — run the verification commands below.
5. **Review** — report what changed and what was verified.
6. Do **not** begin unrelated work, refactors, or "while I'm here" cleanups.

Work is phase-based. Do not implement a later phase's concerns early. Known
phase markers in the code: Phase 2 = Django + PostgreSQL + real CMS/API,
Phase 3–5 = product specifications/documents, Phase 4 = search backend,
Phase 11 = enquiry/quotation system, Phase 14 = production hardening
(CSP, error reporting).

## Stack (verified)

| Layer | What is actually here |
|---|---|
| Framework | Next.js **16.3.1**, App Router, React **19.2.8**, TypeScript 5 (strict) |
| Styling | Tailwind CSS **v4** via `@tailwindcss/postcss`; tokens in `src/app/globals.css` `@theme` |
| Fonts | `next/font/google` — Inter Tight (UI/body), Newsreader (display serif) |
| Data | **PostgreSQL via Drizzle** (`src/db/`), seeded from the reviewed typed TS in `src/data/`, which remains the build-time and outage fallback |
| Backend | **This app.** Admin + Postgres live here. Django was dropped — see "Backend decision" below |
| Auth | Auth.js v5, credentials provider, bcrypt. Accounts created by CLI only |
| Images | `next/image` via `CeriumImage`; Cloudinary loader wired but **not configured** |
| Deploy | Docker multi-stage (`node:22-alpine`, `output: "standalone"`) + Caddy 2 reverse proxy/TLS |
| Tests | **None.** No test runner, no test files, no `test` script (lint + typecheck only) |

Runtime dependencies: `next`, `react`, `react-dom`, `server-only`, plus
`drizzle-orm`, `pg`, `next-auth`, `bcryptjs` for the admin. Still deliberately
small — do not add another without asking. `cn()` in `src/lib/cn.ts` exists
specifically to avoid `clsx`/`tailwind-merge`.

## Commands

```bash
npm run dev        # next dev
npm run build      # next build
npm run start      # next start
npm run lint       # eslint (flat config, eslint-config-next core-web-vitals + ts)
npm run typecheck  # tsc --noEmit
docker compose build web        # production build on the supported runtime
docker compose up -d --build    # full prod stack (db + web + caddy)

npm run db:generate   # drizzle-kit: generate a migration from schema changes
npm run db:migrate    # apply pending migrations (deliberately manual)
npm run db:seed       # (re)seed Postgres from the reviewed typed catalogue
npm run db:admin      # create/update an admin account (interactive, needs a TTY)
npm run db:studio     # drizzle-kit studio, a DB browser
```

**First deploy, in order:** `docker compose up -d db` → `npm run db:migrate` →
`npm run db:seed` → `npm run db:admin` → `docker compose up -d --build`.
Migrations never run automatically on boot: two replicas starting at once would
race, and a mistyped env var would run them against the wrong database.

**Node runtime is pinned, not remembered.** `package.json` `engines` requires
Node >= 20.9 / npm >= 10 (Next 16's floor), `.npmrc` sets `engine-strict=true`
so a wrong runtime fails the install instead of warning, and `.nvmrc` pins 22 to
match `ARG NODE_VERSION` in the Dockerfile. Keep `.nvmrc` and the Dockerfile arg
in step. If `npm install` fails with `EBADENGINE`, the fix is to switch Node —
never to disable `engine-strict`.

Verification expectation for any change: `npm run typecheck` **and** `npm run
lint` must be clean. Run the build too when the change touches routing,
metadata, `generateStaticParams`, or anything build-time — via
`docker compose build web` if the local Node is older than 20.9.

## Standing documents

- `docs/data-layer-boundary.md` — what the `lib/content.ts` rule actually means,
  and the minimum change required before the Phase 2 API migration. Read this
  before touching data access.
- `docs/pending-cerium-decisions.md` — open questions that are Cerium's to
  answer, not ours. Never resolve one of these in code.

## Architecture boundaries

```
src/app/          routes (App Router) — 6 static pages + 3 dynamic + studio + api/studio
src/components/   ui/ layout/ sections/ cards/ search/ motion/ studio/
src/config/       site.ts — the ONLY place site/contact/brand/env config lives
src/data/         typed content, the Phase 1 "database"
src/lib/          content.ts (data access seam), seo.ts, cloudinary.ts, slug.ts, cn.ts, studio-*
src/types/        content.ts — the shapes the UI consumes
```

**The data-access seam is `src/lib/content.ts`.** Catalogue content (categories,
products, applications, industries) must be read through its `fetch*`
functions, which are `async` on purpose so Phase 2 can swap in HTTP calls
without touching a single component. Do not add new direct catalogue imports
from `@/data/taxonomy` or `@/data/applications` into pages/components — extend
`lib/content.ts` instead. (Predicates like `isPublishable`/`flattenCategories`
and non-catalogue data — `company.ts`, `navigation.ts`, `media.ts` — are
imported directly today; that is the current convention, not a bug.)

**Backend decision (supersedes the Django plan).** Django + PostgreSQL as a
separate service was the plan through Phase 2.3B. It was dropped in favour of an
admin inside this Next.js app, backed by Postgres via Drizzle, with Cloudinary
for media. Anything in `docs/` describing a Django API describes the superseded
plan; the entity model in `docs/phase-2-2a-schema-specification.md` is still
authoritative and `src/db/schema.ts` follows it.

`lib/content.ts` is still the only seam. It now resolves Postgres first and
falls back to the reviewed typed data when no database is reachable — which is
what lets `next build` prerender inside a Docker stage with no `db` service, and
keeps the site serving during a database outage. **Do not delete `src/data/`**:
it is the seed, the build-time source and the outage floor.

## Routing

- `/products/*` — what the material **is** (product families/ranges)
- `/applications/*` — what it is **for** (Skin Care, Fabric Care, …)
- `/industries/*` — who it is **for** (Personal Care, Home Care)

That one-job-per-URL split is a deliberate Phase 1 decision (documented at the
top of `src/data/taxonomy.ts`) taken to avoid duplicate, competing URLs. Do not
add a fourth overlapping set of category pages.

Dynamic routes use `generateStaticParams` + `notFound()`, params are `Promise`
(Next 16). Slugs are always meaningful strings, never numeric IDs. A category
only gets a page when `isPublishable()` — it has products or children — so thin
pages cannot ship.

## API structure

Two API surfaces:

- `src/app/api/auth/*` — Auth.js callbacks for the admin.
- `src/app/api/studio/*` — the legacy **Content Studio** at `/studio`, still
  hard-disabled outside development by `src/lib/studio-guard.ts`. Superseded by
  `/admin`; it writes to the source tree and cannot work on a deployed
  container. Remove it once the admin has fully replaced it.

`robots.ts` disallows `/api/`, and `/admin` sets its own `noindex` so it stays
unindexed regardless of the site-wide indexing flag.

**The admin (`/admin`).** Authenticated, deployable, writes to Postgres.
Authorisation lives in `requireUser()` / `requireUserForAction()`
(`src/lib/admin-guard.ts`) and **every page and every Server Action calls one of
them**. `src/middleware.ts` only redirects on a missing cookie — it runs on the
Edge runtime where bcrypt and `pg` cannot load, so it is a UX affordance, never
the security boundary. A Server Action is a POST endpoint reachable without
rendering its page; guarding the layout does not guard the action.

Accounts are created only by `npm run db:admin`. There is no sign-up route, no
password-reset endpoint and no user-management screen, on purpose.

## Design system (Phase 1 rules)

- **Never hardcode a colour, size, radius, shadow, or duration in a component.**
  Add or use a token in the `@theme` block of `src/app/globals.css`.
- Colour: green is the primary brand identity (from the 2026 printed
  catalogue); the logo's pure `#0000FF` is refined to `--color-secondary` and
  used only as a supporting accent. Contrast ratios are documented per token —
  tokens marked **GRAPHICAL ONLY** (`--color-accent`, `--color-text-light`)
  must never carry small body text.
- Type: Newsreader (serif) is reserved for display/h1/h2 only; h3 and below
  return to Inter Tight. The uppercase `Eyebrow` is a `<p>`, never a heading.
- Primitives are mandatory: `Container` (horizontal rhythm), `Section`
  (vertical rhythm + surface tone), `Heading` (`level` is semantic, `size` is
  visual — never fake hierarchy with the tag), `Button`/`TextLink`, `Badge`,
  `CeriumImage`.
- Motion is CSS-only, driven by `[data-reveal]` + one shared
  IntersectionObserver in `Reveal`. No animation library. Content must always
  end visible — reduced-motion and no-JS both force the final state.
- Accessibility is not optional: real `<button>`/`<a>` elements, visible
  `:focus-visible` outlines (re-targeted on `.on-dark`), labelled section
  landmarks, zoom never blocked, colour never the sole carrier of meaning.
- Restrained radii and shadows — borders do most of the separation. This is not
  a rounded-card site.

## Branding rules

- Name is **Cerium Chemicals**. Logos: `/brand/cerium-logo.png` and
  `cerium-logo-white.png` (for dark surfaces) — use the `Logo` component.
- Theme colour `#21683f`. Voice: factual, industrial, understated. No hype, no
  invented superlatives.
- Never restate a Cerium claim in stronger terms than the source document.

## Data integrity — the hard rule

**Never invent product or technical information.** No CAS numbers, INCI names,
specifications, certifications, origins, stock levels, prices, founding dates,
employee counts, awards, or ratings unless they appear in a supplied Cerium
document. This is not stylistic caution — for a chemicals supplier it is a
safety and liability matter, and fabricated structured data is a manual-action
risk.

- Every content entry carries a `source: SourceDocument` marking provenance.
  Add content without a source and the provenance chain rots.
- Benefit/summary copy is verbatim from the catalogue or price lists. Do not
  paraphrase it into a claim.
- Counts ("N products") are always derived from the data, never hardcoded.
- Known gaps are recorded, not filled: catalogue pages 12–13 are missing from
  the supplied PDF; some entries were obscured and were **omitted rather than
  guessed**. Preserve that behaviour.
- Prices exist in the supplied price lists and are deliberately not modelled —
  publishing B2B pricing is Cerium's commercial decision.
- Missing data degrades gracefully. Most type fields are optional; render
  nothing rather than placeholder prose.

## SEO-first principles

- Every indexable page builds metadata through `buildMetadata()` in
  `src/lib/seo.ts` and therefore declares a canonical URL. No exceptions.
- Structured data: `Organization` + `WebSite` in the root layout;
  `BreadcrumbList` and `ItemList` per page. `ItemList` — **not** `Product` —
  because Cerium has supplied no offer data. Do not upgrade it until real
  price/availability/SKU data exists.
- `sitemap.ts` is generated from the same data that generates the routes, so it
  cannot list a page that does not exist. Never hand-maintain it.
- **Admin writes call `revalidatePath("/", "layout")`.** The public site is
  statically generated, so without that an edit saves and appears to do nothing.
- `robots.ts` **disallows everything unless `NEXT_PUBLIC_ALLOW_INDEXING=true`**.
  That default is deliberate — an indexed staging site is far worse than a
  temporarily blocked production one.
- Descriptions come from real Cerium information. No keyword stuffing, no
  generated filler.
- Static generation is the default; it is the fastest and most crawlable.

## Images / media (Cloudinary)

- `CeriumImage` is **the only image component**. Everything goes through it so
  responsive sizing, lazy loading, format negotiation and the Cloudinary
  migration happen in exactly one place.
- No real photography has been supplied. When a slot has no image, `CeriumImage`
  renders a visibly-labelled **"Image pending"** development placeholder. That is
  intentional. **Never fill a slot with stock imagery** that implies it shows
  Cerium's products, facilities, team, or customers — a placeholder is honest.
- Cloudinary is wired but **not active**: set `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
  and populate `image.cloudinaryId` instead of `src`. `cloudinaryLoader`
  (`f_auto,q_auto,c_limit,w_*`) then bypasses the Next optimizer. No data entry
  currently uses `cloudinaryId`.
- `res.cloudinary.com` is the only allowed remote image host (`next.config.ts`).
- Adding an image means editing `src/data/media.ts` / `taxonomy.ts` /
  `applications.ts` only — no component edits. See `public/images/README.md`.
- `alt` describes content and purpose, never the filename; `alt: ""` only for
  genuinely decorative images.

## Environment variables

- `NEXT_PUBLIC_*` are **inlined at build time**, so they are passed as Docker
  build args in `docker-compose.yml` and must be rebuilt after any change.
- Current vars: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`,
  `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ALLOW_INDEXING`, plus `DOMAIN` /
  `ACME_EMAIL` for Caddy. Server-only Cloudinary credentials sit in `.env` and
  are **not read by any code yet**.
- All env access is centralised in `src/config/site.ts`. Do not read
  `process.env` from a component. Document every new var in `.env.example`.
- `.env` is gitignored; `.env.example` is committed. Never commit real secrets.

## Docker / deployment

- Multi-stage `Dockerfile` (deps → builder → runner), `node:22-alpine`,
  `output: "standalone"`, runs as non-root `nextjs` user on port 3000.
- `docker-compose.yml`: `web` (internal only, `expose`) + `caddy` (ports
  80/443, automatic TLS via Let's Encrypt, HSTS, www → apex redirect).
- Baseline security headers are in `next.config.ts`; CSP is deliberately
  deferred to the proxy in Phase 14 — do not add a guessed CSP.
- `poweredByHeader: false`, `reactStrictMode: true`. Leave both.

## Coding conventions

- TypeScript strict; no `any`. Import alias `@/*` → `src/*`.
- Server Components by default. `"use client"` only where interaction demands
  it (currently: Header, MegaMenu, MobileNavigation, SearchOverlay, Reveal,
  error boundary, Studio forms).
- `import "server-only"` in modules that must never reach the client.
- Named exports for components; one primary component per file. Props are
  typed interfaces with closed variant unions (`Record<Variant, string>` maps),
  not open-ended `className` soup.
- Comments explain **why**, not what — the codebase is heavily and
  deliberately commented with rationale and trade-offs. Match that: when you
  make a non-obvious decision, record the reasoning. Do not strip existing
  rationale comments.
- Slugs come from `slugify()`. Class names are joined with `cn()`.
- API handlers rebuild request bodies field by field and never spread user
  input into stored data. Keep that.

## Known risks / open items (recorded, not fixed)

1. **The local machine runs Node 18.19.1, below Next 16's floor.** This is now
   pinned rather than assumed (`engines`, `engine-strict`, `.nvmrc`), so it
   fails loudly instead of silently — but the local box still cannot run
   `npm run build`. Build via `docker compose build web` (node:22-alpine).
2. **No tests.** `npm run typecheck` and `npm run lint` exist and must pass, but
   there is no runner and no test file. Do not claim a change is "tested".
3. `src/lib/api` is referenced in comments (`types/content.ts`,
   `config/site.ts`) but **does not exist**; `apiConfig` is exported and unused.
   Both are Phase 2 placeholders.
4. `lib/content.ts` overstates its own rule. Only three non-Studio files
   actually bypass the seam for catalogue records, but the whole catalogue does
   reach the client bundle through `SearchOverlay` and `navigation.ts`. Full
   analysis and the recommended sequence: `docs/data-layer-boundary.md`.
5. `package-lock.json` currently carries 114 deletions that are **not** project
   work — npm 9.2.0 (Node 18) stripped the `libc` metadata that npm 10+ had
   written for platform-specific optional dependencies. Revert it rather than
   committing it; `engine-strict` now prevents a recurrence.
6. The Caddyfile HSTS header is deployment hardening that `next.config.ts`
   attributes to Phase 14. It is correct and safe, but `includeSubDomains`
   applies to every subdomain of the apex — confirm no subdomain needs plain
   HTTP before this ships.
7. The taxonomy is **provisional** and is replaced by the Phase 2 database
   taxonomy. Nothing may hardcode a category. Product data is names + benefit
   copy only; catalogue pages 12–13 are missing from the source PDF.
8. The Food Ingredients conflict between `site.ts` and `taxonomy.ts` blocks
   taxonomy finalization and is **Cerium's decision, not ours**. Do not resolve
   it in code — see `docs/pending-cerium-decisions.md`.
9. Social profile URLs for Facebook/Instagram/LinkedIn are **unknown** and left
   `undefined` until Cerium confirms the handles.
10. Search is a **UI shell only** — it deliberately does not filter local data.
    Do not make it fake results; it connects to a real backend in Phase 4.
11. The contact page has no working form — an enquiry system is Phase 11, and a
    form that silently discards submissions is worse than none.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
