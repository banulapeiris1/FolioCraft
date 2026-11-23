"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
}

/** Server render assumes no preference; the client corrects it after hydration. */
function getServerSnapshot(): boolean {
  return false;
}

/** Live `prefers-reduced-motion: reduce` state (Phase 14 editor controls). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
