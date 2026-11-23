"use client";

import { useEffect } from "react";
import { acquireMotionRuntime } from "./revealRuntime";
import { acquireHistoryDirection } from "./historyDirection";

/**
 * The only client-side piece of the motion system (Phase 14). Mount it once
 * per page tree (public portfolio layout, editor preview); it drives scroll
 * reveals for every [data-motion] scope in the document, so templates stay
 * Server Components, and gives browser Back / Forward the matching page
 * transition direction (historyDirection.ts). Renders nothing, so it cannot
 * affect markup or hydration.
 */
export function MotionRuntime(): null {
  useEffect(() => {
    const releaseReveals = acquireMotionRuntime();
    const releaseHistory = acquireHistoryDirection();
    return () => {
      releaseHistory();
      releaseReveals();
    };
  }, []);
  return null;
}
