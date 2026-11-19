# FolioCraft – Phase 10: PUB-06E Final Runtime Verification

**Date:** 2026-11-20
**Branch:** `feat/publishing`
**Mode:** Verification only. No code changes, no process restarts, no commits.

## Verdict

**PASS – Phase 10 Publishing is ready for completion**, subject to one condition: a short **manual browser click-through** of the dashboard publishing modal (§4). No browser automation was available, so the UI interactions were not exercised.

All 35 runtime checks against the running application passed (0 failures). D5 and D6 are confirmed fixed in the running backend. Real user data was not changed.

---

## 1. Running Environment

| Component | URL | Process | How identified |
|---|---|---|---|
| Frontend | `http://localhost:3000` | `next dev` (PID 20512, started 2026-11-20 01:31) | Port 3000 as instructed; `X-Powered-By: Next.js` |
| Backend | `http://localhost:5000` | `tsx src/server.ts` via `npm run dev` (PID 24068, started 2026-11-20 01:32) | `NEXT_PUBLIC_API_URL` in `frontend/.env.local` and `PORT` in `backend/.env`; `GET /api/public/<x>` → 404 JSON, `GET /api/portfolios` → 401 |

- The servers noted in PUB-06/PUB-06D (ports 3001, 5001 and the old 3000/5000 instances) were **no longer running**.
- Both current servers started **after** the PUB-06D changes, and D6 behaviour (2.1–2.4e) confirms the backend runs the fixed code.
- The frontend runs in **development mode** (`next dev`), not as a production build.
- No process was started, stopped or restarted during this verification.

## 2. Test Data

- Test accounts `pub06e_qa_<tag>_a` / `_b` were registered through `POST /api/auth/register`, with random passwords that were not recorded.
- Portfolios were created through the API.
- Two "legacy" rows (usernames `about` and a 2-character name) were inserted directly by SQL under test user A. The create/update API now correctly refuses these usernames, so this was the only way to exercise the publish endpoint's own username checks.
- All test records were removed afterwards (scoped to `email LIKE 'pub06e_qa_%@foliocraft.test'`). See §7.

## 3. Backend Publishing Security (running backend `:5000`)

| # | Requirement | Result | HTTP / evidence |
|---|---|---|---|
| 2.1 | `PUT {published:true}` rejected | PASS | 400: "'published' cannot be modified through portfolio update. … Use POST /api/portfolios/:id/publish or POST /api/portfolios/:id/unpublish." DB stays `published=false` |
| 2.2 | `PUT {published:false}` rejected | PASS | 400; portfolio stays published |
| 2.3 | `publishedAt` / `published_at` rejected | PASS | 400 / 400; `published_at` unchanged |
| 2.3 | `POST /api/portfolios` with `published:true` rejected | PASS | 400; no row created |
| 2.4a | Create rejects `ab`, `about`, `Dashboard`, `bad.name`, 51 characters | PASS | 400 for all five |
| 2.4b | Update rejects reserved `admin` | PASS | 400 "Username 'admin' is reserved for system use"; username unchanged |
| 2.4c | Reserved username cannot be published | PASS | publish 400 "Cannot publish portfolio: Username 'about' is reserved for system use"; `/api/public/about` 404 |
| 2.4d | Too-short username cannot be published | PASS | 400 "…must be at least 3 characters long" |
| 2.4e | Former PUT bypass on reserved row closed | PASS | 400; still not public |
| 2.5 | Invalid template cannot be published | PASS | publish 400 "unsupported template 'nonexistent-template'"; public 404 |
| 2.6 | `/publish` works for valid portfolio | PASS | 200; `published:true`, `publishedAt` set, `publicUrl=/u/<username>` |
| 2.7 | `/unpublish` works | PASS | 200; `published:false`, `publicUrl:null` |
| 2.8 | Unpublish preserves content and username | PASS | username, name, about, 2 projects, 1 skill, 1 experience and first `published_at` all intact |
| 2.9 | Republish works | PASS | availability check (own username) → `available:true`; publish 200; first `published_at` kept; page live again |
| 2.10 | Unauthorized users blocked | PASS | other user: publish 403, unpublish 403, PUT 403; anonymous: publish 401, unpublish 401; state unchanged |

## 4. Public Portfolio Access (running frontend `:3000`)

| # | Check | Result | HTTP / behaviour |
|---|---|---|---|
| 3.1 | Published test portfolio displays (no auth) | PASS | 200; title "Runtime Verifier — Release QA \| FolioCraft"; canonical `/u/<username>`; name, title, both projects, skill and experience rendered; no `robots` meta |
| 3.1b | Published HTML leaks no JWT, account email or user id | PASS | — |
| 3.1c | Existing **real** published portfolio renders (read-only GET) | PASS | 200; template rendered |
| 3.2a | Public API: unpublished and nonexistent | PASS | both 404 `{"message":"Portfolio not found"}` (identical) |
| 3.2 | Unpublished username page | PASS (behaviour) | branded not-found card, no portfolio content, `<meta name="robots" content="noindex">`; **HTTP 200** (browser and Googlebot user-agents) |
| 3.2 | Nonexistent username page | PASS (behaviour) | identical not-found card + `noindex`; **HTTP 200** (browser and Googlebot) |
| 3.4 | Invalid usernames `ab`, `bad.name`, 51 characters | PASS (behaviour) | invalid-username guidance card, no API call; **HTTP 200, no `noindex`** (see L2) |
| 3.5 | Public API exposes no private user info | PASS | no `userId`/password/token keys; account email absent |
| 3.6 | Modern / Minimal / Professional templates | PASS ×3 | 200; only the selected template's root rendered; all content present |

### HTTP status matrix (actual)

