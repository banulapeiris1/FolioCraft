import React from "react";
import { AlertCircleIcon } from "@/components/portfolio/PortfolioIcons";
import type { ApiErrorKind } from "@/lib/dashboard";

export interface DashboardErrorStateProps {
  kind: ApiErrorKind;
  /** Server-provided message, shown as supporting detail when present. */
  detail?: string | null;
  /**
   * What failed to load. "session" is used when the stored session could
   * not be verified at all (backend unreachable on page load).
   */
  context?: "portfolios" | "session";
  onRetry: () => void;
  isRetrying?: boolean;
}

interface ErrorCopy {
  title: string;
  description: string;
}

export function getDashboardErrorCopy(
  kind: ApiErrorKind,
  context: "portfolios" | "session" = "portfolios"
): ErrorCopy {
  if (context === "session") {
    return {
      title: "Can't reach FolioCraft",
      description:
        "We couldn't verify your session because the FolioCraft servers aren't responding. You're still signed in. Try again once your connection is back.",
    };
  }

  switch (kind) {
    case "network":
      return {
        title: "Can't reach FolioCraft",
        description:
          "We couldn't connect to the FolioCraft servers. Check your internet connection, then try again.",
      };
    case "server":
      return {
        title: "Something went wrong on our side",
        description:
          "The server ran into a problem while loading your portfolios. Please try again in a moment.",
      };
    case "auth":
      return {
        title: "Your session has expired",
        description: "Please sign in again to continue.",
      };
    default:
      return {
        title: "Unable to load your portfolios",
        description: "Something went wrong while loading your portfolios.",
      };
  }
}

/**
 * Error state for the dashboard (DASH-02).
 * Copy is chosen from the classified error so users can tell an outage
 * from a server fault, and the real server message is surfaced when useful.
 */
export default function DashboardErrorState({
  kind,
  detail,
  context = "portfolios",
  onRetry,
  isRetrying = false,
}: DashboardErrorStateProps): React.JSX.Element {
  const copy = getDashboardErrorCopy(kind, context);
  const showDetail =
    Boolean(detail) && (kind === "server" || kind === "generic") && detail !== copy.description;

  return (
    <div
      role="alert"
      data-testid="dashboard-error-state"
      data-error-kind={kind}
      className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 shadow-xs text-center max-w-lg mx-auto"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
        <AlertCircleIcon className="w-6 h-6" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-[#0f172a] mb-1">{copy.title}</h3>
      <p className="text-sm text-[#64748b] leading-relaxed">{copy.description}</p>
      {showDetail && (
        <p
          data-testid="dashboard-error-detail"
          className="mt-3 text-xs text-[#64748b] break-words"
        >
          Details: {detail}
        </p>
      )}
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        data-testid="dashboard-retry-button"
        className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2"
      >
        {isRetrying ? (
          <>
            <span
              className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>Retrying...</span>
          </>
        ) : (
          <span>Try Again</span>
        )}
      </button>
    </div>
  );
}
