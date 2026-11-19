/**
 * Session restoration helpers (DASH-02).
 *
 * Kept free of React so the decisions can be unit-tested without a DOM.
 */

import { ApiError } from "./api";

/** Query value appended to /login when a session expires mid-use. */
export const SESSION_EXPIRED_REASON = "session-expired";

/** Login route that shows the "session expired" notice. */
export const LOGIN_SESSION_EXPIRED_PATH = `/login?reason=${SESSION_EXPIRED_REASON}`;

/**
 * What to do when verifying a stored token (GET /api/auth/me) fails.
 *
 * - "clear": the server rejected the token (401) or the user no longer
 *   exists (404). The stored token is useless and must be removed.
 * - "unavailable": the server could not be reached or failed (network
 *   error, 5xx, misconfiguration). The token may still be valid, so it is
 *   kept and the UI shows a service-unavailable state instead of logging out.
 */
export type SessionRestoreOutcome = "clear" | "unavailable";

export function resolveSessionRestoreFailure(error: unknown): SessionRestoreOutcome {
  if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
    return "clear";
  }
  return "unavailable";
}

export function isSessionExpiredReason(reason: string | null | undefined): boolean {
  return reason === SESSION_EXPIRED_REASON;
}
