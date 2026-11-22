/* Phase 13: Advanced Template Collection — template contract, multi-page and registry suite. */
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import type { Project } from "@/types/project";
import type { Experience } from "@/types/experience";
import type { Skill } from "@/types/skill";
import type { PortfolioViewData } from "./types";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_LIST,
  TEMPLATE_REGISTRY,
  getTemplateDefinition,
  getTemplateCategoryLabel,
} from "./registry";
import { TemplateRenderer } from "./TemplateRenderer";
import { SiteNav } from "./site/SiteNav";
import { SITE_THEMES, getSiteTheme, type SiteTheme } from "./site/siteThemes";
import {
  createProjectHrefResolver,
  formatTenure,
  getInitials,
  getPortfolioStats,
  getSafeSocialLinks,
  groupProjectsByTechnology,
} from "./site/siteModel";
import PublicPortfolioPage from "@/app/u/[username]/page";
import PublicAboutPage from "@/app/u/[username]/about/page";
import PublicExperiencePage from "@/app/u/[username]/experience/page";
import PublicProjectsPage from "@/app/u/[username]/projects/page";
import PublicProjectPage from "@/app/u/[username]/projects/[projectSlug]/page";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const stamp = { portfolioId: "port-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

function project(overrides: Partial<Project> & { id: string; title: string }): Project {
  return {
    ...stamp,
    description: null,
    technologies: [],
    githubUrl: null,
    projectUrl: null,
    imageUrl: null,
    orderIndex: 0,
    ...overrides,
  };
}

function experience(overrides: Partial<Experience> & { id: string }): Experience {
  return {
    ...stamp,
    company: "Acme",
    position: "Engineer",
    description: null,
    startDate: "2022-01-01",
    endDate: null,
    isCurrent: false,
    ...overrides,
  };
}

function skill(id: string, name: string, category: string | null, orderIndex = 0): Skill {
  return { ...stamp, id, name, category, orderIndex } as Skill;
}

const fullData: PortfolioViewData = {
  name: "Jane Doe",
  title: "Principal Software Engineer",
  about: "I build reliable web platforms for teams that care about craft.",
  email: "jane@example.com",
  phone: "+94 77 123 4567",
  location: "Colombo, Sri Lanka",
  profileImageUrl: "https://example.com/me.png",
  socialLinks: { github: "https://github.com/jane", linkedin: "linkedin.com/in/jane", twitter: "javascript:alert(1)" },
  username: "janedoe",
  projects: [
    project({ id: "p2", title: "Second Project", orderIndex: 1, technologies: ["Go"] }),
    project({
      id: "p1",
      title: "FolioCraft Platform",
      orderIndex: 0,
      description: "CV-to-portfolio builder",
      technologies: ["Next.js", "TypeScript"],
      githubUrl: "https://github.com/example/foliocraft",
      projectUrl: "foliocraft.dev",
      imageUrl: "https://example.com/shot.png",
    }),
    project({ id: "p3", title: "Third Project", orderIndex: 2, githubUrl: "javascript:alert(2)" }),
  ],
  skills: [skill("s1", "React", "Frontend"), skill("s2", "PostgreSQL", "Backend"), skill("s3", "Leadership", null)],
  experiences: [
    experience({ id: "e1", company: "Acme Corp", position: "Staff Engineer", startDate: "2023-03-01", isCurrent: true, description: "Led the platform team." }),
    experience({ id: "e2", company: "Beta Labs", position: "Engineer", startDate: "2019-06-01", endDate: "2023-02-01" }),
  ],
  template: "modern",
};

const emptyData: PortfolioViewData = {
  name: "",
  title: "",
  about: null,
  email: null,
  phone: null,
  location: null,
  profileImageUrl: null,
  socialLinks: {},
  username: "emptyuser",
  projects: [],
  skills: [],
  experiences: [],
  template: "modern",
};

const ORIGINAL_IDS = ["modern", "minimal", "professional"];
const PHASE13_IDS = TEMPLATE_LIST.map((t) => t.meta.id).filter((id) => !ORIGINAL_IDS.includes(id));

const render = (el: React.ReactElement) => renderToStaticMarkup(el);
const count = (html: string, re: RegExp) => (html.match(re) || []).length;
const activeLabels = (html: string) =>
  [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g)].map((m) => m[1]);
