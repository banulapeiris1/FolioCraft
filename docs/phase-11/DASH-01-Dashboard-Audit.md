# DASH-01 – Dashboard UI & Architecture Audit

**Phase:** 11 – Dashboard Polish
**Branch audited:** `feat/publishing` @ `3d86111` (clean working tree)
**Date:** 2026-11-20
**Scope:** Audit and plan only. No source, database, dependency or Git changes were made.

---

## 0. Executive Summary

The dashboard works. A user can sign in, see their portfolios as cards, open the editor or preview, and publish, unpublish or copy the public URL through the shared `PublishModal`. Phase 10's publishing work is solid and covered by tests.

Polish is weak in four areas:

1. **Placeholder content still in the hero.** "Authentication Verified", "Session Active", the raw email chip, a duplicate *Sign Out* button and a hard-coded "System Info" row ("JWT Bearer Session", "PostgreSQL Verified") are left over from the auth phase. They take the most prominent space and say nothing about the user's portfolios.
2. **Error handling hides the cause.**
   - When the backend is down on page load, the user is sent to `/login`, as if logged out.
   - An expired token on the portfolio fetch shows a generic "try again" card, not a session-expired flow.
   - The error card ignores the error message it computes.
3. **Status is binary.** Cards show only *Draft* or *Published*. A portfolio that was live and has been taken down shows as *Draft*, although the data to tell them apart already exists.
4. **No dashboard-level overview or management.** There are no counts (total, live, draft), no delete action (the backend endpoint exists), no "what's missing" hints, and no tests for the dashboard page.

**One Phase 10 defect needs a decision (§4.6):** the username field in `PublishModal` can be edited and is checked for availability, but the new value is never saved. Publishing always uses the stored username.

**Backend changes needed:** none for the core polish. One optional, additive, read-only change (section counts on `GET /api/portfolios`) would enable "missing content" hints. It needs no migration. CV upload status should be deferred because no read endpoint exists.

---

## 1. Current Dashboard Architecture

### 1.1 Component tree

```
app/layout.tsx  (AuthProvider)
└── app/dashboard/page.tsx            "use client", 363 lines, single component
    ├── <header>                      inline navbar (logo, "Workspace" badge, user chip, Log out)
    ├── Welcome banner                inline (auth-phase placeholder content + Create / Sign Out)
    ├── "Your Portfolios" section
    │   ├── PortfolioCardSkeleton ×3  (loading)
    │   ├── inline error card         (error + Try Again)
    │   ├── inline empty state        (no portfolios)
    │   └── PortfolioCard[]           (grid 1 / md:2 / lg:3)
    ├── "System Info" row             inline, hard-coded
    └── PublishModal                  (shared with the editor)
```

### 1.2 Data flow

| Concern | Implementation |
|---|---|
| Auth | `useAuth()` from [AuthContext.tsx](../../frontend/src/context/AuthContext.tsx). On mount it restores the JWT from `localStorage` and calls `GET /api/auth/me`. |
| Route guard | `useEffect` sends the user to `/login` when `!isLoading && !isAuthenticated`. The same pattern is copied into the create, edit and preview pages. |
| Portfolio fetch | `getPortfolios(token)` in a `useEffect` keyed on `token`, with an `isMounted` guard. `handleRetry` repeats the logic. |
| State | Local `useState`: `portfolios`, `isLoadingPortfolios`, `portfoliosError`, `selectedPortfolioForPublish`. No cache or global store. |
| Publish updates | `PublishModal` → `onPortfolioUpdated(merged)` → the dashboard replaces the matching portfolio in its array (an optimistic merge via `mergePublishingResult`). |
| API client | [lib/api.ts](../../frontend/src/lib/api.ts) `request<T>()`. Network failure becomes `ApiError(status 0)`; non-2xx becomes `ApiError(status, server message)`. |

### 1.3 Backend endpoints used by the dashboard

