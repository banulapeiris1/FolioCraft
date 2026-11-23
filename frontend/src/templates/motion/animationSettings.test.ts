/**
 * Phase 14, Stage 4: animation settings — selector, editor form, API payload,
 * live preview, replay, gallery "none" mode, public data and template caps.
 */
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ANIMATION_STYLES,
  ANIMATION_STYLE_OPTIONS,
  MOTION_PRESETS,
  resolveMotionMode,
} from "./motionConfig";
import {
  HERO_SELECTOR,
  READY_ATTR,
  REVEALED_ATTR,
  replayMotion,
  startMotion,
  startMotionRuntime,
  type MotionEnv,
} from "./revealRuntime";
import { AnimationStyleSelector } from "@/components/portfolio/AnimationStyleSelector";
import PortfolioForm from "@/components/portfolio/PortfolioForm";
import { PreviewShell } from "@/components/portfolio/PreviewShell";
import { TemplateGallery } from "@/components/portfolio/TemplateGallery";
import { TEMPLATE_LIST } from "../registry";
import { mapDraftToPortfolioViewData, type PortfolioViewData } from "../types";
import { normalizePublicPortfolio } from "@/lib/publicPortfolio";
import { updatePortfolio } from "@/lib/api";
import PublicPortfolioPage from "@/app/u/[username]/page";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

const data: PortfolioViewData = {
  name: "Ada Lovelace",
  title: "Engineer",
  about: "Builds analytical engines.",
  username: "ada",
  template: "modern",
  projects: [
    {
      id: "p1",
      portfolioId: "x",
      title: "Engine",
      description: "Difference engine.",
      technologies: ["TS"],
      githubUrl: null,
      projectUrl: null,
      imageUrl: null,
      orderIndex: 0,
      createdAt: "",
      updatedAt: "",
    },
  ],
  skills: [],
  experiences: [],
};

// ---------------------------------------------------------------------------
// Element-tree helpers (invoke handlers without a DOM)
// ---------------------------------------------------------------------------

type AnyEl = React.ReactElement<Record<string, unknown>>;

function collect(node: React.ReactNode, match: (el: AnyEl) => boolean, out: AnyEl[] = []): AnyEl[] {
  if (Array.isArray(node)) node.forEach((n) => collect(n, match, out));
  else if (React.isValidElement(node)) {
    const el = node as AnyEl;
    if (match(el)) out.push(el);
    collect(el.props.children as React.ReactNode, match, out);
  }
  return out;
}

function selectorRadios(props: React.ComponentProps<typeof AnimationStyleSelector>): AnyEl[] {
  const tree = AnimationStyleSelector(props);
  return collect(tree, (el) => el.props.role === "radio");
}

// ---------------------------------------------------------------------------
// Options & selector
// ---------------------------------------------------------------------------

test("Options: exactly the three persisted styles, in order, never 'none'", () => {
  assert.deepEqual(
    ANIMATION_STYLE_OPTIONS.map((o) => o.id),
    ["subtle", "creative", "minimal"]
  );
  assert.deepEqual(
    ANIMATION_STYLE_OPTIONS.map((o) => o.label),
    ["Subtle Professional", "Interactive Creative", "Minimal Motion"]
  );
  assert.equal(ANIMATION_STYLE_OPTIONS.find((o) => o.recommended)?.id, "subtle");
  assert.ok(!ANIMATION_STYLE_OPTIONS.some((o) => (o.id as string) === "none"));
  for (const o of ANIMATION_STYLE_OPTIONS) {
    assert.equal(o.label, MOTION_PRESETS[o.id].label, "labels reuse the Stage 1 presets (no duplication)");
    assert.ok(o.tagline && o.description);
  }
});

