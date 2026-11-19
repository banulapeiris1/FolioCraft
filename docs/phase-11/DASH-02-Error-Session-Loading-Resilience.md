# DASH-02 – Error, Session & Loading Resilience

**Phase:** 11 – Dashboard Polish · **Depends on:** DASH-01 audit (§3 C/D, §6 items 1–3)
**Backend changes:** none · **New dependencies:** none · **Database:** untouched

## Problems fixed

| # | Before | After |
|---|---|---|
| 1 | Backend unreachable on page load → `AuthContext` left the user unauthenticated → dashboard **redirected to `/login`**. | The stored token is kept, `isServiceUnavailable` is set, and the dashboard shows a branded "Can't reach FolioCraft — you're still signed in" screen with **Try Again** (`retrySession`). |
| 2 | A 401 from `GET /api/portfolios` showed a generic "Try Again" card that could never succeed. | The session is ended (`logout()`) and the user is sent to `/login?reason=session-expired`, where an amber notice explains why. |
| 3 | The error card showed fixed copy; the computed message was discarded. | `classifyApiError` gives `network` / `server` / `generic` copy. The server's message is shown as detail for server and generic errors, never for network errors (too technical). The card has `role="alert"`. |
| 4 | The initial fetch and Retry duplicated the logic. | Shared `handlePortfoliosLoaded` / `handlePortfoliosFailed` handlers. Retry shows the skeleton again. |
| 5 | Skeleton grid was invisible to screen readers; its footer showed 2 actions, while the real card has 3. | `PortfolioGridSkeleton`: `role="status"`, `aria-busy`, screen-reader text. The cards are `aria-hidden` and have a 3-action footer and `motion-reduce:animate-none`. |

## Files

| File | Change |
|---|---|
| `frontend/src/lib/authSession.ts` | **New.** `resolveSessionRestoreFailure` (401/404 → `clear`, everything else → `unavailable`), `SESSION_EXPIRED_REASON`, `LOGIN_SESSION_EXPIRED_PATH`, `isSessionExpiredReason`. |
| `frontend/src/lib/dashboard.ts` | **New.** `classifyApiError` → `{ kind, detail }`. |
| `frontend/src/context/AuthContext.tsx` | Adds `isServiceUnavailable` and `retrySession`, and moves verification into a state-free `verifyStoredToken`. `login`/`logout` reset the flag. Existing fields and behaviour are unchanged for 401/404 and success. |
| `frontend/src/app/dashboard/page.tsx` | Route guard skips the redirect while the service is unavailable and passes the session-expired reason. Uses the new error and loading components. Hero, cards and `PublishModal` untouched. |
| `frontend/src/components/dashboard/DashboardErrorState.tsx` | **New.** Classified error card (`portfolios` or `session` context), with retry. |
| `frontend/src/components/dashboard/PortfolioGridSkeleton.tsx` | **New.** Accessible loading grid. |
| `frontend/src/components/auth/SessionExpiredNotice.tsx` | **New.** `useSearchParams` reader (inside `<Suspense>`, as the Next 16 docs require) and the presentational `SessionExpiredBanner`. |
| `frontend/src/app/login/page.tsx` | Renders `<SessionExpiredNotice />` inside `<Suspense fallback={null}>`. `/login` still prerenders statically. |
| `frontend/src/components/portfolio/PortfolioCard.tsx` | `PortfolioCardSkeleton` only. `PortfolioCard` is unchanged. |
| `frontend/src/components/dashboard/dashboardResilience.test.ts` | **New.** 18 subtests. |

## Scope notes
- The create, edit and preview pages keep their current guards. When the backend is down they still redirect to `/login`, but the stored token now survives, so the user is signed back in once the API is reachable. Showing the unavailable screen there too is a possible follow-up; it was left out to keep this task focused on the dashboard.
- The lint rule `react-hooks/set-state-in-effect` is satisfied without suppressions. Effects await state-free calls and apply results in promise callbacks, the pattern already used in the codebase.

## Verification

| Check | Result |
|---|---|
| `npx tsx --test src/components/dashboard/dashboardResilience.test.ts` | 19/19 pass (18 subtests + suite) |
| All frontend suites (`npx tsx --test` on all 17 `*.test.ts`) | **216/216 pass** |
| Publishing regression: `src/templates/publishingControls.test.ts` | 13/13 pass (unchanged) |
| Backend publishing regression (`publishingIntegrity`, `publishing`, `portfolio` routes, `portfolio.service`, `public` routes) | **103/103 pass** |
| `tsc --noEmit` | clean |
| `eslint` on all changed files | clean |
| `npm run build` | success; `/dashboard` and `/login` static |
