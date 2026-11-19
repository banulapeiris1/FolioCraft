// Ensure environment variable is configured before any module evaluation
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError, getPortfolios } from "@/lib/api";
import { classifyApiError } from "@/lib/dashboard";
import {
  resolveSessionRestoreFailure,
  isSessionExpiredReason,
  LOGIN_SESSION_EXPIRED_PATH,
  SESSION_EXPIRED_REASON,
} from "@/lib/authSession";
import DashboardErrorState, {
  getDashboardErrorCopy,
} from "@/components/dashboard/DashboardErrorState";
import PortfolioGridSkeleton from "@/components/dashboard/PortfolioGridSkeleton";
import { PortfolioCardSkeleton } from "@/components/portfolio/PortfolioCard";
import { SessionExpiredBanner } from "@/components/auth/SessionExpiredNotice";

const noop = () => {};

test("DASH-02: Dashboard error, session & loading resilience", async (t) => {
  const originalFetch = global.fetch;

  t.afterEach(() => {
    global.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // classifyApiError
  // ---------------------------------------------------------------------------

  await t.test("1. classifyApiError maps status 0 to network without technical detail", () => {
    const result = classifyApiError(
      new ApiError("Unable to connect to server: Failed to fetch. Please check your connection.", 0)
    );
    assert.deepEqual(result, { kind: "network", detail: null });
  });

  await t.test("2. classifyApiError maps 401 to auth", () => {
    assert.deepEqual(classifyApiError(new ApiError("Authentication required", 401)), {
      kind: "auth",
      detail: null,
    });
  });

  await t.test("3. classifyApiError maps 5xx to server and keeps the server message", () => {
    assert.deepEqual(classifyApiError(new ApiError("Internal server error", 500)), {
      kind: "server",
      detail: "Internal server error",
    });
    assert.equal(classifyApiError(new ApiError("Bad gateway", 502)).kind, "server");
    assert.equal(classifyApiError(new ApiError("Unavailable", 503)).kind, "server");
  });

  await t.test("4. classifyApiError maps other 4xx to generic with detail", () => {
    assert.deepEqual(classifyApiError(new ApiError("Forbidden", 403)), {
      kind: "generic",
      detail: "Forbidden",
    });
    assert.equal(classifyApiError(new ApiError("Not found", 404)).kind, "generic");
    assert.equal(classifyApiError(new ApiError("   ", 400)).detail, null);
  });

  await t.test("5. classifyApiError treats non-ApiError values as generic without leaking messages", () => {
    assert.deepEqual(classifyApiError(new Error("Configuration Error: NEXT_PUBLIC_API_URL is not set")), {
      kind: "generic",
      detail: null,
    });
    assert.deepEqual(classifyApiError("boom"), { kind: "generic", detail: null });
    assert.deepEqual(classifyApiError(undefined), { kind: "generic", detail: null });
  });

  await t.test("6. classifyApiError classifies real getPortfolios failures (network, 401, 500)", async () => {
    global.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(getPortfolios("tok"), (err) => classifyApiError(err).kind === "network");

    global.fetch = async () =>
      new Response(JSON.stringify({ message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    await assert.rejects(getPortfolios("tok"), (err) => classifyApiError(err).kind === "auth");

    global.fetch = async () =>
      new Response(JSON.stringify({ message: "Database unavailable" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    await assert.rejects(getPortfolios("tok"), (err) => {
      const c = classifyApiError(err);
      return c.kind === "server" && c.detail === "Database unavailable";
    });
  });

  // ---------------------------------------------------------------------------
  // Session restore decision (AuthContext)
  // ---------------------------------------------------------------------------

  await t.test("7. resolveSessionRestoreFailure clears the session only for 401 and 404", () => {
    assert.equal(resolveSessionRestoreFailure(new ApiError("Authentication required", 401)), "clear");
    assert.equal(resolveSessionRestoreFailure(new ApiError("User not found", 404)), "clear");
  });

  await t.test("8. resolveSessionRestoreFailure keeps the session when the backend is unreachable or failing", () => {
    assert.equal(resolveSessionRestoreFailure(new ApiError("Unable to connect", 0)), "unavailable");
    assert.equal(resolveSessionRestoreFailure(new ApiError("Internal server error", 500)), "unavailable");
    assert.equal(resolveSessionRestoreFailure(new ApiError("Bad gateway", 502)), "unavailable");
    assert.equal(resolveSessionRestoreFailure(new Error("Configuration Error")), "unavailable");
  });

  await t.test("9. Session-expired login path and reason helper agree", () => {
    assert.equal(LOGIN_SESSION_EXPIRED_PATH, `/login?reason=${SESSION_EXPIRED_REASON}`);
    assert.equal(isSessionExpiredReason(SESSION_EXPIRED_REASON), true);
    assert.equal(isSessionExpiredReason(null), false);
    assert.equal(isSessionExpiredReason(""), false);
    assert.equal(isSessionExpiredReason("other"), false);
  });

  // ---------------------------------------------------------------------------
  // DashboardErrorState
  // ---------------------------------------------------------------------------

  await t.test("10. DashboardErrorState announces itself as an alert with a retry button", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardErrorState, { kind: "network", onRetry: noop })
    );
    assert.ok(html.includes('role="alert"'));
    assert.ok(html.includes('data-error-kind="network"'));
    assert.ok(html.includes('data-testid="dashboard-retry-button"'));
    assert.ok(html.includes("Try Again"));
  });

  await t.test("11. Network errors show connection copy and never the technical detail", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardErrorState, {
        kind: "network",
        detail: "Unable to connect to server: Failed to fetch",
        onRetry: noop,
      })
    );
    assert.ok(html.includes("Can&#x27;t reach FolioCraft"));
    assert.ok(html.includes("Check your internet connection"));
    assert.ok(!html.includes("Failed to fetch"));
    assert.ok(!html.includes('data-testid="dashboard-error-detail"'));
  });

  await t.test("12. Server errors show distinct copy plus the server message", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardErrorState, {
        kind: "server",
        detail: "Database unavailable",
        onRetry: noop,
      })
    );
    assert.ok(html.includes("Something went wrong on our side"));
    assert.ok(html.includes('data-testid="dashboard-error-detail"'));
    assert.ok(html.includes("Database unavailable"));
  });

  await t.test("13. Generic errors render the computed message (previously discarded)", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardErrorState, {
        kind: "generic",
        detail: "Invalid user ID",
        onRetry: noop,
      })
    );
    assert.ok(html.includes("Unable to load your portfolios"));
    assert.ok(html.includes("Invalid user ID"));
  });

  await t.test("14. Retrying disables the button and shows progress", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardErrorState, { kind: "server", onRetry: noop, isRetrying: true })
    );
    assert.ok(/<button[^>]*disabled=""/.test(html));
    assert.ok(html.includes("Retrying..."));
    assert.ok(!html.includes("Try Again"));
  });

  await t.test("15. Session context explains the user is still signed in", () => {
    const copy = getDashboardErrorCopy("network", "session");
    assert.equal(copy.title, "Can't reach FolioCraft");
    assert.ok(copy.description.includes("still signed in"));
    // All kinds produce non-empty, distinct titles for portfolios
    const titles = (["network", "server", "auth", "generic"] as const).map(
      (k) => getDashboardErrorCopy(k).title
    );
    assert.equal(new Set(titles).size, 4);
  });

  // ---------------------------------------------------------------------------
  // Loading states
  // ---------------------------------------------------------------------------

  await t.test("16. PortfolioGridSkeleton is an accessible busy status region", () => {
    const html = renderToStaticMarkup(React.createElement(PortfolioGridSkeleton));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes('class="sr-only"'));
    assert.ok(html.includes("Loading your portfolios..."));
    assert.equal(html.match(/data-testid="portfolio-card-skeleton"/g)?.length, 3);

    const five = renderToStaticMarkup(React.createElement(PortfolioGridSkeleton, { count: 5 }));
    assert.equal(five.match(/data-testid="portfolio-card-skeleton"/g)?.length, 5);
  });

  await t.test("17. PortfolioCardSkeleton is decorative and mirrors the 3-action card footer", () => {
    const html = renderToStaticMarkup(React.createElement(PortfolioCardSkeleton));
    assert.ok(html.includes('aria-hidden="true"'));
    assert.equal(html.match(/data-skeleton-action/g)?.length, 3);
    assert.ok(html.includes("motion-reduce:animate-none"));
  });

  // ---------------------------------------------------------------------------
  // Login notice
  // ---------------------------------------------------------------------------

  await t.test("18. SessionExpiredBanner explains why the user must sign in again", () => {
    const html = renderToStaticMarkup(React.createElement(SessionExpiredBanner));
    assert.ok(html.includes('data-testid="session-expired-notice"'));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes("Your session has expired"));
  });
});