| Page | Browser user-agent | Googlebot user-agent | robots meta |
|---|---|---|---|
| `/u/<published>` | 200 | — | absent (indexable) |
| `/u/<unpublished>` | 200 | 200 | `noindex` |
| `/u/<nonexistent>` | 200 | 200 | `noindex` |
| `/u/ab`, `/u/bad.name`, `/u/<51 chars>` | 200 | — | absent |
| `GET /api/public/<unpublished or nonexistent>` | 404 | — | n/a |

The 200 status on not-found pages is the known Next.js streaming behaviour. `app/u/[username]/loading.tsx` makes the route stream, so the status is committed before `notFound()` runs (Next 16 docs, `file-conventions/loading.md` → "Status Codes"). Next injects `noindex` instead, so these pages are not indexed. This matches PUB-06 results on the production build.

## 5. Frontend Publishing Workflow

**No browser interactions were performed.** No browser automation tool (Playwright, Puppeteer, Chrome or built-in browser MCP) is available in this environment. The dashboard and editor are client-rendered with the session token in browser storage, so they cannot be driven by plain HTTP requests.

| Requirement | Interactive UI | Underlying API behaviour the UI depends on |
|---|---|---|
| Publishing status displayed | NOT TESTED | PASS: list API returns `published:true` and `publishedAt` (4.1) |
| Username availability validation | NOT TESTED | PASS: free → available; own username (any case, with `portfolioId`) → available; another user's → unavailable (4.2) |
| Invalid / reserved usernames rejected | NOT TESTED | PASS: check-username 400 for `dashboard` / `ab`; create/update 400 (2.4a/b) |
| Publishing readiness checks | NOT TESTED | PASS: server-side readiness rejects bad username/template (2.4c–2.5). Modal checklist covered by PUB-05 unit test 10 |
| Publish action | NOT TESTED | PASS (2.6) |
| Public URL displayed | NOT TESTED | PASS: `publicUrl=/u/<username>`. Absolute-URL handling covered by PUB-05 unit test 12 |
| Copy URL | NOT TESTED | — (needs a real clipboard) |
| Unpublish confirmation | NOT TESTED | PASS: unpublish API (2.7). Confirm dialog markup covered by PUB-05 unit test 8 |
| Republish after unpublish | NOT TESTED | PASS: API (2.9). Modal state merge fix covered by PUB-05 unit test 11 |

`GET /dashboard` returns 200 (client shell).

**Recommended manual click-through (~5 min)** in a browser on `http://localhost:3000`:
1. Dashboard → Publish on a test portfolio.
2. Type a taken name, a reserved name and a 2-character name, and confirm each feedback message.
3. Publish.
4. Copy URL, then paste it to confirm it's absolute.
5. Visit Live.
6. Unpublish → confirm dialog → confirm.
7. Check the card shows Draft and keeps its name and title.
8. Publish again without reloading.

## 6. Security Summary

| Area | Result |
|---|---|
| Publishing state only changeable via `/publish` and `/unpublish` (D6) | PASS |
| One username rule set across create, update, availability and publish (D5) | PASS |
| Authentication (401) and ownership (403) on publish, unpublish and update | PASS |
| Draft enumeration: unpublished ≡ nonexistent (API body and page) | PASS |
| No private account data, JWT or user id in public API or HTML | PASS |

## 7. Data Integrity

| Check | Result |
|---|---|
| Before-snapshot: 7 real portfolios (id, template, published, `published_at`, `updated_at`, username hash, content counts) | Taken |
| After-snapshot compared with before | **Identical** |
| Real published portfolio's `published_at` (`2026-11-17T21:00:01.655Z`) | **Unchanged** |
| Real portfolios were only read (one read-only GET of a real public page) | Confirmed |
| Test records removed | 2 users and 4 portfolios (`pub06e-<tag>`, `pub06e-tpl-<tag>`, legacy `about`, legacy 2-character name) |
| Leftover PUB-06E users/portfolios | 0; `/api/public/about` → 404 after cleanup |
| Total portfolios | 8 (unchanged from before the run) |

## 8. Known Limitations

- **L1. Unavailable public pages return HTTP 200 (with `noindex`).** This is the documented Next.js streaming behaviour caused by `loading.tsx`. It is SEO-safe because of `noindex`. A true 404 would need removing `loading.tsx` or adding a `proxy` pre-check, which is a design decision rather than a defect.
- **L2. Invalid-format usernames (`/u/ab`) return 200 *without* `noindex`.** The page shows the invalid-username card directly. These URLs are never generated by the app, so the impact is very low. Optional minimal fix: return `robots: { index: false }` from `generateMetadata` for invalid formats. Not applied, because this task is verification-only and the item is outside D5/D6.
- **L3. Ordinary `PUT` accepts an unsupported `template` value** (200). Publishing still blocks it (2.5), so nothing invalid can go public. Restricting template values on update is a possible follow-up.
- **L4.** Canonical URLs are relative (`NEXT_PUBLIC_APP_URL` unset). Set it for production.
- **L5.** Public payload contains nested item `id`/`portfolioId` UUIDs. No account data; low risk.
- **L6.** Interactive browser workflow not verified (§5).
- **L7.** The frontend was verified in `next dev` mode. Production-build behaviour was verified in PUB-06/PUB-06D (build PASS; same status/noindex behaviour).

## 9. Failures and Root Causes

**None.** All 35 checks passed. The four observations (template accepted on PUT, nested UUIDs, the HTTP 200 status matrix, the dashboard shell) are recorded as known limitations above.

## 10. Git Status

Unchanged by this verification apart from adding this report. Branch `feat/publishing`; all PUB-02 to PUB-06D modifications and untracked files are preserved; nothing committed or pushed.

```text
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

---

**PASS – Phase 10 Publishing is ready for completion**, conditional on the manual browser click-through in §5.