test("Selector: accessible radio group with title, description, indicator and preview per option", () => {
  const html = render(React.createElement(AnimationStyleSelector, { value: "creative", onChange: () => {} }));
  assert.match(html, /role="radiogroup"/);
  assert.equal((html.match(/role="radio"/g) || []).length, 3);
  for (const o of ANIMATION_STYLE_OPTIONS) {
    assert.ok(html.includes(`>${o.label}<`), o.label);
    assert.ok(html.includes(o.tagline), o.tagline);
    assert.ok(html.includes(`data-testid="animation-style-preview-${o.id}"`), `${o.id} preview`);
  }
  assert.match(html, /data-testid="animation-style-creative"[^>]*|aria-checked="true"[^>]*data-testid="animation-style-creative"/);
  const radios = selectorRadios({ value: "creative", onChange: () => {} });
  assert.deepEqual(
    radios.map((r) => [r.props["data-testid"], r.props["aria-checked"], r.props.tabIndex]),
    [
      ["animation-style-subtle", false, -1],
      ["animation-style-creative", true, 0],
      ["animation-style-minimal", false, -1],
    ],
    "one selected radio, single tab stop"
  );
  assert.doesNotMatch(html, /animation-style-none|No motion/, "gallery-only mode is never offered");
});

test("Selector: missing or invalid value falls back to Subtle Professional", () => {
  for (const value of [undefined, null, "", "none", "wild"]) {
    const checked = selectorRadios({ value, onChange: () => {} }).filter((r) => r.props["aria-checked"]);
    assert.equal(checked.length, 1);
    assert.equal(checked[0]!.props["data-testid"], "animation-style-subtle", String(value));
  }
});

test("Selector: click and arrow keys report the selected style", () => {
  const picked: string[] = [];
  const radios = selectorRadios({ value: "subtle", onChange: (s) => picked.push(s) });
  (radios[2]!.props.onClick as () => void)();
  assert.deepEqual(picked, ["minimal"]);

  const keyEvent = (key: string) => ({ key, preventDefault() {}, currentTarget: { parentElement: null } });
  (radios[0]!.props.onKeyDown as (e: unknown) => void)(keyEvent("ArrowRight"));
  (radios[0]!.props.onKeyDown as (e: unknown) => void)(keyEvent("ArrowLeft"));
  assert.deepEqual(picked, ["minimal", "creative", "minimal"], "arrow keys wrap around");

  const disabled = selectorRadios({ value: "subtle", onChange: (s) => picked.push(s), disabled: true });
  (disabled[1]!.props.onClick as () => void)();
  assert.equal(picked.length, 3, "disabled selector ignores input");
});

test("Selector: explains the Academic / Executive cap only when it applies", () => {
  for (const templateId of ["academic", "executive"]) {
    const html = render(React.createElement(AnimationStyleSelector, { value: "creative", templateId, onChange: () => {} }));
    assert.match(html, /data-testid="animation-style-cap-note"/, templateId);
    assert.match(html, /keeps motion at <strong[^>]*>Subtle Professional<\/strong>/);
  }
  for (const [templateId, value] of [["modern", "creative"], ["academic", "subtle"], ["executive", "minimal"]]) {
    const html = render(React.createElement(AnimationStyleSelector, { value, templateId, onChange: () => {} }));
    assert.doesNotMatch(html, /animation-style-cap-note/, `${templateId}/${value}`);
  }
});

// ---------------------------------------------------------------------------
// Editor form & API
// ---------------------------------------------------------------------------

test("PortfolioForm: Animation Settings section reflects the saved style (default subtle)", () => {
  const base = { name: "Ada", title: "Eng", username: "ada", template: "modern" };
  const saved = render(
    React.createElement(PortfolioForm, { mode: "edit", initialData: { ...base, animationStyle: "minimal" } })
  );
  assert.match(saved, /data-testid="animation-settings-section"/);
  assert.match(saved, />Animation Settings</);
  assert.match(saved, /aria-checked="true"[^>]*data-testid="animation-style-minimal"/);

  const legacy = render(React.createElement(PortfolioForm, { mode: "edit", initialData: base }));
  assert.match(legacy, /aria-checked="true"[^>]*data-testid="animation-style-subtle"/, "missing value shows subtle");
});

test("API: updatePortfolio sends animationStyle through the existing PUT endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_API_URL;
  const calls: Array<{ url: string; init: RequestInit }> = [];
  try {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ portfolio: { id: "p1", animationStyle: "creative" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    const res = await updatePortfolio("p1", { animationStyle: "creative" }, "jwt");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, "http://api.test/api/portfolios/p1");
    assert.equal(calls[0]!.init.method, "PUT");
    assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), { animationStyle: "creative" });
    assert.equal(res.portfolio.animationStyle, "creative");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalUrl;
  }
});

