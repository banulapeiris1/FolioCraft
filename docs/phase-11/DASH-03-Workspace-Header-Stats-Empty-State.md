# DASH-03 – Workspace Header, Dashboard Statistics & Empty State

**Phase:** 11 – Dashboard Polish · **Depends on:** DASH-01 (audit §4.1–4.3, decision 2 & 3), DASH-02
**New dependencies:** none · **Database migrations:** none · **Phase 10 publishing code:** untouched

## 1. What changed

### Workspace header (replaces the placeholder hero)
- `DashboardHeader`: an `<h1>` "Welcome, {first name}", one sentence describing the workspace, and a single primary **Create Portfolio** button. The summary statistics sit in the same card below a divider.
- **Removed:**
  - "Authentication Verified" badge, "Session Active" chip, and the raw email chip.
  - The duplicate hero **Sign Out** button. The navbar **Log out** is unchanged.
  - The dead "Next Phase" notice (`showPortfolioNotice` state).
  - The hard-coded System Info row (Account ID, "JWT Bearer Session", "PostgreSQL Verified").
- There is now **one** Create action at a time:
  - **Empty workspace:** the empty state owns it, and the header hides its button.
  - **Otherwise:** the header owns it. The secondary Create button in the "Your Portfolios" heading was removed.

### Dashboard statistics
Six tiles: **Portfolios · Published · Drafts · Projects · Skills · Experience**.
- Layout: a `<dl aria-label="Workspace summary">` with 2 columns on mobile, 3 on tablet (`sm`) and 6 on desktop (`lg`).
- **Loading:** a matching decorative skeleton (`aria-hidden`, `motion-reduce:animate-none`). The portfolio grid skeleton from DASH-02 announces the loading state.
- **Error:** stats hidden. The DASH-02 error card explains the problem.
- **Empty workspace:** stats hidden. All zeros would add noise, and the empty state explains the next step.
- **Counts unavailable** (an older backend without `sectionCounts`): Projects, Skills and Experience show "—" with "Not available" for screen readers. **They never show a guessed 0.**

### Empty state
`DashboardEmptyState`:
- Heading "You haven't created a portfolio yet", a short encouragement, and a prominent **Create your first portfolio** button.
- A 4-step ordered guide (Create → Import your CV → Choose a template → Publish). The CV step tells users to upload their CV in the portfolio editor (decision 3: hint only, no CV status endpoint).
- Layout: 1 column on mobile, 2 on tablet, 4 on desktop.

## 2. Files

| File | Status | Purpose |
|---|---|---|
| `backend/src/services/portfolio.service.ts` | Modified | `getPortfoliosByUserId` adds three correlated `COUNT(*)::int` subqueries and returns `sectionCounts`. |
| `backend/src/types/portfolio.types.ts` | Modified | New `PortfolioSectionCounts` and `PortfolioListItem` types. |
| `backend/src/routes/portfolioSectionCounts.routes.test.ts` | **New** | 7 HTTP and service tests against the real DB. |
| `frontend/src/types/portfolio.ts` | Modified | `PortfolioSectionCounts` and an optional `Portfolio.sectionCounts`. |
| `frontend/src/lib/dashboard.ts` | Modified | Adds `computeDashboardStats` and `getFirstName`. DASH-02's `classifyApiError` is unchanged. |
| `frontend/src/components/dashboard/DashboardHeader.tsx` | **New** | Workspace header. |
| `frontend/src/components/dashboard/DashboardStats.tsx` | **New** | Stat tiles, `buildStatTiles` and `DashboardStatsSkeleton`. |
| `frontend/src/components/dashboard/DashboardEmptyState.tsx` | **New** | Empty state with the onboarding steps. |
| `frontend/src/app/dashboard/page.tsx` | Modified | Uses the new components; stats come from the portfolio list via `useMemo`; placeholder content removed. |
| `frontend/src/components/dashboard/dashboardWorkspace.test.ts` | **New** | 17 tests. |

Unchanged: `PublishModal`, `PortfolioCard`, `AuthContext`, the login page, the navbar, and all publish, unpublish and check-username endpoints.

## 3. API / backend change

`GET /api/portfolios` gains one **additive, read-only** field per item:

```json
{ "id": "…", "...existing fields...": "…", "sectionCounts": { "projects": 3, "skills": 2, "experience": 1 } }
```

- **No migration.** The counts use the existing `idx_projects_portfolio_id`, `idx_skills_portfolio_id` and `idx_experience_portfolio_id` indexes.
- **Backward compatible.** Existing fields, `success: true` and `ORDER BY updated_at DESC` are unchanged, and no existing test needed changes. Counts are cast with `::int` so they serialize as JSON numbers, not bigint strings.
- **Scope.** Only the list endpoint changed. `GET /api/portfolios/:id`, publish, unpublish and the public endpoint are unchanged (test 6 checks the single-portfolio endpoint).
- **Owner isolation.** Counts come from the requesting user's own portfolios.

