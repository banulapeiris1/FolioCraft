import React from "react";
import { PageTransition } from "@/templates/motion/PageTransition";

/**
 * Phase 14: re-mounts between the projects list and a project detail page
 * (and between detail pages), so links tagged nav-forward / nav-back slide in
 * their direction. Navigations into /projects from other portfolio pages are
 * animated by the parent [username] template instead (React only animates the
 * outermost entering transition). Adds no DOM.
 */
export default function ProjectsTemplate({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <PageTransition>{children}</PageTransition>;
}
