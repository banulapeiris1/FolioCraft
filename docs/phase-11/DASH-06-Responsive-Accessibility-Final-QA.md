# DASH-06 – Responsive Design, Accessibility & Final Dashboard QA

**Phase:** 11 – Dashboard Polish · **Date:** 2026-11-20
**New dependencies:** none · **Database migrations:** none · **Backend code changes:** none

## 1. Browser and viewport details

**Real browser testing was performed.** No browser-automation tool was connected to this session, but Microsoft Edge was installed. The dashboard was therefore driven through the **Chrome DevTools Protocol** by a zero-dependency Node 22 script (built-in `fetch` + `WebSocket`; nothing added to the project). Every result below comes from pages actually rendered and laid out by the browser engine, with real mouse clicks and keyboard events. None of it is inferred from unit tests or markup.

| Item | Value |
|---|---|
| Browser | **Microsoft Edge 157.0.4341.60, headless (Chromium engine)** |
| Driver | CDP: `Emulation.setDeviceMetricsOverride`, `Input.dispatchMouseEvent`/`dispatchKeyEvent`, `Fetch` interception, `Accessibility.getFullAXTree`, `Page.captureScreenshot` |
| Viewports | **360×740** (mobile emulation), **768×1024** (tablet), **1280×800** (desktop; 1280×900 for the end-to-end run) |
| App under test | Production build (`next build` + `next start`) on a separate port, against the updated backend on a separate port. Your dev servers were not used for testing. |
| Data | **Test-only** users created through the public API (`dash06_*@foliocraft.test`). **6 test users and all their content were deleted afterwards; 0 leftovers verified.** No real user data was read, modified or deleted. |
| Failure simulation | CDP `Fetch` interception: connection refused (network), HTTP 500 (server), HTTP 401 (expired session), and held requests (loading state) |

The QA scripts, results JSON and 34 screenshots are in the session scratchpad (`…/scratchpad/qa/`). That location is temporary, so they can be copied into the repo if wanted.

## 2. Responsive testing results

**Automated in-browser checks**, run per state and viewport:
- horizontal page scroll;
- elements outside the viewport;
- text clipped without an ellipsis or line-clamp, **including text spilling past a clipping ancestor**;
- overlapping interactive elements;
- targets smaller than 24×24px (WCAG 2.5.8);
- smallest rendered font size;
- WCAG contrast of every visible text node.

Colours are converted with a canvas, so Tailwind v4 `oklch()` values are measured exactly.

### Final results: all dashboard states clean at all three widths

| State | 360px | 768px | 1280px |
|---|---|---|---|
| Dashboard (3 statuses + long content) | ✅ | ✅ | ✅ |
| Delete dialog (live, 50-char username) | ✅ | ✅ | ✅ |
| Publish dialog (read-only username) | ✅ | ✅ | ✅ |
| Empty state + 4-step guide | ✅ | ✅ | ✅ |
| Loading (held request) | ✅ | ✅ | ✅ |
| Server error (500) | ✅ | ✅ | ✅ |
| Network error | ✅ | ✅ | ✅ |
| Backend unavailable (session restore) | ✅ | ✅ | ✅ |
| Session-expired notice | ✅ notice itself | ✅ notice itself | ✅ notice itself |

✅ = no horizontal scroll, nothing outside the viewport, no unintended clipping, no overlaps, no undersized targets, and no contrast failures. The rest of the login page has issues outside dashboard scope (see §5 B).

