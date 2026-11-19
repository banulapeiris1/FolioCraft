// Ensure environment variable is configured before any module evaluation
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getPortfolios } from "@/lib/api";
import { computeDashboardStats, getFirstName } from "@/lib/dashboard";
import { mergePublishingResult } from "@/components/portfolio/PublishModal";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats, {
  DashboardStatsSkeleton,
  buildStatTiles,
} from "@/components/dashboard/DashboardStats";
import DashboardEmptyState, { ONBOARDING_STEPS } from "@/components/dashboard/DashboardEmptyState";
import type { Portfolio } from "@/types/portfolio";

const base: Portfolio = {
  id: "p-1",
  userId: "u-1",
  name: "Banula Peiris",
  title: "Engineer",
  about: null,
  email: null,
  phone: null,
  location: null,
  profileImageUrl: null,
  socialLinks: {},
  username: "banula",
  template: "modern",
  published: false,
  publishedAt: null,
  publicUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const live: Portfolio = {
  ...base,
  id: "p-live",
  published: true,
  publishedAt: "2026-02-01T00:00:00.000Z",
  sectionCounts: { projects: 4, skills: 9, experience: 2 },
};
const draft: Portfolio = {
  ...base,
  id: "p-draft",
  sectionCounts: { projects: 1, skills: 3, experience: 0 },
};
const takenDown: Portfolio = {
  ...base,
  id: "p-down",
  published: false,
  publishedAt: "2026-01-15T00:00:00.000Z",
  sectionCounts: { projects: 0, skills: 0, experience: 1 },
};

const statValue = (html: string, key: string): string => {
  const match = html.match(
    new RegExp(`data-testid="dashboard-stat-${key}".*?<dd[^>]*>(.*?)</dd>`, "s")
  );
  return match ? match[1]! : "";
};

test("DASH-03: Workspace header, statistics & empty state", async (t) => {
  const originalFetch = global.fetch;
  t.afterEach(() => {
    global.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // computeDashboardStats
  // ---------------------------------------------------------------------------

  await t.test("1. Stats aggregate status and section counts across portfolios", () => {
    const stats = computeDashboardStats([live, draft, takenDown]);
    assert.deepEqual(stats, {
      total: 3,
      published: 1,
      drafts: 2,
      content: { projects: 5, skills: 12, experience: 3 },
    });
  });

  await t.test("2. Empty workspace yields zero stats with zero content totals", () => {
    assert.deepEqual(computeDashboardStats([]), {
      total: 0,
      published: 0,
      drafts: 0,
      content: { projects: 0, skills: 0, experience: 0 },
    });
  });

  await t.test("3. Content totals are null (never guessed) when any portfolio lacks counts", () => {
    const legacy: Portfolio = { ...base, id: "p-legacy" }; // older API: no sectionCounts
    const stats = computeDashboardStats([live, legacy]);
    assert.equal(stats.total, 2);
    assert.equal(stats.published, 1);
    assert.equal(stats.content, null);
  });

  await t.test("4. Malformed counts are rejected rather than producing NaN or negatives", () => {
    const bad = [
      { ...base, sectionCounts: { projects: "3", skills: 1, experience: 0 } },
      { ...base, sectionCounts: { projects: -1, skills: 1, experience: 0 } },
      { ...base, sectionCounts: { projects: Number.NaN, skills: 1, experience: 0 } },
      { ...base, sectionCounts: { projects: 1, skills: 1 } },
    ] as unknown as Portfolio[];
    for (const p of bad) {
      assert.equal(computeDashboardStats([p]).content, null);
    }
  });

  await t.test("5. Publishing a draft (PublishModal merge) keeps counts and moves it to Published", () => {
    const before = computeDashboardStats([live, draft]);
    assert.equal(before.published, 1);
    const merged = mergePublishingResult(draft, {
      id: draft.id,
      username: draft.username,
      published: true,
      publishedAt: "2026-03-01T00:00:00.000Z",
      publicUrl: "/u/banula",
    });
    const after = computeDashboardStats([live, merged]);
    assert.equal(after.published, 2);
    assert.equal(after.drafts, 0);
    assert.deepEqual(after.content, before.content, "section counts survive the partial merge");
  });

  await t.test("6. Stats are computed from a real getPortfolios response (mocked HTTP)", async () => {
    let calls = 0;
    global.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ success: true, portfolios: [live, draft] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const data = await getPortfolios("tok");
    const stats = computeDashboardStats(data.portfolios);
    assert.equal(calls, 1, "statistics need exactly one list request");
    assert.deepEqual(stats.content, { projects: 5, skills: 12, experience: 2 });
  });

  await t.test("7. getFirstName extracts a friendly first name with a fallback", () => {
    assert.equal(getFirstName("Banula Peiris"), "Banula");
    assert.equal(getFirstName("  Ada   Lovelace "), "Ada");
    assert.equal(getFirstName("Cher"), "Cher");
    assert.equal(getFirstName(""), "there");
    assert.equal(getFirstName("   "), "there");
    assert.equal(getFirstName(null), "there");
  });

  // ---------------------------------------------------------------------------
  // DashboardStats
  // ---------------------------------------------------------------------------

  await t.test("8. DashboardStats renders all six tiles with real values", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardStats, { stats: computeDashboardStats([live, draft, takenDown]) })
    );
    assert.ok(html.includes('aria-label="Workspace summary"'));
    assert.ok(html.startsWith("<dl"));
    assert.ok(statValue(html, "total").includes(">3<"));
    assert.ok(statValue(html, "published").includes(">1<"));
    assert.ok(statValue(html, "drafts").includes(">2<"));
    assert.ok(statValue(html, "projects").includes(">5<"));
    assert.ok(statValue(html, "skills").includes(">12<"));
    assert.ok(statValue(html, "experience").includes(">3<"));
    assert.ok(!html.includes("Not available"));
  });

  await t.test("9. DashboardStats shows 'Not available' instead of inventing content totals", () => {
    const stats = computeDashboardStats([{ ...base, published: true }]);
    const html = renderToStaticMarkup(React.createElement(DashboardStats, { stats }));
    assert.ok(statValue(html, "published").includes(">1<"));
    for (const key of ["projects", "skills", "experience"]) {
      assert.ok(statValue(html, key).includes("Not available"), `${key} should be unavailable`);
      assert.ok(!/>0</.test(statValue(html, key)), `${key} must not display a fake 0`);
    }
  });

  await t.test("10. buildStatTiles keeps a stable order and labels", () => {
    const tiles = buildStatTiles(computeDashboardStats([live]));
    assert.deepEqual(
      tiles.map((x) => x.label),
      ["Portfolios", "Published", "Drafts", "Projects", "Skills", "Experience"]
    );
  });

  await t.test("11. Stats grid is responsive (2 / 3 / 6 columns) and the skeleton is decorative", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardStats, { stats: computeDashboardStats([live]) })
    );
    assert.ok(html.includes("grid-cols-2") && html.includes("sm:grid-cols-3") && html.includes("lg:grid-cols-6"));

    const skeleton = renderToStaticMarkup(React.createElement(DashboardStatsSkeleton));
    assert.ok(skeleton.includes('aria-hidden="true"'));
    assert.ok(skeleton.includes("motion-reduce:animate-none"));
    assert.ok(skeleton.includes("lg:grid-cols-6"));
  });

  // ---------------------------------------------------------------------------
  // DashboardHeader
  // ---------------------------------------------------------------------------

  await t.test("12. DashboardHeader greets the user and offers Create Portfolio", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardHeader, { firstName: "Banula" })
    );
    assert.ok(/<h1[^>]*>Welcome, <!-- -->Banula<\/h1>/.test(html) || html.includes("Welcome, Banula"));
    assert.ok(html.includes('aria-labelledby="dashboard-heading"'));
    assert.ok(html.includes('data-testid="dashboard-header-create"'));
    assert.ok(html.includes('href="/portfolio/create"'));
  });

  await t.test("13. DashboardHeader can hide Create (empty state owns the action) and renders stats slot", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        DashboardHeader,
        { firstName: "Ada", showCreateAction: false },
        React.createElement("p", { "data-testid": "slot" }, "stats")
      )
    );
    assert.ok(!html.includes('data-testid="dashboard-header-create"'));
    assert.ok(html.includes('data-testid="slot"'));
  });

  await t.test("14. DashboardHeader contains none of the removed placeholder content", () => {
    const html = renderToStaticMarkup(React.createElement(DashboardHeader, { firstName: "Ada" }));
    for (const removed of [
      "Authentication Verified",
      "Session Active",
      "Next Phase",
      "PostgreSQL",
      "JWT Bearer",
      "Sign Out",
    ]) {
      assert.ok(!html.includes(removed), `header must not contain '${removed}'`);
    }
  });

  // ---------------------------------------------------------------------------
  // DashboardEmptyState
  // ---------------------------------------------------------------------------

  await t.test("15. Empty state explains there are no portfolios and links to creation", () => {
    const html = renderToStaticMarkup(React.createElement(DashboardEmptyState));
    assert.ok(html.includes("You haven&#x27;t created a portfolio yet"));
    assert.ok(html.includes("Create your first portfolio"));
    assert.ok(html.includes('data-testid="dashboard-empty-create"'));
    assert.ok(html.includes('href="/portfolio/create"'));
  });

  await t.test("16. Empty state shows the 4-step guide as an ordered list incl. the CV import hint", () => {
    const html = renderToStaticMarkup(React.createElement(DashboardEmptyState));
    assert.ok(html.includes("<ol"));
    assert.equal(html.match(/<li /g)?.length, ONBOARDING_STEPS.length);
    assert.equal(ONBOARDING_STEPS.length, 4);
    const cvStep = ONBOARDING_STEPS.find((s) => s.title === "Import your CV");
    assert.ok(cvStep && /portfolio editor/i.test(cvStep.description));
    assert.ok(html.includes("lg:grid-cols-4"));
  });

  // ---------------------------------------------------------------------------
  // Page composition guard (the page needs the App Router, so its source is checked)
  // ---------------------------------------------------------------------------

  await t.test("17. Dashboard page uses the new components and drops placeholder content", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src", "app", "dashboard", "page.tsx"),
      "utf8"
    );
    for (const used of ["<DashboardHeader", "<DashboardStats", "<DashboardStatsSkeleton", "<DashboardEmptyState", "computeDashboardStats("]) {
      assert.ok(source.includes(used), `page should use ${used}`);
    }
    for (const removed of [
      "Authentication Verified",
      "Session Active",
      "showPortfolioNotice",
      "PostgreSQL Verified",
      "JWT Bearer Session",
      "Sign Out",
    ]) {
      assert.ok(!source.includes(removed), `page must not contain '${removed}'`);
    }
    // DASH-02 behaviour preserved
    for (const kept of ["isServiceUnavailable", "LOGIN_SESSION_EXPIRED_PATH", "<DashboardErrorState", "<PortfolioGridSkeleton", "<PublishModal", "handleLogout"]) {
      assert.ok(source.includes(kept), `page must keep ${kept}`);
    }
  });
});
