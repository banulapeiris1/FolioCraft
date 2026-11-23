import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import type { Project } from "@/types/project";
import type { PortfolioViewData } from "../types";
import {
  AUTO_PAGE_TRANSITION,
  NAV_BACK,
  NAV_FORWARD,
  getPageTransitionClasses,
} from "./motionConfig";
import { PageTransition, isViewTransitionSupported } from "./PageTransition";
import {
  HANDOFF_ATTR,
  SKELETON_ATTR,
  skeletonRemoved,
  startMotionRuntime,
  type MotionEnv,
} from "./revealRuntime";
import { SiteNav } from "../site/SiteNav";
import { ProjectsListView } from "../site/ProjectsListView";
import { ProjectDetailView } from "../site/ProjectDetailView";
import { ProjectTitleLink } from "../site/ProjectTitleLink";
import { getSiteTheme } from "../site/siteThemes";
import { buildProjectEntries, findProjectBySlug, getSiteNavItems, portfolioPaths } from "../site/siteModel";
import { TEMPLATE_LIST } from "../registry";
import PortfolioPageTemplate from "@/app/u/[username]/template";
import ProjectsTemplate from "@/app/u/[username]/projects/template";
import PublicPortfolioLoading from "@/app/u/[username]/loading";

// ---------------------------------------------------------------------------
// Fixtures and a shallow element-tree walker (renders function components,
// stops at <Link> so its props, including transitionTypes, can be inspected).
// ---------------------------------------------------------------------------

const STAMP = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const projects: Project[] = [0, 1, 2].map((i) => ({
  id: `p${i}`,
  portfolioId: "port-1",
  title: `Project ${i}`,
  description: "Description.",
  technologies: ["TypeScript"],
  githubUrl: null,
  projectUrl: null,
  imageUrl: i === 0 ? "https://example.com/p0.png" : null,
  orderIndex: i,
  ...STAMP,
}));

function data(template = "modern"): PortfolioViewData {
  return {
    name: "Jane Doe",
    title: "Engineer",
    about: "About.",
    email: "jane@example.com",
    phone: null,
    location: null,
    profileImageUrl: null,
    socialLinks: {},
    username: "janedoe",
    projects,
    skills: [],
    experiences: [],
    template,
  };
}

interface LinkProps {
  href: string;
  transitionTypes?: string[];
  "aria-current"?: string;
}

function collectLinks(node: React.ReactNode, out: LinkProps[] = []): LinkProps[] {
  if (Array.isArray(node)) {
    node.forEach((child) => collectLinks(child, out));
    return out;
  }
  if (!React.isValidElement(node)) return out;
  const el = node as React.ReactElement<Record<string, unknown>>;
  if (el.type === Link) {
    out.push(el.props as unknown as LinkProps);
    return out;
  }
  if (typeof el.type === "function") {
    return collectLinks((el.type as (p: unknown) => React.ReactNode)(el.props), out);
  }
  return collectLinks(el.props.children as React.ReactNode, out);
}

const css = fs.readFileSync(path.join(__dirname, "motion.css"), "utf8");
const NO_PREF = "(prefers-reduced-motion: no-preference)";

/** Contents of every `@media <query> { ... }` block (brace-balanced). */
function mediaBlock(source: string, query: string): string {
  let out = "";
  let from = 0;
  for (;;) {
    const start = source.indexOf(`@media ${query}`, from);
    if (start < 0) return out;
    let depth = 0;
    let i = source.indexOf("{", start);
    const open = i;
    for (; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}" && --depth === 0) break;
    }
    out += source.slice(open + 1, i) + "\n";
    from = i;
  }
}

// ---------------------------------------------------------------------------
// Page transitions
// ---------------------------------------------------------------------------