const hrefs = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

function servePortfolio(data: PortfolioViewData): void {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: true, portfolio: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

function renderHome(id: string, data: PortfolioViewData) {
  const d = { ...data, template: id };
  return render(
    React.createElement(TemplateRenderer, {
      templateId: id,
      data: d,
      siteNav: React.createElement(SiteNav, { data: d, username: d.username, current: "home" }),
      getProjectHref: createProjectHrefResolver(d.username, d.projects),
    })
  );
}

// ---------------------------------------------------------------------------
// Registry & categories
// ---------------------------------------------------------------------------

test("Phase 13: registry and categories", async (t) => {
  await t.test("the original three templates are still registered first and unchanged in order", () => {
    assert.deepEqual(TEMPLATE_LIST.slice(0, 3).map((x) => x.meta.id), ORIGINAL_IDS);
    assert.equal(TEMPLATE_REGISTRY.modern.meta.name, "Modern Developer");
    assert.equal(TEMPLATE_REGISTRY.minimal.meta.name, "Minimal Editorial");
    assert.equal(TEMPLATE_REGISTRY.professional.meta.name, "Classic Executive");
  });

  await t.test("every registry entry is listed exactly once and keyed by its own id", () => {
    const ids = TEMPLATE_LIST.map((x) => x.meta.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual([...ids].sort(), Object.keys(TEMPLATE_REGISTRY).sort());
    for (const [key, def] of Object.entries(TEMPLATE_REGISTRY)) assert.equal(def.meta.id, key);
  });

  await t.test("names and descriptions are unique so templates are distinguishable", () => {
    const names = TEMPLATE_LIST.map((x) => x.meta.name.toLowerCase());
    const descriptions = TEMPLATE_LIST.map((x) => x.meta.description.toLowerCase());
    assert.equal(new Set(names).size, names.length);
    assert.equal(new Set(descriptions).size, descriptions.length);
  });

  await t.test("every template has a known category and every category is used", () => {
    const known = new Set(TEMPLATE_CATEGORIES.map((c) => c.id));
    for (const { meta } of TEMPLATE_LIST) assert.ok(known.has(meta.category), `${meta.id} category`);
    for (const category of TEMPLATE_CATEGORIES) {
      assert.ok(
        TEMPLATE_LIST.some((x) => x.meta.category === category.id),
        `category ${category.id} has at least one template`
      );
    }
    assert.equal(getTemplateCategoryLabel("academic"), "Academic");
  });

  await t.test("lookups normalise case/whitespace and unknown ids still fall back to modern", () => {
    for (const id of PHASE13_IDS) {
      assert.equal(getTemplateDefinition(`  ${id.toUpperCase()} `).meta.id, id);
    }
    assert.equal(getTemplateDefinition("cyberpunk_neon").meta.id, "modern");
    assert.equal(getTemplateDefinition(undefined).meta.id, "modern");
  });
});

// ---------------------------------------------------------------------------
// Template contract — runs for every registered template
// ---------------------------------------------------------------------------

test("Phase 13: template rendering contract (all templates)", async (t) => {
  for (const { meta } of TEMPLATE_LIST) {
    const id = meta.id;

    await t.test(`${id}: live preview renders all portfolio content with its own navigation`, () => {
      const html = render(React.createElement(TemplateRenderer, { templateId: id, data: { ...fullData, template: id } }));
      assert.match(html, new RegExp(`data-testid="template-${id}"`));
      for (const text of ["Jane Doe", "Principal Software Engineer", "FolioCraft Platform", "Second Project", "Third Project", "Staff Engineer", "React", "PostgreSQL"]) {
        assert.ok(html.includes(text), `${id} renders "${text}"`);
      }
      assert.match(html, /href="mailto:jane@example.com"/);
      assert.equal(count(html, /<h1[\s>]/g), 1, "exactly one h1");
      assert.doesNotMatch(html, /portfolio-site-nav/, "no site nav in live preview");
      assert.doesNotMatch(html, /href="\/u\//, "no public links in live preview");
    });

    await t.test(`${id}: public mode uses the site nav once and links projects to detail pages`, () => {
      const html = renderHome(id, fullData);
      assert.match(html, /data-testid="portfolio-site-nav"/);
      assert.equal(count(html, /<nav/g), 1, "exactly one navigation bar");
      for (const slug of ["foliocraft-platform", "second-project", "third-project"]) {
        assert.ok(html.includes(`href="/u/janedoe/projects/${slug}"`), `${id} links ${slug}`);
      }
    });

    await t.test(`${id}: unsafe URLs are never rendered as links`, () => {
      for (const html of [
        render(React.createElement(TemplateRenderer, { templateId: id, data: { ...fullData, template: id } })),
        renderHome(id, fullData),
      ]) {
        assert.ok(!hrefs(html).some((h) => /^\s*(javascript|data):/i.test(h)), `${id} has no unsafe hrefs`);
        // Phase 13 templates drop unsafe URLs entirely. (The original three keep
        // their pre-existing behaviour of prefixing https://, which is inert.)
        if (PHASE13_IDS.includes(id)) {
          assert.ok(!html.includes("alert("), `${id} does not render unsafe URLs at all`);
        }
      }
    });

    await t.test(`${id}: empty portfolio renders safely without placeholder leaks`, () => {
      for (const html of [
        render(React.createElement(TemplateRenderer, { templateId: id, data: { ...emptyData, template: id } })),
        renderHome(id, emptyData),
      ]) {
        assert.match(html, new RegExp(`data-testid="template-${id}"`));
        assert.equal(count(html, /<h1[\s>]/g), 1);
        assert.doesNotMatch(html, />[^<]*\b(undefined|null|NaN)\b[^<]*</);
      }
    });

    await t.test(`${id}: never renders an Education section (not stored by the platform)`, () => {
      const html = renderHome(id, fullData);
      assert.doesNotMatch(html, />\s*Education\s*</);
      assert.doesNotMatch(html, /Publications/);
    });
  }
});

// ---------------------------------------------------------------------------
// Phase 13 specifics: no nested landmarks, distinct identities
// ---------------------------------------------------------------------------

test("Phase 13: new template structure and identity", async (t) => {
  await t.test("new templates do not nest a <main> inside the public page's <main>", () => {
    for (const id of PHASE13_IDS) {
      assert.equal(count(renderHome(id, fullData), /<main[\s>]/g), 0, `${id} home body`);
      const preview = render(React.createElement(TemplateRenderer, { templateId: id, data: { ...fullData, template: id } }));
      assert.equal(count(preview, /<main[\s>]/g), 1, `${id} preview keeps one main landmark`);
    }
  });

  await t.test("each new template has its own page background and typeface signature", () => {
    const signature = (id: string) => {
      const html = render(React.createElement(TemplateRenderer, { templateId: id, data: { ...fullData, template: id } }));
      const root = html.match(new RegExp(`data-testid="template-${id}" class="([^"]*)"`))?.[1] || "";
      return root.split(/\s+/).filter((c) => /^(bg-|font-)/.test(c)).sort().join(" ");
    };
    const signatures = TEMPLATE_LIST.map((x) => signature(x.meta.id));
    assert.equal(new Set(signatures).size, signatures.length, `root signatures must differ: ${signatures.join(" | ")}`);
  });

  const structuralMarkers: Record<string, RegExp[]> = {
    editorial: [/data-testid="editorial-work-item"/, /first-letter:/, /Correspondence/],
    executive: [/data-testid="executive-sidebar"/, /Core Competencies/, /data-testid="executive-figures"/, /Career History/],
    academic: [/data-testid="academic-contact-line"/, /\[1\]/, /\[code\]/, /Selected Work/],
    bento: [/data-testid="bento-grid"/, /data-testid="bento-tile-stats"/, /data-testid="bento-tile-featured"/, /data-testid="bento-tile-now"/],
    studio: [/data-testid="studio-showcase"/, /data-testid="studio-marquee"/, /animate-marquee/, /motion-reduce:animate-none/],
    showcase: [/data-testid="showcase-spotlight"/, /data-testid="showcase-repo-card"/, /data-testid="showcase-tech-index"/, /README\.md/],
  };

  for (const [id, markers] of Object.entries(structuralMarkers)) {
    await t.test(`${id}: renders its signature layout elements`, () => {
      if (!(id in TEMPLATE_REGISTRY)) return;
      const html = render(React.createElement(TemplateRenderer, { templateId: id, data: { ...fullData, template: id } }));
      for (const marker of markers) assert.match(html, marker, `${id} marker ${marker}`);
      for (const [otherId, otherMarkers] of Object.entries(structuralMarkers)) {
        if (otherId === id) continue;
        assert.doesNotMatch(html, otherMarkers[0], `${id} must not reuse ${otherId}'s layout`);
      }
    });
  }

  await t.test("executive derives tenure from dates and academic numbers entries in display order", () => {
    const exec = render(React.createElement(TemplateRenderer, { templateId: "executive", data: { ...fullData, template: "executive" } }));
    assert.match(exec, /3 yrs 9 mos/, "Beta Labs 2019-06 → 2023-02 = 3 yrs 9 mos");
    const academic = render(React.createElement(TemplateRenderer, { templateId: "academic", data: { ...fullData, template: "academic" } }));
    const first = academic.indexOf("FolioCraft Platform");
    const second = academic.indexOf("Second Project");
    assert.ok(first > -1 && second > first, "orderIndex order");
  });
});

// ---------------------------------------------------------------------------
// Phase 12 multi-page routes for every template
// ---------------------------------------------------------------------------

test("Phase 13: every template across the Phase 12 public routes", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const params = { params: Promise.resolve({ username: "janedoe" }) };

  for (const { meta } of TEMPLATE_LIST) {
    const id = meta.id;
    const data = { ...fullData, template: id };

    await t.test(`${id}: home, about, projects, project detail and experience render in the template's theme`, async () => {
      servePortfolio(data);

      const home = render(await PublicPortfolioPage(params));
      assert.match(home, new RegExp(`data-testid="template-${id}"`));
      assert.deepEqual(activeLabels(home), ["Home", "Home"]);

      const theme = getSiteTheme(id);
      const pages: Array<[string, React.ReactElement, string]> = [
        ["about", await PublicAboutPage(params), "About"],
        ["projects", await PublicProjectsPage(params), "Projects"],
        ["experience", await PublicExperiencePage(params), "Experience"],
        [
          "project",
          await PublicProjectPage({ params: Promise.resolve({ username: "janedoe", projectSlug: "foliocraft-platform" }) }),
          "Projects",
        ],
      ];
      for (const [name, element, active] of pages) {
        const html = render(element);
        assert.match(html, new RegExp(`data-template="${id}"`), `${id} ${name} theme`);
        assert.ok(html.includes(theme.root), `${id} ${name} root classes`);
        assert.deepEqual(activeLabels(html), [active, active], `${id} ${name} active nav`);
        assert.equal(count(html, /<h1[\s>]/g), 1, `${id} ${name} one h1`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Secondary-page themes
// ---------------------------------------------------------------------------

test("Phase 13: SiteTheme tokens", async (t) => {
  const optionalEmpty = new Set<keyof SiteTheme>(["sideColumn", "projectGrid"]);

  await t.test("every registered template has a complete, self-identified theme", () => {
    for (const { meta } of TEMPLATE_LIST) {
      const theme = SITE_THEMES[meta.id];
      assert.ok(theme, `${meta.id} theme exists`);
      assert.equal(theme.id, meta.id);
      for (const [key, value] of Object.entries(theme)) {
        if (optionalEmpty.has(key as keyof SiteTheme)) continue;
        assert.ok(typeof value === "string" && value.trim().length > 0, `${meta.id}.${key} is set`);
      }
    }
  });

  await t.test("original themes keep their Phase 12 layout and brand behaviour", () => {
    assert.equal(SITE_THEMES.modern.brandStyle, "handle");
    assert.equal(SITE_THEMES.modern.brandIcon, "code");
    assert.equal(SITE_THEMES.professional.brandIcon, "briefcase");
    assert.equal(SITE_THEMES.minimal.brandIcon, "none");
    assert.equal(SITE_THEMES.minimal.mainColumn, "lg:col-span-3");
    assert.equal(SITE_THEMES.minimal.projectGrid, "");
    assert.equal(SITE_THEMES.modern.projectGrid, "md:grid-cols-2");
  });

  await t.test("SiteNav renders a monogram brand mark when the theme asks for one", () => {
    const theme = Object.values(SITE_THEMES).find((x) => x.brandIcon === "monogram");
    if (!theme) return;
    const html = render(React.createElement(SiteNav, { data: { ...fullData, template: theme.id }, username: "janedoe", current: "about" }));
    assert.match(html, />JD</);
  });

  await t.test("theme roots differ across all templates", () => {
    const roots = Object.values(SITE_THEMES).map((x) => x.root);
    assert.equal(new Set(roots).size, roots.length);
  });
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

test("Phase 13: shared site model helpers", async (t) => {
  await t.test("getInitials", () => {
    assert.equal(getInitials("Jane van Doe"), "JD");
    assert.equal(getInitials("  cher "), "C");
    assert.equal(getInitials(""), "P");
    assert.equal(getInitials(null), "P");
  });

  await t.test("formatTenure", () => {
    const now = new Date(2026, 10, 15); // Nov 2026
    assert.equal(formatTenure("2019-06-01", "2023-02-01", false, now), "3 yrs 9 mos");
    assert.equal(formatTenure("2026-01-01", null, true, now), "11 mos");
    assert.equal(formatTenure("2025-11-01", null, true, now), "1 yr 1 mo");
    assert.equal(formatTenure("2024-01-01", "2023-01-01", false, now), "", "negative range");
    assert.equal(formatTenure(null, null, false, now), "");
    assert.equal(formatTenure("2024-01-01", null, false, now), "", "no end date and not current");
  });

  await t.test("getPortfolioStats counts only existing data", () => {
    const stats = getPortfolioStats(fullData);
    assert.deepEqual(stats, { projects: 3, skills: 3, roles: 2, technologies: 3, since: 2019 });
    assert.deepEqual(getPortfolioStats(emptyData), { projects: 0, skills: 0, roles: 0, technologies: 0, since: null });
  });

  await t.test("getSafeSocialLinks drops unsafe URLs and labels platforms", () => {
    const links = getSafeSocialLinks(fullData.socialLinks);
    assert.deepEqual(
      links.map((l) => [l.label, l.href]),
      [
        ["GitHub", "https://github.com/jane"],
        ["LinkedIn", "https://linkedin.com/in/jane"],
      ]
    );
    assert.deepEqual(getSafeSocialLinks(undefined), []);
  });

  await t.test("groupProjectsByTechnology groups case-insensitively, most used first", () => {
    const groups = groupProjectsByTechnology([
      project({ id: "a", title: "A", orderIndex: 1, technologies: ["React", "Node"] }),
      project({ id: "b", title: "B", orderIndex: 0, technologies: ["react", "react", " "] }),
    ]);
    assert.deepEqual(
      groups.map(([tech, list]) => [tech, list.map((p) => p.id)]),
      [
        ["react", ["b", "a"]],
        ["Node", ["a"]],
      ]
    );
  });
});
