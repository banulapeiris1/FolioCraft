import React from "react";
import {
  AUTO_PAGE_TRANSITION,
  getPageTransitionClasses,
  type PageTransitionMode,
} from "./motionConfig";

interface ViewTransitionLikeProps {
  name?: string;
  enter?: string | Record<string, string>;
  exit?: string | Record<string, string>;
  default?: string;
  children?: React.ReactNode;
}

/**
 * React's <ViewTransition> exists in the React canary that Next.js bundles for
 * the App Router, but not in the stable React used by unit tests or older
 * runtimes. Resolve it at runtime and fall back to rendering children as-is.
 */
const ReactViewTransition = (
  React as unknown as { ViewTransition?: React.ComponentType<ViewTransitionLikeProps> }
).ViewTransition;

export function isViewTransitionSupported(): boolean {
  return typeof ReactViewTransition !== "undefined";
}

export interface PageTransitionProps {
  /**
   * Portfolio motion mode. Defaults to "auto" (used by the route templates,
   * which receive no portfolio data): motion.css then reads the style from
   * the page's motion scope.
   */
  mode?: PageTransitionMode;
  children?: React.ReactNode;
}

/**
 * Animates public portfolio page content on navigation (Phase 14).
 *
 * - Default navigations crossfade; links tagged NAV_FORWARD / NAV_BACK via
 *   <Link transitionTypes> slide in that direction (styles in motion.css).
 * - "minimal" / "none" modes, or a runtime without ViewTransition, render
 *   children unchanged: navigation still works, it just doesn't animate.
 * - Reduced-motion users get no view-transition animation (motion.css).
 * - Without browser View Transitions support React swaps content instantly.
 * Server-safe: no hooks, deterministic output, adds no DOM.
 */
export function PageTransition({
  mode = AUTO_PAGE_TRANSITION,
  children,
}: PageTransitionProps): React.JSX.Element {
  const classes = getPageTransitionClasses(mode);
  if (!classes || !ReactViewTransition) return <>{children}</>;

  return (
    <ReactViewTransition enter={classes.enter} exit={classes.exit} default="none">
      {children}
    </ReactViewTransition>
  );
}