test("Phase 14 Stage 3: page transition configuration", async (t) => {
  await t.test("auto mode uses style-neutral classes; explicit modes are unchanged", () => {
    assert.deepEqual(getPageTransitionClasses(AUTO_PAGE_TRANSITION), {
      enter: { [NAV_FORWARD]: "fc-forward-auto", [NAV_BACK]: "fc-back-auto", default: "fc-page-auto" },
      exit: { [NAV_FORWARD]: "fc-forward-auto", [NAV_BACK]: "fc-back-auto", default: "fc-page-auto" },
    });
    assert.equal(getPageTransitionClasses("minimal"), null);
    assert.equal(getPageTransitionClasses("none"), null);
    assert.equal(getPageTransitionClasses("subtle")?.enter.default, "fc-page-subtle");
  });

  await t.test("fallback: without React ViewTransition, the wrapper adds nothing", () => {
    // Unit tests run on stable React (no ViewTransition) — the fallback path
    // older runtimes take. Navigation keeps working; it just doesn't animate.
    assert.equal(isViewTransitionSupported(), false);
    const page = React.createElement("main", { id: "page" }, "content");
    const expected = renderToStaticMarkup(page);
    assert.equal(renderToStaticMarkup(React.createElement(PageTransition, null, page)), expected);
  });

  await t.test("route templates wrap every page in an auto PageTransition and add no DOM", () => {
    for (const Template of [PortfolioPageTemplate, ProjectsTemplate]) {
      const page = React.createElement("main", { "data-testid": "page" }, "page");
      const el = Template({ children: page });
      assert.equal(el.type, PageTransition, `${Template.name} renders PageTransition`);
      assert.equal((el.props as { mode?: string }).mode, undefined, "mode defaults to auto");
      assert.equal(renderToStaticMarkup(el), renderToStaticMarkup(page), `${Template.name} adds no markup`);
    }
  });

  await t.test("route templates exist where navigation re-mounts content", () => {
    const appDir = path.join(__dirname, "..", "..", "app", "u", "[username]");
    for (const file of ["template.tsx", path.join("projects", "template.tsx")]) {
      const src = fs.readFileSync(path.join(appDir, file), "utf8");
      assert.ok(!/["']use client["']/.test(src), `${file} stays a Server Component`);
      assert.match(src, /<PageTransition>/);
    }
    // Pages themselves are untouched by Stage 3 (the home <main> contract holds).
    const home = fs.readFileSync(path.join(appDir, "page.tsx"), "utf8");
    assert.ok(!home.includes("PageTransition"));
  });
});

// ---------------------------------------------------------------------------
// Directional project navigation
// ---------------------------------------------------------------------------

test("Phase 14 Stage 3: project links carry directional transition types", async (t) => {
  const paths = portfolioPaths("janedoe");

  await t.test("projects list -> detail is a forward navigation", () => {
    const links = collectLinks(ProjectsListView({ data: data(), username: "janedoe" }));
    const toDetail = links.filter((l) => l.href.startsWith(`${paths.projects}/`));
    // Image link (project 0 only), title link and "View project" for each card.
    assert.equal(toDetail.length, projects.length * 2 + 1);
    for (const link of toDetail) assert.deepEqual(link.transitionTypes, [NAV_FORWARD], link.href);
  });

  await t.test("detail -> projects list is a backward navigation; prev/next follow their direction", () => {
    const entries = buildProjectEntries(projects);
    const location = findProjectBySlug(entries, entries[1].slug)!;
    const links = collectLinks(ProjectDetailView({ data: data(), username: "janedoe", location }));
    const back = links.find((l) => l.href === paths.projects);
    assert.deepEqual(back?.transitionTypes, [NAV_BACK], "All projects link slides back");
    assert.deepEqual(links.find((l) => l.href === paths.project(entries[0].slug))?.transitionTypes, [NAV_BACK]);
    assert.deepEqual(links.find((l) => l.href === paths.project(entries[2].slug))?.transitionTypes, [NAV_FORWARD]);
  });

  await t.test("home template project titles open details with a forward transition", () => {
    const el = ProjectTitleLink({ project: projects[0], getProjectHref: () => "/u/janedoe/projects/project-0" });
    assert.equal(el.type, Link);
    assert.deepEqual((el.props as LinkProps).transitionTypes, [NAV_FORWARD]);
    // Live preview (no resolver) still renders the plain title.
    assert.equal(renderToStaticMarkup(ProjectTitleLink({ project: projects[0] })), "Project 0");
  });

  await t.test("site navigation links use the default crossfade", () => {
    const links = collectLinks(SiteNav({ data: data(), username: "janedoe", current: "about" }));
    assert.ok(links.length >= 3);
    for (const link of links) assert.equal(link.transitionTypes, undefined, link.href);
  });
});

// ---------------------------------------------------------------------------
// Site navigation
// ---------------------------------------------------------------------------

test("Phase 14 Stage 3: SiteNav animation hooks", async (t) => {
  for (const { meta } of TEMPLATE_LIST) {
    await t.test(meta.id, () => {
      const theme = getSiteTheme(meta.id);
      const html = renderToStaticMarkup(
        React.createElement(SiteNav, { data: data(meta.id), username: "janedoe", current: "projects" })
      );
      assert.match(html, /<nav aria-label="Portfolio" data-testid="portfolio-site-nav" class="[^"]+" data-site-nav="">/);
      assert.ok(html.includes(`class="${theme.nav}"`), "nav keeps its theme classes");

      // Desktop links: hooks added, exactly one active (aria-current) link.
      const desktop = html.slice(html.indexOf('data-testid="portfolio-site-nav-desktop"'), html.indexOf("</ul>"));
      const links = desktop.match(/<a [^>]*>/g) ?? [];
      assert.equal(links.length, getSiteNavItems(data(meta.id), "janedoe", "projects").length);
      assert.ok(links.every((a) => a.includes('data-nav-link=""')), "every desktop link has the hook");
      assert.equal(links.filter((a) => a.includes('aria-current="page"')).length, 1);
      assert.ok(links.some((a) => a.includes(theme.navLinkActive)), "active styling unchanged");

      // Mobile menu: still a native <details>/<summary> disclosure.
      assert.match(html, /<details class="relative sm:hidden" data-testid="portfolio-site-nav-mobile" data-nav-menu="">/);
      assert.match(html, /<summary class="[^"]*" aria-label="Open portfolio menu">/);
      assert.ok(html.includes(`<ul class="${theme.mobilePanel}" data-nav-panel="">`));
      assert.ok(!/<details[^>]* open/.test(html), "menu starts closed");
    });
  }
});

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

test("Phase 14 Stage 3: loading skeleton", async (t) => {
  const el = PublicPortfolioLoading();
  const html = renderToStaticMarkup(el);

  await t.test("keeps its accessible status root and dark layout", () => {
    assert.equal(el.props.role, "status");
    assert.equal(el.props["data-testid"], "public-portfolio-loading");
    assert.match(
      html,
      /^<div role="status" aria-label="Loading developer portfolio" data-testid="public-portfolio-loading" class="min-h-screen bg-slate-950 [^"]*" data-motion-skeleton="">/
    );
    assert.ok(html.includes('<span class="sr-only">Loading portfolio content...</span>'));
    assert.ok(html.includes("max-w-5xl mx-auto px-6 py-12 sm:py-20 lg:py-24 space-y-16"), "layout unchanged");
  });

  await t.test("one shared, preference-aware pulse instead of per-block pulsing", () => {
    assert.ok(!html.includes("animate-pulse"), "Tailwind's always-on pulse is gone");
    assert.equal((html.match(/data-skeleton-content=""/g) ?? []).length, 2, "nav row and main content");
  });

  await t.test("the skeleton root is marked for the content handoff", () => {
    assert.equal(el.props[SKELETON_ATTR], "");
  });
});

// ---------------------------------------------------------------------------
// Skeleton -> content handoff (motion runtime)
// ---------------------------------------------------------------------------

class FakeElement {
  nodeType = 1;
  attrs = new Map<string, string>();
  children: FakeElement[] = [];
  isConnected = true;
  constructor(attrs: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(attrs)) this.attrs.set(k, v);
  }
  setAttribute(k: string, v: string) {
    this.attrs.set(k, v);
  }
  removeAttribute(k: string) {
    this.attrs.delete(k);
  }
  getAttribute(k: string) {
    return this.attrs.get(k) ?? null;
  }
  hasAttribute(k: string) {
    return this.attrs.has(k);
  }
  matches(selector: string) {
    return selector === `[${SKELETON_ATTR}]` && this.attrs.has(SKELETON_ATTR);
  }
  querySelector(selector: string): FakeElement | null {
    for (const child of this.children) if (child.matches(selector) || child.querySelector(selector)) return child;
    return null;
  }
  querySelectorAll() {
    return [] as FakeElement[];
  }
}

