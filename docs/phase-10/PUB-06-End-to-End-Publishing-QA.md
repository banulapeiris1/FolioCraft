# FolioCraft – Phase 10: PUB-06 End-to-End Publishing QA & Verification

**Date:** 2026-11-19
**Branch:** `feat/publishing` (no commits, pushes, merges, rebases, stashes, resets or branch switches performed)
**Scope:** QA of PUB-02 → PUB-05 publishing workflow; defect fixes limited to Phase 10.

## Summary

| Area | Result |
|---|---|
| Live API + SSR end-to-end run (final) | **59 PASS / 1 FAIL** (+10 observations) |
| Backend regression (33 suites, CV/Gemini suites excluded) | **485 / 485 PASS** |
| Frontend test suites (6 suites) | **74 / 74 PASS** |
| Frontend TypeScript (`tsc --noEmit`) | **PASS** (0 errors) |
| ESLint – Phase 10 files | **PASS** (0 errors, 0 warnings) |
| ESLint – whole frontend | **FAIL** (5 errors, 11 warnings, all in pre-existing non-Phase-10 files) |
| Next.js production build | **PASS** |
| Interactive browser testing | **NOT TESTED** (no browser automation available; see §12) |
| Real data integrity after QA | **PASS** (pre/post snapshot identical) |

**Defects found: 6. Fixed: 4 (each with regression tests). Awaiting approval: 2** (they change a pre-Phase-10 API contract; see §11).

---

## 1. QA Environment & Configuration

| Item | Value |
|---|---|
| OS | Windows 11 Pro |
| Node.js | v22.18.0 |
| Next.js | 16.3.5 (`next build --webpack`, served with `next start`) |
| PostgreSQL | 18.6 (local, the shared development database from `backend/.env`) |
| Backend | Express 5 via `tsx src/server.ts` |
| Frontend API base | `NEXT_PUBLIC_API_URL=http://localhost:5000` |
| `NEXT_PUBLIC_APP_URL` | **Not set** (affects canonical URL, see §13) |

Test runs:
- Initial run: backend `:5000` + production frontend `:3000`.
- After fixes, the original server processes could not be terminated from the QA session. Fresh instances of the fixed code were started on backend `:5001` and frontend `:3001` (rebuilt production bundle) for the final run. The frontend build's API URL still targeted `:5000`; the public API code is unchanged between those builds and both read the same database.

Specification note: `FolioCraft_Project_Specification.pdf` is **not present in the repository**, so it was not reviewed. The QA used the PUB-01, PUB-03, PUB-04 and PUB-05 reports in `docs/phase-10/`.

## 2. Test Accounts & Test Data

- The live E2E run created users `pub06_qa_<runTag>_a@foliocraft.test` and `pub06_qa_<runTag>_b@foliocraft.test` with random, unrecorded passwords. Their portfolios used `pub06qa-<runTag>` plus probe usernames `ab`, `xm` and `about`.
- All PUB-06 test users and portfolios were deleted after each run. The deletion was scoped to `email LIKE 'pub06_qa_%@foliocraft.test'` inside a transaction. Final count of PUB-06 users is 0.
- Automated suites create and remove their own `@foliocraft.test` users.
- **Real data protection:** before any testing, the 7 portfolios belonging to non-test users were snapshotted (id, template, published, `published_at`, `updated_at`, username hash, project/skill/experience counts). After all testing the snapshot was **byte-identical**. That includes the one real published portfolio and its `published_at`.
- Pre-existing finding: the database holds **198 leftover `@foliocraft.test` users** from earlier test runs. They were not created by PUB-06 and were not touched.

## 3. End-to-End Scenarios & Results (live API + server-rendered pages)

The scripted run used real HTTP calls against the running backend and the production Next.js server, with direct database checks.

### Scenario A – Create & Publish
| ID | Check | Result |
|---|---|---|
| A1 | Register + JWT authentication | PASS |
| A2 | Create portfolio (201); defaults to Draft, `publishedAt=null` | PASS |
| A4 | Username availability before create → available | PASS |
| A4b | Owner's own username with `?portfolioId` → available | PASS |
| A5 | Add 2 projects, 1 skill, 1 experience | PASS |
| A6/A7 | Publish → 200, `published:true`, `publishedAt`, `publicUrl=/u/<username>` | PASS |
| A8 | DB: `published=true`, `published_at` set | PASS |
| A9 | Dashboard list API shows `published:true` | PASS |
| A10 | `/u/<username>` resolves | PASS |

