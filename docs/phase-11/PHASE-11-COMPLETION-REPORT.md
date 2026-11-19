# Phase 11 – Dashboard Polish: Completion Report

**Branch:** `feat/publishing` (Phase 11 changes uncommitted; no Git operations performed)
**Period:** 2026-11-20 · **Tasks:** DASH-01 to DASH-06 + one approved post-QA correction (§9) · **Status:** Approved; post-QA correction applied

## 1. Summary

Phase 11 turned the FolioCraft dashboard from an auth-phase scaffold into a production-quality workspace:
- **Reliability:** honest error states and safe session handling.
- **Information:** real statistics, three-state publishing status with history, and an onboarding empty state.
- **Management:** safe deletion, and a fix for the publish-modal username trap.
- **Verified quality:** checked in a real browser at mobile, tablet and desktop widths, with accessibility fixes measured against WCAG.

Three things stayed constant throughout:
- The Phase 10 publishing flow is unchanged.
- The only backend source change is one additive, read-only field.
- There are no migrations and no new dependencies.

## 2. Tasks

| Task | Outcome | Report |
|---|---|---|
| **DASH-01** Audit | Mapped the architecture, found 4 problem areas (placeholder hero, hidden error causes, binary status, no management or overview), and found the Phase 10 username defect. Produced the plan for DASH-02 to DASH-06. | `DASH-01-Dashboard-Audit.md` |
| **DASH-02** Error, session & loading | Backend-down no longer logs users out ("still signed in" + Try Again). A 401 now logs out → `/login?reason=session-expired` with a notice. Errors are classified (network / server / generic) with `role="alert"`. Loading skeleton is accessible. | `DASH-02-…md` |
| **DASH-03** Header, stats & empty state | Placeholder hero and the hard-coded "System Info" row replaced by a workspace header. 6 real statistics (Portfolios, Published, Drafts, Projects, Skills, Experience) from **one** API call. Onboarding empty state with a CV hint. | `DASH-03-…md` |
| **DASH-04** Cards & status | Three statuses (Draft / Published / **Unpublished**) with "First published <date>" history, using `publishedAt` only. Consistent, equal-height cards. "Republish" label. Copy feedback. | `DASH-04-…md` |
| **DASH-05** Management & delete | Delete with an accessible native-`<dialog>` confirmation, typed username for live portfolios, cascade summary, and full outcome handling (success / 401 / 403 / 404 / network / 5xx). Publish-modal username **read-only** with an editor link. | `DASH-05-…md` |
| **DASH-06** Responsive, a11y & QA | Real-browser QA (Edge via DevTools Protocol) at 360, 768 and 1280px. 9 issues fixed: contrast, target size, names, modal focus, Tab wrap, long-username overflow, and a self-introduced focus regression. 23/23 end-to-end steps pass. | `DASH-06-…md` |

## 3. Dashboard improvements at a glance

- **Header:** greeting, workspace description, a single primary Create action, and the stats grid (2 / 3 / 6 columns).
- **Statistics:** computed client-side from the list response, and updated instantly on publish, unpublish and delete. "—" with "Not available" when counts are missing, never a fake 0.
- **Empty state:** 4-step guide (Create → Import CV in the editor → Template → Publish) with one prominent CTA.
- **Cards:**
  - **Status and history:** three-state badge and first-published history.
  - **Owner:** name and `@username`.
  - **Summary:** clamped text, or a placeholder when empty.
  - **Template link:** with a unique accessible name.
  - **Live URL:** banner with a 28px copy button.
  - **Actions:** identical action rows and Delete.
- **Errors and sessions:** network, server and generic errors; backend-unavailable recovery; session expiry with a notice; announced through live regions.
- **Dialogs:**
  - **Delete:** native modal.
  - **Publish:** div modal, now with full focus management (initial focus, Tab wrap, scroll lock, focus restore).
  - Both close on Escape.
- **Accessibility:**
  - **Contrast:** 0 text-contrast failures in dashboard scope, down from 13+ per view.
  - **Targets:** all at least 24px.
  - **Names:** no duplicate or missing accessible names.
  - **Motion:** reduced motion honoured.

## 4. Backend changes

| Change | Type | Details |
|---|---|---|
| `GET /api/portfolios` → `sectionCounts { projects, skills, experience }` per item (DASH-03) | **Additive, read-only, backward compatible** | Three correlated `COUNT(*)::int` subqueries using the existing `*_portfolio_id` indexes. List endpoint only. **No migration.** Files: `backend/src/services/portfolio.service.ts`, `backend/src/types/portfolio.types.ts`. |
| Deletion (DASH-05) | **No code change** | The existing `DELETE /api/portfolios/:id` was inspected and its behaviour locked in by tests: owner-only (403/404/401), hard delete, cascades to projects, skills, experience (and `education` in the live DB), keeps `cv_uploads` (SET NULL). |

