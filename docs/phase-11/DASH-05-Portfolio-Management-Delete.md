# DASH-05 – Portfolio Management & Delete Functionality

**Phase:** 11 – Dashboard Polish · **Depends on:** DASH-01 (decisions 1 & 4), DASH-02, DASH-03, DASH-04
**Backend code changes:** none · **New dependencies:** none · **Database migrations:** none

## 1. Features implemented

### Portfolio deletion
- **Delete action on every card.** An icon-only trash button sits next to the publish action. It is visually secondary (grey, turning rose on hover or focus) and announced as "Delete portfolio <title>".
- **Confirmation dialog** (`DeletePortfolioDialog`):
  - Title: "Delete "<portfolio title>"?" with `@username`.
  - States that deletion is **permanent** and **can't be undone**. This matches the backend, which does a hard `DELETE` with no soft-delete.
  - Lists the content that will cascade, using DASH-03 section counts ("3 projects, 2 skills and 1 experience entry"). Without counts it falls back to "its projects, skills and experience entries", so the number is never guessed.
  - Notes that uploaded CV files are kept. This matches `ON DELETE SET NULL` on `cv_uploads`.
  - **Published portfolios get a stronger check.** An amber warning explains that `/u/<username>` stops working immediately and that the username becomes available to other users. The user must **type the username** to enable Delete (case-insensitive).
- **No repeated submissions.** A ref-based in-flight lock blocks double clicks within one render. While deleting, both buttons are disabled, Escape and backdrop clicks are ignored, and a "Deleting..." spinner shows with `aria-busy`.
- **Feedback:**
  - **Success:** the dialog closes and the card is removed without a reload. A dismissible "<title> was permanently deleted." message appears in a polite live region and auto-dismisses after 6 seconds. Focus moves to the "Your Portfolios" heading.
  - **Failure:** the dialog stays open with an inline `role="alert"` message, and the portfolio stays in the list.
- **Statistics update straight away.** Stats are derived with `useMemo` from the portfolio array, so removing an item updates Portfolios, Published, Drafts and the content totals at once. Deleting the last portfolio shows the DASH-03 empty state.

| Server response | Outcome on the dashboard |
|---|---|
| 200 | Removed locally + success message |
| 401 | Session ended through the **DASH-02 flow** (`setSessionExpired` → `logout` → `/login?reason=session-expired`) |
| 403 (not the owner) | "You don't have permission to delete this portfolio. Nothing was deleted." Portfolio kept. |
| 404 | Removed locally + "had already been deleted" (e.g. deleted in another tab) |
| Network failure (status 0) | "Couldn't reach FolioCraft, so your portfolio was not deleted…" Kept. |
| 5xx | "The server couldn't delete this portfolio. Nothing was changed…" Kept. |
| Other 4xx | Server message shown. Kept. |

### Accessibility of the dialog
- Native `<dialog>` opened with **`showModal()`**. The browser makes the rest of the page **inert**, so there are no background clicks and focus can't leave the dialog, and the dialog sits in the top layer with a dimmed backdrop. No focus-trap dependency is needed.
- `role="alertdialog"`, `aria-modal`, `aria-labelledby` (title), `aria-describedby` (consequences).
- **Initial focus** goes to **Cancel**, the safe default. Escape and backdrop clicks cancel, except while deleting. **Focus returns** to the trigger, or to the section heading when the card no longer exists.
- Page scroll is locked while the dialog is open.
- Responsive: buttons stack full-width on mobile (Cancel below Delete) and sit side by side from `sm`; the dialog is limited to `max-w-md` and scrolls if needed.

### Publish-modal username (DASH-01 §4.6)
- The username field is now **read-only** (`readOnly`, `aria-readonly`). It shows the saved username and is linked through `aria-describedby` to help text: "Your username is managed in the portfolio editor. **Change username in editor**".
- The link goes to `/portfolio/edit/<id>` and calls `onClose`. From the dashboard it navigates to the editor. From inside the editor (same route) it closes the modal and shows the form, which has the username field.
- Publishing still calls `POST /api/portfolios/:id/publish` with **no body**, so the server publishes the **saved** username. The existing debounced format and availability check, the readiness checklist, and the publish/unpublish flows are unchanged. The previous false state, where a typed-but-unsaved handle was shown as "available", can no longer happen.
- No username-update capability was added to the publish endpoint.

## 2. Files

| File | Status | Change |
|---|---|---|
| `frontend/src/lib/api.ts` | Modified | `deletePortfolio(id, token)` → `DELETE /api/portfolios/:id` |
| `frontend/src/types/portfolio.ts` | Modified | `DeletePortfolioResponse` |
| `frontend/src/lib/dashboard.ts` | Modified | Adds `resolveDeleteFailure`, `performPortfolioDelete`, `describeDeletedContent` and `matchesDeleteConfirmation`. Earlier helpers unchanged. |
| `frontend/src/components/portfolio/DeletePortfolioDialog.tsx` | **New** | Accessible confirmation dialog |
| `frontend/src/components/dashboard/DashboardNotice.tsx` | **New** | Polite live-region success message |
| `frontend/src/components/portfolio/PortfolioCard.tsx` | Modified | Optional `onDeleteClick` prop and the Delete icon button (only rendered when the prop is passed) |
| `frontend/src/app/dashboard/page.tsx` | Modified | Delete state, outcome handling, local removal, notice, and a focusable heading (`tabIndex={-1}`) |
| `frontend/src/components/portfolio/PublishModal.tsx` | Modified | **Username field only:** read-only + help text + editor link |
| `frontend/src/components/portfolio/portfolioManagement.test.ts` | **New** | 23 tests |
| `backend/src/routes/portfolioDelete.routes.test.ts` | **New** | 10 integration tests against the real DB (tests only, no backend code changed) |