**Layout measurements:**
- **Cards.** Equal heights per row: 1280px gives 409/409/409, and 768px gives 409/409 in the first row (the third card wraps to its own row). On mobile they form a single column at natural heights.
- **Card actions.** Identical on every card: Edit + Preview (equal width), a full-width publish action, and a 38×38 Delete button. All are 38px tall.
- **Stats.** 2 columns at 360px, 3 at 768px, 6 at 1280px. Values are correct (3 / 1 / 2 / 2 / 3 / 1 for the seeded data).
- **Dialogs fit the viewport at every width** (final run, long-title live portfolio). Delete is 328×671 at 360px (viewport 740) and 448×525 elsewhere. Publish is 328×647 at 360px and 576×533 elsewhere. Both scroll inside if needed.
- **Long content.** A long title is clamped to 2 lines and the full text stays available via `title`. A long name, 50-character username and long URL are truncated with an ellipsis. A 600-character description with a 60-character unbroken word is clamped and wrapped.
- **Text size.** Smallest dashboard text is 11px (meta and hints). 10px appears only in the Phase 10 checklist "✓" glyph (§5 C).

**Visual review.** Screenshots were inspected manually at all widths. That inspection found one bug the original automated checks missed (fix 8), and the audit was extended to catch that class of bug.

## 3. Accessibility testing results (final)

| Check | Result | How it was verified |
|---|---|---|
| Keyboard navigation | ✅ 21 Tab stops in logical order: navbar → header CTA → per card (template, URL, copy, Edit, Preview, publish, Delete) | Real `Tab` key events |
| Visible focus indicators | ✅ 0 of 21 stops without an indicator; also checked on every dialog control | Computed outline / box-shadow on the focused element |
| Accessible names | ✅ 0 unnamed buttons or links; **0 duplicate names** (was 3× "Modern Developer →") | Chromium accessibility tree |
| Delete dialog focus | ✅ Opens with the keyboard; initial focus on **Cancel**; Tab and Shift+Tab **wrap inside** (11 presses) | Real keys |
| Publish dialog focus | ✅ Initial focus inside (close button); Tab stays inside (12 presses) | Real keys |
| Escape | ✅ Closes both dialogs (ignored while deleting) | Real key |
| Focus restoration | ✅ Back to the trigger button for both dialogs. After a successful delete it goes to the "Your Portfolios" heading, because the card no longer exists | `document.activeElement` |
| Background interaction blocked | ✅ Delete: background `.focus()` refused and pointer hits land on the dialog (native inert). Publish: Tab can't reach the background, and the page doesn't scroll behind either dialog. | Programmatic + hit testing |
| Typed confirmation (live delete) | ✅ Disabled initially and with a wrong name; Enter with a wrong name refused; enabled with the correct name (case-insensitive) | Real typing |
| Loading announcement | ✅ `role="status"`, `aria-busy="true"`, visually hidden "Loading your portfolios..." | Live DOM during a held request |
| Error announcement | ✅ Error card `role="alert"`, with the right `data-error-kind` (server/network) | Live DOM |
| Action feedback | ✅ Polite live region announces "…was permanently deleted." | Live DOM |
| Status badge contrast | ✅ Draft, Published and Unpublished all ≥ 4.5:1 | Canvas-measured |
| Text contrast (dashboard) | ✅ 0 failures (was 13 per viewport on the dashboard, plus dialogs, empty and error states) | All visible text nodes |
| Reduced motion | ✅ Live-badge pulse is `pulse` normally and `none` with `prefers-reduced-motion: reduce`; all 9 skeleton animations `none` | `Emulation.setEmulatedMedia` + computed `animation-name` |

## 4. Functional regression results (real UI, 23/23 pass)

Run at 1280×900 against a fresh test user. Sign-in, creation, publishing and deletion all go through the real UI.

