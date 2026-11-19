// Ensure environment variable is configured before any module evaluation
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getWrappedFocusTarget } from "@/lib/useModalFocus";
import PortfolioCard from "@/components/portfolio/PortfolioCard";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import DeletePortfolioDialog from "@/components/portfolio/DeletePortfolioDialog";
import PublishModal from "@/components/portfolio/PublishModal";
import { computeDashboardStats } from "@/lib/dashboard";
import type { Portfolio } from "@/types/portfolio";

const live: Portfolio = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "u-1",
  name: "Ada Lovelace",
  title: "Analytical Engineer",
  about: null,
  email: null,
  phone: null,
  location: null,
  profileImageUrl: null,
  socialLinks: {},
  username: "ada",
  template: "modern",
  published: true,
  publishedAt: "2026-02-15T12:00:00.000Z",
  publicUrl: null,
  createdAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-03-10T12:00:00.000Z",
  sectionCounts: { projects: 1, skills: 1, experience: 1 },
};
const noop = () => {};
const LOW_CONTRAST = /text-\[#94a3b8\]|text-\[#cbd5e1\]/;

/** Removes elements marked aria-hidden (decorative bullets) before scanning. */
const withoutDecorative = (html: string) => html.replace(/<span[^>]*aria-hidden="true"[^>]*>[^<]*<\/span>/g, "");

test("DASH-06: Dashboard accessibility fixes", async (t) => {
  await t.test("1. Focus wrap: last → first on Tab, first → last on Shift+Tab", () => {
    const items = ["close", "copy", "publish"];
    assert.equal(getWrappedFocusTarget(items, "publish", false, true), "close");
    assert.equal(getWrappedFocusTarget(items, "close", true, true), "publish");
  });

  await t.test("2. Focus wrap: middle elements use native order; outside focus is pulled back in", () => {
    const items = ["close", "copy", "publish"];
    assert.equal(getWrappedFocusTarget(items, "copy", false, true), null);
    assert.equal(getWrappedFocusTarget(items, "copy", true, true), null);
    assert.equal(getWrappedFocusTarget(items, "background", false, false), "close");
    assert.equal(getWrappedFocusTarget(items, "background", true, false), "publish");
    assert.equal(getWrappedFocusTarget([], null, false, true), null);
  });

  await t.test("3. Informational dashboard text no longer uses low-contrast colours (WCAG 1.4.3)", () => {
    const rendered = [
      renderToStaticMarkup(React.createElement(PortfolioCard, { portfolio: live, onPublishClick: noop, onDeleteClick: noop })),
      renderToStaticMarkup(React.createElement(DashboardStats, { stats: computeDashboardStats([live]) })),
      renderToStaticMarkup(React.createElement(DashboardStats, { stats: computeDashboardStats([{ ...live, sectionCounts: undefined }]) })),
      renderToStaticMarkup(React.createElement(DashboardEmptyState)),
      renderToStaticMarkup(React.createElement(DashboardErrorState, { kind: "server", detail: "Database unavailable", onRetry: noop })),
      renderToStaticMarkup(
        React.createElement(DeletePortfolioDialog, { portfolio: live, isDeleting: false, error: null, onConfirm: noop, onCancel: noop })
      ),
    ];
    for (const html of rendered) {
      assert.ok(!LOW_CONTRAST.test(withoutDecorative(html)), "found #94a3b8/#cbd5e1 on informational text");
    }
  });

  await t.test("4. Icon-only buttons meet non-text contrast (trash icon and modal close)", () => {
    const card = renderToStaticMarkup(
      React.createElement(PortfolioCard, { portfolio: live, onPublishClick: noop, onDeleteClick: noop })
    );
    const trash = card.match(/<button[^>]*data-testid="card-delete-btn-[^"]+"[^>]*>/)?.[0] ?? "";
    assert.ok(trash.includes("text-[#64748b]"));
    const modal = renderToStaticMarkup(
      React.createElement(PublishModal, { isOpen: true, onClose: noop, portfolio: live, token: "t", onPortfolioUpdated: noop })
    );
    const close = modal.match(/<button[^>]*aria-label="Close modal"[^>]*>/)?.[0] ?? "";
    assert.ok(close.includes("text-[#64748b]"));
  });

  await t.test("5. Card links have unique accessible names and 24px+ targets (WCAG 2.5.8)", () => {
    const html = renderToStaticMarkup(React.createElement(PortfolioCard, { portfolio: live, onPublishClick: noop }));
    const template = html.match(/<a[^>]*href="\/portfolio\/templates[^>]*>[\s\S]*?<\/a>/)?.[0] ?? "";
    assert.ok(template.includes("min-h-6"));
    assert.ok(template.includes('<span class="sr-only">, change template for <!-- -->Analytical Engineer</span>') || template.includes("change template for Analytical Engineer"));
    assert.ok(/<span aria-hidden="true">.*→<\/span>/.test(template), "arrow is decorative");
    const copy = html.match(/<button[^>]*data-testid="card-copy-url-[^"]+"[^>]*>/)?.[0] ?? "";
    assert.ok(copy.includes('aria-label="Copy public URL for Analytical Engineer"'));
    assert.ok(copy.includes("min-w-7") && copy.includes("min-h-7"));
    const liveLink = html.match(/<a[^>]*href="\/u\/ada"[^>]*>/)?.[0] ?? "";
    assert.ok(liveLink.includes("min-h-7") && liveLink.includes("focus-visible:ring-2"));
  });

  await t.test("5b. Delete dialog wraps long usernames instead of clipping them (found at 360px)", () => {
    const longName = "d6live" + "x".repeat(44);
    const html = renderToStaticMarkup(
      React.createElement(DeletePortfolioDialog, {
        portfolio: { ...live, username: longName },
        isDeleting: false,
        error: null,
        onConfirm: noop,
        onCancel: noop,
      })
    );
    const label = html.match(/<label[^>]*>[\s\S]*?<\/label>/)?.[0] ?? "";
    assert.ok(label.includes("break-words"));
    assert.ok(label.includes('<span class="font-mono break-all">' + longName + "</span>"));
    assert.ok(/<code[^>]*break-all[^>]*>/.test(html), "public URL in the warning also wraps");
  });

  await t.test("6. Both dialogs use the shared focus manager", () => {
    const read = (rel: string) => readFileSync(path.join(process.cwd(), "src", ...rel.split("/")), "utf8");
    const publish = read("components/portfolio/PublishModal.tsx");
    assert.ok(publish.includes("useModalFocus(modalRef, isOpen)"));
    assert.ok(publish.includes("ref={modalRef}"));
    const del = read("components/portfolio/DeletePortfolioDialog.tsx");
    assert.ok(del.includes("useModalFocus(dialogRef, true, { initialFocusRef: cancelRef, fallbackFocusId, nativeDialog: true })"));
    // The hook records the trigger BEFORE showModal() moves focus (regression found in browser QA)
    const hook = read("lib/useModalFocus.ts");
    assert.ok(hook.indexOf("const previouslyFocused") < hook.indexOf("dialog.showModal()"));
    assert.ok(hook.includes("!container.contains(previouslyFocused)"));
  });

  await t.test("7. Publish modal behaviour unchanged by the focus fix (Phase 10 regression)", () => {
    const html = renderToStaticMarkup(
      React.createElement(PublishModal, { isOpen: true, onClose: noop, portfolio: { ...live, published: false, publishedAt: null }, token: "t", onPortfolioUpdated: noop })
    );
    assert.ok(html.includes('role="dialog"') && html.includes('aria-modal="true"'));
    assert.ok(html.includes("Publish to Live Site"));
    assert.ok(html.includes("Publishing Readiness Checklist"));
    assert.equal(
      renderToStaticMarkup(
        React.createElement(PublishModal, { isOpen: false, onClose: noop, portfolio: live, token: "t", onPortfolioUpdated: noop })
      ),
      ""
    );
  });
});
