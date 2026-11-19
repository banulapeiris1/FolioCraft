# FolioCraft – Phase 10: PUB-06D Defect Fixes (D5 & D6)

**Date:** 2026-11-19
**Branch:** `feat/publishing` (no commits, pushes, merges, rebases, stashes, resets or branch switches)
**Scope:** Only D5 and D6 from [PUB-06 QA](./PUB-06-End-to-End-Publishing-QA.md). No PUB-07 work and no new features.

## Summary

| Defect | Status | Enforcement point |
|---|---|---|
| **D6** Publishing bypass through generic create/update | **FIXED** | API boundary (controller) + service guard |
| **D5** Inconsistent username rules | **FIXED** | One shared `validateUsername()` used by create, update, check-username and publish |

| Verification | Result |
|---|---|
| New PUB-06D suite (`publishingIntegrity.routes.test.ts`) | **15/15 PASS** |
| Portfolio, publishing and public suites (7 suites) | **103/103 PASS** |
| Full backend suite (CV/Gemini suites excluded) | **501/501 PASS** |
| Frontend tests | **74/74 PASS** |
| Frontend TypeScript (`tsc --noEmit`) | **PASS** |
| ESLint, changed frontend files and Phase 10 frontend files | **PASS** |
| ESLint, backend | **NOT APPLICABLE** (no ESLint config or install in `backend/`) |
| Next.js production build | **PASS** |
| Real portfolio data before and after | **UNCHANGED** (snapshot diff identical) |

---

## 1. Root Causes

### D6 – Publishing bypass
Before Phase 10, publishing was just a portfolio column, and `published` was an ordinary optional field in `createPortfolioSchema`, `updatePortfolioSchema`, `CreatePortfolioDto` and `UpdatePortfolioDto`:
- `createPortfolio` inserted `data.published ?? false`.
- `updatePortfolio` wrote `published` and managed `published_at`.

PUB-03 added the validated `POST /:id/publish` and `/:id/unpublish` endpoints but left the older path open. Any owner could send `PUT {"published": true}` (or `POST` with `published:true`) and skip every readiness check: reserved or invalid username, supported template, name and title. PUB-06 showed this live: a portfolio with the reserved username `about` and template `nonexistent-template` became publicly served.

### D5 – Inconsistent username rules
Usernames were validated by two separate implementations:
- **zod schemas (create/update):** 1–50 characters, regex only, no minimum of 3, no reserved-name check.
- **`validateUsername()` (check-username/publish):** 3–50 characters, regex, reserved list.

So create/update accepted names like `ab` and `about` that publishing then rejected, leaving a portfolio that could never be published. The frontend form only caught these through a debounced async availability check.

## 2. Files Changed

| File | Change |
|---|---|
| `backend/src/utils/validation.ts` | Shared zod `usernameField` built on `validateUsername()`. Added `PROTECTED_PUBLISHING_FIELDS`, `PROTECTED_PUBLISHING_FIELD_MESSAGE` and `findProtectedPublishingField()`. `validateUsername` now returns "Username is required" for whitespace-only input. Removed `published` from both portfolio schemas |
| `backend/src/controllers/portfolio.controller.ts` | Create and update reject protected fields with 400 before schema parsing. `published` removed from the allowed update keys |
| `backend/src/services/portfolio.service.ts` | `assertNoPublishingFields()` guard in create and update. `validateUsername()` in create and update. New portfolios always insert `published=false`. The `published`/`published_at` branch was removed from `updatePortfolio` |
| `backend/src/types/portfolio.types.ts` | `published` / `publishedAt` removed from `CreatePortfolioDto` and `UpdatePortfolioDto` (still present on the `Portfolio` response type) |
| `frontend/src/components/portfolio/PortfolioForm.tsx` | Sync minimum-length (3) check added. The availability check is skipped below 3 characters |
| `backend/src/routes/publishingIntegrity.routes.test.ts` | **New**: 15 regression tests |
| `backend/src/routes/publishing.routes.test.ts` | PUB-03 C8 updated (see §5) |
| `backend/src/routes/portfolio.routes.test.ts` | PORTFOLIO-03 test 1 and PORTFOLIO-05 test 12 updated (see §6) |
| `backend/src/services/portfolio.service.test.ts` | PORTFOLIO-02 tests 1–4 and 11/12 updated (see §6) |

## 3. Implementation Details

### D6
- **API boundary:** `findProtectedPublishingField(req.body)` checks for `published`, `publishedAt` and `published_at` by own property. The check doesn't care about the value: `true`, `false`, `null` and timestamps are all rejected. It runs before validation and before any database access, so a request that mixes protected and ordinary fields is rejected **as a whole** with no partial update.
  - `POST /api/portfolios` → `400 "'published' cannot be set when creating a portfolio. Publishing state cannot be set through this endpoint. Use POST /api/portfolios/:id/publish or POST /api/portfolios/:id/unpublish."`
  - `PUT /api/portfolios/:id` → `400 "'<field>' cannot be modified through portfolio update. …"`
