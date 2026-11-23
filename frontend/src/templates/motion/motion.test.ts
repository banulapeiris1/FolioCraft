process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ANIMATION_STYLES,
  DEFAULT_ANIMATION_STYLE,
  MAX_STAGGER_INDEX,
  MOTION_PRESETS,
  NAV_BACK,
  NAV_FORWARD,
  getMotionCssVars,
  getPageTransitionClasses,
  heroItemProps,
  isAnimationStyle,
  motionCardProps,
  motionMediaProps,
  normalizeAnimationStyle,
  resolveMotionMode,
  revealProps,
} from "./motionConfig";
import { MotionRoot, motionScopeProps } from "./MotionRoot";
import { PageTransition, isViewTransitionSupported } from "./PageTransition";
import {
  READY_ATTR,
  REVEALED_ATTR,
  REVEAL_OBSERVER_OPTIONS,
  acquireMotionRuntime,
  startMotion,
  startMotionRuntime,
  type MotionEnv,
} from "./revealRuntime";
import { AnimatedTemplateRenderer, TemplateRenderer } from "../TemplateRenderer";
import { TEMPLATE_LIST } from "../registry";
import { PortfolioSiteShell } from "../site/PortfolioSiteShell";
import type { PortfolioViewData } from "../types";
import PublicPortfolioPage from "@/app/u/[username]/page";
import PublicPortfolioLayout from "@/app/u/[username]/layout";

const now = new Date().toISOString();

