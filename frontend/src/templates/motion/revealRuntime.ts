/**
 * Scroll-reveal runtime (Phase 14). Framework-free so it can be unit tested
 * with fakes; the <MotionRuntime> client component starts it once per page.
 *
 * Progressive enhancement contract:
 * - Server HTML never hides anything. Elements marked [data-reveal] are only
 *   hidden by motion.css once this runtime sets [data-motion-ready] on their
 *   motion scope (and only under prefers-reduced-motion: no-preference).
 * - Elements already on screen when a scope starts are marked
 *   data-revealed="static" first, so visible content never flickers out.
 * - Everything else gets data-revealed="animate" when it scrolls into view.
 * - Without IntersectionObserver, all elements are revealed statically.
 * - State lives in DOM attributes React does not render, so it causes no
 *   hydration mismatch and survives re-renders (live preview typing).
 */

import { ENTER_ATTR, consumeHistoryDirection } from "./historyDirection";

export const SCOPE_ATTR = "data-motion";
export const READY_ATTR = "data-motion-ready";
export const REVEALED_ATTR = "data-revealed";
export const REVEAL_SELECTOR = "[data-reveal]";
export const ACTIVE_SCOPE_SELECTOR = `[${SCOPE_ATTR}]:not([${SCOPE_ATTR}="none"])`;
export const REVEAL_OBSERVER_OPTIONS: IntersectionObserverInit = { rootMargin: "0px", threshold: 0 };
/** Marks the route loading skeleton (app/u/[username]/loading.tsx). */
export const SKELETON_ATTR = "data-motion-skeleton";
/** Set on a scope that replaced the loading skeleton; motion.css fades it in. */
export const HANDOFF_ATTR = "data-motion-handoff";

/** True when a mutation batch removed the loading skeleton. */
export function skeletonRemoved(records: ReadonlyArray<Pick<MutationRecord, "removedNodes">> = []): boolean {
  const selector = `[${SKELETON_ATTR}]`;
  return records.some((record) =>
    Array.from(record.removedNodes).some((node) => {
      const el = node as Element;
      return el.nodeType === 1 && (el.matches?.(selector) || !!el.querySelector?.(selector));
    })
  );
}

type IOConstructor = new (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => Pick<IntersectionObserver, "observe" | "unobserve" | "disconnect">;

type MOConstructor = new (callback: MutationCallback) => Pick<MutationObserver, "observe" | "disconnect">;

export interface MotionEnv {
  IntersectionObserver?: IOConstructor;
  MutationObserver?: MOConstructor;
  viewportHeight: () => number;
  /**
   * Pending browser Back / Forward direction for the page that is about to
   * appear (historyDirection.ts); single-use. Optional for tests.
   */
  consumeDirection?: () => string | null;
}

export function getBrowserMotionEnv(): MotionEnv {
  return {
    IntersectionObserver:
      typeof IntersectionObserver === "undefined" ? undefined : IntersectionObserver,
    MutationObserver: typeof MutationObserver === "undefined" ? undefined : MutationObserver,
    viewportHeight: () =>
      typeof window === "undefined" ? 0 : window.innerHeight || document.documentElement.clientHeight,
    consumeDirection: consumeHistoryDirection,
  };
}

export interface RevealController {
  /** Picks up [data-reveal] elements added since the last call. */
  refresh: () => void;
  /** Stops observing and restores the no-hiding state. */
  stop: () => void;
}

export interface StartMotionOptions {
  /**
   * Replay (editor "Replay animations"): do not pre-mark on-screen elements as
   * static, so content already in view animates again too.
   */
  replay?: boolean;
}

/** Starts reveal tracking for one motion scope. */
export function startMotion(
  scope: HTMLElement,
  env: MotionEnv = getBrowserMotionEnv(),
  options: StartMotionOptions = {}
): RevealController {
  // Only elements that belong to this scope (not to a nested scope).
  const pending = () =>
    Array.from(scope.querySelectorAll<HTMLElement>(`${REVEAL_SELECTOR}:not([${REVEALED_ATTR}])`)).filter(
      (el) => el.closest(`[${SCOPE_ATTR}]`) === scope
    );

  const IO = env.IntersectionObserver;
  if (!IO) {
    const revealAll = () => pending().forEach((el) => el.setAttribute(REVEALED_ATTR, "static"));
    revealAll();
    return { refresh: revealAll, stop: () => {} };
  }

  const observer = new IO(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.setAttribute(REVEALED_ATTR, "animate");
        observer.unobserve(el);
      }
    },
    // No negative inset: an element at the very bottom of the page must still
    // be able to intersect, or it would stay hidden forever.
    REVEAL_OBSERVER_OPTIONS
  );

  // Before hiding anything, keep what the visitor can already see visible.
  const viewport = env.viewportHeight();
  for (const el of pending()) {
    if (options.replay) {
      observer.observe(el);
      continue;
    }
    const rect = el.getBoundingClientRect();
    const onScreen = rect.bottom > 0 && rect.top < viewport && rect.height > 0;
    if (onScreen) el.setAttribute(REVEALED_ATTR, "static");
    else observer.observe(el);
  }
  scope.setAttribute(READY_ATTR, "");

  return {
    // Added after start (e.g. a project added in the live editor): observe;
    // observe() ignores elements that are already observed.
    refresh: () => pending().forEach((el) => observer.observe(el)),
    stop: () => {
      observer.disconnect();
      scope.removeAttribute(READY_ATTR);
    },
  };
}

