import React from "react";
import { MotionRuntime } from "@/templates/motion/MotionRuntime";

/**
 * Public portfolio layout (Phase 14).
 *
 * Adds no markup: it only mounts the shared <MotionRuntime> once for every
 * /u/:username route. The runtime persists across client navigations between
 * portfolio pages and picks up each page's motion scope as it appears.
 */
export default function PublicPortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <>
      {children}
      <MotionRuntime />
    </>
  );
}
