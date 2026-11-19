# DASH-04 – Portfolio Card & Status Polish

**Phase:** 11 – Dashboard Polish · **Depends on:** DASH-01 (§3A, §4.3–4.5), DASH-02, DASH-03
**Backend changes:** none · **New dependencies:** none · **Database migrations:** none
**PublishModal / publishing endpoints:** not modified

## 1. Changes made

### Status
- **New third status: Unpublished.** A portfolio that was published and then taken offline now shows an **Unpublished** badge (slate) instead of **Draft**. Its publishing history stays visible: "Offline · first published Feb 15, 2026".
- **Shared badge.** `PortfolioStatusBadge` replaces the inline badge markup. It always pairs colour with a text label, and the pulsing "live" dot respects `prefers-reduced-motion`.
- **Publishing date line.**
  - **Published:** "First published <date>".
  - **Unpublished:** "Offline · first published <date>".
  - **Draft:** none.
- **Action label.** The publish action reads **Republish** for unpublished portfolios. It still opens the same `PublishModal` with the same behaviour.

### Card layout
| Area | Before | After |
|---|---|---|
| Height | Uneven between cards | `h-full flex flex-col`; content is `flex-1`, so the actions sit at the bottom and cards in a row match in height |
| Title | 1 line, cut off | Up to 2 lines with `break-words`; full text in the `title` tooltip |
| Owner line | template · @username | **name · @username**, truncated with tooltip |
| Template link | Next to the username | Moved to a meta row with the last-updated date ("Modern Developer → • Updated Mar 10, 2026") |
| Summary | Left out when missing (cards shrink) | 2-line clamp with `break-words`. When missing or blank: muted "No summary yet. Add one in the editor." |
| Status badge | Inline styles, 2 states | Shared component, 3 states, `whitespace-nowrap`, stays top-right |
| Actions | One wrapping row; footers uneven at 3 columns | Same on every card: **Edit + Preview** in a 2-column row, then a **full-width** Publish / Republish / Manage Live button. All three are 38px tall. |
| Preview icon | External-link icon on an internal link | Eye icon. Only the live URL opens a new tab. |
| Screen-reader names | "Edit", "Preview", "Publish" repeated on every card | Each action also announces the portfolio title (visually hidden), so the visible label is still the start of its accessible name |
| Copy URL | Failure ignored | Shows "Copy failed" briefly; the button has `aria-label="Copy public URL"` |
| Skeleton | 3 actions in a row | Matches the new footer: 2-column row plus a full-width bar |

**Duplicated actions avoided.** Live cards don't get an extra "View live" button, because the URL banner already opens the live site. There is still one Edit, one Preview and one publish action per card.

## 2. Files

| File | Status | Change |
|---|---|---|
| `frontend/src/lib/dashboard.ts` | Modified | Adds `PortfolioStatus`, `getPortfolioStatus`, `formatPortfolioDate` and `getPublishingInfo`. DASH-02 and DASH-03 functions unchanged. |
| `frontend/src/components/portfolio/PortfolioStatusBadge.tsx` | **New** | The status pill and `getStatusLabel`. |
| `frontend/src/components/portfolio/PortfolioCard.tsx` | Modified | Card layout, status, dates, actions, copy feedback, skeleton footer. Exports, props and test IDs (`card-publish-btn-*`, `card-copy-url-*`, `card-public-url-banner`) kept. |
| `frontend/src/components/portfolio/portfolioCardStatus.test.ts` | **New** | 17 tests. |

Not modified: `PublishModal.tsx`, `lib/api.ts`, the dashboard page, every DASH-02 and DASH-03 component, and all backend code.

## 3. Status logic and date handling

```
published === true                     → live         ("Published")
published === false && valid publishedAt → unpublished ("Unpublished")
otherwise                              → draft        ("Draft")
```

**Why this is sound (verified against the backend):**
- **Publish** sets `published_at = COALESCE(published_at, CURRENT_TIMESTAMP)`, so the date is set once, at the first publish.
- **Unpublish** sets only `published = false`. It never clears `published_at` (PUB-06 QA C8 also checked this).
- **Create** leaves `published_at` NULL, and generic create and update cannot set it (PUB-06D D6).