| # | Step | Result |
|---|---|---|
| 1 | Sign in through the login form | ✅ Redirected to `/dashboard` |
| 2 | Open dashboard (new user) | ✅ Empty state, stats hidden |
| 3 | Create a portfolio through the create form | ✅ Redirected to the editor |
| 4 | Draft status on the dashboard | ✅ Draft; total 1, published 0 |
| 5 | Open the editor from the card | ✅ |
| 6 | Publish (from the editor header) | ✅ Modal username read-only |
| 7 | Published status | ✅ "First published Nov 20, 2026"; published 1 |
| 8 | Open the public page `/u/:username` | ✅ Renders the portfolio |
| 9 | Unpublish (dashboard → Manage Live → confirm) | ✅ |
| 10 | Unpublished status + history | ✅ "Offline · first published Nov 20, 2026", same after reload; public page shows not-found |
| 11 | Republish | ✅ Button read "Republish"; the original first-publish date was kept |
| 12a | Cancelled deletion | ✅ Card kept; **no DELETE request sent** (checked on the network) |
| 12b | Network failure during delete | ✅ "Couldn't reach FolioCraft, so your portfolio was not deleted…"; card kept |
| 12c | Delete a draft after confirmation | ✅ Removed without a reload; "…was permanently deleted."; focus moved to the heading |
| 13 | Stats after deletion | ✅ Total 2 → 1, drafts 1 → 0, published 1 → 1 |
| 12d | Delete the live portfolio (typed username) | ✅ Empty state, stats hidden |
| 14 | Deleted public page | ✅ UI not-found **and** API 404 |
| 14b | Ownership | ✅ Another user's DELETE → 403; portfolio intact |
| 15a | Backend unavailable on load | ✅ Stays on `/dashboard` ("still signed in"); **Try Again recovers** |
| 15b | Network failure loading the list | ✅ Classified network error; **Retry recovers** |
| 15c | Session expires during delete (401) | ✅ `/login?reason=session-expired` with notice; token cleared; portfolio **not** deleted |
| 15d | Session expires while loading the dashboard | ✅ `/login?reason=session-expired` |

## 5. Issues discovered and fixes applied

### Fixed (dashboard scope)

| # | Issue (found in the browser) | Fix |
|---|---|---|
| 1 | **Text contrast (WCAG 1.4.3).** `#94a3b8` text measured **2.47–2.56:1** in: stat hints, `@username`, the "No summary yet" placeholder, the Updated date, empty-state step numbers, the error detail, and the dialog's `@username` and CV note. The "—" (not available) glyph used `#cbd5e1`. The dashboard loading text "Verifying credentials" was the same colour. | → `#64748b` (≥ 4.6:1 on white and `#fbfaff`). Decorative `aria-hidden` bullets unchanged. |
| 2 | **Non-text contrast (WCAG 1.4.11).** Trash icon and publish-modal close icon at 2.56:1 | → `#64748b` |
| 3 | **Publish modal contrast** (colour only, Phase 10 file): `/u/<handle>` hint (2.56), "/u/" prefix (4.29), status description (4.47) | → `#64748b` / `#475569` / `#475569` |
| 4 | **Target size (WCAG 2.5.8).** Copy-URL button 22×22px; template link 17px tall; live-URL link 16px tall | Copy → 28×28 (`min-w-7 min-h-7 p-1.5`); template link `min-h-6` (24px); URL link `min-h-7` (banner padding reduced, so the height stays the same) |
| 5 | **Ambiguous names.** Three links named "Modern Developer →". The copy button would repeat its name once several portfolios are live. | Visually hidden ", change template for <title>"; arrow `aria-hidden`; copy button "Copy public URL for <title>". The visible label is still the start of each accessible name. |
| 6 | **Publish modal focus.** Initial focus stayed on the card; Tab reached background cards; focus was lost to `<body>` on close; the page scrolled behind. | New dependency-free `useModalFocus` hook: initial focus, Tab/Shift+Tab wrap, scroll lock, focus restore. Wired with `ref` + one hook call. **No publishing logic changed.** |
| 7 | **Delete dialog Tab escape.** Native `<dialog>` lets Tab leave to the browser chrome, which the WAI-ARIA modal pattern doesn't expect. | Same hook (it now also opens and closes the native dialog) |
| 8 | **Long username clipped at 360px.** "Type <username> to confirm" ran **72px** past the dialog edge (hidden by its overflow, so no page scroll). Spotted in a screenshot. | `break-words` + `break-all` on the username. The audit was extended to detect text spilling past clipping ancestors, then confirmed clean at all widths. |
| 9 | **Regression introduced while fixing 7, caught by the browser test.** `showModal()` moved focus into the dialog before the hook recorded the trigger, so focus went to the heading instead of the trash button on close. | The hook records the trigger **before** calling `showModal()`, and never "restores" to an element inside the dialog. A unit test guards the order. |

