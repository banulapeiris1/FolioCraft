// Ensure environment variable is configured before any module evaluation
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError, deletePortfolio, publishPortfolio } from "@/lib/api";
import {
  computeDashboardStats,
  describeDeletedContent,
  matchesDeleteConfirmation,
  performPortfolioDelete,
  resolveDeleteFailure,
} from "@/lib/dashboard";
import DeletePortfolioDialog from "@/components/portfolio/DeletePortfolioDialog";
import PortfolioCard from "@/components/portfolio/PortfolioCard";
import PublishModal from "@/components/portfolio/PublishModal";
import DashboardNotice from "@/components/dashboard/DashboardNotice";
import type { Portfolio } from "@/types/portfolio";

const draft: Portfolio = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "u-1",
  name: "Banula Peiris",
  title: "Principal Engineer",
  about: "Building systems.",
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
  sectionCounts: { projects: 3, skills: 2, experience: 1 },
};

const live: Portfolio = {
  ...draft,
  id: "22222222-2222-4222-8222-222222222222",
  username: "banula-live",
  published: true,
  publishedAt: "2026-02-15T12:00:00.000Z",
  sectionCounts: { projects: 1, skills: 0, experience: 0 },
};

const noop = () => {};

const renderDialog = (props: Partial<React.ComponentProps<typeof DeletePortfolioDialog>> = {}) =>
  renderToStaticMarkup(
    React.createElement(DeletePortfolioDialog, {
      portfolio: draft,
      isDeleting: false,
      error: null,
      onConfirm: noop,
      onCancel: noop,
      ...props,
    })
  );

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const isDisabled = (html: string, testId: string) =>
  new RegExp(`<button[^>]*disabled=""[^>]*data-testid="${testId}"|<button[^>]*data-testid="${testId}"[^>]*disabled=""`).test(html);