So a non-null `publishedAt` on a non-live portfolio means it was published before.

**On the dashboard:** the unpublish response doesn't include `publishedAt`, but `mergePublishingResult` keeps the existing value. A portfolio unpublished from the dashboard therefore switches straight to **Unpublished** (test 4).

**Date wording.** Because `published_at` is the **first** publish date and survives republishing, the card says "First published", not "Live since". "Live since" would be wrong after an unpublish and republish.

**Nothing is inferred.** Dates come only from `publishedAt`. `createdAt` and `updatedAt` are never used as publishing history, and missing or invalid dates produce no publishing line.

**Relation to DASH-03 stats.** The "Drafts" tile (hint "Not live yet") counts every non-live portfolio, so it includes unpublished ones. That still matches its label.

## 4. Testing results

| Check | Result |
|---|---|
| New DASH-04 suite (`portfolioCardStatus.test.ts`) | **18/18 pass** (17 subtests + suite) |
| All 19 frontend test files | **252/252 pass** |
| Phase 10 (`publishingControls`, `publicPortfolioRoute`) with DASH-02, DASH-03 and DASH-04 suites | **86/86 pass**. PUB-05 test 9 (card status, URL banner, Manage Live) passes unchanged. |
| Backend: section counts, `publishingIntegrity`, `publishing`, `portfolio` routes, `portfolio.service`, `public` routes | **111/111 pass** |
| Frontend `tsc --noEmit` | clean |
| `eslint` on all Phase 11 files | clean |
| `npm run build` | success; `/dashboard` still static |

**Scenarios covered:**
- **Statuses:** draft cards, published cards, and previously published (unpublished) cards.
- **Real flow:** draft → publish → unpublish through `mergePublishingResult`, using the response shapes the API actually returns.
- **Legacy data:** published portfolios with no date (stay live, no date line) and invalid date strings.
- **Long content:** long titles (2-line clamp with full tooltip), long unbroken descriptions (`break-words`), and 50-character usernames (truncated).
- **Missing summary:** null, empty and whitespace-only all show the placeholder, never "null". Invalid updated or created dates fall back to "Recently updated".
- **Actions:** identical action structure and height on all three statuses, correct Edit and Preview links, full-width publish action, Preview opening in the same tab, screen-reader names with the title, and the template link and last-updated text kept.
- **Skeleton:** matches the new footer. The DASH-02 skeleton test (3 actions) still passes.

## 5. Known limitations
- **Portfolios published before the publish-date column existed (PUB-02).** If one of these is now unpublished, it has no `published_at`, so it shows as **Draft**. Nothing in the data distinguishes it, so no history is invented. Live ones still show **Published**, just without a date.
- **The card shows the first publish date, not the latest.** The schema keeps only one timestamp. "Live since" for republished portfolios would need a new column, which is out of scope (no migrations).
- **Copy failures are rare to see in practice.** Both clipboard paths rarely throw, so "Copy failed" will seldom appear. It replaces silent failure.
- **Not checked in a browser yet.** Layout is verified through rendered class assertions, not visually. Visual QA at 360, 768 and 1280px is planned for DASH-06.
- **The editor header and `PublishModal` still show two states.** They keep their two-state "Draft/Published" wording, because changing `PublishModal` was out of scope. Only the dashboard card shows the three-state status.

## 6. Integrity confirmation
- **Phase 10:** `PublishModal`, `mergePublishingResult`, `getPublicPortfolioUrl`, the publishing API client and all backend publishing code are unchanged. The publish/unpublish regression suites pass on both frontend and backend. The card still calls `onPublishClick(portfolio)`, so the dashboard opens the same modal.
- **DASH-02:** session handling, error states and `PortfolioGridSkeleton` are unchanged, and its suite passes. Only the skeleton's inner footer layout changed, to match the card.
- **DASH-03:** header, stats, empty state and the `sectionCounts` API are unchanged, and its suite passes.
- **No Git operations** were performed.
