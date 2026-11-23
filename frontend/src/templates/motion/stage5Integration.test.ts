/**
 * Phase 14, Stage 5: final integration — browser Back / Forward direction,
 * full-page template preview motion and sticky-safe template roots.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ENTER_ATTR,
  NAV_DIRECTION_TTL_MS,
  isDirectionalPair,
  startHistoryDirection,
  traversalDirection,
  type HistoryDirectionEnv,
} from "./historyDirection";
import { startMotionRuntime, type MotionEnv } from "./revealRuntime";
import { TEMPLATE_LIST } from "../registry";
import { getSiteTheme } from "../site/siteThemes";
import { PortfolioSiteShell } from "../site/PortfolioSiteShell";
import type { PortfolioViewData } from "../types";

const data: PortfolioViewData = {
  name: "Ada Lovelace",
  title: "Engineer",
  username: "ada",
  projects: [],
  skills: [],
  experiences: [],
};

// ---------------------------------------------------------------------------
// Direction rules
// ---------------------------------------------------------------------------

test("isDirectionalPair: only projects list <-> detail and detail <-> detail", () => {
  assert.equal(isDirectionalPair("/u/ada/projects/engine", "/u/ada/projects"), true);
  assert.equal(isDirectionalPair("/u/ada/projects", "/u/ada/projects/engine"), true);
  assert.equal(isDirectionalPair("/u/ada/projects/a", "/u/ada/projects/b"), true);
  assert.equal(isDirectionalPair("/u/Ada/projects/a/", "/u/ada/projects"), true, "case / trailing slash tolerant");
  assert.equal(isDirectionalPair("/u/ada/about", "/u/ada"), false, "other pages keep the plain swap");
  assert.equal(isDirectionalPair("/u/ada/projects", "/u/ada/projects"), false);
  assert.equal(isDirectionalPair("/u/ada/projects/a", "/u/ada/projects/a"), false);
  assert.equal(isDirectionalPair("/u/ada/projects/a", "/u/bob/projects"), false, "different portfolio");
  assert.equal(isDirectionalPair("/u/ada/projects/a", "/u/ada/experience"), false);
  assert.equal(isDirectionalPair("/portfolio/edit/x", "/u/ada/projects"), false);
});

test("traversalDirection: index comparison with safe nulls", () => {
  assert.equal(traversalDirection(4, 3), "back");
  assert.equal(traversalDirection(3, 4), "forward");
  assert.equal(traversalDirection(2, 2), null);
  assert.equal(traversalDirection(undefined, 1), null);
  assert.equal(traversalDirection(2, -1), null);
});

// ---------------------------------------------------------------------------
// Tracker (fake Navigation API)
// ---------------------------------------------------------------------------

type HarnessOpts = { mode?: string; reduced?: boolean; navigation?: boolean; path?: string; index?: number };

function harness(opts: HarnessOpts = {}) {
  const listeners: Array<(e: never) => void> = [];
  const clicks: Array<(e: Event) => void> = [];
  let now = 1000;
  let currentPath = opts.path ?? "/u/ada/projects/engine";
  const navigation = {
    currentEntry: { index: opts.index ?? 5 },
    addEventListener: (_: string, l: (e: never) => void) => listeners.push(l),
    removeEventListener: (_: string, l: (e: never) => void) => listeners.splice(listeners.indexOf(l), 1),
  };
  const env: HistoryDirectionEnv = {
    navigation: opts.navigation === false ? undefined : (navigation as never),
    doc: {
      addEventListener: ((_: string, l: (e: Event) => void) => clicks.push(l)) as never,
      removeEventListener: ((_: string, l: (e: Event) => void) => clicks.splice(clicks.indexOf(l), 1)) as never,
      querySelector: (() => ({ getAttribute: () => opts.mode ?? "subtle" })) as never,
    },
    currentPath: () => currentPath,
    reducedMotion: () => opts.reduced === true,
    now: () => now,
  };
  const navigate = (url: string, index: number, navigationType = "traverse", sameDocument = true) =>
    listeners.forEach((l) => l({ navigationType, destination: { url: `http://x${url}`, index, sameDocument } } as never));
  const click = (insideLink: boolean) =>
    clicks.forEach((l) => l({ target: { closest: () => (insideLink ? {} : null) } } as unknown as Event));
  return {
    env,
    listeners,
    clicks,
    navigate,
    click,
    setPath: (p: string) => (currentPath = p),
    advance: (ms: number) => (now += ms),
  };
}

test("Back from a detail to the list -> 'back'; Forward -> 'forward'; single use", () => {
  const h = harness();
  const tracker = startHistoryDirection(h.env);
  h.navigate("/u/ada/projects", 4);
  h.navigate("/u/ada/projects", -1, "replace"); // Next.js replaceState during the traversal
  assert.equal(tracker.consume(), "back", "replace events do not cancel the direction");
  assert.equal(tracker.consume(), null, "consumed once");

  h.setPath("/u/ada/projects");
  h.navigate("/u/ada/projects/engine", 6);
  assert.equal(tracker.consume(), "forward");
  tracker.stop();
  assert.equal(h.listeners.length + h.clicks.length, 0, "stop removes listeners");
});

test("A pending direction expires, and is dropped by link clicks and new navigations", () => {
  const h = harness();
  const tracker = startHistoryDirection(h.env);
  h.navigate("/u/ada/projects", 4);
  h.advance(NAV_DIRECTION_TTL_MS + 1);
  assert.equal(tracker.consume(), null, "expired");

  h.navigate("/u/ada/projects", 4);
  h.click(false);
  h.click(true);
  assert.equal(tracker.consume(), null, "link click drops it (non-link clicks ignored)");

  h.navigate("/u/ada/projects", 4);
  h.navigate("/u/ada/about", 6, "push");
  assert.equal(tracker.consume(), null, "a push navigation drops it");
  tracker.stop();
});

test("No direction: other pages, push/reload, cross-document, minimal/none, reduced motion, unknown index", () => {
  const none = (label: string, opts: HarnessOpts, act: (h: ReturnType<typeof harness>) => void) => {
    const h = harness(opts);
    const tracker = startHistoryDirection(h.env);
    act(h);
    assert.equal(tracker.consume(), null, label);
    tracker.stop();
  };
  none("about -> home", { path: "/u/ada/about" }, (h) => h.navigate("/u/ada", 4));
  none("push navigation", {}, (h) => h.navigate("/u/ada/projects", 6, "push"));
  none("reload", {}, (h) => h.navigate("/u/ada/projects/engine", 5, "reload"));
  none("cross-document entry", {}, (h) => h.navigate("/u/ada/projects", 4, "traverse", false));
  none("minimal style", { mode: "minimal" }, (h) => h.navigate("/u/ada/projects", 4));
  none("gallery none", { mode: "none" }, (h) => h.navigate("/u/ada/projects", 4));
  none("reduced motion", { reduced: true }, (h) => h.navigate("/u/ada/projects", 4));
  none("unknown index", { index: -1 }, (h) => h.navigate("/u/ada/projects", 4));
});

test("Without the Navigation API the tracker is inert (plain swap fallback)", () => {
  const h = harness({ navigation: false });
  const tracker = startHistoryDirection(h.env);
  assert.equal(h.clicks.length, 0);
  assert.equal(tracker.consume(), null);
  tracker.stop();
});

// ---------------------------------------------------------------------------
// Runtime integration: the new page's scope receives the direction once
// ---------------------------------------------------------------------------

class FakeScope {
  attrs = new Map<string, string>();
  isConnected = true;
  constructor(mode: string) {
    this.attrs.set("data-motion", mode);
  }
  getAttribute(n: string) {
    return this.attrs.get(n) ?? null;
  }
  setAttribute(n: string, v: string) {
    this.attrs.set(n, v);
  }
  removeAttribute(n: string) {
    this.attrs.delete(n);
  }
  querySelectorAll() {
    return [];
  }
}

test("Runtime: only the page that appears after a traversal is marked, never the old or later pages", () => {
  const directions: Array<string | null> = [];
  let mutate: ((records: unknown[]) => void) | null = null;
  class MO {
    constructor(cb: never) {
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
  const oldPage = new FakeScope("creative");
  const scopes: FakeScope[] = [oldPage];
  const doc = { body: {}, querySelectorAll: () => scopes.filter((s) => s.isConnected) };
  const env = {
    IntersectionObserver: IO,
    MutationObserver: MO,
    viewportHeight: () => 800,
    consumeDirection: () => directions.shift() ?? null,
  } as unknown as MotionEnv;
  const stop = startMotionRuntime(doc as never, env);
  assert.equal(oldPage.getAttribute(ENTER_ATTR), null, "initial page is never marked");

  directions.push("back");
  oldPage.isConnected = false;
  const newPage = new FakeScope("creative");
  scopes.push(newPage);
  mutate!([]);
  assert.equal(newPage.getAttribute(ENTER_ATTR), "back", "incoming page slides in from the left");

  mutate!([]); // later edits inside the same page
  const later = new FakeScope("creative");
  scopes.push(later);
  mutate!([]);
  assert.equal(later.getAttribute(ENTER_ATTR), null, "direction is single-use");
  stop();
});

// ---------------------------------------------------------------------------
// CSS contract
// ---------------------------------------------------------------------------

const css = fs.readFileSync(path.join(__dirname, "motion.css"), "utf8");

function block(source: string, query: string): string {
  const start = source.indexOf(`@media ${query}`);
  let depth = 0;
  let i = source.indexOf("{", start);
  const open = i;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) break;
  }
  return source.slice(open + 1, i);
}

test("CSS: history entrance reuses the slide keyframes, motion-preference and style gated, print-safe", () => {
  const noPref = block(css, "(prefers-reduced-motion: no-preference)");
  assert.match(noPref, /\[data-motion-enter="back"\]:is\(\[data-motion="subtle"\], \[data-motion="creative"\]\) #main-content \{\s*animation: [^;]*backwards fc-vt-in-left;/);
  assert.match(noPref, /\[data-motion-enter="forward"\]:is\(\[data-motion="subtle"\], \[data-motion="creative"\]\) #main-content \{\s*animation: [^;]*backwards fc-vt-in-right;/);
  assert.match(noPref, /\[data-motion-enter\]\[data-motion="creative"\] #main-content \{\s*--fc-vt-distance: 40px;/);
  const outside = css.replace(noPref, "");
  assert.doesNotMatch(outside, /\[data-motion-enter[^\]]*\][^{]*\{[^}]*animation: \d/, "no entrance animation outside no-preference");
  assert.match(block(css, "print"), /\[data-motion-enter\] #main-content/);
  assert.equal((css.match(/@keyframes fc-vt-in-left/g) || []).length, 1, "no duplicated keyframes");
  assert.doesNotMatch(css, /data-fc-nav-direction/, "no dead history view-transition selectors");
});

// ---------------------------------------------------------------------------
// Full-page template preview & sticky-safe roots
// ---------------------------------------------------------------------------

test("Full-page template preview: animated renderer + shared runtime, never persists the style", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../app/portfolio/templates/[templateId]/page.tsx"), "utf8");
  assert.match(src, /<AnimatedTemplateRenderer\s+templateId=\{normalizedTemplateId\}\s+data=\{portfolioViewData\}\s*\/>/);
  assert.match(src, /<MotionRuntime \/>/);
  assert.match(src, /animationStyle: portfolioRes\.portfolio\.animationStyle/, "uses the saved style");
  const payload = src.slice(src.indexOf("const res = await updatePortfolio("), src.indexOf("setPortfolio(res.portfolio)"));
  assert.ok(payload.length > 0);
  assert.doesNotMatch(payload, /animationStyle/, "Use This Template never sends an animation style");
  assert.doesNotMatch(src, /animationStyle=\{?"none"/, "preview is not forced static");
});

test("Sticky nav: no template or site-shell root is a horizontal scroll container", () => {
  for (const { meta, component } of TEMPLATE_LIST) {
    const html = renderToStaticMarkup(React.createElement(component, { data: { ...data, template: meta.id } }));
    const rootTag = html.slice(0, html.indexOf(">"));
    assert.doesNotMatch(rootTag, /overflow-x-hidden|overflow-hidden/, `${meta.id} template root`);
    assert.doesNotMatch(getSiteTheme(meta.id).root, /overflow-x-hidden/, `${meta.id} shell theme`);
    const shell = renderToStaticMarkup(
      React.createElement(PortfolioSiteShell, { data: { ...data, template: meta.id }, username: "ada", current: "about" }, "x")
    );
    assert.doesNotMatch(shell.slice(0, shell.indexOf(">")), /overflow-x-hidden/, `${meta.id} shell root`);
  }
});
