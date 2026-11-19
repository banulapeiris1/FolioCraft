import React from "react";
import type { DashboardStats as DashboardStatsData } from "@/lib/dashboard";

export interface DashboardStatsProps {
  stats: DashboardStatsData;
}

type Accent = "brand" | "live" | "draft" | "neutral";

interface StatTile {
  key: string;
  label: string;
  /** null = not provided by the API; rendered as an em dash, never guessed. */
  value: number | null;
  hint: string;
  accent: Accent;
}

const ACCENT_DOT: Record<Accent, string> = {
  brand: "bg-[#6e56cf]",
  live: "bg-emerald-500",
  draft: "bg-amber-400",
  neutral: "bg-[#cbd5e1]",
};

const GRID_CLASSES = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3";

export function buildStatTiles(stats: DashboardStatsData): StatTile[] {
  const content = stats.content;
  return [
    { key: "total", label: "Portfolios", value: stats.total, hint: "In your workspace", accent: "brand" },
    { key: "published", label: "Published", value: stats.published, hint: "Live right now", accent: "live" },
    { key: "drafts", label: "Drafts", value: stats.drafts, hint: "Not live yet", accent: "draft" },
    { key: "projects", label: "Projects", value: content ? content.projects : null, hint: "Across portfolios", accent: "neutral" },
    { key: "skills", label: "Skills", value: content ? content.skills : null, hint: "Across portfolios", accent: "neutral" },
    { key: "experience", label: "Experience", value: content ? content.experience : null, hint: "Roles listed", accent: "neutral" },
  ];
}

/**
 * Workspace summary statistics (DASH-03).
 * All values come from GET /api/portfolios; content totals are shown only
 * when the API provided section counts for every portfolio.
 */
export default function DashboardStats({ stats }: DashboardStatsProps): React.JSX.Element {
  const tiles = buildStatTiles(stats);

  return (
    <dl aria-label="Workspace summary" data-testid="dashboard-stats" className={GRID_CLASSES}>
      {tiles.map((tile) => (
        <div
          key={tile.key}
          data-testid={`dashboard-stat-${tile.key}`}
          className="rounded-2xl bg-[#fbfaff] border border-[#eae6f5] px-4 py-3.5 min-w-0"
        >
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ACCENT_DOT[tile.accent]}`} aria-hidden="true" />
            <span className="truncate">{tile.label}</span>
          </dt>
          <dd className="mt-1.5">
            {tile.value === null ? (
              <span className="text-2xl font-bold text-[#64748b]" title="Not available">
                <span aria-hidden="true">—</span>
                <span className="sr-only">Not available</span>
              </span>
            ) : (
              <span className="text-2xl font-bold tracking-tight text-[#0f172a] tabular-nums">
                {tile.value}
              </span>
            )}
            <span className="block text-[11px] text-[#64748b] mt-0.5 truncate">{tile.hint}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Loading placeholder matching the stats grid (decorative). */
export function DashboardStatsSkeleton(): React.JSX.Element {
  return (
    <div aria-hidden="true" data-testid="dashboard-stats-skeleton" className={GRID_CLASSES}>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-[#fbfaff] border border-[#eae6f5] px-4 py-3.5 animate-pulse motion-reduce:animate-none"
        >
          <div className="h-3 bg-slate-200 rounded w-16" />
          <div className="h-6 bg-slate-200 rounded w-8 mt-2.5" />
          <div className="h-2.5 bg-slate-100 rounded w-20 mt-2" />
        </div>
      ))}
    </div>
  );
}
