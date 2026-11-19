// Ensure environment variable is configured before any module evaluation
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getPortfolioStatus,
  getPublishingInfo,
  formatPortfolioDate,
  computeDashboardStats,
} from "@/lib/dashboard";
import { mergePublishingResult } from "@/components/portfolio/PublishModal";
import PortfolioCard, { PortfolioCardSkeleton } from "@/components/portfolio/PortfolioCard";
import PortfolioStatusBadge, { getStatusLabel } from "@/components/portfolio/PortfolioStatusBadge";
import type { Portfolio } from "@/types/portfolio";

const draft: Portfolio = {
  id: "card-draft",
  userId: "u-1",
  name: "Banula Peiris",
  title: "Principal Engineer",
  about: "Building scalable distributed systems.",
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
  createdAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-03-10T12:00:00.000Z",
};

const live: Portfolio = {
  ...draft,
  id: "card-live",
  published: true,
  publishedAt: "2026-02-15T12:00:00.000Z",
};

const unpublished: Portfolio = {
  ...draft,
  id: "card-unpublished",
  published: false,
  publishedAt: "2026-02-15T12:00:00.000Z",
};

const render = (portfolio: Portfolio) =>
  renderToStaticMarkup(
    React.createElement(PortfolioCard, { portfolio, onPublishClick: () => {} })
  );

const badgeStatus = (html: string) =>
  html.match(/data-testid="portfolio-status-badge" data-status="([a-z]+)"/)?.[1];