| Endpoint | Used by | Response |
|---|---|---|
| `GET /api/auth/me` | AuthContext | `{ user }` |
| `GET /api/portfolios` | Dashboard | `{ success, portfolios: Portfolio[] }`, ordered by `updated_at DESC`. **No `publicUrl`, no section counts.** |
| `GET /api/portfolios/check-username/:u?portfolioId=` | PublishModal | `{ success, available, username }` |
| `POST /api/portfolios/:id/publish` | PublishModal | partial `{ id, username, published, publishedAt, publicUrl }` |
| `POST /api/portfolios/:id/unpublish` | PublishModal | partial `{ id, username, published }`. **`published_at` is kept in the database.** |
| `DELETE /api/portfolios/:id` | **Not used** (no client function) | `{ success, id }`; child rows cascade |

---

## 2. Existing Functionality (works today)

| Area | Status | Notes |
|---|---|---|
| Route protection | ✅ | Branded "Loading your workspace…" screen during auth restore prevents a flash of unauthenticated content. |
| Portfolio list | ✅ | Responsive card grid, sorted by most recently updated. |
| Portfolio card | ✅ | Title, Draft/Published badge, template name (links to the gallery), `@username`, `about` snippet, "Updated <date>", public URL banner with copy (published only), Edit / Preview / Publish or Manage Live buttons. |
| Creation entry points | ✅ | Three: hero CTA, section-header button (only when the list is non-empty), empty-state CTA. All go to `/portfolio/create`. |
| Edit / preview navigation | ✅ | `/portfolio/edit/:id` and `/portfolio/preview?id=`. Both pages link back to `/dashboard`. |
| Publish / unpublish | ✅ | `PublishModal`: status banner, readiness checklist, publish spinner, unpublish confirmation, copy URL, open live site, success and error alerts, Esc and backdrop close. |
| Loading state | ✅ (basic) | Three `PortfolioCardSkeleton`s. |
| Error state | ⚠️ partial | Card with Try Again. The message is generic, and the cause is never classified. |
| Empty state | ✅ (basic) | Dashed card, icon, "No portfolio yet", Create CTA. |
| Tests | ⚠️ partial | `publishingControls.test.ts` (13 passing) covers `PortfolioCard` static markup and `PublishModal`. **The dashboard page itself has no tests.** |

---

## 3. Missing Functionality

### A. Status indicators

| State | Derivable today? | Shown today? |
|---|---|---|
| Draft (never published) | `!published && !publishedAt` | Shown as "Draft" |
| Published / Live | `published` | "Published", plus a pulsing dot and URL banner |
| **Unpublished (was live, now private)** | `!published && publishedAt != null`. Unpublish keeps `published_at` ([portfolio.service.ts](../../backend/src/services/portfolio.service.ts), `unpublishPortfolio`). | ❌ Shown as "Draft" |
| **Not ready to publish** (missing name or title) | Client-side, from `name`/`title` (same rule as the modal checklist) | ❌ Only visible inside the modal |
| "Live since <date>" | `publishedAt` is in the list response | ❌ Not shown |

### B. Empty states

| Case | Today | Gap |
|---|---|---|
| New user, no portfolios | Basic card | No guidance on the steps (Create → Import CV → Pick template → Publish). No mention that a CV can be imported, though this is a core selling point. |
| No CV uploaded | — | **No API to read CV status** (`cv_uploads` is written by `POST /api/cv/upload` only; no GET route). CV import lives in the editor (`CvUploadManager`). |
| Missing portfolio content (no projects, skills or experience) | — | The list response has no counts. Today it can only be found with 3 calls per portfolio. |
| No `about` | Snippet is silently left out | The card gets shorter. A muted "No summary yet" placeholder would keep the cards even. |

### C. Loading states