- **Defence in depth:** the service rejects the same fields if a caller bypasses the controller. Neither the schemas nor the DTOs carry the fields any more, so no code path can write them.
- **Single writer:** `published` and `published_at` are now written only by `publishPortfolio` (`published = true`, `published_at = COALESCE(published_at, CURRENT_TIMESTAMP)`) and `unpublishPortfolio` (`published = false`). New portfolios are always drafts.
- **Authorization unchanged:** ownership checks (403) and authentication (401) behave as before. Because the protected-field check runs first, a non-owner sending a protected field gets 400. That response is the same for owned and unowned IDs, so it reveals nothing about ownership.

### D5
- `validateUsername()` (3–50 characters, `[a-zA-Z0-9_-]`, reserved list, trim + lowercase) is the one rule set. It is applied at:
  - the create/update zod schemas (`usernameField` = `superRefine(validateUsername)` + normalising `transform`)
  - `PortfolioService.createPortfolio` / `updatePortfolio`
  - `checkUsernameAvailability` (unchanged)
  - `publishPortfolio` (unchanged)
- Every entry point returns the **same message** for the same invalid input. The tests assert this.
- Case-insensitive uniqueness is still enforced by `idx_portfolios_username_lower` (409 on create/update) and by the availability check. The owner's own username is still reported available with `?portfolioId`, and re-saving it (any case) succeeds and stores it lowercase.
- Frontend: the form's sync check now includes the minimum length. Reserved names stay server-authoritative (availability check plus create/update 400), so no second reserved list can drift out of sync.

## 4. Regression Tests Added (`publishingIntegrity.routes.test.ts`)

Real HTTP calls against an in-process instance of the app using the real database. Test users are tagged `pub06d_*@foliocraft.test` and removed in `after()`.

| ID | Requirement | Result |
|---|---|---|
| D6-1 | PUT `published:true` rejected; stays private (DB + public API 404) | PASS |
| D6-2 | PUT mixing protected and ordinary fields: rejected, no partial update | PASS |
| D6-3 | POST create with `published:true` rejected; no row created | PASS |
| D6-4 | Ordinary updates (title/about/template) still work; publishing state untouched | PASS |
| D6-5 | Dedicated publish endpoint works; public API 200 | PASS |
| D6-6 | PUT `published:false` rejected; stays public; `published_at` unchanged | PASS |
| D6-7 | PUT `published_at` / `publishedAt` rejected; timestamp unchanged | PASS |
| D6-8 | Dedicated unpublish works; first-publish timestamp retained | PASS |
| D6-9 | Other user cannot PUT (403), publish (403) or unpublish (403); protected-field attempt refused | PASS |
| D6-10 | Failed publish validation (reserved username, unsupported template) never makes the portfolio public, and the PUT bypass is closed | PASS |
| D5-1 | Create, update and check-username reject short, long, reserved, mixed-case reserved and invalid-character usernames with **identical messages** | PASS |
| D5-2 | Publish applies the same rules to legacy rows | PASS |
| D5-3 | Case-insensitive collisions rejected on create (409), update (409) and check (unavailable) | PASS |
| D5-4 | Owner's existing username stays available while editing; re-save normalises case | PASS |
| D5-5 | Valid usernames work: mixed case normalised, 3- and 50-character boundaries, publish end-to-end | PASS |

## 5. Updated PUB-06 Test

**PUB-03 C8** (added in PUB-06) previously asserted that `PUT {published:false}` returned 200 and kept `published_at`. That is now the forbidden path. It asserts **400**, the portfolio **stays published**, and `published_at` is unchanged.

## 6. Backward Compatibility

The older suites mixed legitimate CRUD expectations with the unsafe publishing behaviour. Only the conflicting assertions were changed:

| Test | Old expectation | Classification | Change |
|---|---|---|---|
| PORTFOLIO-03 test 1 (route create) | Sent `published:false` on create | Unsafe input (protected field) | Field removed from payload; still asserts the portfolio is created as a draft. All other create assertions unchanged |
| PORTFOLIO-05 test 12 (route update) | PUT `{username, published:true}` → `published:true` | Unsafe (the bypass) | Now PUT `{username, title}`; asserts username kept, title updated, `published` still `false` |
| PORTFOLIO-02 tests 1–4 (service create) | `createPortfolio({… published:true})` → `published:true` | Unsafe | Field removed; asserts `published:false` (drafts) |
| PORTFOLIO-02 tests 11/12 (service update) | Unspecified fields preserved, including `published:true` | Legitimate intent (preservation), outdated value | Asserts preserved value `false` |

All other create, read, update and delete behaviour is unchanged: field updates, unknown-key handling, 409 collisions, ownership 403/404, delete, and response shapes (`{ portfolio }` still includes `published` and `publishedAt` as read-only output).

**API contract change (intentional):** clients that send `published`, `publishedAt` or `published_at` to `POST /api/portfolios` or `PUT /api/portfolios/:id` now receive 400. A search of the frontend found no such payloads; the form never sends them, and publishing goes through `PublishModal` → `/publish` and `/unpublish`.

**Existing data:** all 8 stored usernames were checked against the shared validator and **0 are invalid**, so no existing user is blocked from saving their portfolio. (Edit-form saves always resend the username.)