test("Draft mapping: the editor's style reaches the preview; 'none' can never be persisted", () => {
  const base = { name: "A", title: "T", username: "a" };
  assert.equal(mapDraftToPortfolioViewData({ ...base, animationStyle: "creative" }).animationStyle, "creative");
  assert.equal(mapDraftToPortfolioViewData(base).animationStyle, "subtle");
  assert.equal(mapDraftToPortfolioViewData(null).animationStyle, "subtle");
  assert.equal(
    mapDraftToPortfolioViewData({ ...base, animationStyle: "none" as never }).animationStyle,
    "subtle"
  );
});

// ---------------------------------------------------------------------------
// Live preview & replay button
// ---------------------------------------------------------------------------

const motionAttr = (html: string) => html.match(/data-motion-wrapper="" data-motion="([a-z]+)"/)?.[1];

test("PreviewShell: renders the selected style and updates when it changes", () => {
  for (const style of ANIMATION_STYLES) {
    const html = render(React.createElement(PreviewShell, { data: { ...data, animationStyle: style } }));
    assert.equal(motionAttr(html), style);
  }
  const fallback = render(React.createElement(PreviewShell, { data }));
  assert.equal(motionAttr(fallback), "subtle", "missing style falls back to subtle");
});

test("PreviewShell: style change only swaps motion attributes (same tree, no remount key)", () => {
  const a = render(React.createElement(PreviewShell, { data: { ...data, animationStyle: "subtle" } }));
  const b = render(React.createElement(PreviewShell, { data: { ...data, animationStyle: "creative" } }));
  const strip = (html: string) =>
    html
      .replace(/data-motion="[a-z]+"( style="[^"]*")?/g, "")
      .replace(/aria-label="Replay [^"]*"/, "")
      .replace(/title="Replay animations \([^)]*\)"/, "");
  assert.notEqual(a, b);
  assert.equal(strip(a), strip(b), "only the motion scope (and replay label) differ");
});

test("PreviewShell: Academic / Executive previews are capped at subtle", () => {
  for (const template of ["academic", "executive"]) {
    const html = render(React.createElement(PreviewShell, { data: { ...data, template, animationStyle: "creative" } }));
    assert.equal(motionAttr(html), "subtle", template);
    assert.equal(resolveMotionMode("creative", template), "subtle");
  }
  const modern = render(React.createElement(PreviewShell, { data: { ...data, animationStyle: "creative" } }));
  assert.equal(motionAttr(modern), "creative");
});

test("PreviewShell: Replay Animations button is present, labelled and keeps existing controls", () => {
  const html = render(React.createElement(PreviewShell, { data: { ...data, animationStyle: "creative" } }));
  const button = html.match(/<button[^>]*data-testid="replay-animations-btn"[^>]*>/)?.[0] ?? "";
  assert.ok(button, "replay button rendered");
  assert.match(button, /type="button"/, "never submits the editor form");
  assert.match(button, /aria-label="Replay Interactive Creative animations"/);
  assert.doesNotMatch(button, / disabled=""/, "enabled when motion is allowed (server snapshot)");
  for (const id of ["zoom-in-btn", "zoom-out-btn", "zoom-fit-btn", "preview-content-scrollable", "preview-zoom-sizer"]) {
    assert.ok(html.includes(`data-testid="${id}"`), `${id} preserved`);
  }
});

// ---------------------------------------------------------------------------
// Gallery thumbnails
// ---------------------------------------------------------------------------

test("TemplateGallery: all nine thumbnails render static ('none'), whatever the saved style", () => {
  const html = render(
    React.createElement(TemplateGallery, {
      portfolioData: { ...data, animationStyle: "creative" },
      onSelectTemplate: () => {},
    })
  );
  const scopes = html.match(/data-motion="[a-z]+"/g) || [];
  assert.equal(TEMPLATE_LIST.length, 9);
  assert.equal(scopes.length, 9, "one scope per thumbnail");
  assert.ok(scopes.every((s) => s === 'data-motion="none"'), scopes.join(","));
  assert.doesNotMatch(html, /--motion-/, "no motion variables inside the gallery");
  for (const { meta } of TEMPLATE_LIST) {
    assert.ok(html.includes(`data-testid="use-template-btn-${meta.id}"`) || html.includes(`data-testid="current-badge-${meta.id}"`));
  }
});

// ---------------------------------------------------------------------------
// Public data
// ---------------------------------------------------------------------------

test("Public data: saved style is kept; missing / unknown / 'none' fall back to subtle", () => {
  for (const style of ANIMATION_STYLES) {
    assert.equal(normalizePublicPortfolio({ name: "A", animationStyle: style }, "a").animationStyle, style);
  }
  // Read side is lenient about case/whitespace (writes are strict on the backend).
  assert.equal(normalizePublicPortfolio({ name: "A", animationStyle: " CREATIVE " }, "a").animationStyle, "creative");
  for (const bad of [undefined, null, "", "none", "bouncy", 3]) {
    assert.equal(normalizePublicPortfolio({ name: "A", animationStyle: bad }, "a").animationStyle, "subtle", String(bad));
  }
});

test("Public page: renders each saved style, capped for Academic and Executive", async () => {
  const originalFetch = globalThis.fetch;
  const cases: Array<[string, string, string]> = [
    ["modern", "subtle", "subtle"],
    ["modern", "creative", "creative"],
    ["modern", "minimal", "minimal"],
    ["academic", "creative", "subtle"],
    ["executive", "creative", "subtle"],
    ["executive", "minimal", "minimal"],
    ["bento", "garbage", "subtle"],
  ];
  try {
    for (const [template, saved, expected] of cases) {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ success: true, portfolio: { ...data, template, animationStyle: saved } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })) as typeof fetch;
      const html = render(await PublicPortfolioPage({ params: Promise.resolve({ username: "ada" }) }));
      assert.match(html, new RegExp(`^<main[^>]*data-motion="${expected}"`), `${template}/${saved}`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// Replay runtime (fake DOM)
// ---------------------------------------------------------------------------

/** Records inline `animation` writes and forced reflows. */
class FakeStyle {
  log: string[] = [];
  animation = "";
  constructor(public owner: { reflows: number }) {}
  set(value: string) {
    this.animation = value;
    this.log.push(`set:${value}`);
  }
  removeProperty(name: string) {
    this.log.push(`remove:${name}`);
  }
}

const reflowCounter = { reflows: 0 };

class FakeNode {
  attrs = new Map<string, string>();
  scope: FakeScope | null = null;
  isConnected = true;
  private styleImpl = new FakeStyle(reflowCounter);
  style = new Proxy(this.styleImpl, {
    set: (target, prop, value) => {
      if (prop === "animation") target.set(value);
      return true;
    },
  });
  constructor(public top: number, public hero = false) {}
  get offsetWidth() {
    reflowCounter.reflows += 1;
    return 100;
  }
  get styleLog() {
    return this.styleImpl.log;
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
  closest() {
    return this.scope;
  }
  getBoundingClientRect() {
    return { top: this.top, bottom: this.top + 100, height: 100 };
  }
}

class FakeScope extends FakeNode {
  items: FakeNode[] = [];
  constructor(mode: string, items: FakeNode[]) {
    super(0);
    this.attrs.set("data-motion", mode);
    for (const el of items) {
      el.scope = this;
      this.items.push(el);
    }
  }
  querySelectorAll(selector: string) {
    if (selector === HERO_SELECTOR) return this.items.filter((el) => el.hero);
    const reveals = this.items.filter((el) => !el.hero);
    return selector.includes(":not(") ? reveals.filter((el) => !el.attrs.has(REVEALED_ATTR)) : reveals;
  }
}

function fakeEnv() {
  const state = {
    observed: new Set<FakeNode>(),
    callback: null as null | ((entries: Array<{ isIntersecting: boolean; target: FakeNode }>) => void),
    mutate: null as null | ((records: unknown[]) => void),
  };
  class IO {
    constructor(cb: never) {
      state.callback = cb;
    }
    observe(el: FakeNode) {
      state.observed.add(el);
    }
    unobserve(el: FakeNode) {
      state.observed.delete(el);
    }
    disconnect() {
      state.observed.clear();
    }
  }
  class MO {
    constructor(cb: never) {
      state.mutate = cb;
    }
    observe() {}
    disconnect() {}
  }
  return { state, env: { IntersectionObserver: IO, MutationObserver: MO, viewportHeight: () => 800 } as unknown as MotionEnv };
}

function setup(mode = "creative") {
  const hero = new FakeNode(50, true);
  const onScreen = new FakeNode(200);
  const below = new FakeNode(1600);
  const scope = new FakeScope(mode, [hero, onScreen, below]);
  const { env, state } = fakeEnv();
  const doc = { body: {}, querySelectorAll: () => (scope.getAttribute("data-motion") === "none" ? [] : [scope]) };
  const runtime = startMotionRuntime(doc as never, env);
  return { hero, onScreen, below, scope, state, runtime };
}

test("startMotion replay mode: on-screen content animates again instead of being marked static", () => {
  const visible = new FakeNode(100);
  const scope = new FakeScope("subtle", [visible]);
  const { env, state } = fakeEnv();
  startMotion(scope as never, env, { replay: true });
  assert.equal(visible.getAttribute(REVEALED_ATTR), null);
  assert.ok(state.observed.has(visible));
  state.callback!([{ isIntersecting: true, target: visible }]);
  assert.equal(visible.getAttribute(REVEALED_ATTR), "animate");
});

test("Runtime replay: resets reveals, restarts the hero entrance, touches nothing else", () => {
  const { hero, onScreen, below, scope, state, runtime } = setup();
  assert.equal(onScreen.getAttribute(REVEALED_ATTR), "static", "initial load keeps visible content static");
  state.callback!([{ isIntersecting: true, target: below }]);
  assert.equal(below.getAttribute(REVEALED_ATTR), "animate");
  scope.setAttribute("data-motion-handoff", "");

  const reflowsBefore = reflowCounter.reflows;
  assert.equal(runtime.replay(scope as never), true);
  assert.equal(onScreen.getAttribute(REVEALED_ATTR), null, "visible content re-hidden for replay");
  assert.equal(below.getAttribute(REVEALED_ATTR), null);
  assert.ok(state.observed.has(onScreen) && state.observed.has(below), "all reveals observed again");
  assert.deepEqual(hero.styleLog, ["set:none", "remove:animation"], "hero CSS animation removed then restored");
  assert.equal(reflowCounter.reflows - reflowsBefore, 1, "exactly one forced reflow in between");
  assert.equal(scope.getAttribute(READY_ATTR), "", "scope still active");
  assert.equal(scope.getAttribute("data-motion-handoff"), null);
  assert.equal(scope.getAttribute("data-motion"), "creative", "style attribute untouched");

  state.callback!([{ isIntersecting: true, target: onScreen }]);
  assert.equal(onScreen.getAttribute(REVEALED_ATTR), "animate", "replayed content animates in");
  runtime();
});

test("Runtime: editing content after load never replays animations", () => {
  const { onScreen, below, scope, state, runtime } = setup();
  state.callback!([{ isIntersecting: true, target: below }]);
  const added = new FakeNode(2400);
  added.scope = scope;
  scope.items.push(added);
  state.mutate!([]); // live preview typing / new project
  assert.equal(onScreen.getAttribute(REVEALED_ATTR), "static");
  assert.equal(below.getAttribute(REVEALED_ATTR), "animate");
  assert.ok(state.observed.has(added), "only new content is picked up");
  runtime();
});

test("Runtime replay: refuses 'none' scopes; replayMotion never forces motion", () => {
  const { scope, runtime } = setup("none");
  assert.equal(runtime.replay(scope as never), false);
  runtime();
  const active = setup("subtle");
  assert.equal(replayMotion(active.scope as never, { reducedMotion: true }), false, "reduced motion: no replay");
  assert.equal(active.onScreen.getAttribute(REVEALED_ATTR), "static", "nothing hidden under reduced motion");
  assert.equal(replayMotion(null, { reducedMotion: false }), false);
  assert.equal(
    replayMotion(active.scope as never, { reducedMotion: false }),
    false,
    "no shared runtime mounted (server / tests): no-op"
  );
  active.runtime();
});
