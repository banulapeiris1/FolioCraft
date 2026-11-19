import React from "react";
import { PortfolioCardSkeleton } from "@/components/portfolio/PortfolioCard";

export interface PortfolioGridSkeletonProps {
  count?: number;
}

/**
 * Accessible loading placeholder for the portfolio grid (DASH-02).
 * Announces the loading state to assistive technology while the
 * decorative skeleton cards stay hidden from it.
 */
export default function PortfolioGridSkeleton({
  count = 3,
}: PortfolioGridSkeletonProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="portfolio-grid-skeleton"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
    >
      <span className="sr-only">Loading your portfolios...</span>
      {Array.from({ length: count }, (_, i) => (
        <PortfolioCardSkeleton key={i} />
      ))}
    </div>
  );
}
