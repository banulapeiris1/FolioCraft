import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import type { Project } from "@/types/project";
import type { Experience } from "@/types/experience";
import type { PortfolioViewData } from "./types";
import {
  slugify,
  buildProjectEntries,
  findProjectBySlug,
  createProjectHrefResolver,
  getSiteNavItems,
  portfolioPaths,
  sortExperiences,
  groupSkills,
  formatDateRange,
  safeExternalUrl,
} from "./site/siteModel";
import {
  loadPublicPortfolio,
  normalizePublicPortfolio,
  isValidUsernameFormat,
} from "@/lib/publicPortfolio";
import { TemplateRenderer } from "./TemplateRenderer";
import { SiteNav } from "./site/SiteNav";
import { PortfolioSiteShell } from "./site/PortfolioSiteShell";
import { getSiteTheme } from "./site/siteThemes";
import PublicPortfolioPage from "@/app/u/[username]/page";
import PublicAboutPage, { generateMetadata as aboutMetadata } from "@/app/u/[username]/about/page";
import PublicExperiencePage, {
  generateMetadata as experienceMetadata,
} from "@/app/u/[username]/experience/page";
import PublicProjectsPage, {
  generateMetadata as projectsMetadata,
} from "@/app/u/[username]/projects/page";
import PublicProjectPage, {
  generateMetadata as projectMetadata,
} from "@/app/u/[username]/projects/[projectSlug]/page";
import {
  InvalidUsername,
  ServiceUnavailable,
  ProjectNotFound,
} from "@/components/portfolio/PublicPortfolioStatus";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<Project> & { id: string; title: string }): Project {
  return {
    portfolioId: "port-1",
    description: null,
    technologies: [],
    githubUrl: null,
    projectUrl: null,
    imageUrl: null,
    orderIndex: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeExperience(
  overrides: Partial<Experience> & { id: string }
): Experience {
  return {
    portfolioId: "port-1",
    company: "Acme",
    position: "Engineer",
    description: null,
    startDate: "2022-01-01",
    endDate: null,
    isCurrent: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const threeProjects: Project[] = [
  makeProject({ id: "p2", title: "Second Project", orderIndex: 1 }),
  makeProject({
    id: "p1",
    title: "FolioCraft Platform",
    orderIndex: 0,
    description: "CV-to-portfolio builder",
    technologies: ["Next.js", "TypeScript"],
    githubUrl: "https://github.com/example/foliocraft",
    projectUrl: "foliocraft.dev",
    imageUrl: "https://example.com/shot.png",
  }),
  makeProject({ id: "p3", title: "Third Project", orderIndex: 2 }),
];

const baseData: PortfolioViewData = {
  name: "Jane Doe",
  title: "Software Engineer",
  about: "I build reliable web platforms.",
  email: "jane@example.com",
  phone: null,
  location: "Colombo",
  profileImageUrl: null,
  socialLinks: { github: "https://github.com/jane" },
  username: "janedoe",
  projects: threeProjects,
  skills: [],
  experiences: [makeExperience({ id: "e1" })],
  template: "modern",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Stage 1 — site model
// ---------------------------------------------------------------------------

test("Phase 12: site model", async (t) => {
  await t.test("slugify produces URL-safe, accent-free slugs", () => {
    assert.equal(slugify("FolioCraft Platform"), "foliocraft-platform");
    assert.equal(slugify("  Café API (v2)!  "), "cafe-api-v2");
    assert.equal(slugify("C++ / Rust -- Engine"), "c-rust-engine");
    assert.equal(slugify("日本語"), "");
    assert.ok(slugify("a".repeat(200)).length <= 80);
    const long = slugify(
      "Realtime Chat Service With An Extremely Long Project Title That Must Wrap Cleanly"
    );
    assert.equal(long, "realtime-chat-service-with-an-extremely-long-project-title-that-must-wrap");
    assert.ok(long.length <= 80, "long slugs are cut at a word boundary");
  });

  await t.test("buildProjectEntries orders by orderIndex and assigns slugs", () => {
    const entries = buildProjectEntries(threeProjects);
    assert.deepEqual(
      entries.map((e) => e.slug),
      ["foliocraft-platform", "second-project", "third-project"]
    );
    assert.deepEqual(entries.map((e) => e.index), [0, 1, 2]);
  });

  await t.test("duplicate titles get -2, -3 suffixes in display order", () => {
    const entries = buildProjectEntries([
      makeProject({ id: "a", title: "Chat App", orderIndex: 0 }),
      makeProject({ id: "b", title: "Chat App", orderIndex: 1 }),
      makeProject({ id: "c", title: "chat app!", orderIndex: 2 }),
    ]);
    assert.deepEqual(entries.map((e) => e.slug), ["chat-app", "chat-app-2", "chat-app-3"]);
  });

  await t.test("suffixed slugs never collide with a natural slug", () => {
    const entries = buildProjectEntries([
      makeProject({ id: "a", title: "Foo", orderIndex: 0 }),
      makeProject({ id: "b", title: "Foo", orderIndex: 1 }),
      makeProject({ id: "c", title: "Foo 2", orderIndex: 2 }),
    ]);
    const slugs = entries.map((e) => e.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    assert.deepEqual(slugs, ["foo", "foo-2", "foo-2-2"]);
  });

  await t.test("titles without URL-safe characters fall back to project-<n>", () => {
    const entries = buildProjectEntries([
      makeProject({ id: "a", title: "日本語", orderIndex: 0 }),
      makeProject({ id: "b", title: "!!!", orderIndex: 1 }),
    ]);
    assert.deepEqual(entries.map((e) => e.slug), ["project-1", "project-2"]);
  });

  await t.test("findProjectBySlug resolves previous/next and handles first/last", () => {
    const entries = buildProjectEntries(threeProjects);

    const first = findProjectBySlug(entries, "foliocraft-platform");
    assert.ok(first);
    assert.equal(first.previous, null);
    assert.equal(first.next?.slug, "second-project");
    assert.equal(first.total, 3);

    const middle = findProjectBySlug(entries, "second-project");
    assert.equal(middle?.previous?.slug, "foliocraft-platform");
    assert.equal(middle?.next?.slug, "third-project");

    const last = findProjectBySlug(entries, "third-project");
    assert.equal(last?.previous?.slug, "second-project");
    assert.equal(last?.next, null);
  });

  await t.test("single project has neither previous nor next", () => {
    const entries = buildProjectEntries([makeProject({ id: "x", title: "Only One" })]);
    const loc = findProjectBySlug(entries, "only-one");
    assert.equal(loc?.previous, null);
    assert.equal(loc?.next, null);
  });

  await t.test("findProjectBySlug is case-insensitive and rejects unknown/malformed slugs", () => {
    const entries = buildProjectEntries(threeProjects);
    assert.equal(findProjectBySlug(entries, "FolioCraft-Platform")?.entry.project.id, "p1");
    assert.equal(findProjectBySlug(entries, "does-not-exist"), null);
    assert.equal(findProjectBySlug(entries, ""), null);
    assert.equal(findProjectBySlug(entries, "%E0%A4%A"), null);
    assert.equal(findProjectBySlug([], "anything"), null);
  });

  await t.test("portfolioPaths and project href resolver build stable URLs", () => {
    const paths = portfolioPaths("janedoe");
    assert.equal(paths.home, "/u/janedoe");
    assert.equal(paths.about, "/u/janedoe/about");
    assert.equal(paths.projects, "/u/janedoe/projects");
    assert.equal(paths.experience, "/u/janedoe/experience");
    assert.equal(paths.project("my-app"), "/u/janedoe/projects/my-app");

    const hrefFor = createProjectHrefResolver("janedoe", threeProjects);
    assert.equal(hrefFor(threeProjects[0]), "/u/janedoe/projects/second-project");
    assert.equal(hrefFor(makeProject({ id: "unknown", title: "X" })), undefined);
  });

  await t.test("nav items hide empty Projects / Experience pages", () => {
    assert.deepEqual(
      getSiteNavItems(baseData, "janedoe").map((i) => i.key),
      ["home", "about", "projects", "experience"]
    );
    const empty = { ...baseData, projects: [], experiences: [] };
    assert.deepEqual(getSiteNavItems(empty, "janedoe").map((i) => i.key), ["home", "about"]);
    assert.deepEqual(
      getSiteNavItems(empty, "janedoe", "projects").map((i) => i.key),
      ["home", "about", "projects"],
      "an empty page being viewed still appears (and is highlighted)"
    );
    assert.deepEqual(
      getSiteNavItems(empty, "janedoe", "experience").map((i) => i.key),
      ["home", "about", "experience"]
    );
  });

  await t.test("sortExperiences puts current roles first, then newest", () => {
    const sorted = sortExperiences([
      makeExperience({ id: "old", startDate: "2018-01-01" }),
      makeExperience({ id: "cur", startDate: "2020-01-01", isCurrent: true }),
      makeExperience({ id: "new", startDate: "2023-01-01" }),
    ]);
    assert.deepEqual(sorted.map((e) => e.id), ["cur", "new", "old"]);
  });

  await t.test("groupSkills groups by category with a default bucket", () => {
    const groups = groupSkills([
      { id: "1", portfolioId: "p", name: "Go", category: "Languages", orderIndex: 1, createdAt: "", updatedAt: "" },
      { id: "2", portfolioId: "p", name: "TS", category: "Languages", orderIndex: 0, createdAt: "", updatedAt: "" },
      { id: "3", portfolioId: "p", name: "Git", category: "", orderIndex: 0, createdAt: "", updatedAt: "" },
    ]);
    assert.deepEqual(groups.map(([c]) => c), ["Languages", "Technologies"]);
    assert.deepEqual(groups[0][1].map((s) => s.name), ["TS", "Go"]);
  });

  await t.test("formatDateRange formats current and past roles", () => {
    assert.equal(formatDateRange("2023-03-01", null, true), "Mar 2023 — Present");
    assert.equal(formatDateRange("2020-01-15", "2022-12-01", false), "Jan 2020 — Dec 2022");
    assert.equal(formatDateRange("", null, false), "");
  });

  await t.test("safeExternalUrl allows only http(s) and upgrades bare domains", () => {
    assert.equal(safeExternalUrl("https://github.com/x"), "https://github.com/x");
    assert.equal(safeExternalUrl("foliocraft.dev"), "https://foliocraft.dev/");
    assert.equal(safeExternalUrl("javascript:alert(1)"), null);
    assert.equal(safeExternalUrl("data:text/html,hi"), null);
    assert.equal(safeExternalUrl("   "), null);
    assert.equal(safeExternalUrl(null), null);
  });
});

// ---------------------------------------------------------------------------
// Stage 1 — public portfolio loader
// ---------------------------------------------------------------------------

test("Phase 12: public portfolio loader", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("isValidUsernameFormat mirrors backend username rules", () => {
    assert.equal(isValidUsernameFormat("janedoe"), true);
    assert.equal(isValidUsernameFormat("ab"), false);
    assert.equal(isValidUsernameFormat("bad@name"), false);
    assert.equal(isValidUsernameFormat("a".repeat(51)), false);
    assert.equal(isValidUsernameFormat(undefined), false);
  });

  await t.test("invalid usernames never reach the API", async () => {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return jsonResponse({}, 500);
    };
    const result = await loadPublicPortfolio("x!");
    assert.equal(result.status, "invalid");
    assert.equal(called, false);
  });

  await t.test("published portfolio loads with lowercase username", async () => {
    let requested = "";
    globalThis.fetch = async (input) => {
      requested = String(input);
      return jsonResponse({ success: true, portfolio: baseData });
    };
    const result = await loadPublicPortfolio("JaneDoe");
    assert.ok(requested.endsWith("/api/public/janedoe"));
    assert.equal(result.status, "ok");
    if (result.status === "ok") {
      assert.equal(result.username, "janedoe");
      assert.equal(result.data.projects.length, 3);
    }
  });

  await t.test("404 (unpublished or missing) maps to not-found", async () => {
    globalThis.fetch = async () => jsonResponse({ message: "Portfolio not found" }, 404);
    assert.deepEqual(await loadPublicPortfolio("unpublished_user"), { status: "not-found" });
  });

  await t.test("400 maps to invalid; 500 and network errors map to unavailable", async () => {
    globalThis.fetch = async () => jsonResponse({ message: "bad" }, 400);
    assert.equal((await loadPublicPortfolio("someone")).status, "invalid");

    globalThis.fetch = async () => jsonResponse({ message: "boom" }, 500);
    assert.equal((await loadPublicPortfolio("someone")).status, "unavailable");

    globalThis.fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    assert.equal((await loadPublicPortfolio("someone")).status, "unavailable");
  });

  await t.test("normalizePublicPortfolio drops malformed items and defaults fields", () => {
    const data = normalizePublicPortfolio(
      {
        name: "Jane",
        title: 42,
        about: "   ",
        socialLinks: { github: "https://github.com/jane", empty: "", bad: 3 },
        projects: [
          { id: "ok", title: "Valid", technologies: ["TS", 5, "  ", " Go "] },
          { id: "no-title", title: "   " },
          { title: "No id" },
          null,
          "garbage",
        ],
        skills: "not-an-array",
        experiences: [{ id: "e1", company: "Acme", position: "Dev", isCurrent: "yes" }],
      },
      "fallback"
    );

    assert.equal(data.title, "");
    assert.equal(data.about, null);
    assert.equal(data.username, "fallback");
    assert.equal(data.template, "modern");
    assert.deepEqual(data.socialLinks, { github: "https://github.com/jane" });
    assert.equal(data.projects.length, 1);
    assert.deepEqual(data.projects[0].technologies, ["TS", "Go"]);
    assert.deepEqual(data.skills, []);
    assert.equal(data.experiences[0].isCurrent, false);
  });

  await t.test("normalizePublicPortfolio tolerates a non-object payload", () => {
    const data = normalizePublicPortfolio(null, "jane");
    assert.equal(data.username, "jane");
    assert.deepEqual(data.projects, []);
  });
});

// ---------------------------------------------------------------------------
// Stage 2 — navigation, shell and template integration
// ---------------------------------------------------------------------------

const TEMPLATE_IDS = ["modern", "minimal", "professional"] as const;

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

/** Every <a ... aria-current="page" ...>Label</a> label in the markup. */
function activeLabels(html: string): string[] {
  return [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g)].map((m) => m[1]);
}

test("Phase 12: navigation and template integration", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("live preview compatibility: templates keep built-in nav and unlinked titles", () => {
    const modern = render(React.createElement(TemplateRenderer, { templateId: "modern", data: baseData }));
    assert.match(modern, /aria-label="Portfolio Navigation"/);
    assert.match(modern, /href="#projects"/);
    assert.doesNotMatch(modern, /portfolio-site-nav/);
    assert.doesNotMatch(modern, /\/u\/janedoe\/projects\//);

    const professional = render(
      React.createElement(TemplateRenderer, { templateId: "professional", data: baseData })
    );
    assert.match(professional, /aria-label="Executive Portfolio Navigation"/);

    const minimal = render(React.createElement(TemplateRenderer, { templateId: "minimal", data: baseData }));
    assert.doesNotMatch(minimal, /<nav/);
  });

  for (const id of TEMPLATE_IDS) {
    await t.test(`${id}: siteNav replaces in-page nav and project titles link to detail pages`, () => {
      const data = { ...baseData, template: id };
      const html = render(
        React.createElement(TemplateRenderer, {
          templateId: id,
          data,
          siteNav: React.createElement(SiteNav, { data, username: "janedoe", current: "home" }),
          getProjectHref: createProjectHrefResolver("janedoe", data.projects),
        })
      );
      assert.match(html, /data-testid="portfolio-site-nav"/);
      assert.doesNotMatch(html, /Portfolio Navigation"/);
      assert.equal((html.match(/<nav/g) || []).length, 1, "exactly one navigation bar");
      assert.match(html, /href="\/u\/janedoe\/projects\/foliocraft-platform"/);
      assert.match(html, /href="\/u\/janedoe\/projects\/third-project"/);
    });
  }

  await t.test("SiteNav highlights only the current page (desktop + mobile)", () => {
    for (const current of ["home", "about", "projects", "experience"] as const) {
      const html = render(React.createElement(SiteNav, { data: baseData, username: "janedoe", current }));
      const labels = activeLabels(html);
      const expected = current.charAt(0).toUpperCase() + current.slice(1);
      assert.deepEqual(labels, [expected, expected], `${current}: one active link per menu`);
    }
  });

  await t.test("SiteNav renders desktop links, a mobile disclosure menu and contact link", () => {
    const html = render(React.createElement(SiteNav, { data: baseData, username: "janedoe", current: "home" }));
    assert.match(html, /data-testid="portfolio-site-nav-desktop"/);
    assert.match(html, /<details[^>]*data-testid="portfolio-site-nav-mobile"/);
    assert.match(html, /<summary[^>]*aria-label="Open portfolio menu"/);
    assert.match(html, /href="\/u\/janedoe\/about"/);
    assert.match(html, /href="mailto:jane@example.com"/);
  });

  await t.test("SiteNav omits links to empty Projects / Experience and the contact link without email", () => {
    const data = { ...baseData, projects: [], experiences: [], email: null };
    const html = render(React.createElement(SiteNav, { data, username: "janedoe", current: "about" }));
    assert.doesNotMatch(html, /\/u\/janedoe\/projects"/);
    assert.doesNotMatch(html, /\/u\/janedoe\/experience"/);
    assert.doesNotMatch(html, /mailto:/);
  });

  await t.test("SiteNav and shell adopt the owner's template theme", () => {
    for (const id of TEMPLATE_IDS) {
      const data = { ...baseData, template: id };
      const theme = getSiteTheme(id);
      const html = render(
        React.createElement(PortfolioSiteShell, { data, username: "janedoe", current: "about" }, "content")
      );
      assert.match(html, new RegExp(`data-template="${id}"`));
      assert.ok(html.includes(theme.root), `${id} root classes applied`);
      assert.match(html, /<main id="main-content"/);
      assert.match(html, /Published with FolioCraft/);
    }
    assert.equal(getSiteTheme("unknown").id, "modern");
    assert.equal(getSiteTheme(null).id, "modern");
  });

  await t.test("public home page renders the full template with site navigation", async () => {
    globalThis.fetch = async () => jsonResponse({ success: true, portfolio: baseData });
    const page = await PublicPortfolioPage({ params: Promise.resolve({ username: "janedoe" }) });
    const html = render(page);
    assert.match(html, /data-testid="public-portfolio-container"/);
    assert.match(html, /data-testid="template-modern"/);
    assert.match(html, /data-testid="portfolio-site-nav"/);
    assert.deepEqual(activeLabels(html), ["Home", "Home"]);
    assert.match(html, /href="\/u\/janedoe\/projects\/second-project"/);
  });
});

// ---------------------------------------------------------------------------
// Stage 3 — projects listing and project detail pages
// ---------------------------------------------------------------------------

function isNextNotFound(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404");
}

function servePortfolio(data: PortfolioViewData): void {
  globalThis.fetch = async () => jsonResponse({ success: true, portfolio: data });
}

function projectParams(projectSlug: string, username = "janedoe") {
  return { params: Promise.resolve({ username, projectSlug }) };
}

test("Phase 12: projects listing and detail pages", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  for (const id of TEMPLATE_IDS) {
    await t.test(`${id}: projects page lists every project as a card in display order`, async () => {
      servePortfolio({ ...baseData, template: id });
      const html = render(await PublicProjectsPage({ params: Promise.resolve({ username: "janedoe" }) }));
      assert.match(html, new RegExp(`data-template="${id}"`));
      assert.match(html, /data-testid="projects-page"/);
      assert.equal((html.match(/data-testid="project-card"/g) || []).length, 3);
      assert.deepEqual(activeLabels(html), ["Projects", "Projects"]);

      const order = ["foliocraft-platform", "second-project", "third-project"].map((slug) =>
        html.indexOf(`/u/janedoe/projects/${slug}`)
      );
      assert.ok(order.every((pos) => pos > -1));
      assert.deepEqual([...order].sort((a, b) => a - b), order, "cards follow orderIndex");
    });
  }

  await t.test("project cards show image, description, technologies and a detail link", async () => {
    servePortfolio(baseData);
    const html = render(await PublicProjectsPage({ params: Promise.resolve({ username: "janedoe" }) }));
    assert.match(html, /src="https:\/\/example.com\/shot.png"/);
    assert.match(html, /CV-to-portfolio builder/);
    assert.match(html, />Next\.js</);
    assert.match(html, /aria-label="View project: FolioCraft Platform"/);
    assert.match(html, /No description provided\./);
  });

  await t.test("project card collapses long technology lists", async () => {
    const techs = ["A", "B", "C", "D", "E", "F", "G"];
    servePortfolio({ ...baseData, projects: [makeProject({ id: "x", title: "Big", technologies: techs })] });
    const html = render(await PublicProjectsPage({ params: Promise.resolve({ username: "janedoe" }) }));
    assert.match(html, />\+2</);
    assert.doesNotMatch(html, />F</);
  });

  await t.test("projects page shows an empty state when there are no projects", async () => {
    servePortfolio({ ...baseData, projects: [] });
    const html = render(await PublicProjectsPage({ params: Promise.resolve({ username: "janedoe" }) }));
    assert.match(html, /data-testid="projects-empty"/);
    assert.match(html, /No projects yet/);
    assert.match(html, /href="\/u\/janedoe"/);
    assert.deepEqual(activeLabels(html), ["Projects", "Projects"], "empty page is still highlighted");
    assert.doesNotMatch(html, /data-testid="project-card"/);
  });

  await t.test("project detail renders complete project information", async () => {
    servePortfolio(baseData);
    const html = render(await PublicProjectPage(projectParams("foliocraft-platform")));
    assert.match(html, /data-testid="project-detail"/);
    assert.match(html, /<h1 id="project-title"[^>]*>FolioCraft Platform<\/h1>/);
    assert.match(html, /Project 1 of 3/);
    assert.match(html, /CV-to-portfolio builder/);
    assert.match(html, /alt="Screenshot of FolioCraft Platform"/);
    assert.match(html, /data-testid="project-technologies"/);
    assert.match(html, />TypeScript</);
    assert.match(
      html,
      /href="https:\/\/github.com\/example\/foliocraft"[^>]*target="_blank"[^>]*rel="noreferrer noopener"/
    );
    assert.match(html, /href="https:\/\/foliocraft.dev\/"/);
    assert.match(html, /href="\/u\/janedoe\/projects"/);
    assert.deepEqual(activeLabels(html), ["Projects", "Projects"]);
  });

  await t.test("project detail handles sparse projects and unsafe links", async () => {
    servePortfolio({
      ...baseData,
      projects: [
        makeProject({ id: "s", title: "Sparse", githubUrl: "javascript:alert(1)", projectUrl: "   " }),
      ],
    });
    const html = render(await PublicProjectPage(projectParams("sparse")));
    assert.match(html, /No description provided for this project\./);
    assert.match(html, /No technologies listed\./);
    assert.doesNotMatch(html, /javascript:/);
    assert.doesNotMatch(html, /data-testid="project-links"/);
    assert.doesNotMatch(html, /<img/);
    assert.doesNotMatch(html, /data-testid="project-pagination"/, "single project has no prev/next");
  });

  await t.test("previous/next navigation handles first, middle and last projects", async () => {
    servePortfolio(baseData);

    /** href of the <a rel="prev|next"> link, independent of attribute order. */
    const relHref = (html: string, rel: "prev" | "next"): string | null => {
      const tag = html.match(new RegExp(`<a[^>]*\\brel="${rel}"[^>]*>`))?.[0];
      return tag?.match(/href="([^"]*)"/)?.[1] ?? null;
    };

    const first = render(await PublicProjectPage(projectParams("foliocraft-platform")));
    assert.equal(relHref(first, "prev"), null);
    assert.doesNotMatch(first, /data-testid="project-previous"/);
    assert.equal(relHref(first, "next"), "/u/janedoe/projects/second-project");

    const middle = render(await PublicProjectPage(projectParams("second-project")));
    assert.equal(relHref(middle, "prev"), "/u/janedoe/projects/foliocraft-platform");
    assert.equal(relHref(middle, "next"), "/u/janedoe/projects/third-project");

    const last = render(await PublicProjectPage(projectParams("third-project")));
    assert.equal(relHref(last, "prev"), "/u/janedoe/projects/second-project");
    assert.equal(relHref(last, "next"), null);
    assert.doesNotMatch(last, /data-testid="project-next"/);
  });

  await t.test("duplicate project titles resolve to distinct detail pages", async () => {
    servePortfolio({
      ...baseData,
      projects: [
        makeProject({ id: "a", title: "Chat App", orderIndex: 0, description: "First chat" }),
        makeProject({ id: "b", title: "Chat App", orderIndex: 1, description: "Second chat" }),
      ],
    });
    assert.match(render(await PublicProjectPage(projectParams("chat-app"))), /First chat/);
    assert.match(render(await PublicProjectPage(projectParams("chat-app-2"))), /Second chat/);
  });

  await t.test("unknown project slugs trigger the 404 boundary (page and metadata)", async () => {
    servePortfolio(baseData);
    for (const slug of ["does-not-exist", "foliocraft-platform-2", "%E0%A4%A"]) {
      await assert.rejects(PublicProjectPage(projectParams(slug)), isNextNotFound, slug);
      await assert.rejects(projectMetadata(projectParams(slug)), isNextNotFound, slug);
    }
  });

  await t.test("unpublished or missing portfolios 404 on every project route", async () => {
    globalThis.fetch = async () => jsonResponse({ message: "Portfolio not found" }, 404);
    await assert.rejects(
      PublicProjectsPage({ params: Promise.resolve({ username: "draft_user" }) }),
      isNextNotFound
    );
    await assert.rejects(
      projectsMetadata({ params: Promise.resolve({ username: "draft_user" }) }),
      isNextNotFound
    );
    await assert.rejects(PublicProjectPage(projectParams("anything", "draft_user")), isNextNotFound);
  });

  await t.test("invalid usernames and outages render the existing status screens", async () => {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error("ECONNREFUSED");
    };
    const invalid = await PublicProjectsPage({ params: Promise.resolve({ username: "a!" }) });
    assert.equal((invalid as React.ReactElement).type, InvalidUsername);
    assert.equal(called, false);

    const down = await PublicProjectPage(projectParams("x", "someone"));
    assert.equal((down as React.ReactElement).type, ServiceUnavailable);
  });

  await t.test("project metadata uses project title, summary, image and canonical URL", async () => {
    servePortfolio({
      ...baseData,
      projects: [
        makeProject({
          id: "m",
          title: "Metrics",
          description: "x".repeat(300),
          imageUrl: "https://example.com/m.png",
        }),
      ],
    });
    const meta = await projectMetadata(projectParams("METRICS"));
    assert.equal(meta.title, "Metrics — Jane Doe | FolioCraft");
    assert.ok(String(meta.description).length <= 160);
    assert.equal(meta.alternates?.canonical, "/u/janedoe/projects/metrics");
    const og = meta.openGraph as Record<string, unknown>;
    assert.deepEqual(og.images, [{ url: "https://example.com/m.png", alt: "Metrics" }]);

    const listMeta = await projectsMetadata({ params: Promise.resolve({ username: "janedoe" }) });
    assert.equal(listMeta.title, "Projects — Jane Doe | FolioCraft");
    assert.equal(listMeta.alternates?.canonical, "/u/janedoe/projects");
  });

  await t.test("ProjectNotFound renders branded 404 with optional projects link", () => {
    const withLink = render(React.createElement(ProjectNotFound, { projectsHref: "/u/janedoe/projects" }));
    assert.match(withLink, /data-testid="project-not-found"/);
    assert.match(withLink, /href="\/u\/janedoe\/projects"/);
    assert.match(withLink, /portfolio is not currently published/);

    const withoutLink = render(React.createElement(ProjectNotFound, {}));
    assert.doesNotMatch(withoutLink, /View all projects/);
  });
});

// ---------------------------------------------------------------------------
// Stage 4 — About and Experience pages, privacy and responsive guarantees
// ---------------------------------------------------------------------------

const userParams = (username = "janedoe") => ({ params: Promise.resolve({ username }) });

test("Phase 12: about and experience pages", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const richData: PortfolioViewData = {
    ...baseData,
    phone: "+94 77 000 0000",
    profileImageUrl: "https://example.com/me.png",
    socialLinks: { github: "https://github.com/jane", linkedin: "linkedin.com/in/jane", evil: "javascript:alert(1)" },
    skills: [
      { id: "s1", portfolioId: "port-1", name: "TypeScript", category: "Languages", orderIndex: 0, createdAt: "", updatedAt: "" },
      { id: "s2", portfolioId: "port-1", name: "Docker", category: "Tools", orderIndex: 0, createdAt: "", updatedAt: "" },
    ],
    experiences: [
      makeExperience({ id: "old", position: "Junior Dev", company: "Startup", startDate: "2019-02-01", endDate: "2021-06-01", description: "Built APIs.\nShipped features." }),
      makeExperience({ id: "cur", position: "Senior Engineer", company: "BigCo", startDate: "2023-03-01", isCurrent: true }),
    ],
  };

  for (const id of TEMPLATE_IDS) {
    await t.test(`${id}: about page renders introduction, skills and contact`, async () => {
      servePortfolio({ ...richData, template: id });
      const html = render(await PublicAboutPage(userParams()));
      assert.match(html, new RegExp(`data-template="${id}"`));
      assert.match(html, /data-testid="about-page"/);
      assert.match(html, /<h1[^>]*>Jane Doe<\/h1>/);
      assert.match(html, /Software Engineer/);
      assert.match(html, /I build reliable web platforms\./);
      assert.match(html, /data-testid="about-skills"/);
      assert.match(html, />Languages</);
      assert.match(html, />Docker</);
      assert.match(html, /href="mailto:jane@example.com"/);
      assert.match(html, /href="tel:\+94 77 000 0000"/);
      assert.match(html, /href="https:\/\/linkedin.com\/in\/jane"/);
      assert.match(html, />LinkedIn</);
      assert.match(html, /alt="Jane Doe&#x27;s profile photo"/);
      assert.deepEqual(activeLabels(html), ["About", "About"]);
    });
  }

  await t.test("about page drops unsafe social links", async () => {
    servePortfolio(richData);
    const html = render(await PublicAboutPage(userParams()));
    assert.doesNotMatch(html, /javascript:/);
    assert.doesNotMatch(html, />Evil</);
  });

  await t.test("about page handles a sparse profile gracefully", async () => {
    servePortfolio({
      ...baseData,
      about: null,
      email: null,
      phone: null,
      location: null,
      socialLinks: {},
      skills: [],
      projects: [],
      experiences: [],
    });
    const html = render(await PublicAboutPage(userParams()));
    assert.match(html, /data-testid="about-empty"/);
    assert.match(html, /hasn&#x27;t written an introduction yet/);
    assert.match(html, /Contact details have not been shared\./);
    assert.doesNotMatch(html, /data-testid="about-skills"/);
    assert.doesNotMatch(html, /View projects/);
  });

  for (const id of TEMPLATE_IDS) {
    await t.test(`${id}: experience page renders a sorted timeline`, async () => {
      servePortfolio({ ...richData, template: id });
      const html = render(await PublicExperiencePage(userParams()));
      assert.match(html, new RegExp(`data-template="${id}"`));
      assert.equal((html.match(/data-testid="experience-item"/g) || []).length, 2);
      assert.ok(html.indexOf("Senior Engineer") < html.indexOf("Junior Dev"), "current role first");
      assert.match(html, /Mar 2023 — Present/);
      assert.match(html, /Feb 2019 — Jun 2021/);
      assert.match(html, />Current</);
      assert.match(html, /Built APIs\.\nShipped features\./);
      assert.match(html, /2 roles across Jane Doe&#x27;s career\./);
      assert.deepEqual(activeLabels(html), ["Experience", "Experience"]);
    });
  }

  await t.test("experience page shows an empty state and never renders Education", async () => {
    servePortfolio({ ...baseData, experiences: [] });
    const html = render(await PublicExperiencePage(userParams()));
    assert.match(html, /data-testid="experience-empty"/);
    assert.match(html, /No experience listed yet/);
    assert.doesNotMatch(html, /Education/);
  });

  await t.test("unpublished portfolios 404 on about and experience (page and metadata)", async () => {
    globalThis.fetch = async () => jsonResponse({ message: "Portfolio not found" }, 404);
    await assert.rejects(PublicAboutPage(userParams("draft_user")), isNextNotFound);
    await assert.rejects(aboutMetadata(userParams("draft_user")), isNextNotFound);
    await assert.rejects(PublicExperiencePage(userParams("draft_user")), isNextNotFound);
    await assert.rejects(experienceMetadata(userParams("draft_user")), isNextNotFound);
  });

  await t.test("invalid usernames and outages render status screens on about/experience", async () => {
    globalThis.fetch = async () => jsonResponse({ message: "boom" }, 503);
    assert.equal(((await PublicAboutPage(userParams("bad name"))) as React.ReactElement).type, InvalidUsername);
    assert.equal(((await PublicExperiencePage(userParams("someone"))) as React.ReactElement).type, ServiceUnavailable);
    const meta = await aboutMetadata(userParams("someone"));
    assert.equal(meta.title, "Portfolio Not Found | FolioCraft");
    assert.deepEqual(meta.robots, { index: false, follow: false }, "outage pages are noindex");

    const invalidMeta = await aboutMetadata(userParams("ab"));
    assert.deepEqual(invalidMeta.robots, { index: false, follow: false }, "invalid-username pages are noindex");
  });

  await t.test("about and experience metadata carry titles and canonical URLs", async () => {
    servePortfolio(richData);
    const about = await aboutMetadata(userParams("JaneDoe"));
    assert.equal(about.title, "About Jane Doe | FolioCraft");
    assert.equal(about.alternates?.canonical, "/u/janedoe/about");
    const exp = await experienceMetadata(userParams());
    assert.equal(exp.title, "Experience — Jane Doe | FolioCraft");
    assert.equal(exp.alternates?.canonical, "/u/janedoe/experience");
  });

  await t.test("public pages never expose internal identifiers", async () => {
    servePortfolio({ ...richData, projects: threeProjects });
    const pages = [
      await PublicPortfolioPage(userParams()),
      await PublicAboutPage(userParams()),
      await PublicExperiencePage(userParams()),
      await PublicProjectsPage(userParams()),
      await PublicProjectPage(projectParams("second-project")),
    ];
    for (const page of pages) {
      const html = render(page as React.ReactElement);
      assert.doesNotMatch(html, /port-1/, "portfolioId must not be rendered");
      assert.doesNotMatch(html, /userId|password/i);
    }
  });

  await t.test("responsive guards: overflow clipping, shrinkable columns and wrapping titles", async () => {
    for (const id of TEMPLATE_IDS) {
      assert.match(getSiteTheme(id).root, /overflow-x-hidden/, `${id} root clips horizontal overflow`);
      assert.match(getSiteTheme(id).pageTitle, /break-words/, `${id} long titles wrap`);
      assert.match(getSiteTheme(id).container, /px-4 sm:px-6/, `${id} has mobile gutters`);
    }
    servePortfolio({
      ...richData,
      projects: [makeProject({ id: "long", title: "A".repeat(120), description: "B".repeat(500) })],
    });
    const detail = render(await PublicProjectPage(projectParams("a".repeat(80))));
    assert.match(detail, /data-testid="project-detail"[^>]*class="min-w-0"/);
    const listing = render(await PublicProjectsPage(userParams()));
    assert.match(listing, /data-testid="project-card"[^>]*class="[^"]*min-w-0/);
    assert.match(listing, /grid grid-cols-1/, "single column on mobile");
  });
});
