# FolioCraft – Phase 10: PUB-03 Backend Publishing, Unpublishing & Username Management Report

**Date:** 2026-11-18  
**Branch:** `feat/publishing`  
**Status:** **PUB-03 COMPLETED**  
**Role:** Senior Software Architect, Backend Engineer, PostgreSQL Database Engineer, Security Reviewer

---

## 1. Executive Summary

Phase 10: PUB-03 implements the complete backend lifecycle management for portfolio publishing, unpublishing, and username governance. Building on top of the PUB-01 architecture audit and PUB-02 database indexing & public retrieval API, PUB-03 establishes secure, robust, and idempotent endpoints allowing authenticated users to validate usernames, check availability, publish complete portfolios, and unpublish active portfolios while preserving content and security boundaries.

### Scope Boundaries Enforced
- **Backend Only:** All endpoints, services, controllers, validators, and tests are implemented strictly within the backend.
- **No Frontend UI/Routes:** Frontend routes (`/u/:username` for PUB-04) and dashboard/editor publish buttons (`PUB-05`) were deliberately excluded per task boundaries.
- **Git Safety:** Zero commits, stashes, resets, or pushes were executed. All changes from Phase 9, PUB-01, PUB-02, and PUB-03 remain safely preserved on `feat/publishing`.

---

## 2. API Endpoints Implemented

| Method | Endpoint | Auth | Ownership Check | Description |
|---|---|---|---|---|
| `GET` | `/api/portfolios/check-username/:username` | JWT Required | Current User / Portfolio Aware | Checks if username is valid, unreserved, and available; permits owner's current username |
| `POST` | `/api/portfolios/:id/publish` | JWT Required | Owner Only (`403 Forbidden` on mismatch) | Validates readiness, sets `published = true`, sets `published_at`, generates `publicUrl` |
| `POST` | `/api/portfolios/:id/unpublish` | JWT Required | Owner Only (`403 Forbidden` on mismatch) | Sets `published = false`, preserves all content and `published_at`, returns `publicUrl: null` |

---

## 3. Detailed Component Architecture

### A. Username Management & Validation (`backend/src/utils/validation.ts`)
- **Validation Rules:**
  - Length: Minimum 3 characters, Maximum 50 characters (`/^[a-zA-Z0-9_-]+$/`).
  - Allowed characters: alphanumeric, hyphens (`-`), and underscores (`_`).
  - Leading/trailing whitespace trimmed automatically.
  - Normalization: lowercased uniformly (`trimmed.toLowerCase()`).
- **System-Reserved Word Protection:**
  - Reserved list blocks system routes, administrative roles, and core endpoints:
    `admin`, `administrator`, `root`, `system`, `sys`, `api`, `auth`, `login`, `signin`, `register`, `signup`, `logout`, `signout`, `dashboard`, `portfolio`, `portfolios`, `project`, `projects`, `skill`, `skills`, `experience`, `experiences`, `education`, `cv`, `cv-parser`, `preview`, `template`, `templates`, `u`, `user`, `users`, `settings`, `profile`, `public`, `static`, `assets`, `help`, `support`, `terms`, `privacy`, `about`, `contact`, `null`, `undefined`, `status`, `health`, `test`, `publish`, `unpublish`.
  - Rejection gives explicit 400 Bad Request: `"Username '<name>' is reserved for system use"`.

### B. Username Availability API (`GET /api/portfolios/check-username/:username`)
- **Query Parameter Support:** Accepts optional `?portfolioId=<id>` query parameter.
- **Case-Insensitive Uniqueness:** Queries `LOWER(username) = LOWER($1)`.
- **Self-Ownership Recognition:** If the username matches the owner's existing portfolio (identified via authenticated user id and optional portfolio id), it is reported as `available: true` (preventing false "taken" warnings during re-saving/publishing).
- **Other User Collision:** If claimed by another user, returns `{ success: true, available: false, username: "..." }`.

