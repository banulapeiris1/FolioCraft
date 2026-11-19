import React from "react";
import type { PortfolioStatus } from "@/lib/dashboard";

export interface PortfolioStatusBadgeProps {
  status: PortfolioStatus;
  className?: string;
}

const STATUS_STYLES: Record<PortfolioStatus, { label: string; badge: string; dot: string }> = {
  live: {
    label: "Published",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500 animate-pulse motion-reduce:animate-none",
  },
  draft: {
    label: "Draft",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  unpublished: {
    label: "Unpublished",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

export function getStatusLabel(status: PortfolioStatus): string {
  return STATUS_STYLES[status].label;
}

/**
 * Publishing status pill (DASH-04). Colour is always paired with a text
 * label, so the status never relies on colour alone.
 */
export default function PortfolioStatusBadge({
  status,
  className = "",
}: PortfolioStatusBadgeProps): React.JSX.Element {
  const style = STATUS_STYLES[status];
  return (
    <span
      data-testid="portfolio-status-badge"
      data-status={status}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${style.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {style.label}
    </span>
  );
}
