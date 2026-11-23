/**
 * Browser Back / Forward direction (Phase 14, Stage 5).
 *
 * Link clicks between the projects list and project details slide via
 * React view transitions (<Link transitionTypes>). Browser history
 * navigations are different: Next.js 16 commits them without a view
 * transition at all (verified in the production build; the Next.js view
 * transitions guide also notes they carry no transition type). Forcing one
 * would mean intercepting history or racing React's synchronous popstate
 * commit, which is fragile.
 *
 * Instead this module only *detects* direction, without touching history or
 * routing:
 * - The Navigation API `navigate` event reports a history traversal
 *   (`navigationType: "traverse"`) and the destination entry index before
 *   Next.js handles the resulting popstate.
 * - For the same pairs that slide on click (projects list <-> project detail,
 *   detail <-> detail) it records a pending "back" / "forward" direction.
 * - The motion runtime consumes it when the new page's motion scope appears
 *   (before first paint) and marks that scope with ENTER_ATTR; motion.css
 *   slides the incoming content in from the matching side.
 *
 * The pending direction is single-use, expires after NAV_DIRECTION_TTL_MS
 * and is dropped by any link click or new push / traverse navigation.
 * ("replace" events are ignored: Next.js itself calls replaceState while
 * handling the traversal.)
 *
 * Fallbacks (content swaps without a slide, as before): browsers without the
 * Navigation API, cross-document entries, unknown indexes, reduced motion,
 * minimal / none styles. Direct loads and refreshes are not same-document
 * traversals, so they never get a direction.
 */

export type NavDirection = "back" | "forward";

/** Set on the incoming page's motion scope; motion.css animates it. */
export const ENTER_ATTR = "data-motion-enter";

/** How long a detected direction may wait for its page before it is dropped. */
export const NAV_DIRECTION_TTL_MS = 3000;

const PROJECTS_PATH = /^\/u\/([^/]+)\/projects(?:\/([^/]+))?\/?$/i;

/**
 * True for the navigations that slide when made with a link: projects list
 * <-> project detail, or detail <-> detail, within one portfolio.
 */
export function isDirectionalPair(fromPath: string, toPath: string): boolean {
  const from = PROJECTS_PATH.exec(fromPath);
  const to = PROJECTS_PATH.exec(toPath);
  if (!from || !to) return false;
  if (from[1]!.toLowerCase() !== to[1]!.toLowerCase()) return false;
  if (!from[2] && !to[2]) return false; // list -> list
  return fromPath !== toPath;
}

/** Direction of a history traversal from entry indexes, or null if unknown. */
export function traversalDirection(currentIndex: number | undefined, destinationIndex: number | undefined): NavDirection | null {
  if (typeof currentIndex !== "number" || typeof destinationIndex !== "number") return null;
  if (currentIndex < 0 || destinationIndex < 0 || currentIndex === destinationIndex) return null;
  return destinationIndex < currentIndex ? "back" : "forward";
}

interface NavigateEventLike {
  navigationType: string;
  destination: { url: string; index: number; sameDocument: boolean };
}

interface NavigationLike {
  currentEntry: { index: number } | null;
  addEventListener: (type: "navigate", listener: (event: NavigateEventLike) => void) => void;
  removeEventListener: (type: "navigate", listener: (event: NavigateEventLike) => void) => void;
}

export interface HistoryDirectionEnv {
  navigation?: NavigationLike;
  doc: Pick<Document, "addEventListener" | "removeEventListener" | "querySelector">;
  currentPath: () => string;
  reducedMotion: () => boolean;
  now: () => number;
}

export interface HistoryDirectionTracker {
  /** Returns the pending direction once (then forgets it), or null. */
  consume: () => NavDirection | null;
  stop: () => void;
}

/** Only styles that animate page navigation get a direction. */
function pageAnimates(doc: HistoryDirectionEnv["doc"]): boolean {
  const mode = doc.querySelector("[data-motion]")?.getAttribute("data-motion");
  return mode === "subtle" || mode === "creative";
}

const INERT: HistoryDirectionTracker = { consume: () => null, stop: () => {} };

/** Starts tracking. Inert without the Navigation API. */
export function startHistoryDirection(env: HistoryDirectionEnv): HistoryDirectionTracker {
  const navigation = env.navigation;
  if (!navigation) return INERT;

  let pending: { direction: NavDirection; expires: number } | null = null;

  const onNavigate = (event: NavigateEventLike) => {
    if (event.navigationType === "replace") return;
    pending = null;
    if (event.navigationType !== "traverse" || !event.destination.sameDocument) return;
    if (env.reducedMotion() || !pageAnimates(env.doc)) return;
    let toPath: string;
    try {
      toPath = new URL(event.destination.url).pathname;
    } catch {
      return;
    }
    if (!isDirectionalPair(env.currentPath(), toPath)) return;
    const direction = traversalDirection(navigation.currentEntry?.index, event.destination.index);
    if (direction) pending = { direction, expires: env.now() + NAV_DIRECTION_TTL_MS };
  };

  // A link click starts its own (typed) view transition: drop any pending direction.
  const onClick = (event: Event) => {
    const target = event.target as Element | null;
    if (target && typeof target.closest === "function" && target.closest("a[href]")) pending = null;
  };

  navigation.addEventListener("navigate", onNavigate);
  env.doc.addEventListener("click", onClick, true);
  return {
    consume: () => {
      const current = pending;
      pending = null;
      return current && current.expires >= env.now() ? current.direction : null;
    },
    stop: () => {
      navigation.removeEventListener("navigate", onNavigate);
      env.doc.removeEventListener("click", onClick, true);
      pending = null;
    },
  };
}

function browserEnv(): HistoryDirectionEnv | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  return {
    navigation: (window as unknown as { navigation?: NavigationLike }).navigation,
    doc: document,
    currentPath: () => window.location.pathname,
    reducedMotion: () =>
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    now: () => Date.now(),
  };
}

// One tracker per document, however many <MotionRuntime> mount.
let mounts = 0;
let shared: HistoryDirectionTracker | null = null;

export function acquireHistoryDirection(): () => void {
  const env = browserEnv();
  if (!env) return () => {};
  mounts += 1;
  if (mounts === 1) shared = startHistoryDirection(env);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    mounts -= 1;
    if (mounts === 0) {
      shared?.stop();
      shared = null;
    }
  };
}

/** Consumes the shared tracker's pending direction (used by the motion runtime). */
export function consumeHistoryDirection(): NavDirection | null {
  return shared ? shared.consume() : null;
}