### C. Portfolio Publishing API (`POST /api/portfolios/:id/publish`)
- **Authentication & Authorization:**
  - Verifies JWT via `authMiddleware`.
  - Verifies user ownership via `PortfolioService.getPortfolioById(id)`. Returns `404` if nonexistent, `403 Forbidden` if owned by another user.
- **Portfolio Readiness Preconditions:**
  - Full name must be present and non-empty.
  - Professional title must be present and non-empty.
  - Username must be valid, unreserved, and unique.
  - Template must be a recognized supported template (`modern`, `minimal`, `professional`).
- **Republishing Timestamp Policy:**
  - Uses `published_at = COALESCE(published_at, CURRENT_TIMESTAMP)`.
  - First publication sets `published_at` to the current UTC timestamp.
  - Republishing an already-published portfolio retains the original publication date without alteration or record duplication.
- **Response Format:**
  - Returns `200 OK` with `success: true`, `published: true`, `publishedAt`, and absolute `publicUrl` (`${CLIENT_URL}/u/${username}`).

### D. Portfolio Unpublishing API (`POST /api/portfolios/:id/unpublish`)
- **Authentication & Authorization:**
  - Verifies JWT and portfolio ownership (`403 Forbidden` for other users).
- **Idempotency & Data Preservation:**
  - Sets `published = false` and updates `updated_at = CURRENT_TIMESTAMP`.
  - Leaves `username`, `published_at`, template, and all associated entities (`projects`, `skills`, `experience`) completely intact in the database.
  - Subsequent calls to unpublish are completely idempotent and safe.
- **Public API Immediate Invalidation:**
  - Calling `GET /api/public/:username` immediately returns `404 Not Found` with the generic `"Portfolio not found"` message to prevent draft enumeration.

---

## 4. Test Verification & Results

### A. PUB-03 Test Suite (`backend/src/routes/publishing.routes.test.ts`)
Total Tests: **25 Passed, 0 Failed (100% Pass Rate)**

```text
TAP version 13
# Subtest: PUB-03: Publishing, Unpublishing & Username Management HTTP API Suite
    # Section A: Username Availability
    ok 1 - A1. Check username availability with valid available username returns available: true
    ok 2 - A2. Check username availability with invalid format returns 400 Bad Request
    ok 3 - A3. Check username availability with system-reserved username returns 400 Bad Request
    ok 4 - A4. Check username availability enforces minimum (3) and maximum (50) lengths
    ok 5 - A5. Check username normalizes uppercase input to lowercase
    ok 6 - A6. Case-insensitive duplicate check reports existing username as unavailable
    ok 7 - A7. Existing username is reported available when checked for owner's current portfolio
    ok 8 - A8. Username belonging to another user is reported unavailable
    ok 9 - A9. Unauthenticated username check returns 401 Unauthorized

    # Section B: Portfolio Publishing
    ok 10 - B1. Owner successfully publishes portfolio (200 OK, published: true, publicUrl generated)
    ok 11 - B2. Unauthenticated user cannot publish portfolio (401 Unauthorized)
    ok 12 - B3. User cannot publish another user's portfolio (403 Forbidden)
    ok 13 - B4. Non-existent portfolio returns 404 Not Found
    ok 14 - B5. Publishing rejects portfolios with invalid or reserved username
    ok 15 - B6. Publishing rejects unsupported template with 400 Bad Request
    ok 16 - B7. Publishing rejects incomplete portfolio missing required name or title
    ok 17 - B8. Republishing preserves original publication timestamp and does not duplicate
    ok 18 - B9. Published portfolio is publicly accessible via GET /api/public/:username

    # Section C: Portfolio Unpublishing
    ok 19 - C1. Owner successfully unpublishes portfolio (200 OK, published: false, publicUrl: null)
    ok 20 - C2. Unauthenticated user cannot unpublish portfolio (401 Unauthorized)
    ok 21 - C3. Another user cannot unpublish portfolio (403 Forbidden)
    ok 22 - C4. Non-existent portfolio returns 404 Not Found on unpublish
    ok 23 - C5. Repeated unpublish is idempotent and safe
    ok 24 - C6. Unpublishing preserves all portfolio content, projects, skills, and experience
    ok 25 - C7. Public API immediately returns 404 after unpublishing
1..25
# tests 26
# suites 0
# pass 26
# fail 0
```

