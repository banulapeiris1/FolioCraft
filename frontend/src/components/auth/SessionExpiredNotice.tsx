"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircleIcon } from "@/components/auth/AuthIcons";
import { isSessionExpiredReason } from "@/lib/authSession";

/**
 * Presentational banner explaining that the user was signed out because
 * their session expired (DASH-02).
 */
export function SessionExpiredBanner(): React.JSX.Element {
  return (
    <div
      role="status"
      data-testid="session-expired-notice"
      className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2"
    >
      <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1">
        <span>Your session has expired. Please sign in again to continue.</span>
      </div>
    </div>
  );
}

/**
 * Shows the banner when the login URL carries ?reason=session-expired.
 * Uses useSearchParams, so render it inside a <Suspense> boundary.
 */
export default function SessionExpiredNotice(): React.JSX.Element | null {
  const searchParams = useSearchParams();
  if (!isSessionExpiredReason(searchParams.get("reason"))) return null;
  return <SessionExpiredBanner />;
}