## 5. Files and components added

**Frontend: new**
- `lib/authSession.ts`: session-restore decision and the session-expired route constants.
- `lib/dashboard.ts`: error classification, stats, status and publishing dates, delete outcomes.
- `lib/useModalFocus.ts`: focus management for modals.
- `components/auth/SessionExpiredNotice.tsx`
- `components/dashboard/`:
  - `DashboardErrorState.tsx`
  - `PortfolioGridSkeleton.tsx`
  - `DashboardHeader.tsx`
  - `DashboardStats.tsx`
  - `DashboardEmptyState.tsx`
  - `DashboardNotice.tsx`
- `components/portfolio/PortfolioStatusBadge.tsx`
- `components/portfolio/DeletePortfolioDialog.tsx`

**Frontend: modified**
- `context/AuthContext.tsx`: `isServiceUnavailable` and `retrySession`, additive.
- `app/dashboard/page.tsx`
- `app/login/page.tsx`: notice inside `<Suspense>`.
- `components/portfolio/PortfolioCard.tsx`
- `components/portfolio/PublishModal.tsx`: read-only username, focus hook and colour classes (Phase 11); feedback-reset fix and `isDifferentPortfolio` (post-QA, §9).
- `lib/api.ts`: `deletePortfolio`.
- `types/portfolio.ts`: `sectionCounts` and `DeletePortfolioResponse`.

**Tests: new**
- Frontend: `dashboardResilience`, `dashboardWorkspace`, `dashboardAccessibility`, `portfolioCardStatus`, `portfolioManagement`, `publishModalFeedback` (post-QA).
- Backend: `portfolioSectionCounts.routes`, `portfolioDelete.routes`.

**Docs:** `docs/phase-11/` holds DASH-01 to DASH-06 and this report.

## 6. Testing coverage

| Layer | Before Phase 11 | After Phase 11 |
|---|---|---|
| Frontend unit / static-render tests | 197 (16 files); **no dashboard page coverage** | **293 / 293 pass** (22 files; +90 Phase 11 tests + 6 suites, including the post-QA suite) |
| Backend tests (db / routes / services / middleware / utils, excluding `cv*`) | n/a | **520 / 520 pass** (32 files; +17 Phase 11 tests against the real DB) |
| Phase 10 publishing regression | n/a | Frontend 31/31, backend 129/129 (with Phase 11 suites) |
| Real-browser QA (Edge) | none | Responsive 24/24 dashboard combinations clean; accessibility checklist all pass; end-to-end 23/23 (DASH-06), then **26/26** after the post-QA fix (3 success-message checks added) |
| Static checks | n/a | Frontend `tsc` clean; ESLint clean on all Phase 11 files; `npm run build` passes |

Phase 11 tests cover:
- **Error classification and session decisions:** DASH-02.
- **Statistics:** with real-API live checks in DASH-03 and DASH-06.
- **Status and dates:** through the real publish → unpublish response shapes.
- **Card layout and long content.**
- **Delete outcomes:** including 401, 403, 404, network, cancel and ownership.
- **Read-only username and editor navigation.**
- **Focus-wrap logic, contrast classes and target sizes.**

## 7. Known limitations

1. ~~**Phase 10 success alert.**~~ **Resolved** by the approved post-QA correction (§9).
2. **Publish history is first-publish only.** The schema stores a single `published_at` (the first publish), so cards say "First published", not "Live since". Portfolios unpublished before PUB-02 added the column show as Draft.
3. **CV status isn't on the dashboard (deferred by decision).** There is no read endpoint, so the dashboard gives a hint only.
4. **Login page accessibility.** Contrast and target-size issues in the auth module are outside dashboard scope (DASH-06 §5 B).
5. **Pre-existing tooling debt.** 5 ESLint errors in CV, experience, project and skill managers. Backend `tsc` configuration errors.
6. **QA reach.** Chromium only, no real screen reader, and emulated touch (DASH-06 §8).
7. **`education` table.** It exists in the live DB (it cascades on delete) but not in this branch's `schema.sql`, likely from the stashed `feat/education` work. The delete dialog wording accounts for it.

## 8. Recommendations