## 7. Test Results

| Run | Command | Result |
|---|---|---|
| D5/D6 + portfolio + publishing + public | `npx tsx --test src/routes/publishingIntegrity.routes.test.ts src/routes/publishing.routes.test.ts src/routes/portfolio.routes.test.ts src/services/portfolio.service.test.ts src/routes/public.routes.test.ts` | 103/103 PASS |
| Full backend (all db/routes/services suites except CV) | `npx tsx --test <files>` | 501/501 PASS (PUB-06 baseline 485 + 16 from the new file: 15 subtests + its parent test; the reworked C8 was already counted) |
| Frontend (LP-02, LP-03, PUB-04, PUB-05, TPL-08, TPL-02) | `node --import ../backend/node_modules/tsx/dist/loader.mjs --test src/templates/*.test.ts` | 74/74 PASS |
| Frontend TypeScript | `npx tsc -p tsconfig.json --noEmit` | PASS (exit 0) |
| Frontend ESLint (PortfolioForm + all Phase 10 frontend files) | `npx eslint …` | PASS (exit 0) |
| Backend ESLint | — | NOT APPLICABLE: no ESLint config/install in `backend/` |
| Backend `tsc` | `npx tsc --noEmit -p backend/tsconfig.json` | Informational: the backend has no type-check gate (it runs via `tsx`) and 633 pre-existing config-level errors (`verbatimModuleSyntax`/CommonJS, `exactOptionalPropertyTypes`). Changed files show only those pre-existing categories |
| Production build | `npm --prefix frontend run build` | PASS |

The PUB-02 migration suite ran within the full backend run and uses the transactional rollback check from PUB-06. **No destructive rollback was run against the shared database.** The real-portfolio snapshot taken before this task matched exactly afterwards, and no `pub06d_*` users or test portfolios remain.

## 8. Remaining Issues

- **Running servers:** the processes noted in PUB-06 (ports 3000, 3001, 5000, 5001 and a separate `next dev`) were left untouched as instructed. The `:5000`/`:5001` backends still run **pre-fix code** until restarted, so the bypass stays open on those instances. Verification used in-process servers. The production build was regenerated, so the long-running `next start` instances on 3000/3001 may need restarting to serve consistent assets.
- **No interactive browser test** of the form's new minimum-length message (no browser automation available). Server behaviour is covered by the PUB-06D suite.
- **Frontend unit coverage:** `PortfolioForm.validateField` is internal to the component and has no direct unit test. The rule it mirrors is covered on the backend.
- Items carried over from PUB-06 and **not** addressed (out of scope):
  - L1: streamed not-found pages return HTTP 200 with `noindex`.
  - L2: `NEXT_PUBLIC_APP_URL` is unset.
  - L4: nested item UUIDs appear in the public payload.
  - L5: tests share the development database, and 198 leftover test users from older runs remain.
  - L7: 5 pre-existing frontend ESLint errors outside Phase 10.

## 9. Final Git Status

```text
On branch feat/publishing
 M backend/src/config/database.ts
 M backend/src/controllers/portfolio.controller.ts
 M backend/src/db/schema.sql
 M backend/src/routes/portfolio.routes.test.ts
 M backend/src/routes/portfolio.routes.ts
 M backend/src/server.ts
 M backend/src/services/portfolio.service.test.ts
 M backend/src/services/portfolio.service.ts
 M backend/src/types/portfolio.types.ts
 M backend/src/utils/validation.ts
 M frontend/package.json
 M frontend/src/app/dashboard/page.tsx
 M frontend/src/app/portfolio/create/page.tsx
 M frontend/src/app/portfolio/edit/[id]/page.tsx
 M frontend/src/components/portfolio/PortfolioCard.tsx
 M frontend/src/components/portfolio/PortfolioForm.tsx
 M frontend/src/components/portfolio/PortfolioIcons.tsx
 M frontend/src/lib/api.ts
 M frontend/src/types/portfolio.ts
?? backend/src/controllers/publicPortfolio.controller.ts
?? backend/src/db/migrate-pub02.ts
?? backend/src/db/migrations/
?? backend/src/db/pub02.migration.test.ts
?? backend/src/routes/public.routes.test.ts
?? backend/src/routes/public.routes.ts
?? backend/src/routes/publishing.routes.test.ts
?? backend/src/routes/publishingIntegrity.routes.test.ts
?? backend/src/services/publicPortfolio.service.ts
?? docs/
?? frontend/src/app/u/
?? frontend/src/components/portfolio/PublicPortfolioStatus.tsx
?? frontend/src/components/portfolio/PublishModal.tsx
?? frontend/src/templates/publicPortfolioRoute.test.ts
?? frontend/src/templates/publishingControls.test.ts
```

Newly modified in PUB-06D: `backend/src/routes/portfolio.routes.test.ts` and `backend/src/services/portfolio.service.test.ts` (previously clean tracked files). New untracked: `backend/src/routes/publishingIntegrity.routes.test.ts` and this report. All earlier PUB-02 to PUB-06 work is preserved.

**PUB-06D is complete. Awaiting approval before the next task.**
