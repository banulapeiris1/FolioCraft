import React from "react";
import { CheckCircleIcon, XIcon } from "@/components/portfolio/PortfolioIcons";

export interface DashboardNoticeProps {
  message: string | null;
  onDismiss: () => void;
}

/**
 * Polite live region for dashboard action feedback (DASH-05).
 * The region is always rendered so screen readers announce new messages.
 */
export default function DashboardNotice({
  message,
  onDismiss,
}: DashboardNoticeProps): React.JSX.Element {
  return (
    <div role="status" aria-live="polite" data-testid="dashboard-notice-region">
      {message && (
        <div
          data-testid="dashboard-notice"
          className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-start gap-2.5"
        >
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span className="flex-1 break-words">{message}</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss message"
            className="p-0.5 rounded-md text-emerald-700 hover:text-emerald-950 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