test("DASH-05: Portfolio management, delete & publish-modal username", async (t) => {
  const originalFetch = global.fetch;
  t.afterEach(() => {
    global.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // API client
  // ---------------------------------------------------------------------------

  await t.test("1. deletePortfolio sends an authenticated DELETE to /api/portfolios/:id", async () => {
    let captured: { url: string; init?: RequestInit } | null = null;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(input), init };
      return jsonResponse(200, { success: true, id: draft.id });
    };
    const result = await deletePortfolio(draft.id, "jwt-token");
    assert.deepEqual(result, { success: true, id: draft.id });
    assert.ok(captured);
    const c = captured as { url: string; init?: RequestInit };
    assert.equal(c.url, `http://localhost:5000/api/portfolios/${draft.id}`);
    assert.equal(c.init?.method, "DELETE");
    assert.equal((c.init?.headers as Record<string, string>).Authorization, "Bearer jwt-token");
    assert.equal(c.init?.body, undefined, "no body; the server derives the owner from the JWT");
  });

  await t.test("2. deletePortfolio URL-encodes the id", async () => {
    let url = "";
    global.fetch = async (input: RequestInfo | URL) => {
      url = String(input);
      return jsonResponse(200, { success: true, id: "x" });
    };
    await deletePortfolio("a/b?c", "t");
    assert.equal(url, "http://localhost:5000/api/portfolios/a%2Fb%3Fc");
  });

  // ---------------------------------------------------------------------------
  // Outcomes: success, failure, expired session, ownership
  // ---------------------------------------------------------------------------

  await t.test("3. Successful deletion resolves to 'deleted'", async () => {
    global.fetch = async () => jsonResponse(200, { success: true, id: draft.id });
    assert.deepEqual(await performPortfolioDelete(draft.id, "t", deletePortfolio), { kind: "deleted" });
  });

  await t.test("4. Expired session (401) resolves to 'session-expired' (DASH-02 logout flow)", async () => {
    global.fetch = async () => jsonResponse(401, { message: "Authentication required" });
    assert.deepEqual(await performPortfolioDelete(draft.id, "t", deletePortfolio), {
      kind: "session-expired",
    });
  });

  await t.test("5. Another user's portfolio (403) shows a permission error and is NOT removed", async () => {
    global.fetch = async () => jsonResponse(403, { message: "Unauthorized to delete this portfolio" });
    const outcome = await performPortfolioDelete(draft.id, "t", deletePortfolio);
    assert.equal(outcome.kind, "error");
    assert.match((outcome as { message: string }).message, /permission/i);
    assert.match((outcome as { message: string }).message, /Nothing was deleted/);
  });

  await t.test("6. Missing portfolio (404) resolves to 'already-deleted'", async () => {
    global.fetch = async () => jsonResponse(404, { message: "Portfolio not found" });
    assert.deepEqual(await performPortfolioDelete(draft.id, "t", deletePortfolio), {
      kind: "already-deleted",
    });
  });

  await t.test("7. Network failure and server errors keep the portfolio and explain nothing changed", async () => {
    global.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    const network = await performPortfolioDelete(draft.id, "t", deletePortfolio);
    assert.equal(network.kind, "error");
    assert.match((network as { message: string }).message, /Couldn't reach FolioCraft.*not deleted/);

    global.fetch = async () => jsonResponse(500, { message: "Internal server error" });
    const server = await performPortfolioDelete(draft.id, "t", deletePortfolio);
    assert.equal(server.kind, "error");
    assert.match((server as { message: string }).message, /Nothing was changed/);
  });

  await t.test("8. resolveDeleteFailure covers other 4xx and non-API errors", () => {
    assert.deepEqual(resolveDeleteFailure(new ApiError("Invalid user ID", 400)), {
      action: "show-error",
      message: "Invalid user ID",
    });
    assert.equal(resolveDeleteFailure(new Error("boom")).action, "show-error");
    assert.equal(resolveDeleteFailure(undefined).action, "show-error");
  });

  // ---------------------------------------------------------------------------
  // Statistics after deletion
  // ---------------------------------------------------------------------------

  await t.test("9. Removing a portfolio locally updates DASH-03 statistics immediately", () => {
    const before = computeDashboardStats([draft, live]);
    assert.deepEqual(before, {
      total: 2,
      published: 1,
      drafts: 1,
      content: { projects: 4, skills: 2, experience: 1 },
    });
    // Same operation as the dashboard's removePortfolioLocally
    const afterLive = computeDashboardStats([draft, live].filter((p) => p.id !== live.id));
    assert.deepEqual(afterLive, {
      total: 1,
      published: 0,
      drafts: 1,
      content: { projects: 3, skills: 2, experience: 1 },
    });
    const afterAll = computeDashboardStats([]);
    assert.equal(afterAll.total, 0);
  });

  // ---------------------------------------------------------------------------
  // Confirmation dialog
  // ---------------------------------------------------------------------------

  await t.test("10. Dialog is an accessible modal alertdialog naming the portfolio", () => {
    const html = renderDialog();
    assert.ok(html.startsWith("<dialog"));
    assert.ok(html.includes('role="alertdialog"'));
    assert.ok(html.includes('aria-modal="true"'));
    assert.ok(/aria-labelledby="[^"]+"/.test(html) && /aria-describedby="[^"]+"/.test(html));
    assert.ok(html.includes("Delete &ldquo;Principal Engineer&rdquo;?") || html.includes("Delete “Principal Engineer”?"));
    assert.ok(html.includes("@banula"));
    // Hidden until showModal() is called; only displayed while open
    assert.ok(html.includes("open:flex"));
    assert.ok(!/<dialog[^>]* open=/.test(html));
  });

  await t.test("11. Dialog states the delete is permanent and lists the content that cascades", () => {
    const html = renderDialog();
    assert.ok(html.includes("permanently deletes"));
    assert.ok(html.includes("This can&#x27;t be undone."));
    assert.ok(html.includes("3 projects, 2 skills and 1 experience entry"));
    assert.ok(html.includes("CV files you uploaded are kept in your account."));
  });

  await t.test("12. Content wording falls back gracefully when counts are unavailable", () => {
    const html = renderDialog({ portfolio: { ...draft, sectionCounts: undefined } });
    assert.ok(html.includes("its projects, skills and experience entries"));
    assert.equal(describeDeletedContent(undefined), null);
    assert.equal(describeDeletedContent({ projects: 0, skills: 0, experience: 0 }), null);
    assert.equal(describeDeletedContent({ projects: 1, skills: 0, experience: 0 }), "1 project");
    assert.equal(describeDeletedContent({ projects: 0, skills: 2, experience: 3 }), "2 skills and 3 experience entries");
  });

  await t.test("13. Draft: no live warning, Delete enabled, Cancel available", () => {
    const html = renderDialog();
    assert.ok(!html.includes('data-testid="delete-live-warning"'));
    assert.ok(!isDisabled(html, "delete-confirm-button"));
    assert.ok(!isDisabled(html, "delete-cancel-button"));
    assert.ok(html.includes(">Delete portfolio<"));
  });

  await t.test("14. Live portfolio: warns the URL stops working and requires typing the username", () => {
    const html = renderDialog({ portfolio: live });
    assert.ok(html.includes('data-testid="delete-live-warning"'));
    assert.ok(html.includes("/u/banula-live"));
    assert.ok(html.includes("will stop working immediately"));
    assert.ok(html.includes("available to other users"));
    assert.ok(html.includes('data-testid="delete-confirm-input"'));
    assert.ok(isDisabled(html, "delete-confirm-button"), "disabled until the username is typed");
    assert.equal(matchesDeleteConfirmation("banula-live", "banula-live"), true);
    assert.equal(matchesDeleteConfirmation("  BANULA-LIVE ", "banula-live"), true);
    assert.equal(matchesDeleteConfirmation("banula", "banula-live"), false);
    assert.equal(matchesDeleteConfirmation("", ""), false);
  });

  await t.test("15. While deleting, both buttons are disabled and progress is shown (no repeat submits)", () => {
    const html = renderDialog({ isDeleting: true });
    assert.ok(isDisabled(html, "delete-confirm-button"));
    assert.ok(isDisabled(html, "delete-cancel-button"));
    assert.ok(html.includes("Deleting..."));
    assert.ok(html.includes('aria-busy="true"'));
  });

  await t.test("16. Failure message is announced inside the dialog", () => {
    const html = renderDialog({ error: "Couldn't reach FolioCraft, so your portfolio was not deleted." });
    assert.ok(/role="alert"[^>]*data-testid="delete-error"/.test(html));
    assert.ok(html.includes("was not deleted"));
  });

  // ---------------------------------------------------------------------------
  // Card & feedback
  // ---------------------------------------------------------------------------

  await t.test("17. Card shows a labelled Delete action only when deletion is wired up", () => {
    const withDelete = renderToStaticMarkup(
      React.createElement(PortfolioCard, { portfolio: draft, onPublishClick: noop, onDeleteClick: noop })
    );
    assert.ok(withDelete.includes(`data-testid="card-delete-btn-${draft.id}"`));
    assert.ok(withDelete.includes('aria-label="Delete portfolio Principal Engineer"'));
    const withoutDelete = renderToStaticMarkup(
      React.createElement(PortfolioCard, { portfolio: draft, onPublishClick: noop })
    );
    assert.ok(!withoutDelete.includes("card-delete-btn"));
    // Publish action is unchanged and still present
    assert.ok(withDelete.includes(`data-testid="card-publish-btn-${draft.id}"`));
  });

  await t.test("18. Success feedback is a dismissible polite live region", () => {
    const empty = renderToStaticMarkup(React.createElement(DashboardNotice, { message: null, onDismiss: noop }));
    assert.ok(empty.includes('role="status"') && empty.includes('aria-live="polite"'));
    assert.ok(!empty.includes('data-testid="dashboard-notice"'));
    const shown = renderToStaticMarkup(
      React.createElement(DashboardNotice, { message: '"Principal Engineer" was permanently deleted.', onDismiss: noop })
    );
    assert.ok(shown.includes("was permanently deleted."));
    assert.ok(shown.includes('aria-label="Dismiss message"'));
  });

  // ---------------------------------------------------------------------------
  // Publish modal username (DASH-01 §4.6)
  // ---------------------------------------------------------------------------

  const renderModal = (portfolio: Portfolio) =>
    renderToStaticMarkup(
      React.createElement(PublishModal, {
        isOpen: true,
        onClose: noop,
        portfolio,
        token: "t",
        onPortfolioUpdated: noop,
      })
    );

  await t.test("19. Username in the publish modal is read-only and shows the saved value", () => {
    const html = renderModal(draft);
    const input = html.match(/<input[^>]*id="publish-modal-username"[^>]*>/)?.[0] ?? "";
    assert.ok(input, "username field still rendered for its label");
    assert.ok(input.includes('readOnly=""') || input.includes("readonly"));
    assert.ok(input.includes('aria-readonly="true"'));
    assert.ok(input.includes('value="banula"'));
    assert.ok(/aria-describedby="[^"]+"/.test(input));
  });

  await t.test("20. Modal explains usernames are managed in the editor and links to it", () => {
    for (const p of [draft, live]) {
      const html = renderModal(p);
      assert.ok(html.includes("Your username is managed in the portfolio editor."));
      const link = html.match(/<a[^>]*data-testid="edit-username-link"[^>]*>/)?.[0] ?? "";
      assert.ok(link.includes(`href="/portfolio/edit/${p.id}"`), "links to this portfolio's editor");
      assert.ok(!link.includes('target="_blank"'), "same-tab navigation");
    }
  });

  await t.test("21. Publishing still sends no username: the server publishes the saved one", async () => {
    let init: RequestInit | undefined;
    let url = "";
    global.fetch = async (input: RequestInfo | URL, i?: RequestInit) => {
      url = String(input);
      init = i;
      return jsonResponse(200, {
        success: true,
        message: "Portfolio published successfully",
        portfolio: { id: draft.id, username: "banula", published: true, publishedAt: "2026-04-01T00:00:00.000Z", publicUrl: "/u/banula" },
      });
    };
    await publishPortfolio(draft.id, "t");
    assert.equal(url, `http://localhost:5000/api/portfolios/${draft.id}/publish`);
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, undefined);
  });

  await t.test("22. Phase 10 modal behaviour intact (checklist, publish button, unpublish)", () => {
    const draftHtml = renderModal(draft);
    assert.ok(draftHtml.includes("Publishing Readiness Checklist"));
    assert.ok(draftHtml.includes('data-testid="publish-submit-button"'));
    assert.ok(draftHtml.includes("Publish to Live Site"));
    const liveHtml = renderModal(live);
    assert.ok(liveHtml.includes("Unpublish Portfolio"));
    assert.ok(liveHtml.includes("Copy URL"));
  });

  // ---------------------------------------------------------------------------
  // Page wiring (needs the App Router, so the source is checked)
  // ---------------------------------------------------------------------------

  await t.test("23. Dashboard wires delete through the shared outcome handler and DASH-02 session flow", () => {
    const source = readFileSync(path.join(process.cwd(), "src", "app", "dashboard", "page.tsx"), "utf8");
    for (const needle of [
      "onDeleteClick={openDeleteDialog}",
      "<DeletePortfolioDialog",
      "performPortfolioDelete(target.id, token, deletePortfolio)",
      "deleteInFlightRef.current",
      'case "session-expired"',
      "setSessionExpired(true)",
      "removePortfolioLocally(target.id)",
      'fallbackFocusId="portfolios-heading"',
      "<DashboardNotice",
    ]) {
      assert.ok(source.includes(needle), `page should contain ${needle}`);
    }
    // Error outcome keeps the portfolio (only shows the message)
    const errorCase = source.slice(source.indexOf('case "error"'), source.indexOf('case "error"') + 120);
    assert.ok(errorCase.includes("setDeleteError(outcome.message)"));
    assert.ok(!errorCase.includes("removePortfolioLocally"));
  });
});
