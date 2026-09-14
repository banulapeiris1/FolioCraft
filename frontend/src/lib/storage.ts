/**
 * FolioCraft Authentication Storage Utility
 *
 * ARCHITECTURAL DECISION & MVP TRADEOFF:
 * ----------------------------------------------------
 * The FolioCraft MVP backend currently operates as a stateless Bearer token service
 * (expecting `Authorization: Bearer <JWT>`) without server-set httpOnly cookies
 * or refresh token rotation.
 *
 * Therefore, `localStorage` is used to persist the JWT across page refreshes.
 *
 * Tradeoff & Security Consideration:
 * - Storing tokens in `localStorage` allows client-side restoration after refresh.
 * - However, it exposes the token to any script running in the browser context (XSS risk).
 * - Production hardening should migrate toward `httpOnly`, `SameSite`, `Secure` cookies
 *   combined with short-lived access tokens and refresh rotation.
 */

const AUTH_TOKEN_KEY = "folioCraft_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Gracefully handle quota exceeded or storage disabled
  }
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Gracefully handle storage disabled
  }
}