Observation A4c: when the owner checks their own username **without** `portfolioId`, the API reports `available:false`. This matches the design; the UI always passes `portfolioId`.

### Scenario B – Anonymous Public Access
| ID | Check | Result |
|---|---|---|
| B1/B1b | Public API 200 without JWT; case-insensitive lookup | PASS |
| B2 | Logged-out page request → 200, no auth redirect | PASS |
| B3/B4 | Correct portfolio; correct template (`data-testid="template-minimal"`) | PASS |
| B5/B5b | Name, title, both projects, skill, experience in API and HTML | PASS |
| B6 | Missing optional fields (no email/phone/avatar, project without description) render without error | PASS |
| B7 | `<title>`, meta description, `og:type=profile` correct | PASS |
| B7b | Canonical / `og:url` end with `/u/<username>` | PASS (relative: `/u/<username>`, see §13) |

### Scenario C – Unpublishing
| ID | Check | Result |
|---|---|---|
| C2 | Confirmation dialog | NOT TESTED in browser. Covered by PUB-05 component test (`unpublish-confirm-dialog`) |
| C3 | Unpublish → 200, `published:false`, `publicUrl:null` | PASS |
| C4 | Dashboard list API shows Draft | PASS |
| C6 | Public API → 404 | PASS |
| C7 | Frontend shows branded not-found state, no portfolio content | PASS |
| C7b | Not-found page carries `<meta name="robots" content="noindex">` | PASS (after fix D2) |
| C7c | Nonexistent username renders the same not-found state with noindex | PASS |
| C7e | Crawler (Googlebot user-agent) receives HTTP **404** status | **FAIL**: status is 200; see limitation L1 |
| C8 | DB: username, content counts and first `published_at` preserved | PASS |
| C9 | Repeated unpublish idempotent | PASS |

### Scenario D – Republish
| ID | Check | Result |
|---|---|---|
| D1 | Republish → 200 | PASS |
| D1b | `published_at` keeps first-publish timestamp | PASS |
| D2 | Existing username still valid for its portfolio | PASS |
| D3/D4 | Public URL works again with correct content | PASS |
| D-UI | Republish from the same modal session right after unpublishing | **Was broken** (defect D3, fixed). The fix is verified by a unit test, not in a browser |

### Scenario E – Username Validation
| ID | Case | check-username API | Publish API | Frontend form | Result |
|---|---|---|---|---|---|
| E1 | Valid unused | available | allowed | allowed | PASS |
| E2 | Used by another user | unavailable | 409 | blocked (async check) | PASS |
| E3 | Reserved (`dashboard`) | 400 | 400 | blocked via async check (400 shown) | PASS |
| E4 | Invalid chars (`.`/space) | 400 | 400 | blocked (sync regex) | PASS |
| E5 | 2 chars | 400 | 400 | blocked only via async check | PASS (see D5) |
| E6/E6b | 51 chars / exactly 50 | 400 / available | — | blocked / allowed | PASS |
| E7/E7b | Case-insensitive collision | unavailable; create → 409 | — | — | PASS |
| E8 | Current portfolio's username | available | allowed | "Current username" | PASS |
| E9 | **Create/update accept `ab`, `xm`, `about`** | — | — | — | **Disagreement**, defect D5 (awaiting approval) |

### Scenario F – Security & Authorization
| ID | Check | Result |
|---|---|---|
| F1a–d | Anonymous / invalid-JWT publish, unpublish, check-username → 401 | PASS |
| F3/F3b | User B unpublishing A's portfolio → 403; state unchanged | PASS |
| (suite B3/C3) | User B publishing A's portfolio → 403 | PASS (PUB-03 suite) |
| F4/F4b | Public payload has no `userId`/password/token keys, no account email | PASS |
| F5 | Unpublished and nonexistent → identical `404 {"message":"Portfolio not found"}` | PASS |
| F6 | SQL-injection probe on public API → 400 | PASS |
| F7 | Public HTML contains no JWT, account email or user id | PASS |
| SQL review | All publishing/public queries use `$n` parameters; the only interpolation is the server-built column list in `updatePortfolio` | PASS |
| E11/E12 | **`PUT /api/portfolios/:id {published:true}` bypasses publish validation** | **Defect D6** (awaiting approval) |

Observation F4c: nested `projects[]`, `skills[]` and `experiences[]` in the public payload include their own `id` and `portfolioId` UUIDs. This is not account data, and every mutation is ownership-checked, so the risk is low (§13).

