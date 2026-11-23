import React from "react";
import { PageTransition } from "@/templates/motion/PageTransition";

/**
 * Phase 14 page transitions. Next.js re-mounts a route template on every
 * navigation between its child segments (home, about, experience, projects),
 * which is what lets <ViewTransition> run its exit/enter animations; a layout
 * persists and never would. Templates receive no portfolio data, so the
 * transition runs in "auto" mode and motion.css reads the animation style from
 * the page's motion scope. Adds no DOM; the page markup is unchanged.
 */
export default function PortfolioPageTemplate({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <PageTransition>{children}</PageTransition>;
}
