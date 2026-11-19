import React from "react";
import Link from "next/link";
import { PlusIcon } from "@/components/portfolio/PortfolioIcons";

export interface DashboardHeaderProps {
  firstName: string;
  /**
   * Hide the Create action when the empty state already shows its own
   * prominent Create button, so the page has a single primary action.
   */
  showCreateAction?: boolean;
  /** Optional summary content rendered under the greeting (stats). */
  children?: React.ReactNode;
}

/**
 * Workspace header for the dashboard (DASH-03).
 * Replaces the auth-phase placeholder hero with a greeting, a short
 * workspace description, the primary Create action and summary stats.
 */
export default function DashboardHeader({
  firstName,
  showCreateAction = true,
  children,
}: DashboardHeaderProps): React.JSX.Element {
  return (
    <section
      aria-labelledby="dashboard-heading"
      data-testid="dashboard-header"
      className="bg-white rounded-3xl border border-[#eae6f5] shadow-xl shadow-[#6e56cf]/5 p-6 sm:p-8 relative overflow-hidden"
    >
      {/* Static ambient glow (decorative, no animation) */}
      <div
        className="absolute -top-20 -right-20 w-72 h-72 bg-[#6e56cf]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div className="min-w-0">
            <h1
              id="dashboard-heading"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a] break-words"
            >
              Welcome, {firstName}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#475569] max-w-xl leading-relaxed">
              Your portfolio workspace. Create, edit and publish your developer
              portfolios, and see what&apos;s live at a glance.
            </p>
          </div>

          {showCreateAction && (
            <Link
              href="/portfolio/create"
              data-testid="dashboard-header-create"
              className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-md shadow-[#6e56cf]/25 hover:shadow-lg hover:shadow-[#6e56cf]/35 transition-colors active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Portfolio</span>
            </Link>
          )}
        </div>

        {children && <div className="mt-6 pt-6 border-t border-[#f1edf9]">{children}</div>}
      </div>
    </section>
  );
}