### Scenario G – Templates (via public route → `TemplateRenderer`)
| Template | Result |
|---|---|
| Modern (`template-modern`) | PASS: only this template's root rendered, content present |
| Professional (`template-professional`) | PASS |
| Minimal (`template-minimal`) | PASS |
| Unknown template fallback | PASS (PUB-04 unit test 4). Also observed live: a non-supported template published via the D6 bypass rendered as Modern |

## 4. Browser Test Results

No browser automation (Playwright, Puppeteer or a browser MCP tool) was available, and no new dependencies were installed. **Interactive browser checks were NOT TESTED:** the dashboard publishing modal, live availability feedback while typing, the Publish button, clipboard copy, Visit Live in a new tab, the unpublish confirmation click flow, loading skeleton timing, and responsive layout at different viewports.

What was verified instead:
- Server-rendered HTML of `/u/:username` from the production build (Scenarios B, C, D, G).
- Component rendering of PublishModal and PortfolioCard via PUB-05 unit tests (draft, published and confirm states; disabled Publish when the checklist fails).
- A static code review of PublishModal state handling, which found defects D3 and D4.

## 5. API Test Results

All publishing endpoints were exercised live (Scenarios A–F). Automated suites:

| Suite | Result |
|---|---|
| PUB-02 Public API (`public.routes.test.ts`) | 12/12 PASS |
| PUB-02 Migration (`pub02.migration.test.ts`) | 6/6 PASS (incl. new regression test 6) |
| PUB-03 Publishing (`publishing.routes.test.ts`) | 26/26 PASS (incl. new regression C8) |

## 6. Database Verification

| Check | Result |
|---|---|
| `idx_portfolios_username_lower` UNIQUE on `lower(trim(username))` exists | PASS |
| Case-variant insert rejected (23505), and API create returns 409 | PASS |
| `idx_portfolios_public_lookup` on `(lower(trim(username)), published)` exists | PASS |
| `published_at TIMESTAMPTZ` column exists | PASS |
| `published` toggles correctly on publish/unpublish | PASS |
| First-publish policy: set once via `COALESCE`, kept on unpublish and republish | PASS (both `/unpublish` and, after fix D4, `PUT published:false`) |
| Unpublish preserves username and all content | PASS |
| Migration and rollback | Forward: `20261118_pub02_publishing_indexing.sql`. Rollback: `..._rollback.sql` drops both indexes **and the `published_at` column** (data loss by design). Run with `npx tsx src/db/migrate-pub02.ts [--rollback]`. Rollback → re-apply now verified **inside a transaction that is rolled back** |
| Legacy case-sensitive `portfolios_username_key` UNIQUE also present | Informational; redundant but harmless |

## 7. Security Verification

PASS for authentication (401), ownership (403), draft-enumeration resistance (identical 404s), public-payload sanitisation, parameterised SQL, and no tokens or private account data in public HTML.

Open security-relevant item: **D6, a publish-validation bypass through the generic update endpoint** (see §11).

## 8. Template Verification

All three templates render through `/u/:username` → `TemplateRenderer` → registry (§3 G). No template components were modified.

## 9. Regression Test Results

| Suite group | Result |
|---|---|
| Backend: all suites except CV-route/Gemini-dependent files (33 suites) | **485/485 PASS** |
| Frontend: LP-02, LP-03 (Phase 9 live preview), PUB-04, PUB-05, TPL-08, TPL-02 | **74/74 PASS** |

Commands:
- Backend: `cd backend; npx tsx --test <db, routes and services *.test.ts excluding cv*>`
- Frontend: `cd frontend; node --import ../backend/node_modules/tsx/dist/loader.mjs --test src/templates/*.test.ts`

Excluded: backend CV route/schema suites, because they call the external Gemini API and are unrelated to Phase 10.

Note: a transient PUB-03 B5 failure occurred mid-QA. B5 inserts the hard-coded username `ab`, which a PUB-06 probe portfolio had just claimed. It passed after cleanup; the fragility is recorded in §13.

## 10. TypeScript, ESLint & Production Build

| Check | Result |
|---|---|
| `npx tsc -p frontend/tsconfig.json --noEmit` | PASS, 0 errors |
| ESLint on Phase 10 files (`app/u`, `app/dashboard`, `app/portfolio`, `components/portfolio`, `lib/api.ts`, `types/portfolio.ts`, PUB-04/05 tests) | PASS, 0 problems |
| ESLint whole frontend | FAIL: 5 × `react-hooks/set-state-in-effect` errors in `CvParsedPreview.tsx`, `ExperienceManager.tsx`, `ProjectManager.tsx`, `SkillFormModal.tsx`, `SkillManager.tsx`, plus 11 warnings. All in files **not modified by Phase 10** (pre-existing, last changed in commit 14c1571). Not suppressed, not fixed (out of scope) |
| `npm --prefix frontend run build` (after all fixes) | PASS, all 13 routes incl. `ƒ /u/[username]` |