const removed = (...nodes: unknown[]) => [{ removedNodes: nodes as unknown as NodeList }];

test("Phase 14 Stage 3: skeleton handoff", async (t) => {
  await t.test("skeletonRemoved detects the skeleton root or a subtree containing it", () => {
    const skeleton = new FakeElement({ [SKELETON_ATTR]: "" });
    const wrapper = new FakeElement();
    wrapper.children.push(skeleton);
    assert.equal(skeletonRemoved(removed(skeleton)), true);
    assert.equal(skeletonRemoved(removed(wrapper)), true);
    assert.equal(skeletonRemoved(removed(new FakeElement(), { nodeType: 3 })), false);
    assert.equal(skeletonRemoved(), false, "no records (e.g. the initial sync) means no handoff");
  });

  await t.test("only a scope that replaces the skeleton is marked for the fade-in", () => {
    const scopes: FakeElement[] = [];
    let mutate: ((records: unknown[]) => void) | null = null;
    class MO {
      constructor(cb: (records: unknown[]) => void) {
        mutate = cb;
      }
      observe() {}
      disconnect() {}
    }
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const env = { IntersectionObserver: IO, MutationObserver: MO, viewportHeight: () => 800 } as unknown as MotionEnv;
    const doc = { body: {}, querySelectorAll: () => scopes.filter((s) => s.isConnected) };

    const first = new FakeElement({ "data-motion": "subtle" });
    scopes.push(first);
    const stop = startMotionRuntime(doc as never, env);
    assert.equal(first.hasAttribute(HANDOFF_ATTR), false, "initial page load: no handoff");

    // Ordinary navigation: a new scope, no skeleton involved.
    first.isConnected = false;
    const second = new FakeElement({ "data-motion": "subtle" });
    scopes.push(second);
    mutate!(removed(first));
    assert.equal(second.hasAttribute(HANDOFF_ATTR), false, "plain navigation: no handoff");

    // The page replaces the loading skeleton in a single commit.
    second.isConnected = false;
    const third = new FakeElement({ "data-motion": "subtle" });
    scopes.push(third);
    mutate!(removed(new FakeElement({ [SKELETON_ATTR]: "" })));
    assert.equal(third.hasAttribute(HANDOFF_ATTR), true, "skeleton replaced: the page fades in");
    stop();
  });

  await t.test("the handoff fade is gated by motion preference and style", () => {
    assert.match(
      mediaBlock(css, NO_PREF),
      /\[data-motion-handoff\]:not\(\[data-motion="none"\]\)\s*\{\s*animation:\s*fc-vt-fade-in/
    );
    assert.ok(!css.includes("fc-skeleton-out"), "no view-transition rule that React never triggers");
  });
});

// ---------------------------------------------------------------------------
// CSS contract
// ---------------------------------------------------------------------------

test("Phase 14 Stage 3: navigation and transition CSS", async (t) => {
  const noPref = mediaBlock(css, NO_PREF);
  const reduce = mediaBlock(css, "(prefers-reduced-motion: reduce)");

  await t.test("auto transitions animate like subtle and follow the page's style", () => {
    for (const cls of ["fc-page-auto", "fc-forward-auto", "fc-back-auto"]) {
      assert.ok(noPref.includes(`::view-transition-old(.${cls})`) && noPref.includes(`::view-transition-new(.${cls})`), cls);
    }
    assert.match(noPref, /:root:has\(\[data-motion="creative"\]\)::view-transition-new\(\.fc-forward-auto\)/);
    // Minimal / none: no page animation, whatever the transition classes.
    for (const part of ["group", "old", "new"]) {
      assert.ok(css.includes(`:root:has([data-motion="minimal"], [data-motion="none"])::view-transition-${part}(*)`), part);
    }
  });

  await t.test("reduced motion disables every page transition", () => {
    for (const part of ["group", "old", "new"]) assert.ok(reduce.includes(`::view-transition-${part}(*)`));
    assert.match(reduce, /animation:\s*none\s*!important/);
  });

  await t.test("the site nav is anchored and the active link slides", () => {
    assert.match(css, /\[data-site-nav\]\s*\{\s*view-transition-name:\s*fc-site-nav;/);
    assert.match(css, /\[data-nav-link\]\[aria-current="page"\]\s*\{\s*view-transition-name:\s*fc-nav-active;/);
    assert.match(css, /::view-transition-old\(fc-site-nav\)\s*\{\s*display:\s*none;/);
    assert.match(css, /::view-transition-new\(fc-site-nav\)\s*\{\s*animation:\s*none;/);
    assert.match(noPref, /::view-transition-group\(fc-nav-active\)/);
    assert.match(css, /::view-transition\s*\{\s*pointer-events:\s*none;/);
  });

  await t.test("nav interactions, mobile menu and scroll shadow only animate with motion allowed", () => {
    assert.match(noPref, /\[data-nav-menu\]\[open\] \[data-nav-panel\]\s*\{\s*animation:\s*fc-menu-in/);
    assert.match(noPref, /@supports selector\(::details-content\)/);
    assert.match(noPref, /\[data-motion-ready\]:not\(\[data-motion="none"\]\) \[data-nav-menu\]::details-content/);
    assert.match(noPref, /@supports \(animation-timeline: scroll\(\)\)/);
    assert.match(noPref, /\[data-site-nav\]::after\s*\{[^}]*animation-timeline:\s*scroll\(root block\)/);
    assert.match(noPref, /:not\(\[class\*="hover:border-"\]\)/, "themes with their own hover underline keep it");
    assert.equal(css.split("animation: fc-menu-in").length - 1, 1, "menu animation is declared once, under no-preference");
  });

  await t.test("skeleton motion is gated by the preference and visible in print", () => {
    assert.match(noPref, /\[data-skeleton-content\]\s*\{\s*animation:/);
    assert.match(mediaBlock(css, "print"), /\[data-skeleton-content\]/);
  });
});