## 4. How statistics are calculated

All values come from the **single** `GET /api/portfolios` response the dashboard already made. **No extra requests.** `computeDashboardStats(portfolios)`:

| Stat | Formula |
|---|---|
| Portfolios | `portfolios.length` |
| Published | count of `published === true` |
| Drafts | `total − published`: every portfolio not currently live, including ones that were unpublished. DASH-04 adds the separate "Unpublished" badge on cards; this tile stays "not live". |
| Projects / Skills / Experience | sum of `sectionCounts.*`, **only if every portfolio has valid counts** (finite, non-negative numbers). Otherwise `null`, rendered as "—". |

Publish and unpublish in `PublishModal` already update the page's portfolio array through `handlePortfolioUpdated` and `mergePublishingResult`. The tiles therefore update straight away without a refetch, and the section counts survive the partial merge (test 5).

## 5. Testing results

| Check | Result |
|---|---|
| New DASH-03 frontend suite (`dashboardWorkspace.test.ts`) | **18/18 pass** (17 subtests + suite) |
| New backend suite (`portfolioSectionCounts.routes.test.ts`, real DB) | **8/8 pass** (7 subtests + suite) |
| All 18 frontend test files | **234/234 pass** |
| Phase 10 publishing (`publishingControls.test.ts`) with DASH-02 and DASH-03 suites | **50/50 pass**; PUB-05 13/13 unchanged |
| Backend: section counts, `publishingIntegrity`, `publishing`, `portfolio` routes, `portfolio.service`, `public` routes | **111/111 pass** |
| Frontend `tsc --noEmit` | clean |
| `eslint` on all Phase 11 changed files | clean |
| `npm run build` | success; `/dashboard` and `/login` still prerender statically |
| Backend `tsc` | The changed files have no type errors. The project already has 662 errors under its current `tsc` config (module-system errors plus earlier strict-type errors in controllers and tests). This is not a gate; tests run through `tsx`. |

**Covered scenarios:**
- Rendering with portfolios (6 tiles with values) and without portfolios (empty state, guide, single Create).
- Stats from a real API response:
  - Mocked HTTP: exactly one request.
  - **Live end-to-end** against an updated backend instance on a temporary port with the real database. A throwaway user was created through the public API. Results:
    - Empty workspace: all 0.
    - 2 portfolios with 4 projects, 2 skills and 2 experience entries: the counts match.
    - Publish: Published goes 0 → 1, Drafts 2 → 1.
    - Unpublish: back to 0 and 2.
  - The test user was deleted afterwards (cascade checked: 0 leftover portfolios) and the temporary server stopped.
- Graceful degradation: the backend already running on `:5000` (pre-DASH-03 code) returned no `sectionCounts`. The helper reported content totals as unavailable, not 0.
- Malformed counts (strings, negatives, NaN, missing keys) are rejected.
- Loading (stats skeleton is decorative and reduced-motion safe), error and backend-unavailable states. DASH-02 tests still pass, and the page source still wires `isServiceUnavailable`, `LOGIN_SESSION_EXPIRED_PATH`, `DashboardErrorState` and `PortfolioGridSkeleton`.
- Removed placeholder content is checked both in the rendered header and in the page source.

**Responsive verification:** breakpoint classes are asserted in tests:
- Stats: 2, then 3, then 6 columns.
- Empty-state guide: 1, then 2, then 4 columns.
- Header: stacks on mobile with a full-width CTA; side by side from `sm`.

This was **not** checked visually in a browser in this session. Visual checks at 360, 768 and 1280px are planned for the DASH-06 QA pass.

## 6. Known limitations
- **Restart needed.** The backend running on `:5000` during this work is still serving pre-DASH-03 code. It needs a restart for the Projects, Skills and Experience tiles to show numbers; until then they show "—" by design.
- **Approximate "Drafts".** "Drafts" counts every portfolio that is not live. Until DASH-04, cards also label unpublished portfolios "Draft", so the two agree.
- **No live refresh of content counts.** They refresh when the dashboard loads, which happens every time the user navigates back from the editor. They don't update while the dashboard stays open.
- **Page not rendered in tests.** The page needs the App Router, so it is covered by component tests and a source-composition guard, not by rendering it.
- **Cost of the counts.** The three subqueries run per portfolio. That is negligible for the expected handful of portfolios per user and is indexed.

## 7. Integrity confirmation
- **DASH-02 intact:**
  - `AuthContext`, `SessionExpiredNotice`, the login page, `DashboardErrorState`, `PortfolioGridSkeleton` and `lib/authSession.ts` were not modified.
  - `classifyApiError` was not changed (only new functions were appended to `lib/dashboard.ts`).
  - The DASH-02 suite passes 19/19.
- **Phase 10 intact:** `PublishModal`, `PortfolioCard` and all publishing endpoints are unchanged. The PUB-05 frontend suite (13/13) and the backend publishing, integrity and public suites pass.
- **No Git operations** were performed.
