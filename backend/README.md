# Cerium Chemicals — Django backend

Identity, the editorial admin, AI-assisted copy and Cloudinary ingest.
`CLAUDE.md` at the repository root treats this file as authoritative for
everything under `backend/`.

## What lives here, and what does not

| Concern | Where |
|---|---|
| Admin accounts (`auth_user`) | **Here.** The only identity store. |
| Editorial admin | **Here**, at `/django-admin/`. |
| AI copy generation | **Here**, `catalogue/services/ai_content.py`. |
| Cloudinary ingest (file **and** URL) | **Here**, `catalogue/services/cloudinary_ingest.py`. |
| The public website | Next.js at the repository root. |
| Catalogue the public site currently reads | Still the Drizzle database + `src/data/`. |

**The catalogue is not cut over yet.** Django owns `cerium_production`; the
Next.js app's Drizzle schema still owns `cerium`, and the public site reads
through `src/lib/content.ts` as before. Two migration systems must never point
at one database — each believes it owns the table definitions and neither reads
the other's history table. Unifying them is the Phase 2.4C cutover.

## Two databases

`backend/initdb/01-create-django-db.sh` creates `cerium_production` alongside
`cerium` on the database volume's **first** boot. It refuses outright if
`POSTGRES_DJANGO_DB` equals `POSTGRES_DB`. On an existing volume it does not run
at all, so create the database by hand there:

```sql
CREATE DATABASE cerium_production OWNER cerium;
```

## Configuration

Every value comes from the `.env` at the **repository root** — the same file the
frontend and compose read. There is deliberately no `backend/.env`: two
configuration files for one deployment is how a shared secret drifts apart from
itself.

`DJANGO_SECRET_KEY` has no default. A settings module that boots with a fallback
key eventually ships with it, and the failure is silent.

## Sign-in: one set of credentials

`/admin` (Next.js) and `/django-admin/` verify the same `auth_user` row, so one
person has one username, one email and one password for both.
`src/lib/auth.ts` POSTs to `/api/admin/auth/verify/`; it never reads a users
table and never handles a hash.

### That endpoint is a password oracle

Read `accounts/views.py` before touching it. Four protections:

1. **Not routed from the internet.** Caddy publishes `/django-admin/*` and
   `/django-static/*` only. Do not add a broader matcher.
2. **`X-Service-Token`**, compared with `secrets.compare_digest`. An unset token
   means refuse everything (403) — fail closed.
3. **No account enumeration.** Wrong password, unknown user and disabled account
   all return an identical 401. The email→username lookup still runs the
   password hasher when nothing matched, so timing does not leak either.
4. **Throttled** per identifier+IP, returning 429.

> The throttle depends on a cache **shared across processes**. It was originally
> `LocMemCache`, which is per-process: with gunicorn's 3 workers, 12 consecutive
> bad passwords produced 12 × 401 and never a 429 — the effective limit was
> triple what was configured. It is now `DatabaseCache`, which needs
> `manage.py createcachetable`. Do not move it back to local memory.

## Accounts

Created by CLI only. No sign-up route, no password-reset endpoint, no
user-management screen in either application, on purpose.

```bash
docker compose run --rm backend python manage.py create_admin
```

Interactive by default so the password stays out of shell history. `--password`
exists for automation and says so. Passwords go through Django's configured
validators — a CLI that accepts what the web form rejects is a hole with extra
steps. `--update` resets an existing account's password.

`npm run db:admin` is **retired**; it used to create a second account in the
Drizzle `users` table that the sign-in page no longer reads.

## AI copy — the model is an assistant, never a source

`catalogue/services/ai_content.py` is the most dangerous file here. A language
model will produce a CAS number, an INCI name or a purity figure for any
chemical you name, and every one will look correct.

Three mechanisms, in order of how much they are relied on:

1. **The output shape cannot carry a specification.** The model returns a
   description, an SEO title and an SEO description. There is no field for a CAS
   number, so there is nowhere for one to go. This is the protection that works,
   because it does not require the model to cooperate.
2. **Every returned string is scanned** for CAS-shaped digits, percentages,
   ISO/GMP/ECOCERT references, pH and physical specifications, INCI mentions and
   shelf-life claims. A hit discards the whole generation rather than stripping
   it — a sentence built around a fabricated number does not survive removal.
3. **The prompt says so.** Listed last deliberately: instructions are the
   weakest mechanism and must never be the only one.

Generated copy always enters as `ai_draft`, and `Product.clean()` refuses to
publish anything still carrying an AI status. Promotion to `human_approved` is a
separate, deliberate admin action — that click *is* the review step. Nothing may
set `authoritative` automatically; that status means verbatim from a supplied
Cerium document.

Without `OPENAI_API_KEY` everything else works and generation fails with a clear
message.

## Images: Cloudinary for bytes, Postgres for metadata

URL ingest **copies** into Cerium's own account rather than hot-linking. A
production catalogue must not depend on a third party's URL staying alive; the
original URL is kept on the row only as an audit note.

Cloudinary performs the URL fetch from its own infrastructure, so a URL pointing
at this network cannot reach our metadata service or internal hosts. The scheme
check still rejects `file://` and similar before any request is made.

## Commands

```bash
docker compose build backend
docker compose run --rm backend python manage.py migrate
docker compose run --rm backend python manage.py createcachetable   # once
docker compose run --rm backend python manage.py create_admin
docker compose run --rm backend python manage.py check --deploy
```

Migrations never run on boot: two replicas starting at once would race, and a
mistyped env var would migrate the wrong database.

`check --deploy` reports `security.W004` (HSTS) and `security.W008` (SSL
redirect). Both are **expected**: Caddy sets HSTS and redirects HTTP→HTTPS.
Setting them here too would mean two sources of truth for a header that is
painful to walk back.

## Tests

There is no test runner in this repository. The auth contract, the throttle, the
fabrication scanner and the publish guard were verified by hand against a
running container. Do not describe any of it as "tested" in the automated sense.