## 11. Bugs Found & Fixes Applied

### Fixed

**D1. PUB-02 migration test destroyed real `published_at` data (High).**
`pub02.migration.test.ts` test 5 ran the rollback script (`DROP COLUMN published_at`) against the shared database. That would wipe every real portfolio's publication timestamp; the dev DB had one live published portfolio.
- Fix (`backend/src/db/pub02.migration.test.ts`): the rollback → re-apply check now runs on one client inside `BEGIN … ROLLBACK`. PostgreSQL DDL is transactional, so the check runs without touching data. The test also asserts the column is dropped within the transaction.
- Regression test: *6. Rollback verification does not destroy existing published_at data*.
- This fix was applied **before** any suite was run, so no data was lost.

**D2. Unpublished/nonexistent `/u/:username` pages were indexable (Medium, SEO).**
The page returned the not-found UI directly, with HTTP 200 and no `noindex`.
- Fix (`frontend/src/app/u/[username]/page.tsx`): call `notFound()` on API 404 in both `generateMetadata` and the page. This delegates to the existing `not-found.tsx` and makes Next.js inject `<meta name="robots" content="noindex">`. Unpublished and nonexistent usernames still render identically.
- Regression tests: PUB-04 tests 6 and 10 updated to assert the Next 404 signal for both unpublished and nonexistent usernames, and that service errors still fall back gracefully. Verified live (C7b, C7c).
- Side effect: the not-found card now says "this user" instead of echoing `@username`.

**D3. Publish/unpublish wiped portfolio fields from dashboard and editor state (High, UX).**
The publish/unpublish APIs return only `{id, username, published, publishedAt, publicUrl}`. PublishModal passed this partial object to `setCurrentPortfolio` and `onPortfolioUpdated`, and both the dashboard and the editor replaced the full portfolio with it. As a result:
- Cards lost their name, title and template.
- The modal's readiness checklist failed, so **Publish was disabled right after Unpublish**, blocking Scenario D in the UI.
- The editor draft's `template` became `undefined`.

The fix (`frontend/src/components/portfolio/PublishModal.tsx`) adds an exported `mergePublishingResult(current, result)`, used by both handlers. Regression test: PUB-05 test 11.

**D4. Copy URL produced a relative path after publishing; `PUT published:false` cleared `published_at` (Medium).**
- After an in-session publish, `getPublicPortfolioUrl` returned the API's relative `publicUrl` (`/u/name`) unchanged, so Copy URL copied a non-shareable path. Fix in both helpers (`PublishModal.tsx`, `lib/api.ts`): relative `publicUrl` values get the origin prefixed; absolute ones pass through. Regression test: PUB-05 test 12.
- Phase 10 had added `published_at = NULL` to `updatePortfolio` when `published:false`, which contradicted the first-publish policy used by `/unpublish`. Fix (`backend/src/services/portfolio.service.ts`): branch removed. Regression test: PUB-03 C8. Verified live (E13).

### Not fixed — awaiting approval

These change behaviour that **pre-Phase-10 tests explicitly assert**: PORTFOLIO-02 creates with `published:true`, and PORTFOLIO-05 updates with `published:true`. They were left untouched, as the task requires.

**D5. Username rules differ between create/update and publishing (Medium).**
`POST`/`PUT /api/portfolios` (zod) allow 1–2 character and reserved usernames (`ab`, `about` accepted with 201). Check-username and publish reject them. The form blocks these only through the debounced async check, so a fast submit or a failed check request can save a handle that can never be published.
- Recommended: apply `validateUsername` (min 3 characters, reserved list) in the create/update schemas, and add a sync min-length check to `PortfolioForm`.
- The real DB currently has no violating usernames among checked cases (0 under 3 characters, 0 with bad characters, 0 in the sampled reserved names). A full reserved-list check should be run before enforcing.

**D6. Publish-validation bypass via the generic update endpoint (Medium, security).**
`PUT /api/portfolios/:id {"published": true}` (and `POST` with `published:true`) publishes without readiness checks. Verified live: a portfolio with reserved username `about` and template `nonexistent-template` became publicly served at `/api/public/about` (200).
- Recommended: remove `published` from the create/update schemas so the dedicated `/publish` and `/unpublish` endpoints are the only way to change it. Alternatively, run the same readiness checks when `published:true` arrives through `PUT`. Either option requires updating the PORTFOLIO-02/05 tests.