Test-harness problems found along the way, not app bugs: smooth-scroll click coordinates, DOM-node results from `waitFor`, a reused browser profile session, and username collisions between reruns. These were fixed in the scripts.

### Documented, not changed (approval needed or out of scope)

| # | Finding | Why not changed | Proposed fix |
|---|---|---|---|
| A | **[Resolved after review — see PHASE-11-COMPLETION-REPORT.md §9]** **Phase 10: the publish/unpublish success alert never stays visible.** After `onPortfolioUpdated`, both the dashboard and the editor pass a new `portfolio` prop. `PublishModal`'s prop-sync block (`if (portfolio !== prevPortfolio)`) then resets `actionSuccess` to null. The browser confirmed the alert is absent after publish (editor), unpublish and republish (dashboard). It's **pre-existing in the committed Phase 10 code (HEAD)**. Users still see the status banner change to "Published (Live)" or "Draft (Unpublished)". | It changes Phase 10 publishing behaviour, which was out of scope | Reset the modal state only when `portfolio.id` changes, not on every new object. Roughly a 3-line change plus a test. |
| B | **Login page (auth module).** Footer and divider text `#94a3b8` at 2.45–2.56:1 (6–10 instances). Small targets: "Back to home", "Forgot password?", "Create one" (16px tall), "Remember me" checkbox 16×16. | Outside dashboard scope; the DASH-02 notice itself passes | Same colour and target-size treatment as the dashboard |
| C | Publish-modal checklist "✓" glyph at 10px | Phase 10 cosmetic; the meaning is also given in text ("Ready") | Increase to 11–12px |
| D | `npm run lint` (whole frontend): 5 errors (`react-hooks/set-state-in-effect`) | All in CV, experience, project and skill managers, untouched by Phase 11 | Separate clean-up |
| E | Backend `tsc`: 674 errors, all from the existing configuration (`TS1295`/`TS1287` module-system settings, plus earlier strict-type errors in controllers, CV services and tests). The two Phase 11 test files add only the same `TS1295` class (11 lines). | Config issue predating Phase 11; tests run through `tsx` | Fix `module`/`verbatimModuleSyntax` in `backend/tsconfig.json` |

## 6. Files created and modified in DASH-06

| File | Status | Change |
|---|---|---|
| `frontend/src/lib/useModalFocus.ts` | **New** | `useModalFocus` hook (initial focus, Tab wrap, scroll lock, focus restore, optional native `<dialog>` open/close) and the pure `getWrappedFocusTarget` |
| `frontend/src/components/dashboard/dashboardAccessibility.test.ts` | **New** | 8 tests |
| `frontend/src/components/portfolio/DeletePortfolioDialog.tsx` | Modified | Uses the hook; long-username wrap; contrast |
| `frontend/src/components/portfolio/PublishModal.tsx` | Modified | `ref` + `useModalFocus(modalRef, isOpen)`; 4 colour classes. **No logic change.** |
| `frontend/src/components/portfolio/PortfolioCard.tsx` | Modified | Contrast; target sizes; unique accessible names |
| `frontend/src/components/dashboard/DashboardStats.tsx` | Modified | Contrast (hints, "—") |
| `frontend/src/components/dashboard/DashboardEmptyState.tsx` | Modified | Contrast (step numbers) |
| `frontend/src/components/dashboard/DashboardErrorState.tsx` | Modified | Contrast (detail) |
| `frontend/src/app/dashboard/page.tsx` | Modified | Contrast (loading-screen subtitle) |
| `frontend/src/components/portfolio/portfolioCardStatus.test.ts` | Modified | DASH-04 assertion updated deliberately for the new copy-button name |