| Case | Today | Gap |
|---|---|---|
| Initial auth restore | ✅ Branded loader | — |
| Portfolio list | ✅ Skeletons | No `aria-busy` or screen-reader text. Skeleton action row (2 blocks) doesn't match the real card (3 buttons). |
| Retry | Swaps to skeletons | Acceptable. |
| Publish / unpublish | ✅ In the modal | — |
| Delete | ❌ No delete feature | — |
| Hero / stats while list loads | — | No stats yet, so nothing to show. |

### D. Error states

| Case | Today | Gap / defect |
|---|---|---|
| **Backend unavailable on page load** | `AuthContext` catches the `/me` failure. For anything other than 401/404 it **keeps the token in storage but never sets `token`/`user`**, so `isAuthenticated` is false and the dashboard **redirects to `/login`**. ([AuthContext.tsx:57-62](../../frontend/src/context/AuthContext.tsx#L57-L62)) | The user is told nothing about an outage and is sent to a login page that will also fail. **High priority.** |
| Network error during list fetch | Error card | Hard-coded copy. `portfoliosError` is set but **never rendered** ([dashboard/page.tsx:275](../../frontend/src/app/dashboard/page.tsx#L275)). |
| **Auth expired (401) during list fetch** | Generic error card; Try Again also fails | Other pages (create, edit, preview) already handle 401 with `logout()` and a redirect. The dashboard doesn't. **High priority.** |
| 5xx | Same generic card | Should read differently from "check your connection". |
| Failed publish/unpublish | ✅ Modal alert with server message | — |
| Failed copy (card) | Swallowed silently ([PortfolioCard.tsx](../../frontend/src/components/portfolio/PortfolioCard.tsx) `catch {}`) | No feedback. |

### E. Management features

- **Delete portfolio:** the backend `DELETE /api/portfolios/:id` exists with ownership checks and cascade, but there's no `deletePortfolio` client function and no UI. A confirmation pattern exists to adapt (`components/project/DeleteConfirmModal.tsx`).
- **Summary stats:** none (total / live / drafts).
- **Quick "View live" from the card action row:** only through the small URL banner link.

---

## 4. UI/UX Problems

### 4.1 Hero is leftover auth-phase scaffolding (high)
- The "Authentication Verified" badge, the "Session Active" chip, the raw email in a monospace chip, and the copy "Your developer account is ready…" read as a developer test page.
- The **Sign Out** button in the hero duplicates *Log out* in the navbar and sits next to the primary CTA at the same visual weight.
- `showPortfolioNotice` / "Next Phase: CV-to-Portfolio Builder" is **dead code**: the state is never set to `true`, and the message is outdated because those features have shipped.

### 4.2 "System Info" row exposes internals (high)
Account UUID, "JWT Bearer Session" and a **hard-coded** "PostgreSQL Verified" indicator, which is not a real health check. This means nothing to users and is mildly misleading.

### 4.3 Action hierarchy
- With portfolios present there are two Create buttons at once (hero and section header).
- The card's **Preview** button uses `ExternalLinkIcon`, but it navigates internally, in the same tab. The external icon should be reserved for the live site.
- Edit, Preview and Publish all use the same size. Publish is visually primary for drafts, which is correct; for live portfolios, "Manage Live" in emerald works.

### 4.4 Visual consistency
- `animate-fadeIn` and `animate-scaleUp` (used by `PublishModal` and the notice) are **not defined** anywhere: there are no `@keyframes` in `globals.css` and no `--animate-*` theme tokens. They do nothing.
- The dashboard header markup is copied almost verbatim into `create/page.tsx` and `edit/[id]/page.tsx`. Drift risk, but out of scope to unify unless cheap (see risks).
- Colors are hard-coded hex values even though `globals.css` defines brand tokens (`--brand-purple`, etc.). This matches the rest of the codebase, so follow the existing convention; don't refactor.

### 4.5 Responsiveness
| Breakpoint | Observation |
|---|---|
| Mobile (≤ 640px) | The navbar packs the logo, wordmark, "Workspace" pill and Log out button; tight at 320–360px. The email chip has no `truncate`/`break-all`, so long emails can overflow. The section header puts the title and Create button side by side with no wrap rule. |
| Tablet (`md`, 2 columns) | Fine. |
| Desktop (`lg`, 3 columns inside `max-w-5xl`) | Cards are about 300px wide. The action row (Edit, Preview, Publish/Manage Live) often wraps to two lines (`flex-wrap`), so cards in the same row have uneven footers. |

### 4.6 Phase 10 defect: the username edit in PublishModal is never saved (medium, needs a decision)
In [PublishModal.tsx:458](../../frontend/src/components/portfolio/PublishModal.tsx#L458) the user can type a new handle, which is checked live ("Username is available!") and ticks the readiness checklist. But `handlePublish` ([line 221](../../frontend/src/components/portfolio/PublishModal.tsx#L221)) calls `publishPortfolio(id)`, which publishes under the **stored** username. The typed value is discarded.

**Options:**
- **(a) Recommended, smallest change:** make the handle read-only in the modal, add a "Change in editor" link, and keep the checklist based on the stored username.
- **(b)** Call `updatePortfolio(id, { username })` before publishing when the handle changed. This adds a two-step failure mode and changes Phase 10 behaviour.

This affects the dashboard's main action, so it belongs in Phase 11, but it changes Phase 10 code. **Needs approval.**

### 4.7 Accessibility
- The error card has no `role="alert"`. Skeletons have no `aria-busy` or status text.
- `PublishModal` has no focus trap and no initial focus. Esc works.
- The status badge pairs color with text (good). The pulsing dot should respect `motion-reduce:`.

---

## 5. API and Data Dependencies

| Dashboard need | Data source | Backend change? |
|---|---|---|
| Draft / Live / Unpublished status | `published`, `publishedAt` in the list response | **No** |
| "Live since" date | `publishedAt` | **No** |
| Readiness hint (name/title) | `name`, `title` | **No** |
| Summary stats | Computed from the list on the client | **No** |
| Delete portfolio | Existing `DELETE /api/portfolios/:id` | **No** (frontend client function only) |
| Session-expiry handling | `ApiError.status === 401` | **No** |
| Backend-down detection | `ApiError.status === 0` | **No** (fix is in `AuthContext`) |
| Content completeness (projects, skills, experience counts) | Not in the list response | **Optional**: add `sectionCounts` via correlated `COUNT` subqueries in `getPortfoliosByUserId`. Additive, read-only, no migration, backward compatible. Alternative: 3 × N client calls (not recommended). |
| CV upload status | `cv_uploads` table; **no read endpoint** | Would need a new endpoint. **Recommend deferring**, and replacing it with a static "Import your CV in the editor" hint. |

**Conclusion:** DASH-02 to DASH-05 need **no backend changes**. The only backend change worth considering is the optional `sectionCounts` in DASH-04, and it can be dropped without blocking anything else.

---

## 6. Recommended Improvements (prioritized)

| # | Priority | Improvement |
|---|---|---|
| 1 | **P0** | Fix the backend-down → `/login` redirect: keep the session as "unverified" and show a service-unavailable state with retry. |
| 2 | **P0** | Handle a 401 on the dashboard fetch: `logout()` → `/login?reason=session-expired` (match the other pages). |
| 3 | **P0** | Classify and render fetch errors (network / server / auth / other) with the real message and `role="alert"`. |
| 4 | **P1** | Replace the hero placeholder with a real workspace header: greeting, one primary Create CTA, summary stats (Total · Live · Drafts). Remove the duplicate Sign Out, the dead notice and the System Info row. |
| 5 | **P1** | Add a status helper `getPortfolioStatus()` → `draft` / `live` / `unpublished`, plus a shared `PortfolioStatusBadge` used by the card (and optionally the editor header and modal). |
| 6 | **P1** | Card polish: "Live since" / "Taken down" line, Preview icon fix, a "View live" action for live cards, an even action row, an "About" placeholder, copy-failure feedback, and a "Missing title" hint. |
| 7 | **P1** | Resolve the PublishModal username defect (§4.6), after approval. |
| 8 | **P2** | Delete portfolio with confirmation (warn if live; cascades to projects, skills and experience). |
| 9 | **P2** | Richer empty state: 4-step onboarding (Create → Import CV → Template → Publish). |
| 10 | **P2** | Responsive fixes: navbar at 320px, email truncation, wrap rule for the section header, card footer layout at `lg`. |
| 11 | **P3** | Define the `fadeIn`/`scaleUp` keyframes in `globals.css` (with `motion-reduce`). Add `aria-busy` to skeletons and initial focus to the modal. |
| 12 | **P3 / optional** | `sectionCounts` on the list endpoint plus "Add projects" / "Add skills" hints on cards. |

---

## 7. Proposed Task Breakdown (DASH-02 to DASH-06)

### DASH-02 – Error, Session & Loading Resilience (P0)
- `AuthContext`: on a non-401/404 failure of `/me`, keep the stored token and expose a new `authError: "unavailable" | null` (or `isOffline`) plus a `retry`. The dashboard (and, for consistency, the other guarded pages) shows a branded "Can't reach FolioCraft" screen instead of redirecting.
- Dashboard fetch: one `loadPortfolios()` (removing the duplicated effect and retry logic); a 401 leads to logout and redirect with a reason; other errors are classified.
- New `DashboardErrorState` (variants: `network`, `server`, `generic`), with `role="alert"` and Retry.
- `aria-busy` and visually hidden status text on the skeleton grid; the skeleton footer matches the real card.
- Optional: the login page reads `?reason=session-expired` and shows a banner.

**Files:** `frontend/src/context/AuthContext.tsx`, `frontend/src/app/dashboard/page.tsx`, new `frontend/src/components/dashboard/DashboardErrorState.tsx`, new `frontend/src/lib/dashboard.ts` (`classifyApiError`), `frontend/src/components/portfolio/PortfolioCard.tsx` (skeleton only), optional `frontend/src/app/login/page.tsx`.

### DASH-03 – Workspace Header, Stats & Empty State (P1)
- Replace the hero with `DashboardHeader`: greeting, short subtitle, a single primary "Create Portfolio" CTA, and `DashboardStats` (Total / Live / Drafts, computed client-side).
- Remove: "Authentication Verified", "Session Active", the email chip, the hero Sign Out, the `showPortfolioNotice` dead code, and the System Info row.
- Keep the section-header Create button only when the hero CTA is out of view, or keep one Create button (decided in implementation).
- New `DashboardEmptyState` with the 4-step onboarding guide, and the CV hint ("Import your CV from the editor after creating").

**Files:** `frontend/src/app/dashboard/page.tsx`, new `frontend/src/components/dashboard/DashboardHeader.tsx`, `DashboardStats.tsx`, `DashboardEmptyState.tsx`.

### DASH-04 – Portfolio Card & Status Polish (P1)
- `getPortfolioStatus(p)` → `"draft" | "live" | "unpublished"` and `isPublishReady(p)` in `lib/dashboard.ts`, plus a shared `PortfolioStatusBadge` (Draft = amber, Live = emerald, Unpublished = slate).
- Card meta line: "Live since <date>" / "Taken down · was live <date>" / "Updated <date>".
- Fixes: Preview icon (eye), a "View live" action on live cards, an even footer layout (primary action full-width on its own row at `lg`, or icon-only secondary buttons), an "About" placeholder, copy-error feedback, a readiness hint when name or title is missing, and `motion-reduce:animate-none` on the pulse.
- *(Optional, needs approval)* backend `sectionCounts` (`projects`, `skills`, `experience`) on `GET /api/portfolios`, and card hints for empty sections.

**Files:** `frontend/src/components/portfolio/PortfolioCard.tsx`, new `frontend/src/components/portfolio/PortfolioStatusBadge.tsx`, `frontend/src/lib/dashboard.ts`, `frontend/src/components/portfolio/PortfolioIcons.tsx` (reuse `EyeIcon` if present). Optional: `frontend/src/types/portfolio.ts`, `backend/src/services/portfolio.service.ts`, `backend/src/types/portfolio.types.ts`, `backend/src/services/portfolio.service.test.ts`, `backend/src/routes/portfolio.routes.test.ts`.

### DASH-05 – Portfolio Management Actions (P1/P2)
- `deletePortfolio(id, token)` in `lib/api.ts` (endpoint exists).
- `DeletePortfolioModal` (adapted from `project/DeleteConfirmModal.tsx`): typed-title or explicit confirm; warns when live ("/u/<handle> will stop working"); lists the cascaded content; shows loading and error states. Removes the card on success.
- Card overflow menu (⋯) holding Delete, keeping the destructive action out of the primary row.
- **PublishModal username fix (§4.6)**, using option (a) unless directed otherwise.
- Shared helper for the publish-modal `onPortfolioUpdated` handler: no change; it already works.

**Files:** `frontend/src/lib/api.ts`, `frontend/src/types/portfolio.ts` (`DeletePortfolioResponse`), new `frontend/src/components/portfolio/DeletePortfolioModal.tsx`, `frontend/src/components/portfolio/PortfolioCard.tsx`, `frontend/src/app/dashboard/page.tsx`, `frontend/src/components/portfolio/PublishModal.tsx` (username section only).

### DASH-06 – Responsive, Accessibility & Dashboard QA (P2/P3)
- Navbar at 320px (hide the "Workspace" pill below `sm`, shrink the wordmark), the section-header wrap, card grid breakpoints (consider `max-w-6xl` or `lg:grid-cols-2 xl:grid-cols-3`).
- `fadeIn`/`scaleUp` keyframes plus `--animate-*` tokens in `globals.css`, respecting `prefers-reduced-motion`.
- `PublishModal` / `DeletePortfolioModal`: initial focus and focus return (no new dependency; a small hook).
- Manual QA matrix (§8.3) at 360 / 768 / 1280px. Write `docs/phase-11/DASH-06-Dashboard-QA.md`.

**Files:** `frontend/src/app/globals.css`, `frontend/src/app/dashboard/page.tsx`, `frontend/src/components/dashboard/*`, `frontend/src/components/portfolio/PublishModal.tsx` (focus only), new `frontend/src/lib/useInitialFocus.ts` (optional).

---

## 8. Testing Strategy

### 8.1 Current state
- Frontend tests use `node:test` + `tsx` + `react-dom/server` `renderToStaticMarkup` (no jsdom or Testing Library). There's **no `test` script** in `frontend/package.json`; suites run with `npx tsx --test <file>`.
- Baseline during this audit: `npx tsx --test src/templates/publishingControls.test.ts` → **13/13 pass**.
- Backend: `npm test` (`tsx --test "src/**/*.test.ts"`). The route and service tests already cover list, delete, publish and unpublish.
- **No test touches `app/dashboard/page.tsx`.**

### 8.2 Approach (no new dependencies)
Because only static rendering is available, **keep the logic in pure functions and presentational components** so they can be tested without a DOM:

| Test file (new) | Covers |
|---|---|
| `frontend/src/components/dashboard/dashboard.test.ts` | `getPortfolioStatus` (draft / live / unpublished), `isPublishReady`, `classifyApiError` (0 → network, 401 → auth, 5xx → server, other), stats computation; static markup of `DashboardStats`, `DashboardEmptyState`, `DashboardErrorState` (has `role="alert"`, renders the message, Retry present), `DashboardHeader` (no "PostgreSQL Verified", no "Authentication Verified"). |
| Extend `publishingControls.test.ts` (or new `portfolioCard.test.ts`) | Card renders the right badge for all 3 states, "Live since" line, View-live action only when live, Preview not using the external icon, missing-title hint. **Keep the existing 13 assertions passing unchanged**, unless an approved PublishModal username change requires updating one. |
| `deletePortfolio` client (mocked `fetch`, existing pattern) | DELETE method, URL encoding, bearer header, error propagation. |
| `DeletePortfolioModal` static markup | Live-portfolio warning, confirm disabled while deleting, error shown. |
| AuthContext | Extract the restore decision into a pure function (`resolveRestoreOutcome(error)` → `clear` / `keep-unverified`) and unit-test it. |
| Backend (only if `sectionCounts` is approved) | Service test: counts correct, zero counts, ownership isolation. Route test: response shape is backward compatible. |

### 8.3 Manual QA matrix (DASH-06)
New user (empty) · 1 draft · 1 live · 1 unpublished · a mix of ≥4 · backend stopped before load · backend stopped after load then Retry · token tampered in `localStorage` · publish → card updates · unpublish → "Unpublished" badge · delete draft · delete live (URL 404s afterwards) · viewports 360 / 768 / 1280 · keyboard-only pass · reduced motion.

### 8.4 Regression gates for every DASH task
`npx tsx --test` on all frontend suites · backend `npm test` (if the backend is touched) · `npx eslint` on changed files · `npm run build` in `frontend`.

---

## 9. Risks and Dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| Changing `AuthContext` affects every guarded page (create, edit, preview, dashboard) | High blast radius | Additive API (new field, existing fields unchanged). Pages that ignore the new field keep today's behaviour. Unit-test the decision function. |
| PublishModal username fix alters Phase 10 behaviour and possibly a PUB-05 assertion | Medium | Needs explicit approval. Option (a) is display-only. Re-run `publishingControls.test.ts`. |
| `PortfolioCard` is covered by Phase 10 tests that use `data-testid`s (`card-publish-btn-*`, `card-copy-url-*`, `card-public-url-banner`) | Medium | Keep all existing test IDs and the "Published" / "Manage Live" text, or update the tests deliberately in the same task. |
| "Unpublished" status depends on `published_at` being kept on unpublish | Low | Confirmed in `unpublishPortfolio` SQL. Covered by PUB-06 QA C8. Add a unit test for the helper. |
| Optional `sectionCounts` query cost (3 correlated subqueries per portfolio) | Low (users have few portfolios; FK columns) | Keep optional. Verify `portfolio_id` indexes before enabling; else use `LEFT JOIN … GROUP BY`. |
| Delete is irreversible and cascades | High for users | Strong confirmation, live-site warning, no bulk delete. |
| Next.js 16.3 has breaking changes (`frontend/AGENTS.md`) | Medium | Read `node_modules/next/dist/docs/` before touching routing or search params (e.g. `?reason=` on login). |
| Header markup copied across 3 pages | Low | Don't extract a shared header in Phase 11 unless a task needs it. Note it for later. |
| No DOM test tooling, so interactive behaviour (retry clicks, modal focus) can't be unit-tested | Medium | Push logic into pure functions; cover interaction in the manual QA matrix. |

**Task dependencies:** DASH-02 → DASH-03 (the header and states share the page refactor) → DASH-04 (card and status helpers) → DASH-05 (delete uses the card menu and helpers) → DASH-06 (QA across everything). DASH-04's backend option is independent and can be skipped.

---

## 10. Decisions Requested Before DASH-02

1. **PublishModal username (§4.6):** option (a) read-only + link to editor (recommended), or (b) save before publish?
2. **Optional backend `sectionCounts`** for "missing content" hints: approve, or keep Phase 11 frontend-only?
3. **CV status on the dashboard:** OK to defer and show only a static "Import CV in the editor" hint?
4. **Delete portfolio:** in scope for Phase 11 (DASH-05)?