type DocLike = Pick<Document, "querySelectorAll"> & { body: Node };

export const HERO_SELECTOR = "[data-hero-item]";

/** Elements matching `selector` that belong to `scope` (not to a nested scope). */
function ownedBy(scope: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.closest(`[${SCOPE_ATTR}]`) === scope
  );
}

/**
 * Restarts the CSS animations declared for elements (the hero entrance).
 * A finished CSS animation is no longer returned by getAnimations(), so it
 * cannot be rewound through the Web Animations API. Instead the animation is
 * briefly removed inline and restored after one forced style flush; the
 * stylesheet's own declaration (and keyframes) then start again from 0,
 * delay included. Only the `animation` property is touched, so React-managed
 * inline custom properties (--hero-i) are preserved.
 */
function restartAnimations(elements: HTMLElement[]): void {
  const styled = elements.filter((el) => el.style);
  if (styled.length === 0) return;
  for (const el of styled) el.style.animation = "none";
  void styled[0]!.offsetWidth; // one reflow for the whole batch
  for (const el of styled) el.style.removeProperty("animation");
}

/** A running runtime: call it to stop; `replay(scope)` replays one scope. */
export type MotionRuntimeHandle = (() => void) & {
  /** Replays entrance + scroll reveals for a scope. False if the scope has no active motion. */
  replay: (scope: HTMLElement) => boolean;
};

/**
 * Tracks every active motion scope in the document, including scopes that
 * appear after client-side navigation or a mode change, and stops scopes that
 * are removed or switched to "none". Returns a cleanup function (which also
 * exposes `replay`).
 */
export function startMotionRuntime(doc: DocLike, env: MotionEnv = getBrowserMotionEnv()): MotionRuntimeHandle {
  const active = new Map<HTMLElement, RevealController>();

  // handoff: the page replaced the loading skeleton in this same commit, so
  // newly started scopes fade in instead of popping in (a React view
  // transition does not run for that reveal in Next.js 16).
  const sync = (handoff = false) => {
    for (const [scope, controller] of active) {
      if (!scope.isConnected || scope.getAttribute(SCOPE_ATTR) === "none") {
        controller.stop();
        active.delete(scope);
      }
    }
    doc.querySelectorAll<HTMLElement>(ACTIVE_SCOPE_SELECTOR).forEach((scope) => {
      const existing = active.get(scope);
      if (existing) existing.refresh();
      else {
        if (handoff) scope.setAttribute(HANDOFF_ATTR, "");
        else {
          // Browser Back / Forward between project pages: the new page's
          // content slides in from the matching side (motion.css).
          const direction = env.consumeDirection?.();
          if (direction) scope.setAttribute(ENTER_ATTR, direction);
        }
        active.set(scope, startMotion(scope, env));
      }
    });
  };

  sync();

  let mutations: InstanceType<MOConstructor> | null = null;
  if (env.MutationObserver) {
    // MutationObserver callbacks run before the next paint, so the handoff
    // attribute is in place before the new page is first drawn.
    mutations = new env.MutationObserver((records) => sync(skeletonRemoved(records)));
    // Only structure and scope changes; the runtime's own attributes
    // (data-revealed / data-motion-ready) do not retrigger it.
    mutations.observe(doc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [SCOPE_ATTR],
    });
  }

  // Replay (Phase 14, Stage 4): reset only this scope's runtime state
  // (DOM attributes React does not render) and restart it in replay mode.
  // Portfolio data, React state and the DOM structure are untouched.
  const replay = (scope: HTMLElement): boolean => {
    const mode = scope.getAttribute(SCOPE_ATTR);
    if (mode === null || mode === "none") return false;
    active.get(scope)?.stop();
    scope.removeAttribute(HANDOFF_ATTR);
    for (const el of ownedBy(scope, REVEAL_SELECTOR)) el.removeAttribute(REVEALED_ATTR);
    restartAnimations(ownedBy(scope, HERO_SELECTOR));
    active.set(scope, startMotion(scope, env, { replay: true }));
    return true;
  };

  const stop = () => {
    mutations?.disconnect();
    for (const controller of active.values()) controller.stop();
    active.clear();
  };
  return Object.assign(stop, { replay });
}

// One shared runtime per document, however many <MotionRuntime> mount
// (also keeps React Strict Mode's double effects harmless).
let mounts = 0;
let shared: MotionRuntimeHandle | null = null;

export function acquireMotionRuntime(): () => void {
  if (typeof document === "undefined") return () => {};
  mounts += 1;
  if (mounts === 1) shared = startMotionRuntime(document);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    mounts -= 1;
    if (mounts === 0) {
      shared?.();
      shared = null;
    }
  };
}

/** True when the visitor asked the OS/browser for reduced motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Replays a scope's entrance and scroll-reveal animations through the shared
 * runtime (editor "Replay animations"). Never forces motion: it does nothing
 * under reduced motion, for "none" scopes, or when no runtime is mounted.
 */
export function replayMotion(
  scope: HTMLElement | null | undefined,
  options: { reducedMotion?: boolean } = {}
): boolean {
  const reduced = options.reducedMotion ?? prefersReducedMotion();
  if (!scope || reduced || !shared) return false;
  return shared.replay(scope);
}