1. ~~Approve and apply the `PublishModal` success-alert fix.~~ **Done** (§9).
2. **Restart the backend dev server in your own terminal.** It's currently running inside the Claude session after an accidental stop during QA clean-up (DASH-06, operational note).
3. **Commit Phase 11** after review. Suggested split: one commit per DASH task, or a single "Phase 11 – Dashboard Polish" commit with the docs.
4. **Apply the dashboard's colour and target-size treatment to the auth pages** (login, register, reset) in a small follow-up.
5. **Add a `test` script to `frontend/package.json`** (`tsx --test "src/**/*.test.ts"`), so the 285 tests run with one command and in CI. Consider keeping the DevTools Protocol QA scripts as an opt-in `qa/` tool.
6. **Fix the backend `tsconfig`** so `tsc` can become a real gate. Clear the 5 `set-state-in-effect` lint errors.
7. **Reconcile `schema.sql` with the live database** (the `education` table) before the education work is merged.
8. **Optional later:** a `last_published_at` column for an accurate "Live since"; a CV-status read endpoint; delete from the editor; and Firefox/Safari plus screen-reader QA.

## 9. Post-QA correction: publish success message (approved after review)

**Problem (found in DASH-06 browser QA, §5 A).** The green success message in `PublishModal` never stayed visible after publish, unpublish or republish:
- After a successful action, the modal calls `onPortfolioUpdated(merged)`.
- The dashboard and the editor then pass the updated portfolio back as a new `portfolio` prop.
- The modal's prop-sync block (`if (portfolio !== prevPortfolio)`) treated every new object as a new portfolio and reset `actionSuccess` to `null`.

This was pre-existing in the committed Phase 10 code.

**Fix (`frontend/src/components/portfolio/PublishModal.tsx`, sync block only):**
- **Data is still always synced:** `currentPortfolio`, `prevPortfolio` and the displayed username.
- **Transient feedback resets only on a portfolio switch:** the success and error messages, the unpublish confirmation, and the username status/message. A switch means a different `id`. The check is the new exported pure function `isDifferentPortfolio(previous, next)`.
- **Side benefit:** the "Current portfolio username" confirmation is no longer cleared after an action.

**Unchanged:**
- **API calls and data:** publish/unpublish API calls, `mergePublishingResult`, and the `onPortfolioUpdated` contract.
- **Handlers:** they still clear messages when an action starts and set the success message after notifying the parent.
- **Validation and UI:** the checklist, status banner, URL section, unpublish confirmation flow and Escape/close behaviour.

**Regression tests:**

| Test | Coverage | Result |
|---|---|---|
| `frontend/src/components/portfolio/publishModalFeedback.test.ts` (new, 7 tests) | Publish, unpublish and republish echoes (using the real partial API response shapes via `mergePublishingResult`) are not treated as a switch. An editor-style echo keeps feedback. A different portfolio does reset. Source guards: data sync stays unconditional, feedback resets only inside the switch branch, and the handlers' order is unchanged. | **8/8 pass** (7 + suite) |
| Real browser (Edge, end-to-end, isolated QA stack, test-only user, cleaned up afterwards) | **6s:** publish from the editor shows "Portfolio published successfully! Your site is live." **9s:** unpublish from the dashboard shows "Portfolio has been unpublished. It is now private." **11s:** republish from the dashboard shows the success message with status "Published (Live)". Before the fix, all three were absent. | **26/26 steps pass** (full workflow regression included) |

**Verification after the fix:**

| Check | Result |
|---|---|
| All frontend tests (22 files) | **293 / 293 pass** |
| Phase 10 publishing, frontend (`publishingControls`, `publicPortfolioRoute`) | **31 / 31 pass** |
| Phase 11 suites + post-QA suite (6 files) | **96 / 96 pass** |
| Phase 10 + Phase 11 backend (`publishingIntegrity`, `publishing`, `public`, `pub02.migration`, `portfolio` routes, `portfolio.service`, `portfolioSectionCounts`, `portfolioDelete`) | **129 / 129 pass** |
| Frontend `tsc --noEmit` | clean |
| ESLint on all Phase 11 + post-QA files | clean (whole-frontend lint unchanged: the same 5 pre-existing errors in CV, experience, project and skill managers, not addressed per instructions) |
| `npm run build` (default config) | success |
| Backend code | unchanged by this fix |

**Scope kept.** Only this fix was made. Login-page accessibility, manager lint errors and the backend `tsconfig` were left untouched as instructed. No Git operations. All earlier uncommitted Phase 11 changes are preserved.