## 7. Test results (final run)

| Check | Result |
|---|---|
| **All frontend tests** (21 files) | **285 / 285 pass** |
| Phase 11 frontend suites (DASH-02 to DASH-06, 5 files) | 88 / 88 pass |
| Phase 10 frontend publishing (`publishingControls`, `publicPortfolioRoute`) | **31 / 31 pass** |
| **Backend tests** (32 files: `db`, `routes`, `services`, `middleware`, `utils`, excluding `cv*`; the same convention as PUB-06) | **520 / 520 pass** |
| Phase 10 + Phase 11 backend (`publishingIntegrity`, `publishing`, `public`, `pub02.migration`, `portfolio` routes, `portfolio.service`, `portfolioSectionCounts`, `portfolioDelete`) | **129 / 129 pass** |
| Frontend `tsc --noEmit` | ✅ clean |
| ESLint, all Phase 11 files | ✅ clean |
| ESLint, whole frontend | 5 errors + 11 warnings, **all in files Phase 11 didn't touch** (§5 D) |
| Backend `tsc` (changed files) | No errors beyond the existing config class (§5 E) |
| `npm run build` (default config) | ✅ success; `/dashboard` and `/login` static, `/u/[username]` dynamic |
| Browser: responsive | 24 of 24 dashboard state × viewport combinations fully clean; the session-expired notice is clean at all 3 widths (the rest of the login page is out of scope, §5 B) |
| Browser: accessibility | All checks in §3 pass |
| Browser: end-to-end | **23 / 23 steps pass** |

## 8. Remaining limitations
- **Only Chromium was tested.** Firefox (Gecko) and Safari (WebKit) weren't available. `<dialog>`/`showModal()` and the CSS used are supported in all current evergreen browsers.
- **No real assistive technology.** Names, roles and announcements were verified through Chromium's accessibility tree and ARIA live-region markup, not NVDA, JAWS or VoiceOver.
- **No physical touch devices.** Mobile was emulated with device metrics; target sizes were measured, but no real touch input was used.
- **Contrast uses the WCAG formula** on the measured composited colours. Gradient or blurred backgrounds (the header glow) are approximated by their base colour.
- **Findings A–E** above remain open.

## 9. Integrity confirmation
- **Phase 10.**
  - Publishing endpoints, the API client, `mergePublishingResult`, the status logic, the checklist, publish/unpublish handlers and validation are unchanged. `PublishModal` received only a focus hook and colour classes, on top of DASH-05's read-only username.
  - Frontend (31/31) and backend publishing suites pass.
  - The browser end-to-end run published, unpublished and republished successfully.
- **DASH-02.** Session-expired and backend-unavailable flows verified in the browser (15a–15d); suite passes.
- **DASH-03.** Stats verified with real data across create, publish, unpublish and delete; the `sectionCounts` API is unchanged; suite passes.
- **DASH-04.** All three statuses and history verified in the browser. One assertion was updated on purpose for the more specific copy-button name; suite passes.
- **DASH-05.** Delete flow verified end to end (cancel, failure, success, live typed confirmation, 401, ownership); suite passes.
- **No database migrations, no new dependencies, no Git operations.** The stashed education work and unrelated modules were not touched.

### Operational note
During QA clean-up, my process filter for stopping the temporary QA backend was too broad. **It also stopped your backend dev server** (`npm run dev` on port 5000). I restarted it immediately with the same command and confirmed `http://localhost:5000` responds. It now runs as a background task of this Claude session and includes the DASH-03 `sectionCounts` change. **Restart it in your own terminal** so it doesn't stop when this session ends. Your frontend dev server on port 3000 was not affected.