const data: PortfolioViewData = {
  name: "Ada Lovelace",
  title: "Engineer",
  about: "Builds analytical engines.",
  email: "ada@example.com",
  username: "ada",
  socialLinks: { github: "https://github.com/ada" },
  projects: [
    {
      id: "p1",
      portfolioId: "pf",
      title: "Engine",
      description: "Difference engine.",
      technologies: ["TypeScript"],
      githubUrl: null,
      projectUrl: null,
      imageUrl: null,
      orderIndex: 0,
      createdAt: now,
      updatedAt: now,
    },
  ],
  skills: [{ id: "s1", portfolioId: "pf", name: "Math", category: "Core", orderIndex: 0, createdAt: now, updatedAt: now }],
  experiences: [
    {
      id: "e1",
      portfolioId: "pf",
      company: "Analytical Co",
      position: "Lead",
      description: null,
      startDate: "2020-01",
      endDate: null,
      isCurrent: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  template: "modern",
};

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

test("motionConfig: allowed styles and default", () => {
  assert.deepEqual([...ANIMATION_STYLES], ["subtle", "creative", "minimal"]);
  assert.equal(DEFAULT_ANIMATION_STYLE, "subtle");
  assert.equal(isAnimationStyle("creative"), true);
  assert.equal(isAnimationStyle("none"), false, "none is internal, never a stored style");
  assert.equal(isAnimationStyle("CREATIVE"), false);
  assert.equal(isAnimationStyle(undefined), false);
});

test("motionConfig: normalizeAnimationStyle falls back to subtle", () => {
  assert.equal(normalizeAnimationStyle(" Creative "), "creative");
  assert.equal(normalizeAnimationStyle("minimal"), "minimal");
  for (const bad of [undefined, null, "", "none", "wild", 42, {}]) {
    assert.equal(normalizeAnimationStyle(bad), "subtle", `fallback for ${String(bad)}`);
  }
});

test("motionConfig: resolveMotionMode applies overrides and template caps", () => {
  assert.equal(resolveMotionMode(undefined, "modern"), "subtle", "existing portfolios default to subtle");
  assert.equal(resolveMotionMode("creative", "studio"), "creative");
  assert.equal(resolveMotionMode("creative", "academic"), "subtle", "academic capped at subtle");
  assert.equal(resolveMotionMode("creative", "executive"), "subtle", "executive capped at subtle");
  assert.equal(resolveMotionMode("minimal", "executive"), "minimal", "caps never raise intensity");
  assert.equal(resolveMotionMode("creative", "studio", "none"), "none", "override none wins");
  assert.equal(resolveMotionMode("subtle", "modern", "minimal"), "minimal");
  assert.equal(resolveMotionMode("creative", "bogus"), "creative");
  assert.equal(resolveMotionMode("creative", null, "bogus"), "creative", "invalid override ignored");
});

test("motionConfig: presets scale in intensity and minimal/none never move", () => {
  const { none, minimal, subtle, creative } = MOTION_PRESETS;
  assert.ok(creative.revealDistancePx > subtle.revealDistancePx);
  assert.ok(subtle.revealDistancePx > minimal.revealDistancePx);
  assert.ok(creative.hoverLiftPx > subtle.hoverLiftPx);
  assert.ok(creative.imageZoom > subtle.imageZoom);
  for (const p of [none, minimal]) {
    assert.equal(p.revealDistancePx, 0);
    assert.equal(p.heroDistancePx, 0);
    assert.equal(p.hoverLiftPx, 0);
    assert.equal(p.imageZoom, 1);
    assert.equal(p.pageTransitions, false);
  }
  for (const p of Object.values(MOTION_PRESETS)) {
    assert.ok(p.heroDurationMs <= 450, "hero entrance stays short to protect LCP");
    assert.ok(p.heroFromOpacity > 0, "hero never starts fully invisible");
  }
});

test("motionConfig: CSS variables per mode", () => {
  assert.deepEqual(getMotionCssVars("none"), {});
  const vars = getMotionCssVars("subtle");
  assert.equal(vars["--motion-reveal-duration"], "560ms");
  assert.equal(vars["--motion-reveal-distance"], "16px");
  assert.equal(vars["--motion-hover-lift"], "3px");
  for (const value of Object.values(vars)) assert.equal(typeof value, "string");
  assert.equal(getMotionCssVars("minimal")["--motion-reveal-distance"], "0px");
});

test("motionConfig: attribute helpers are server-safe and clamp stagger", () => {
  assert.deepEqual(revealProps(), { "data-reveal": "" });
  assert.deepEqual(revealProps(0), { "data-reveal": "" });
  assert.deepEqual(revealProps(-3), { "data-reveal": "" });
  assert.deepEqual(revealProps(Number.NaN), { "data-reveal": "" });
  assert.deepEqual(revealProps(2), { "data-reveal": "", style: { "--reveal-i": 2 } });
  assert.deepEqual(revealProps(99), { "data-reveal": "", style: { "--reveal-i": MAX_STAGGER_INDEX } });
  assert.deepEqual(heroItemProps(1.7), { "data-hero-item": "", style: { "--hero-i": 1 } });
  assert.deepEqual(motionCardProps(), { "data-motion-card": "" });
  assert.deepEqual(motionMediaProps(), { "data-motion-media": "" });

  const html = render(React.createElement("section", revealProps(3), "x"));
  assert.equal(html, '<section data-reveal="" style="--reveal-i:3">x</section>');
});

test("motionConfig: page transition classes", () => {
  assert.equal(getPageTransitionClasses("none"), null);
  assert.equal(getPageTransitionClasses("minimal"), null);
  const subtle = getPageTransitionClasses("subtle");
  assert.deepEqual(subtle?.enter, {
    [NAV_FORWARD]: "fc-forward-subtle",
    [NAV_BACK]: "fc-back-subtle",
    default: "fc-page-subtle",
  });
  assert.deepEqual(subtle?.exit, subtle?.enter);
  assert.equal(getPageTransitionClasses("creative")?.enter.default, "fc-page-creative");
});

// ---------------------------------------------------------------------------
// Server rendering / integration
// ---------------------------------------------------------------------------

test("motionScopeProps: attributes only, never hiding styles", () => {
  const props = motionScopeProps(data);
  assert.equal(props["data-motion"], "subtle");
  const html = render(React.createElement("main", props, React.createElement("p", null, "hi")));
  assert.match(html, /^<main data-motion="subtle" style="--motion-ease:/);
  assert.doesNotMatch(html, new RegExp(READY_ATTR), "ready flag is client-only");
  assert.doesNotMatch(html, new RegExp(REVEALED_ATTR));
  // Custom property names (e.g. --motion-hero-from-opacity) are fine; real hiding styles are not.
  assert.doesNotMatch(html, /[;"]\s*(opacity|visibility)\s*:|display\s*:\s*none/i);

  assert.deepEqual(motionScopeProps(data, "studio", "none"), { "data-motion": "none" });
  assert.equal(motionScopeProps({ ...data, animationStyle: "creative" }, "academic")["data-motion"], "subtle");
  assert.equal(motionScopeProps({ ...data, template: "executive", animationStyle: "creative" })["data-motion"], "subtle");
  assert.equal(motionScopeProps(null)["data-motion"], "subtle");
});

test("MotionRoot: display-contents wrapper with deterministic output", () => {
  const html = render(React.createElement(MotionRoot, { data }, React.createElement("p", null, "hi")));
  assert.match(html, /^<div data-motion-wrapper="" data-motion="subtle" style="--motion-ease:[^"]+"><p>hi<\/p><\/div>$/);
  const none = render(React.createElement(MotionRoot, { data, animationStyle: "none" }, "x"));
  assert.equal(none, '<div data-motion-wrapper="" data-motion="none">x</div>');
  const el = () => React.createElement(MotionRoot, { data: { ...data, animationStyle: "creative" } }, "x");
  assert.equal(render(el()), render(el()), "hydration-safe");
});

test("TemplateRenderer: contract unchanged (returns the bare template element)", () => {
  const el = TemplateRenderer({ templateId: "modern", data });
  assert.equal(el.type, TEMPLATE_LIST[0].component);
  const html = render(React.createElement(TemplateRenderer, { templateId: "studio", data }));
  assert.doesNotMatch(html, /data-motion=/);
});

test("AnimatedTemplateRenderer: all nine templates render inside one motion scope", () => {
  assert.equal(TEMPLATE_LIST.length, 9);
  for (const { meta } of TEMPLATE_LIST) {
    const html = render(React.createElement(AnimatedTemplateRenderer, { templateId: meta.id, data: { ...data, template: meta.id } }));
    assert.equal((html.match(/data-motion="/g) || []).length, 1, `${meta.id}: single motion scope`);
    assert.match(html, /^<div data-motion-wrapper="" data-motion="subtle"/, `${meta.id}: default subtle`);
    assert.match(html, new RegExp(`data-testid="template-${meta.id}"`), `${meta.id}: template rendered`);
    assert.doesNotMatch(html, new RegExp(READY_ATTR));
  }
});

test("AnimatedTemplateRenderer: honours data.animationStyle, caps and override", () => {
  const creative = { ...data, animationStyle: "creative" };
  const studio = render(React.createElement(AnimatedTemplateRenderer, { templateId: "studio", data: creative }));
  assert.match(studio, /data-motion="creative"/);
  assert.match(studio, /--motion-reveal-distance:32px/);

  const academic = render(React.createElement(AnimatedTemplateRenderer, { templateId: "academic", data: creative }));
  assert.match(academic, /data-motion="subtle"/);

  const fallback = render(React.createElement(AnimatedTemplateRenderer, { templateId: "bogus", data: creative }));
  assert.match(fallback, /data-testid="template-modern"/);
  assert.match(fallback, /data-motion="creative"/);

  const thumb = render(React.createElement(AnimatedTemplateRenderer, { templateId: "studio", data: creative, animationStyle: "none" }));
  assert.match(thumb, /^<div data-motion-wrapper="" data-motion="none">/);
  assert.doesNotMatch(thumb, /--motion-/);

  const invalid = render(React.createElement(AnimatedTemplateRenderer, { templateId: "modern", data: { ...data, animationStyle: "wild" } }));
  assert.match(invalid, /data-motion="subtle"/);
});

test("PortfolioSiteShell: root element is the motion scope for every template", () => {
  for (const { meta } of TEMPLATE_LIST) {
    const html = render(
      React.createElement(
        PortfolioSiteShell,
        { data: { ...data, template: meta.id, animationStyle: "minimal" }, username: "ada", current: "about" },
        React.createElement("p", null, "content")
      )
    );
    assert.match(
      html,
      new RegExp(`^<div data-testid="portfolio-site" data-template="${meta.id}" data-page="about" class="[^"]+" data-motion="minimal" style="`),
      `${meta.id}: scope on the existing root, no extra element`
    );
    assert.match(html, /<main id="main-content"/);
  }
});

test("Public home page: <main> is the motion scope and still wraps TemplateRenderer directly", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: true, portfolio: { ...data, template: "studio", animationStyle: "creative" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    const page = await PublicPortfolioPage({ params: Promise.resolve({ username: "motionhome" }) });
    assert.equal((page.props as { children: React.ReactElement }).children.type, TemplateRenderer);
    const html = render(page);
    // Stage 1 pinned "subtle" here because public data did not carry
    // animationStyle yet. Stage 4 connects it: the saved style is rendered.
    assert.match(html, /^<main data-testid="public-portfolio-container" class="min-h-screen w-full" data-motion="creative" style="/);
    assert.match(html, /data-testid="template-studio"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Public layout: adds no markup, only the client runtime", () => {
  const html = render(React.createElement(PublicPortfolioLayout, null, React.createElement("main", null, "page")));
  assert.equal(html, "<main>page</main>");
});

test("PageTransition: falls back to plain children without ViewTransition", () => {
  // Unit tests run on stable React, which has no ViewTransition export.
  assert.equal(isViewTransitionSupported(), false);
  for (const mode of ["none", "minimal", "subtle", "creative"] as const) {
    const html = render(React.createElement(PageTransition, { mode }, React.createElement("main", null, "page")));
    assert.equal(html, "<main>page</main>", `${mode}: children rendered unchanged`);
  }
});

// ---------------------------------------------------------------------------
// Client runtime (fake DOM)
// ---------------------------------------------------------------------------

class FakeEl {
  attrs = new Map<string, string>();
  scope: FakeScope | null = null;
  isConnected = true;
  constructor(public top: number, public height = 100) {}
  getAttribute(n: string) {
    return this.attrs.get(n) ?? null;
  }
  setAttribute(n: string, v: string) {
    this.attrs.set(n, v);
  }
  removeAttribute(n: string) {
    this.attrs.delete(n);
  }
  closest() {
    return this.scope;
  }
  getBoundingClientRect() {
    return { top: this.top, bottom: this.top + this.height, height: this.height };
  }
}

class FakeScope extends FakeEl {
  items: FakeEl[] = [];
  constructor(mode = "subtle", items: FakeEl[] = []) {
    super(0);
    this.attrs.set("data-motion", mode);
    items.forEach((el) => this.add(el));
  }
  add(el: FakeEl) {
    el.scope = this;
    this.items.push(el);
  }
  querySelectorAll() {
    return this.items.filter((el) => !el.attrs.has(REVEALED_ATTR));
  }
}

function fakeEnv() {
  const state = {
    observed: new Set<FakeEl>(),
    callback: null as null | ((entries: Array<{ isIntersecting: boolean; target: FakeEl }>) => void),
    disconnected: false,
    mutate: null as null | (() => void),
    moOptions: null as unknown,
  };
  class IO {
    constructor(cb: never) {
      state.callback = cb;
    }
    observe(el: FakeEl) {
      state.observed.add(el);
    }
    unobserve(el: FakeEl) {
      state.observed.delete(el);
    }
    disconnect() {
      state.disconnected = true;
      state.observed.clear();
    }
  }
  class MO {
    constructor(cb: () => void) {
      state.mutate = cb;
    }
    observe(_target: unknown, options: unknown) {
      state.moOptions = options;
    }
    disconnect() {}
  }
  const env = { IntersectionObserver: IO, MutationObserver: MO, viewportHeight: () => 800 } as unknown as MotionEnv;
  return { env, state };
}

test("startMotion: on-screen content stays visible, off-screen content reveals on scroll", () => {
  const visible = new FakeEl(100);
  const below = new FakeEl(1500);
  const scope = new FakeScope("subtle", [visible, below]);
  const { env, state } = fakeEnv();

  const controller = startMotion(scope as unknown as HTMLElement, env);

  assert.equal(visible.getAttribute(REVEALED_ATTR), "static", "already-visible content never flickers");
  assert.equal(below.getAttribute(REVEALED_ATTR), null);
  assert.ok(state.observed.has(below) && !state.observed.has(visible));
  assert.equal(scope.getAttribute(READY_ATTR), "", "ready set after visible content is protected");

  state.callback!([{ isIntersecting: true, target: below }]);
  assert.equal(below.getAttribute(REVEALED_ATTR), "animate");
  assert.equal(state.observed.has(below), false, "reveal happens once");

  controller.stop();
  assert.equal(scope.getAttribute(READY_ATTR), null, "stop restores the no-hiding state");
  assert.equal(state.disconnected, true);
});

test("startMotion: observer has no negative inset (bottom-of-page content can always reveal)", () => {
  // Found in browser QA: with rootMargin "0px 0px -8% 0px" the last element on
  // a page, if shorter than 8% of the viewport, could never intersect.
  assert.deepEqual(REVEAL_OBSERVER_OPTIONS, { rootMargin: "0px", threshold: 0 });
});

test("startMotion: ignores elements owned by a nested scope", () => {
  const outer = new FakeScope("subtle");
  const inner = new FakeScope("none");
  const nested = new FakeEl(2000);
  inner.add(nested);
  outer.items.push(nested); // DOM descendant of outer, but closest scope is inner
  const { env, state } = fakeEnv();
  startMotion(outer as unknown as HTMLElement, env);
  assert.equal(state.observed.has(nested), false);
  assert.equal(nested.getAttribute(REVEALED_ATTR), null);
});

test("startMotion: without IntersectionObserver everything is revealed statically", () => {
  const items = [new FakeEl(100), new FakeEl(3000)];
  const scope = new FakeScope("subtle", items);
  startMotion(scope as unknown as HTMLElement, { viewportHeight: () => 800 });
  for (const el of items) assert.equal(el.getAttribute(REVEALED_ATTR), "static");
  assert.equal(scope.getAttribute(READY_ATTR), null, "never enters the hiding state");
});

test("startMotionRuntime: follows scopes across navigation, edits and mode changes", () => {
  const first = new FakeScope("subtle", [new FakeEl(1500)]);
  const scopes: FakeScope[] = [first];
  const doc = {
    body: {},
    querySelectorAll: () => scopes.filter((s) => s.isConnected && s.getAttribute("data-motion") !== "none"),
  };
  const { env, state } = fakeEnv();
  const stop = startMotionRuntime(doc as unknown as Document, env);

  assert.equal(first.getAttribute(READY_ATTR), "");
  assert.deepEqual(state.moOptions, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-motion"],
  });

  // Live edit: new content inside an existing scope is observed.
  const added = new FakeEl(2500);
  first.add(added);
  state.mutate!();
  assert.ok(state.observed.has(added));

  // Client navigation: old scope removed, new page scope started.
  first.isConnected = false;
  const second = new FakeScope("creative", [new FakeEl(1800)]);
  scopes.push(second);
  state.mutate!();
  assert.equal(first.getAttribute(READY_ATTR), null, "removed scope stopped");
  assert.equal(second.getAttribute(READY_ATTR), "", "new scope started");

  // Mode switched to none (e.g. preview): scope stops hiding content.
  second.setAttribute("data-motion", "none");
  state.mutate!();
  assert.equal(second.getAttribute(READY_ATTR), null);

  second.setAttribute("data-motion", "subtle");
  state.mutate!();
  assert.equal(second.getAttribute(READY_ATTR), "");

  stop();
  assert.equal(second.getAttribute(READY_ATTR), null, "cleanup restores every scope");
});

test("acquireMotionRuntime: safe without a document (server / tests)", () => {
  const release = acquireMotionRuntime();
  assert.equal(typeof release, "function");
  release();
  release(); // idempotent
});

// ---------------------------------------------------------------------------
// Stylesheet guarantees (reduced motion, no-JS, print)
// ---------------------------------------------------------------------------

const motionCss = fs.readFileSync(path.join(__dirname, "motion.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const globalsCss = fs
  .readFileSync(path.join(__dirname, "..", "..", "app", "globals.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/** Returns the bodies of every `@media <query>` block (brace-matched). */
function mediaBlocks(css: string, query: string): string[] {
  const blocks: string[] = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf(`@media ${query}`, from);
    if (at === -1) return blocks;
    const open = css.indexOf("{", at);
    let depth = 1;
    let i = open + 1;
    while (depth > 0 && i < css.length) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    blocks.push(css.slice(open + 1, i - 1));
    from = i;
  }
}

function stripMedia(css: string, query: string): string {
  let out = css;
  for (const body of mediaBlocks(css, query)) out = out.replace(body, "");
  return out;
}

const NO_PREF = "(prefers-reduced-motion: no-preference)";

test("motion.css: every animation and hidden state requires no-preference", () => {
  const outside = stripMedia(stripMedia(motionCss, NO_PREF), "print");
  // Outside the no-preference block only keyframes, the display:contents
  // wrapper rule and the reduced-motion kill switch may exist.
  const rulesOutsideKeyframes = outside.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  assert.doesNotMatch(rulesOutsideKeyframes, /opacity\s*:\s*0/, "nothing hidden outside no-preference");
  assert.doesNotMatch(rulesOutsideKeyframes, /animation\s*:(?!\s*none)/, "no animation outside no-preference");
  assert.doesNotMatch(rulesOutsideKeyframes, /(^|[\s;{])transition(-[a-z]+)?\s*:/, "no transitions outside no-preference");

  const inside = mediaBlocks(motionCss, NO_PREF).join("\n");
  assert.match(inside, /\[data-reveal\]:not\(\[data-revealed\]\)/);
});

test("motion.css: content is only hidden once the client runtime is ready", () => {
  const inside = mediaBlocks(motionCss, NO_PREF).join("\n");
  const rules = inside.split("}").filter((rule) => /opacity\s*:\s*0\b/.test(rule));
  assert.ok(rules.length > 0);
  for (const rule of rules) {
    assert.match(rule, /\[data-motion-ready\]/, `hidden state gated on JS: ${rule.trim()}`);
  }
});

test("motion.css: reduced motion disables page transitions", () => {
  const reduce = mediaBlocks(motionCss, "(prefers-reduced-motion: reduce)").join("\n");
  assert.match(reduce, /::view-transition-old\(\*\)/);
  assert.match(reduce, /::view-transition-new\(\*\)/);
  assert.match(reduce, /animation:\s*none\s*!important/);
});

test("motion.css: print shows every animated element", () => {
  const print = mediaBlocks(motionCss, "print").join("\n");
  for (const sel of ["[data-reveal]", "[data-hero-item]", "[data-motion-card]", "[data-motion-media]"]) {
    assert.ok(print.includes(sel), `${sel} covered in print`);
  }
  assert.match(print, /opacity:\s*1\s*!important/);
  assert.match(print, /transform:\s*none\s*!important/);
  assert.match(print, /animation:\s*none\s*!important/);
});

test("motion.css: only opacity/transform animate (no layout-affecting properties)", () => {
  const keyframes = motionCss.match(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) || [];
  assert.ok(keyframes.length >= 6);
  for (const kf of keyframes) {
    const props = [...kf.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    for (const prop of props) assert.ok(["opacity", "transform"].includes(prop), `${prop} in ${kf.split("{")[0]}`);
  }
  // Only the wrapper form is display:contents; scopes on existing elements keep their box.
  assert.match(motionCss, /\[data-motion-wrapper\]\s*\{\s*display:\s*contents;/);
  assert.doesNotMatch(motionCss, /\[data-motion\]\s*\{/);
});

test("globals.css: imports motion system and smooth scroll respects reduced motion", () => {
  assert.match(globalsCss, /@import "\.\.\/templates\/motion\/motion\.css";/);
  assert.ok(
    globalsCss.indexOf('@import "tailwindcss"') < globalsCss.indexOf("motion.css"),
    "imports stay at the top"
  );
  const outside = stripMedia(globalsCss, NO_PREF);
  assert.doesNotMatch(outside, /scroll-behavior\s*:\s*smooth/, "no unconditional smooth scroll");
  assert.match(mediaBlocks(globalsCss, NO_PREF).join("\n"), /scroll-behavior\s*:\s*smooth/);
});
