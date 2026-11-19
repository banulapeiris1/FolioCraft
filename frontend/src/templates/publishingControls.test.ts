// Ensure environment variable is configured before any module evaluation
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getPublicPortfolioUrl,
  checkUsernameAvailability,
  publishPortfolio,
  unpublishPortfolio,
} from "@/lib/api";
import { Portfolio } from "@/types/portfolio";
import PublishModal, {
  mergePublishingResult,
  getPublicPortfolioUrl as getModalPublicPortfolioUrl,
} from "@/components/portfolio/PublishModal";
import PortfolioCard from "@/components/portfolio/PortfolioCard";

const mockDraftPortfolio: Portfolio = {
  id: "uuid-1234-5678",
  userId: "user-abc-1",
  name: "Banula Peiris",
  title: "Principal Engineer",
  about: "Building scalable distributed systems.",
  email: "banula@example.com",
  phone: "+1-555-0199",
  location: "Colombo, Sri Lanka",
  profileImageUrl: "https://example.com/avatar.jpg",
  socialLinks: { github: "https://github.com/banulap" },
  username: "banula",
  template: "modern",
  published: false,
  publishedAt: null,
  publicUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockPublishedPortfolio: Portfolio = {
  ...mockDraftPortfolio,
  id: "uuid-8765-4321",
  published: true,
  publishedAt: "2026-02-15T12:00:00.000Z",
  publicUrl: "http://localhost:3000/u/banula",
};

test("PUB-05: Dashboard Publishing Controls & Public URL Management Suite", async (t) => {
  // Save original fetch
  const originalFetch = global.fetch;

  t.afterEach(() => {
    global.fetch = originalFetch;
  });

  await t.test("1. getPublicPortfolioUrl formats URLs correctly for strings and Portfolio objects", () => {
    // String input
    const urlFromString = getPublicPortfolioUrl("johndoe", "https://foliocraft.dev");
    assert.equal(urlFromString, "https://foliocraft.dev/u/johndoe");

    // Portfolio object with publicUrl
    const urlFromPublished = getPublicPortfolioUrl(mockPublishedPortfolio, "https://foliocraft.dev");
    assert.equal(urlFromPublished, "http://localhost:3000/u/banula");

    // Portfolio object without publicUrl
    const urlFromDraft = getPublicPortfolioUrl(mockDraftPortfolio, "https://foliocraft.dev");
    assert.equal(urlFromDraft, "https://foliocraft.dev/u/banula");

    // Username encoding
    const urlSpecialChars = getPublicPortfolioUrl("dev_user-99", "https://example.com");
    assert.equal(urlSpecialChars, "https://example.com/u/dev_user-99");
  });

  await t.test("2. checkUsernameAvailability sends authenticated request with correct query params", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedUrl = String(input);
      capturedHeaders = (init?.headers || {}) as Record<string, string>;
      return new Response(
        JSON.stringify({
          success: true,
          available: true,
          username: "awesomecoder",
          message: "Username is available",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const res = await checkUsernameAvailability("awesomecoder", "test-token-jwt", "uuid-1234-5678");

    assert.equal(res.available, true);
    assert.equal(res.username, "awesomecoder");
    assert.match(capturedUrl, /\/api\/portfolios\/check-username\/awesomecoder\?portfolioId=uuid-1234-5678$/);
    assert.equal(capturedHeaders.Authorization, "Bearer test-token-jwt");
  });

  await t.test("3. checkUsernameAvailability correctly returns unavailable on 200 when taken", async () => {
    global.fetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          success: true,
          available: false,
          username: "admin",
          message: "Username is a reserved system route",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const res = await checkUsernameAvailability("admin", "test-token-jwt");
    assert.equal(res.available, false);
    assert.equal(res.message, "Username is a reserved system route");
  });

  await t.test("4. publishPortfolio sends POST request to /api/portfolios/:id/publish with bearer token", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedAuth = "";

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedUrl = String(input);
      capturedMethod = init?.method || "";
      capturedAuth = (init?.headers as Record<string, string>)?.Authorization || "";
      return new Response(
        JSON.stringify({
          message: "Portfolio published successfully",
          portfolio: {
            ...mockDraftPortfolio,
            published: true,
            publishedAt: "2026-03-01T10:00:00.000Z",
            publicUrl: "http://localhost:5000/u/banula",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const res = await publishPortfolio("uuid-1234-5678", "mock-jwt-auth");

    assert.equal(capturedMethod, "POST");
    assert.match(capturedUrl, /\/api\/portfolios\/uuid-1234-5678\/publish$/);
    assert.equal(capturedAuth, "Bearer mock-jwt-auth");
    assert.equal(res.portfolio.published, true);
    assert.equal(res.message, "Portfolio published successfully");
  });

  await t.test("5. unpublishPortfolio sends POST request to /api/portfolios/:id/unpublish with bearer token", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedAuth = "";

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedUrl = String(input);
      capturedMethod = init?.method || "";
      capturedAuth = (init?.headers as Record<string, string>)?.Authorization || "";
      return new Response(
        JSON.stringify({
          message: "Portfolio unpublished successfully",
          portfolio: {
            ...mockPublishedPortfolio,
            published: false,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const res = await unpublishPortfolio("uuid-8765-4321", "mock-jwt-auth");

    assert.equal(capturedMethod, "POST");
    assert.match(capturedUrl, /\/api\/portfolios\/uuid-8765-4321\/unpublish$/);
    assert.equal(capturedAuth, "Bearer mock-jwt-auth");
    assert.equal(res.portfolio.published, false);
    assert.equal(res.message, "Portfolio unpublished successfully");
  });

  await t.test("6. PublishModal renders null when isOpen is false", () => {
    const el = React.createElement(PublishModal, {
      isOpen: false,
      onClose: () => {},
      portfolio: mockDraftPortfolio,
      token: "jwt-token",
      onPortfolioUpdated: () => {},
    });
    const html = renderToStaticMarkup(el);
    assert.equal(html, "");
  });

  await t.test("7. PublishModal renders draft state with checklist and publish action when unpublished", () => {
    const el = React.createElement(PublishModal, {
      isOpen: true,
      onClose: () => {},
      portfolio: mockDraftPortfolio,
      token: "jwt-token",
      onPortfolioUpdated: () => {},
    });
    const html = renderToStaticMarkup(el);

    // Dialog role & accessibility
    assert.ok(html.includes('role="dialog"'), "Modal must render with role='dialog'");
    assert.ok(html.includes('aria-modal="true"'), "Modal must render with aria-modal='true'");

    // Title and badge for draft
    assert.ok(html.includes("Publish Your Portfolio"), "Draft modal must display 'Publish Your Portfolio' heading");
    assert.ok(html.includes("Draft"), "Must show 'Draft' badge for unpublished portfolio");

    // Pre-publishing checklist
    assert.ok(html.includes("Publishing Readiness Checklist"), "Must render pre-publishing checklist section");
    assert.ok(html.includes("Full Name &amp; Professional Title configured"), "Checklist must verify basic info");

    // Action button
    assert.ok(html.includes("Publish to Live Site"), "Draft modal must have 'Publish to Live Site' button");
    assert.ok(html.includes('data-testid="publish-submit-button"'), "Draft modal must have publish submit button test ID");
  });

  await t.test("8. PublishModal renders published state with public URL, copy action, and unpublish option", () => {
    const el = React.createElement(PublishModal, {
      isOpen: true,
      onClose: () => {},
      portfolio: mockPublishedPortfolio,
      token: "jwt-token",
      onPortfolioUpdated: () => {},
    });
    const html = renderToStaticMarkup(el);

    // Title and badge for published
    assert.ok(html.includes("Manage Public Portfolio"), "Published modal must display 'Manage Public Portfolio' heading");
    assert.ok(html.includes("Published"), "Must show 'Published' badge for live portfolio");

    // Copy URL and View Live
    assert.ok(html.includes("Copy URL"), "Published modal must render copy URL button");
    assert.ok(html.includes("/u/banula"), "Published modal must render link or path with /u/banula");
    assert.ok(html.includes("target=\"_blank\""), "Public link must open in new tab");

    // Unpublish trigger button
    assert.ok(html.includes("Unpublish Portfolio"), "Published modal must have 'Unpublish Portfolio' button");
  });

  await t.test("9. PortfolioCard displays publishing status, live URL banner, and manage button", () => {
    // Render Draft card
    const draftEl = React.createElement(PortfolioCard, {
      portfolio: mockDraftPortfolio,
      onPublishClick: () => {},
    });
    const draftHtml = renderToStaticMarkup(draftEl);

    // Status badge: Draft
    assert.ok(draftHtml.includes("Draft"), "Card must display Draft status badge");
    assert.ok(draftHtml.includes("Publish"), "Draft card must render Publish action button");

    // Render Published card
    const publishedEl = React.createElement(PortfolioCard, {
      portfolio: mockPublishedPortfolio,
      onPublishClick: () => {},
    });
    const publishedHtml = renderToStaticMarkup(publishedEl);

    // Status badge: Published
    assert.ok(publishedHtml.includes("Published"), "Card must display Published status badge");
    assert.ok(publishedHtml.includes("/u/banula"), "Published card must display live URL banner");
    assert.ok(publishedHtml.includes("Manage Live"), "Published card must render Manage Live button");
    assert.ok(publishedHtml.includes("target=\"_blank\""), "Public card link must open in a new tab");
  });

  await t.test("10. Pre-publishing checklist disables Publish button when required fields are missing", () => {
    const invalidPortfolio: Portfolio = {
      ...mockDraftPortfolio,
      name: "",
      title: "",
    };

    const el = React.createElement(PublishModal, {
      isOpen: true,
      onClose: () => {},
      portfolio: invalidPortfolio,
      token: "jwt-token",
      onPortfolioUpdated: () => {},
    });
    const html = renderToStaticMarkup(el);

    // Publish button must have disabled attribute
    assert.ok(html.includes("disabled"), "Publish button must be disabled when pre-checklist fails");
    assert.ok(html.includes("Full Name &amp; Professional Title configured (Missing)"), "Checklist must indicate missing basic info");
  });

  await t.test("11. Partial publish/unpublish API results are merged, preserving portfolio fields (PUB-06 regression)", () => {
    // Shape actually returned by POST /api/portfolios/:id/unpublish
    const unpublishResult = {
      id: mockDraftPortfolio.id,
      username: mockDraftPortfolio.username,
      published: false,
      publicUrl: null,
    } as Partial<Portfolio>;

    const merged = mergePublishingResult(
      { ...mockDraftPortfolio, published: true },
      unpublishResult
    );
    assert.equal(merged.published, false);
    assert.equal(merged.name, mockDraftPortfolio.name);
    assert.equal(merged.title, mockDraftPortfolio.title);
    assert.equal(merged.template, mockDraftPortfolio.template);

    // After unpublishing, the modal must still allow republishing (checklist satisfied)
    const html = renderToStaticMarkup(
      React.createElement(PublishModal, {
        isOpen: true,
        onClose: () => {},
        portfolio: merged,
        token: "test-jwt-token",
        onPortfolioUpdated: () => {},
      })
    );
    assert.ok(
      !html.includes("Full Name &amp; Professional Title configured (Missing)"),
      "Merged portfolio must keep name/title so Publish is not blocked"
    );

    // Shape actually returned by POST /api/portfolios/:id/publish
    const publishResult = {
      id: mockDraftPortfolio.id,
      username: mockDraftPortfolio.username,
      published: true,
      publishedAt: "2026-11-19T10:00:00.000Z",
      publicUrl: "/u/banula",
    } as Partial<Portfolio>;
    const republished = mergePublishingResult(merged, publishResult);
    assert.equal(republished.published, true);
    assert.equal(republished.name, mockDraftPortfolio.name);
    assert.equal(republished.publicUrl, "/u/banula");
  });

  await t.test("12. Relative publicUrl from publish API resolves to an absolute shareable URL (PUB-06 regression)", () => {
    const justPublished = { ...mockDraftPortfolio, published: true, publicUrl: "/u/banula" };
    assert.equal(
      getModalPublicPortfolioUrl(justPublished, "https://foliocraft.dev"),
      "https://foliocraft.dev/u/banula"
    );
    assert.equal(
      getPublicPortfolioUrl(justPublished, "https://foliocraft.dev"),
      "https://foliocraft.dev/u/banula"
    );
    // Absolute publicUrl still passes through unchanged
    assert.equal(
      getPublicPortfolioUrl({ ...justPublished, publicUrl: "https://cdn.example/u/banula" }, "https://foliocraft.dev"),
      "https://cdn.example/u/banula"
    );
  });
});