## 12. Tests That Could Not Be Completed

| Item | Status | Reason |
|---|---|---|
| Interactive browser UI (modal, live username feedback, Publish click, clipboard, Visit Live, confirm dialog click-through, loading skeleton, responsive viewports) | NOT TESTED | No browser automation available; nothing installed |
| Fixes D3/D4 (frontend) in a real browser | NOT TESTED | Unit-tested only |
| Studio Editor publishing controls end-to-end | NOT TESTED | Same reason; covered only by static review and component tests |
| Real HTTP 404 status for unpublished pages | FAIL / limitation | See L1 |
| Backend CV suites | NOT RUN | External Gemini API; unrelated to Phase 10 |
| Project specification PDF review | NOT DONE | File not present in the repository |

## 13. Remaining Risks & Limitations

- **L1. Unpublished pages return HTTP 200 (with `noindex`).** `app/u/[username]/loading.tsx` makes the route stream, and per the Next 16 docs (`file-conventions/loading.md`, "Status Codes") the status is committed before `notFound()` fires. This was confirmed for both browser and Googlebot user-agents. `noindex` prevents indexing. A true 404 would need removing `loading.tsx` or a `proxy` pre-check, which is a design decision for the team.
- **L2. Canonical and `og:url` are relative** because `NEXT_PUBLIC_APP_URL` is unset and the root layout has no `metadataBase`. Set `NEXT_PUBLIC_APP_URL` in production.
- **L3.** D5 and D6 remain open pending approval.
- **L4.** The public payload exposes nested item `id`/`portfolioId` UUIDs. Low risk because every mutation is ownership-checked; could be trimmed later.
- **L5.** Tests run against the shared development database: no isolated test DB, 198 leftover test users, and PUB-03 B5 hard-codes the username `ab` (it breaks if any real user owns `ab`).
- **L6.** The publish API returns a relative `publicUrl`. The PUB-03 report describes it as absolute (`${CLIENT_URL}/u/...`); the documentation is inaccurate. The frontend now handles both forms.
- **L7.** Whole-project ESLint has 5 pre-existing errors outside Phase 10.
- **L8 (environment).** Server processes started during QA could not be stopped from the QA session (stop permission denied). Still running at the end of QA: backend `:5000` (PIDs 14856, 5692, 8908), frontend `:3000` (16844, 21028), and the processes behind `:3001`/`:5001` (e.g. 27780, 14020, 22904, 15384). They can be closed safely; the `:3000`/`:5000` instances run **pre-fix** code.

## 14. Files Changed by PUB-06

| File | Change |
|---|---|
| `backend/src/db/pub02.migration.test.ts` | D1 transactional rollback test + regression test 6 |
| `backend/src/services/portfolio.service.ts` | D4 keep `published_at` on `PUT published:false` |
| `backend/src/routes/publishing.routes.test.ts` | Regression test C8 |
| `frontend/src/app/u/[username]/page.tsx` | D2 `notFound()` on 404 |
| `frontend/src/templates/publicPortfolioRoute.test.ts` | Tests 6 and 10 updated for D2 |
| `frontend/src/components/portfolio/PublishModal.tsx` | D3 `mergePublishingResult`; D4 absolute URL |
| `frontend/src/lib/api.ts` | D4 absolute URL |
| `frontend/src/templates/publishingControls.test.ts` | Regression tests 11 and 12 |
| `docs/phase-10/PUB-06-End-to-End-Publishing-QA.md` | This report |

## 15. Final Git Status

```text
On branch feat/publishing
 M backend/src/config/database.ts
 M backend/src/controllers/portfolio.controller.ts
 M backend/src/db/schema.sql
 M backend/src/routes/portfolio.routes.ts
 M backend/src/server.ts
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
?? backend/src/services/publicPortfolio.service.ts
?? docs/
?? frontend/src/app/u/
?? frontend/src/components/portfolio/PublicPortfolioStatus.tsx
?? frontend/src/components/portfolio/PublishModal.tsx
?? frontend/src/templates/publicPortfolioRoute.test.ts
?? frontend/src/templates/publishingControls.test.ts
```

All pre-existing PUB-02 to PUB-05 modifications and untracked files are preserved. No commits were made.

**PUB-06 QA is complete. Awaiting approval on D5/D6 and before proceeding to the next task.**
