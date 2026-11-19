import test from "node:test";
import assert from "node:assert/strict";
import React from "react";

// Ensure environment variable is configured for test runner
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

type RenderComponent = (props: unknown) => React.ReactElement<Record<string, unknown>>;

import PublicPortfolioPage, {
  generateMetadata,
  PublicPortfolioPageProps,
} from "@/app/u/[username]/page";
import PublicPortfolioLoading from "@/app/u/[username]/loading";
import PublicNotFoundPage from "@/app/u/[username]/not-found";
import {
  PortfolioNotFound,
  InvalidUsername,
  ServiceUnavailable,
} from "@/components/portfolio/PublicPortfolioStatus";
import { getPublicPortfolio, ApiError } from "@/lib/api";
import { PortfolioViewData } from "./types";
import { TemplateRenderer } from "./TemplateRenderer";
import { TemplateModern } from "./modern/TemplateModern";
import { TemplateMinimal } from "./minimal/TemplateMinimal";
import { TemplateProfessional } from "./professional/TemplateProfessional";

/** True when `err` is the error thrown by Next.js `notFound()` (digest NEXT_HTTP_ERROR_FALLBACK;404). */
function isNextNotFound(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404");
}

// Mock public portfolio view data
const mockPublishedModern: PortfolioViewData = {
  name: "Banula Peiris",
  title: "Full Stack Software Architect",
  about: "Specializing in distributed cloud systems and real-time platforms.",
  email: "banula@example.com",
  phone: "+1 555-0188",
  location: "San Francisco, CA",
  profileImageUrl: "https://example.com/avatar.jpg",
  socialLinks: {
    github: "https://github.com/banulap",
    linkedin: "https://linkedin.com/in/banulap",
  },
  username: "banula",
  template: "modern",
  projects: [
    {
      id: "p1",
      portfolioId: "port-1",
      title: "FolioCraft Platform",
      description: "Automated CV-to-portfolio builder",
      technologies: ["Next.js", "TypeScript", "PostgreSQL"],
      githubUrl: "https://github.com/banulap/foliocraft",
      projectUrl: "https://foliocraft.dev",
      imageUrl: null,
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  skills: [
    {
      id: "s1",
      portfolioId: "port-1",
      name: "TypeScript",
      category: "Languages",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  experiences: [
    {
      id: "e1",
      portfolioId: "port-1",
      company: "Tech Systems",
      position: "Lead Architect",
      description: "Led core infrastructure.",
      startDate: "2023-01-01",
      endDate: null,
      isCurrent: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

const mockMinimalData: PortfolioViewData = {
  ...mockPublishedModern,
  template: "minimal",
};

const mockProfessionalData: PortfolioViewData = {
  ...mockPublishedModern,
  template: "professional",
};

test("PUB-04: Public Portfolio Frontend Route (/u/:username) Test Suite", async (t) => {
  // Save original fetch
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // =========================================================================
  // Section 1: Template Integration via TemplateRenderer
  // =========================================================================

  await t.test("1. TemplateRenderer renders TemplateModern with modern templateId", () => {
    const el = TemplateRenderer({
      templateId: "modern",
      data: mockPublishedModern,
    });
    assert.ok(React.isValidElement(el));
    assert.equal(el.type, TemplateModern);

    const rendered = (el.type as RenderComponent)(el.props);
    assert.ok(React.isValidElement(rendered));
    assert.equal(rendered.props["data-testid"], "template-modern");
  });

  await t.test("2. TemplateRenderer renders TemplateMinimal with minimal templateId", () => {
    const el = TemplateRenderer({
      templateId: "minimal",
      data: mockMinimalData,
    });
    assert.ok(React.isValidElement(el));
    assert.equal(el.type, TemplateMinimal);

    const rendered = (el.type as RenderComponent)(el.props);
    assert.ok(React.isValidElement(rendered));
    assert.equal(rendered.props["data-testid"], "template-minimal");
  });

  await t.test("3. TemplateRenderer renders TemplateProfessional with professional templateId", () => {
    const el = TemplateRenderer({
      templateId: "professional",
      data: mockProfessionalData,
    });
    assert.ok(React.isValidElement(el));
    assert.equal(el.type, TemplateProfessional);

    const rendered = (el.type as RenderComponent)(el.props);
    assert.ok(React.isValidElement(rendered));
    assert.equal(rendered.props["data-testid"], "template-professional");
  });

  await t.test("4. TemplateRenderer falls back safely to Modern on unknown or missing templateId", () => {
    const el = TemplateRenderer({
      templateId: "unrecognized-style",
      data: mockPublishedModern,
    });
    assert.ok(React.isValidElement(el));
    assert.equal(el.type, TemplateModern);

    const rendered = (el.type as RenderComponent)(el.props);
    assert.ok(React.isValidElement(rendered));
    assert.equal(rendered.props["data-testid"], "template-modern");
  });

  // =========================================================================
  // Section 2: Page Component Rendering & Status States
  // =========================================================================

  await t.test("5. PublicPortfolioPage successfully renders published portfolio with dynamic username", async () => {
    globalThis.fetch = async (input, init) => {
      const urlStr = String(input);
      assert.ok(urlStr.includes("/api/public/banula"), `Expected URL to include public username, got: ${urlStr}`);
      assert.equal(init?.method || "GET", "GET");
      // Confirm no Authorization header is sent (anonymous access)
      const headers = init?.headers as Record<string, string> | undefined;
      assert.equal(headers?.["Authorization"], undefined, "Public API request must not require Authorization header");

      return new Response(
        JSON.stringify({
          success: true,
          portfolio: mockPublishedModern,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const props: PublicPortfolioPageProps = {
      params: Promise.resolve({ username: "banula" }),
    };

    const pageElement = await PublicPortfolioPage(props);
    assert.ok(React.isValidElement<{ "data-testid"?: string; children?: React.ReactElement }>(pageElement));
    assert.equal(pageElement.props["data-testid"], "public-portfolio-container");

    const innerChild = pageElement.props.children;
    assert.ok(React.isValidElement(innerChild));
    assert.equal(innerChild.type, TemplateRenderer);
  });

  await t.test("6. PublicPortfolioPage triggers notFound() (404 boundary) when API returns 404 (nonexistent/unpublished)", async () => {
    // PUB-06: the page must delegate to not-found.tsx via notFound() so that
    // Next.js serves a 404 / robots noindex rather than an indexable 200.
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ message: "Portfolio not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    for (const username of ["unpublished_user", "never_existed_user"]) {
      await assert.rejects(
        PublicPortfolioPage({ params: Promise.resolve({ username }) }),
        (err: unknown) => isNextNotFound(err),
        `${username} should trigger the Next.js 404 boundary`
      );
    }
  });

  await t.test("7. PublicPortfolioPage renders InvalidUsername when username contains invalid format", async () => {
    // Malformed username should be caught without triggering an API call
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response("", { status: 500 });
    };

    const props: PublicPortfolioPageProps = {
      params: Promise.resolve({ username: "ab" }), // < 3 chars
    };

    const pageElement = await PublicPortfolioPage(props);
    assert.equal(fetchCalled, false, "Invalid format should be intercepted prior to fetch");
    assert.ok(React.isValidElement(pageElement));
    assert.equal(pageElement.type, InvalidUsername);

    const rendered = (pageElement.type as RenderComponent)(pageElement.props);
    assert.ok(React.isValidElement(rendered));
    assert.equal(rendered.props["data-testid"], "portfolio-invalid-username");
  });

  await t.test("8. PublicPortfolioPage renders ServiceUnavailable on server failure (500 or network error)", async () => {
    globalThis.fetch = async () => {
      throw new Error("Connection refused: 127.0.0.1:5000");
    };

    const props: PublicPortfolioPageProps = {
      params: Promise.resolve({ username: "anydeveloper" }),
    };

    const pageElement = await PublicPortfolioPage(props);
    assert.ok(React.isValidElement(pageElement));
    assert.equal(pageElement.type, ServiceUnavailable);

    const rendered = (pageElement.type as RenderComponent)(pageElement.props);
    assert.ok(React.isValidElement(rendered));
    assert.equal(rendered.props["data-testid"], "portfolio-service-unavailable");
  });

  // =========================================================================
  // Section 3: Dynamic SEO Metadata Generation
  // =========================================================================

  await t.test("9. generateMetadata returns dynamic title, description, canonical, and OpenGraph tags for published portfolio", async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: true,
          portfolio: mockPublishedModern,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const props: PublicPortfolioPageProps = {
      params: Promise.resolve({ username: "Banula" }), // Case-variant in URL
    };

    const metadata = await generateMetadata(props);

    // Title & description
    assert.equal(metadata.title, "Banula Peiris — Full Stack Software Architect | FolioCraft");
    assert.equal(
      metadata.description,
      "Specializing in distributed cloud systems and real-time platforms."
    );

    // Canonical URL (normalized lowercase)
    assert.equal(metadata.alternates?.canonical, "/u/banula");

    // OpenGraph
    const og = metadata.openGraph as Record<string, unknown>;
    assert.equal(og?.title, "Banula Peiris — Full Stack Software Architect");
    assert.equal(og?.siteName, "FolioCraft");
    assert.equal(og?.type, "profile");
    assert.equal(og?.url, "/u/banula");
    assert.deepEqual(og?.images, [
      {
        url: "https://example.com/avatar.jpg",
        alt: "Banula Peiris's profile photo",
      },
    ]);

    // Twitter Card
    const tw = metadata.twitter as Record<string, unknown>;
    assert.equal(tw?.card, "summary_large_image");
    assert.equal(tw?.title, "Banula Peiris — Full Stack Software Architect");
  });

  await t.test("10. generateMetadata triggers notFound() on 404 and falls back safely on invalid username or service error", async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ message: "Portfolio not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    };

    // PUB-06 regression: 404 must reach the not-found boundary (robots noindex)
    await assert.rejects(
      generateMetadata({ params: Promise.resolve({ username: "ghost_user" }) }),
      (err: unknown) => isNextNotFound(err)
    );

    globalThis.fetch = async () => {
      throw new Error("Connection refused");
    };
    const unavailableMeta = await generateMetadata({
      params: Promise.resolve({ username: "ghost_user" }),
    });
    assert.equal(unavailableMeta.title, "Portfolio Not Found | FolioCraft");
    assert.match(String(unavailableMeta.description), /could not be found/i);

    const invalidMeta = await generateMetadata({
      params: Promise.resolve({ username: "x" }), // Invalid length
    });
    assert.equal(invalidMeta.title, "Portfolio Not Found | FolioCraft");
  });

  // =========================================================================
  // Section 4: Loading and Error Boundary Components
  // =========================================================================

  await t.test("11. PublicPortfolioLoading renders accessible skeleton with status role", () => {
    const el = PublicPortfolioLoading();
    assert.ok(React.isValidElement<{ "data-testid"?: string; role?: string }>(el));
    assert.equal(el.props["data-testid"], "public-portfolio-loading");
    assert.equal(el.props.role, "status");
  });

  await t.test("12. PublicNotFoundPage renders PortfolioNotFound", () => {
    const el = PublicNotFoundPage();
    assert.ok(React.isValidElement<{ "data-testid"?: string }>(el));
    assert.equal(el.type, PortfolioNotFound);
  });

  await t.test("13. PortfolioNotFound displays branded 404 card and navigation links", () => {
    const el = PortfolioNotFound({ username: "janedoe" });
    assert.ok(React.isValidElement<{ "data-testid"?: string }>(el));
    assert.equal(el.props["data-testid"], "portfolio-not-found");
  });

  await t.test("14. InvalidUsername renders informative error card with guidelines", () => {
    const el = InvalidUsername({ username: "bad@name" });
    assert.ok(React.isValidElement<{ "data-testid"?: string }>(el));
    assert.equal(el.props["data-testid"], "portfolio-invalid-username");
  });

  await t.test("15. ServiceUnavailable renders friendly downtime message", () => {
    const el = ServiceUnavailable();
    assert.ok(React.isValidElement<{ "data-testid"?: string }>(el));
    assert.equal(el.props["data-testid"], "portfolio-service-unavailable");
  });

  // =========================================================================
  // Section 5: API Client Integration & Error Parsing
  // =========================================================================

  await t.test("16. getPublicPortfolio retrieves published portfolio anonymously", async () => {
    globalThis.fetch = async (url) => {
      assert.ok(String(url).endsWith("/api/public/alex"));
      return new Response(
        JSON.stringify({
          success: true,
          portfolio: mockMinimalData,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const res = await getPublicPortfolio("alex");
    assert.equal(res.success, true);
    assert.equal(res.portfolio.name, "Banula Peiris");
    assert.equal(res.portfolio.template, "minimal");
  });

  await t.test("17. getPublicPortfolio throws ApiError with status 404 on unpublished or missing portfolio", async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ message: "Portfolio not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    };

    await assert.rejects(
      async () => {
        await getPublicPortfolio("nonexistent");
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 404);
        assert.equal(err.message, "Portfolio not found");
        return true;
      }
    );
  });
});