test("DASH-04: Portfolio card & status polish", async (t) => {
  // ---------------------------------------------------------------------------
  // Status logic
  // ---------------------------------------------------------------------------

  await t.test("1. getPortfolioStatus distinguishes draft, live and unpublished", () => {
    assert.equal(getPortfolioStatus(draft), "draft");
    assert.equal(getPortfolioStatus(live), "live");
    assert.equal(getPortfolioStatus(unpublished), "unpublished");
  });

  await t.test("2. Live without a recorded date (pre-PUB-02 data) is still live; invalid dates are ignored", () => {
    assert.equal(getPortfolioStatus({ published: true, publishedAt: null }), "live");
    assert.equal(getPortfolioStatus({ published: false, publishedAt: "not-a-date" }), "draft");
    assert.equal(getPortfolioStatus({ published: false, publishedAt: "" }), "draft");
    assert.equal(getPortfolioStatus({ published: false, publishedAt: undefined }), "draft");
  });

  await t.test("3. Publishing info uses only publishedAt and is labelled as the first publish date", () => {
    assert.equal(getPublishingInfo(live), "First published Feb 15, 2026");
    assert.equal(getPublishingInfo(unpublished), "Offline · first published Feb 15, 2026");
    assert.equal(getPublishingInfo(draft), null);
    // No date recorded -> nothing is invented (createdAt/updatedAt are never used)
    assert.equal(getPublishingInfo({ published: true, publishedAt: null }), null);
    assert.equal(formatPortfolioDate("garbage"), null);
  });

  await t.test("4. Phase 10 flow: publish -> unpublish keeps history and yields 'unpublished'", () => {
    // Publish API returns partial fields incl. publishedAt
    const published = mergePublishingResult(draft, {
      id: draft.id,
      username: draft.username,
      published: true,
      publishedAt: "2026-04-01T12:00:00.000Z",
      publicUrl: "/u/banula",
    });
    assert.equal(getPortfolioStatus(published), "live");

    // Unpublish API returns { id, username, published } only; merge keeps publishedAt
    const offline = mergePublishingResult(published, {
      id: draft.id,
      username: draft.username,
      published: false,
    });
    assert.equal(getPortfolioStatus(offline), "unpublished");
    assert.equal(getPublishingInfo(offline), "Offline · first published Apr 1, 2026");

    // DASH-03 stats still count it as not live
    assert.equal(computeDashboardStats([offline]).drafts, 1);
  });

  // ---------------------------------------------------------------------------
  // Status badge
  // ---------------------------------------------------------------------------

  await t.test("5. Status badge pairs colour with a text label and respects reduced motion", () => {
    const liveHtml = renderToStaticMarkup(React.createElement(PortfolioStatusBadge, { status: "live" }));
    assert.ok(liveHtml.includes(">Published<"));
    assert.ok(liveHtml.includes("motion-reduce:animate-none"));
    assert.equal(getStatusLabel("draft"), "Draft");
    assert.equal(getStatusLabel("unpublished"), "Unpublished");
    const offlineHtml = renderToStaticMarkup(React.createElement(PortfolioStatusBadge, { status: "unpublished" }));
    assert.ok(offlineHtml.includes("bg-slate-50"));
    assert.ok(offlineHtml.includes("whitespace-nowrap"));
  });

  // ---------------------------------------------------------------------------
  // Cards per status
  // ---------------------------------------------------------------------------

  await t.test("6. Draft card: Draft badge, Publish action, no URL banner, no publishing line", () => {
    const html = render(draft);
    assert.equal(badgeStatus(html), "draft");
    assert.ok(html.includes('data-status="draft"'));
    assert.ok(/<span>Publish<\/span>/.test(html));
    assert.ok(!html.includes('data-testid="card-public-url-banner"'));
    assert.ok(!html.includes('data-testid="card-publishing-info"'));
  });

  await t.test("7. Published card: badge, first-published date, URL banner, copy and Manage Live", () => {
    const html = render(live);
    assert.equal(badgeStatus(html), "live");
    assert.ok(html.includes("First published Feb 15, 2026"));
    assert.ok(html.includes('data-testid="card-public-url-banner"'));
    assert.ok(html.includes("/u/banula"));
    assert.ok(html.includes(`data-testid="card-copy-url-${live.id}"`));
    // DASH-06: name includes the title so several live cards are distinguishable
    assert.ok(html.includes('aria-label="Copy public URL for Principal Engineer"'));
    assert.ok(html.includes("Manage Live"));
    assert.ok(html.includes('target="_blank"'));
  });

  await t.test("8. Previously published card: Unpublished badge, history kept, Republish, no live URL", () => {
    const html = render(unpublished);
    assert.equal(badgeStatus(html), "unpublished");
    assert.ok(html.includes("Offline · first published Feb 15, 2026"));
    assert.ok(/<span>Republish<\/span>/.test(html));
    assert.ok(!html.includes('data-testid="card-public-url-banner"'));
    assert.ok(!html.includes("Manage Live"));
  });

  // ---------------------------------------------------------------------------
  // Content length & missing content
  // ---------------------------------------------------------------------------

  await t.test("9. Long titles and descriptions are clamped and wrap instead of overflowing", () => {
    const longTitle = "Senior Staff Principal Distinguished Software Engineering Architect ".repeat(4);
    const longAbout = "Supercalifragilisticexpialidocious".repeat(20);
    const html = render({ ...draft, title: longTitle, about: longAbout });
    assert.ok(/<h3[^>]*line-clamp-2[^>]*break-words/.test(html));
    assert.ok(/data-testid="card-about"[^>]*line-clamp-2[^>]*break-words/.test(html));
    // Full text stays available via title attribute
    assert.ok(html.includes(`title="${longTitle}"`));
    assert.ok(html.includes("min-w-0"));
  });

  await t.test("10. Long usernames truncate in the owner line and URL banner", () => {
    const username = "a".repeat(50);
    const html = render({ ...live, username });
    assert.ok(/<p class="mt-0.5 text-xs text-\[#64748b\] truncate"/.test(html));
    assert.ok(html.includes(`/u/${username}`));
    assert.ok(/class="truncate">\/u\//.test(html));
  });

  await t.test("11. Missing optional content renders a calm placeholder, never 'null'", () => {
    for (const about of [null, "", "   "]) {
      const html = render({ ...draft, about });
      assert.ok(html.includes('data-testid="card-about-empty"'));
      assert.ok(html.includes("No summary yet"));
      assert.ok(!html.includes('data-testid="card-about"'));
      assert.ok(!html.includes(">null<"));
    }
    // Invalid dates fall back gracefully
    const html = render({ ...draft, updatedAt: "bad", createdAt: "bad" });
    assert.ok(html.includes("Recently updated"));
  });

  // ---------------------------------------------------------------------------
  // Actions & layout
  // ---------------------------------------------------------------------------

  await t.test("12. Every card has the same action layout: Edit + Preview row, full-width publish action", () => {
    for (const p of [draft, live, unpublished]) {
      const html = render(p);
      const actions = html.slice(html.indexOf('data-testid="card-actions"'));
      assert.ok(actions.includes("grid grid-cols-2 gap-2"));
      assert.ok(actions.includes(`href="/portfolio/edit/${p.id}"`));
      assert.ok(actions.includes(`href="/portfolio/preview?id=${p.id}"`));
      assert.ok(new RegExp(`<button[^>]*data-testid="card-publish-btn-${p.id}"[^>]*class="w-full`).test(actions));
      assert.equal((actions.match(/min-h-\[38px\]/g) || []).length, 3, "three equal-height actions");
    }
  });

  await t.test("13. Cards stretch to equal heights with the actions pinned to the bottom", () => {
    const html = render(draft);
    assert.ok(/<article[^>]*class="h-full[^"]*flex flex-col/.test(html));
    assert.ok(html.includes('<div class="flex-1 min-w-0">'));
  });

  await t.test("14. Preview is an internal action (eye icon, same tab); only the live URL opens a new tab", () => {
    const html = render(draft);
    const previewLink = html.match(/<a[^>]*href="\/portfolio\/preview\?id=card-draft"[^>]*>/)?.[0] ?? "";
    assert.ok(previewLink && !previewLink.includes('target="_blank"'));
    assert.ok(!render(draft).includes('target="_blank"'), "drafts have no new-tab links");
  });

  await t.test("15. Action names include the portfolio title for screen readers", () => {
    const html = render(draft);
    assert.equal(
      (html.match(/<span class="sr-only"> <!-- -->Principal Engineer<\/span>|<span class="sr-only"> Principal Engineer<\/span>/g) || []).length,
      3
    );
  });

  await t.test("16. Template link and last-updated meta are preserved", () => {
    const html = render(draft);
    assert.ok(html.includes(`href="/portfolio/templates?id=${draft.id}"`));
    assert.ok(html.includes("Modern Developer"));
    assert.ok(html.includes("Updated Mar 10, 2026"));
  });

  await t.test("17. Skeleton mirrors the new footer (2-column row + full-width action)", () => {
    const html = renderToStaticMarkup(React.createElement(PortfolioCardSkeleton));
    assert.equal(html.match(/data-skeleton-action/g)?.length, 3);
    assert.ok(html.includes("grid grid-cols-2 gap-2"));
    assert.ok(html.includes("h-full"));
  });
});