## 3. Backend deletion behaviour and ownership protection

These were inspected first, then confirmed by tests.

- **Endpoint.** `DELETE /api/portfolios/:id` runs `authMiddleware` (401 without a valid JWT), then `portfolioService.deletePortfolio`:
  1. Invalid UUID → 404.
  2. Missing portfolio → 404.
  3. Portfolio owned by another user → **403**. Nothing is changed.
  4. Otherwise `DELETE FROM portfolios WHERE id = $1 AND user_id = $2`, a hard delete scoped to the owner, which returns `{ success: true, id }`.
- **Ownership** comes only from the JWT (`req.user.userId`). The client sends no body.
- **Foreign keys** were queried in the **live database** (`pg_constraint`), not assumed from `schema.sql`:

| Child table | On portfolio delete |
|---|---|
| `projects` | CASCADE |
| `skills` | CASCADE |
| `experience` | CASCADE |
| `education` | CASCADE (exists in the live DB but **not** in this branch's `schema.sql`, likely from the stashed `feat/education` work) |
| `cv_uploads` | SET NULL (records kept, unlinked) |

Because of the `education` table, the dialog says "all of its content, including …" rather than claiming a complete list.

- **Verified by the new backend suite:**
  - 401 without a token.
  - 403 for another user, with all content left intact.
  - 200 for the owner.
  - Projects, skills and experience are removed.
  - The CV upload is kept with `portfolio_id = NULL`.
  - `/api/public/<username>` returns 404 immediately.
  - The username is reported available to another user.
  - A repeat delete returns 404.
  - The portfolio disappears from the list.

## 4. Testing results

| Check | Result |
|---|---|
| New DASH-05 frontend suite (`portfolioManagement.test.ts`) | **24/24 pass** (23 subtests + suite) |
| New DASH-05 backend suite (`portfolioDelete.routes.test.ts`, real DB) | **11/11 pass** (10 subtests + suite) |
| All 20 frontend test files | **276/276 pass** |
| Phase 10 (`publishingControls`, `publicPortfolioRoute`) with DASH-02 to DASH-05 suites | **110/110 pass**; PUB-05 13/13 unchanged |
| Backend: delete, section counts, `publishingIntegrity`, `publishing`, `portfolio` routes, `portfolio.service`, `public` routes | **122/122 pass** |
| Frontend `tsc --noEmit` | clean |
| `eslint` on all Phase 11 files | clean |
| `npm run build` | success; `/dashboard` static |

**Scenario coverage:**

| Requested scenario | Where |
|---|---|
| Successful deletion | Frontend 1, 3, 9; backend 4–10 |
| Cancelled deletion | Dialog: Cancel is enabled when idle and disabled while deleting (13, 15). Cancelling only clears dialog state and sends no request (page source, 23). |
| Deletion failure | Frontend 5, 7, 8, 16, 23 (error keeps the portfolio) |
| Expired session | Frontend 4, 23 (DASH-02 path) |
| Ownership protection | Backend 2, 3; frontend 5 |
| Statistics after deletion | Frontend 9 |
| Read-only username | Frontend 19 |
| Navigation to the editor | Frontend 20 |
| Publishing / unpublishing regression | Frontend 21, 22, plus the PUB-05 suite; backend publishing suites |

## 5. Known limitations
- **No in-browser interaction tests.** The test setup has no DOM (only `node:test` and static rendering). Clicking Cancel, Escape, the backdrop, focus return and the inert background are browser behaviours of `<dialog>`, so they are covered by markup assertions and are **scheduled for the DASH-06 manual QA pass**.
- **Older browsers.** Native `<dialog>`/`showModal()` needs a modern browser (all current evergreen browsers support it). If `showModal` were missing, the dialog would stay hidden (`open:flex`) and nothing would be deleted. That fails safe.
- **Exact cascade wording.** The dialog's content summary uses DASH-03 counts for projects, skills and experience only. Education entries (live-DB-only table) are covered by "all of its content" but not counted.
- **Uploaded CVs.** CV upload records are retained but unlinked. There is no UI to manage them yet (CV status was deferred in DASH-01).
- **Dashboard only.** Deletion is available from the dashboard only, not from the editor.
- **The publish-modal username can't be changed in the modal.** Changing it requires the editor (by design, decision 1).

## 6. Integrity confirmation
- **Phase 10:**
  - Publishing endpoints, `publishPortfolio`, `unpublishPortfolio`, `checkUsernameAvailability` and `mergePublishingResult` are unchanged.
  - In `PublishModal` only the username field and its help text changed. Status, checklist, publish, unpublish, copy URL and validation logic are untouched (the diff is limited to that section).
  - The PUB-05 frontend suite and the backend publishing, integrity and public suites pass.
- **DASH-02:** the session-expiry and error flows are reused, not modified, and the suite passes 19/19.
- **DASH-03:** stats, header, empty state and `sectionCounts` are unchanged and react correctly to deletions. The suite passes 18/18.
- **DASH-04:** status logic, badge and card layout are unchanged. The Delete button only renders when `onDeleteClick` is passed, so the DASH-04 card tests are unaffected. The suite passes 18/18.
- **Backend:** no source changes in DASH-05. The only backend source diff in Phase 11 remains DASH-03's additive `sectionCounts`.
- **No Git operations** were performed.