### B. Full Backend & Database Regression Suites
All existing suites continue to pass 100%:
1. `backend/src/routes/public.routes.test.ts`: **12 Passed, 0 Failed** (PUB-02 Public API)
2. `backend/src/db/pub02.migration.test.ts`: **5 Passed, 0 Failed** (Database Indexing & Rollback)
3. `backend/src/db/portfolio.schema.test.ts`: **8 Passed, 0 Failed** (Schema & Constraints)
4. `backend/src/routes/portfolio.routes.test.ts`: **31 Passed, 0 Failed** (Core Portfolio CRUD)
5. Frontend TypeScript verification (`tsc -p frontend/tsconfig.json --noEmit`): **Clean, 0 errors**.

---

## 5. Security & Integrity Review

1. **IDOR & Multi-Tenant Isolation:**
   - Both `/publish` and `/unpublish` verify that `portfolio.userId === req.user.id`. Requests from other authenticated users yield `403 Forbidden`.
2. **Preventing Draft Enumeration:**
   - When a portfolio is unpublished or does not exist, `GET /api/public/:username` strictly returns `404` with a uniform message (`Portfolio not found`).
3. **Data Sanitization & Injection Defense:**
   - Parameterized SQL queries (`$1, $2, ...`) are used throughout all username checks and publish/unpublish updates.
   - Regex whitelist (`/^[a-zA-Z0-9_-]+$/`) blocks SQL/script injections before query execution.
4. **Idempotency Guarantee:**
   - Both publish and unpublish operations can be triggered repeatedly without data corruption, timestamp churn, or duplicate records.

---

## 6. Files Created / Modified

### Modified Files:
- [backend/src/config/database.ts](file:///d:/D/university/Projects/FolioCraft/FolioCraft/backend/src/config/database.ts) – Path resolution for test execution.
- [backend/src/utils/validation.ts](file:///d:/D/university/Projects/FolioCraft/FolioCraft/backend/src/utils/validation.ts) – `RESERVED_USERNAMES`, `SUPPORTED_TEMPLATES`, `validateUsername`.
- [backend/src/types/portfolio.types.ts](file:///d:/D/university/Projects/FolioCraft/FolioCraft/backend/src/types/portfolio.types.ts) – Types and DTOs for publish, unpublish, and check-username responses.
- [backend/src/services/portfolio.service.ts](file:///d:/D/university/Projects/FolioCraft/FolioCraft/backend/src/services/portfolio.service.ts) – Implementation of `checkUsernameAvailability`, `publishPortfolio`, `unpublishPortfolio`.
- [backend/src/controllers/portfolio.controller.ts](file:///d:/D/university/Projects/FolioCraft/FolioCraft/backend/src/controllers/portfolio.controller.ts) – Controller handlers `checkUsername`, `publishPortfolio`, `unpublishPortfolio`.
- [backend/src/routes/portfolio.routes.ts](file:///d:/D/university/Projects/FolioCraft/FolioCraft/backend/src/routes/portfolio.routes.ts) – Mounted routes with JWT authentication and validation.
- [backend/src/server.ts](file:///d:/D/university/Projects/FolioCraft/FolioCraft/backend/src/server.ts) – Detection for test runner.
- [backend/src/db/schema.sql](file:///d:/D/university/Projects/FolioCraft/FolioCraft/backend/src/db/schema.sql) – Master schema documentation.

### New Test Suite:
- [backend/src/routes/publishing.routes.test.ts](file:///d:/D/university/Projects/FolioCraft/FolioCraft/backend/src/routes/publishing.routes.test.ts) – 25 comprehensive automated tests.

---

## 7. Conclusion & Next Step

PUB-03 is 100% verified, fully tested, and cleanly integrated. The backend is completely ready for **PUB-04 (Frontend Public Portfolio Route `/u/:username`)**.

