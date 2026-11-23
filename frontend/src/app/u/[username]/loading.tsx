import React from "react";

/**
 * Public Portfolio Loading Skeleton (PUB-04).
 * Displayed while streaming dynamic portfolio data from the backend.
 *
 * Phase 14: blocks fade in after a short beat (quick loads never flash a
 * skeleton) and share one gentle pulse instead of per-block pulsing; both stop
 * under prefers-reduced-motion. data-motion-skeleton lets the motion runtime
 * fade the real page in when it replaces the skeleton. Layout and colours are
 * unchanged.
 */
export default function PublicPortfolioLoading(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading developer portfolio"
      data-testid="public-portfolio-loading"
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/20"
      data-motion-skeleton=""
    >
      {/* 1. Header Navigation Skeleton */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-slate-950/80 border-b border-slate-850 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4" data-skeleton-content="">
          <div className="h-5 w-32 bg-slate-800 rounded" />
          <div className="hidden sm:flex items-center gap-6">
            <div className="h-4 w-16 bg-slate-800 rounded" />
            <div className="h-4 w-20 bg-slate-800 rounded" />
            <div className="h-4 w-16 bg-slate-800 rounded" />
            <div className="h-4 w-14 bg-slate-800 rounded" />
          </div>
          <div className="h-8 w-24 bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* 2. Hero Header Skeleton */}
      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-20 lg:py-24 space-y-16" data-skeleton-content="">
        <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-8 md:gap-12">
          <div className="space-y-5 flex-1">
            <div className="h-6 w-48 bg-slate-800/80 rounded-full" />
            <div className="space-y-3">
              <div className="h-10 sm:h-12 w-3/4 max-w-md bg-slate-800 rounded-lg" />
              <div className="h-6 sm:h-7 w-1/2 max-w-sm bg-slate-800/80 rounded" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full max-w-xl bg-slate-800/60 rounded" />
              <div className="h-4 w-5/6 max-w-lg bg-slate-800/60 rounded" />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="h-9 w-28 bg-slate-800 rounded-lg" />
              <div className="h-9 w-28 bg-slate-800 rounded-lg" />
              <div className="h-9 w-28 bg-slate-800 rounded-lg" />
            </div>
          </div>
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-slate-800/90 flex-shrink-0" />
        </div>

        {/* 3. Projects Showcase Skeleton */}
        <div className="space-y-6 pt-6">
          <div className="h-7 w-32 bg-slate-800 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-4">
              <div className="h-6 w-40 bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-800/60 rounded" />
              <div className="h-4 w-3/4 bg-slate-800/60 rounded" />
              <div className="flex gap-2 pt-4">
                <div className="h-5 w-16 bg-slate-800 rounded-full" />
                <div className="h-5 w-16 bg-slate-800 rounded-full" />
              </div>
            </div>
            <div className="h-48 rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-4">
              <div className="h-6 w-40 bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-800/60 rounded" />
              <div className="h-4 w-3/4 bg-slate-800/60 rounded" />
              <div className="flex gap-2 pt-4">
                <div className="h-5 w-16 bg-slate-800 rounded-full" />
                <div className="h-5 w-16 bg-slate-800 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Skills Skeleton */}
        <div className="space-y-6">
          <div className="h-7 w-28 bg-slate-800 rounded" />
          <div className="flex flex-wrap gap-2.5">
            <div className="h-7 w-20 bg-slate-800/80 rounded-md" />
            <div className="h-7 w-24 bg-slate-800/80 rounded-md" />
            <div className="h-7 w-28 bg-slate-800/80 rounded-md" />
            <div className="h-7 w-16 bg-slate-800/80 rounded-md" />
            <div className="h-7 w-24 bg-slate-800/80 rounded-md" />
          </div>
        </div>
      </main>
      <span className="sr-only">Loading portfolio content...</span>
    </div>
  );
}

