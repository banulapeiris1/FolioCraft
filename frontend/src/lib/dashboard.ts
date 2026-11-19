/**
 * Dashboard helpers (Phase 11).
 *
 * Pure functions only, so dashboard behaviour can be unit-tested with
 * node:test and static rendering.
 */

import { ApiError } from "./api";
import type { Portfolio, PortfolioSectionCounts } from "../types/portfolio";

/**
 * Category of a failed API request, used to pick the right recovery UI.
 * - network: the server could not be reached (ApiError status 0)
 * - auth:    the session is no longer valid (401)
 * - server:  the server failed (5xx)
 * - generic: anything else (4xx, unexpected client errors)
 */
export type ApiErrorKind = "network" | "auth" | "server" | "generic";

export interface ClassifiedApiError {
  kind: ApiErrorKind;
  /**
   * Server-provided message worth showing to the user, if any.
   * Omitted for network and auth errors, whose messages are technical
   * or replaced by dedicated copy.
   */
  detail: string | null;
}

export function classifyApiError(error: unknown): ClassifiedApiError {
  if (error instanceof ApiError) {
    if (error.status === 0) return { kind: "network", detail: null };
    if (error.status === 401) return { kind: "auth", detail: null };
    const detail = error.message?.trim() || null;
    if (error.status >= 500) return { kind: "server", detail };
    return { kind: "generic", detail };
  }
  return { kind: "generic", detail: null };
}

// ---------------------------------------------------------------------------
// DASH-03: Workspace statistics
// ---------------------------------------------------------------------------

export interface DashboardStats {
  total: number;
  published: number;
  /** Portfolios that are not currently live. */
  drafts: number;
  /**
   * Totals across all portfolios, or null when the API did not provide
   * section counts for every portfolio (never guessed).
   */
  content: PortfolioSectionCounts | null;
}

export function computeDashboardStats(portfolios: readonly Portfolio[]): DashboardStats {
  const published = portfolios.filter((p) => p.published === true).length;
  const hasAllCounts = portfolios.every((p) => isValidSectionCounts(p.sectionCounts));

  const content = hasAllCounts
    ? portfolios.reduce<PortfolioSectionCounts>(
        (sum, p) => ({
          projects: sum.projects + p.sectionCounts!.projects,
          skills: sum.skills + p.sectionCounts!.skills,
          experience: sum.experience + p.sectionCounts!.experience,
        }),
        { projects: 0, skills: 0, experience: 0 }
      )
    : null;

  return {
    total: portfolios.length,
    published,
    drafts: portfolios.length - published,
    content,
  };
}

function isValidSectionCounts(counts: unknown): counts is PortfolioSectionCounts {
  if (!counts || typeof counts !== "object") return false;
  const c = counts as Record<string, unknown>;
  return (["projects", "skills", "experience"] as const).every(
    (key) => typeof c[key] === "number" && Number.isFinite(c[key]) && (c[key] as number) >= 0
  );
}

/** First word of the user's name for the greeting, with a safe fallback. */
export function getFirstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

// ---------------------------------------------------------------------------
// DASH-04: Portfolio status & publishing dates
// ---------------------------------------------------------------------------

/**
 * Publishing status shown on portfolio cards.
 * - live:        currently published
 * - unpublished: not published now, but has a recorded first-publish date
 *                (published_at is set on first publish and kept on unpublish)
 * - draft:       never published (no recorded publish date)
 */
export type PortfolioStatus = "draft" | "live" | "unpublished";

export function getPortfolioStatus(
  portfolio: Pick<Portfolio, "published" | "publishedAt">
): PortfolioStatus {
  if (portfolio.published === true) return "live";
  return parseValidDate(portfolio.publishedAt) ? "unpublished" : "draft";
}

function parseValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Feb 15, 2026", or null for a missing or invalid date. */
export function formatPortfolioDate(value: string | null | undefined): string | null {
  const date = parseValidDate(value);
  if (!date) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Publishing history line for a card, built only from publishedAt.
 * publishedAt is the FIRST publish date (re-publishing keeps it), so it is
 * labelled "First published" rather than "Live since". Returns null when
 * no date is recorded (never published, or published before the column existed).
 */
export function getPublishingInfo(
  portfolio: Pick<Portfolio, "published" | "publishedAt">
): string | null {
  const date = formatPortfolioDate(portfolio.publishedAt);
  if (!date) return null;
  return getPortfolioStatus(portfolio) === "live"
    ? `First published ${date}`
    : `Offline · first published ${date}`;
}

// ---------------------------------------------------------------------------
// DASH-05: Portfolio deletion
// ---------------------------------------------------------------------------

/**
 * What the dashboard should do after a failed delete request.
 * - session-expired: token rejected (401); end the session (DASH-02 flow)
 * - already-deleted: 404; the portfolio no longer exists, so drop it locally
 * - show-error:      keep the dialog open and show the message
 */
export type DeleteFailureResolution =
  | { action: "session-expired" }
  | { action: "already-deleted" }
  | { action: "show-error"; message: string };

export function resolveDeleteFailure(error: unknown): DeleteFailureResolution {
  if (error instanceof ApiError) {
    if (error.status === 401) return { action: "session-expired" };
    if (error.status === 404) return { action: "already-deleted" };
    if (error.status === 403) {
      return {
        action: "show-error",
        message: "You don't have permission to delete this portfolio. Nothing was deleted.",
      };
    }
    if (error.status === 0) {
      return {
        action: "show-error",
        message:
          "Couldn't reach FolioCraft, so your portfolio was not deleted. Check your connection and try again.",
      };
    }
    if (error.status >= 500) {
      return {
        action: "show-error",
        message: "The server couldn't delete this portfolio. Nothing was changed. Please try again.",
      };
    }
    return {
      action: "show-error",
      message: error.message?.trim() || "Unable to delete this portfolio. Please try again.",
    };
  }
  return { action: "show-error", message: "Unable to delete this portfolio. Please try again." };
}

/**
 * Describes the content a delete will remove, from DASH-03 section counts.
 * Returns null when counts are unavailable, so the dialog falls back to
 * generic wording instead of guessing.
 */
export function describeDeletedContent(
  counts: PortfolioSectionCounts | undefined | null
): string | null {
  if (!counts) return null;
  const parts: string[] = [];
  const add = (n: number, one: string, many: string) => {
    if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`);
  };
  add(counts.projects, "project", "projects");
  add(counts.skills, "skill", "skills");
  add(counts.experience, "experience entry", "experience entries");
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Confirmation phrase check for deleting a live portfolio (case-insensitive). */
export function matchesDeleteConfirmation(input: string, username: string): boolean {
  return input.trim().toLowerCase() === username.trim().toLowerCase() && username.trim() !== "";
}

export type DeleteOutcome =
  | { kind: "deleted" }
  | { kind: "already-deleted" }
  | { kind: "session-expired" }
  | { kind: "error"; message: string };

/**
 * Runs the delete request and maps the result to a dashboard outcome.
 * `deleteFn` is injectable for tests; the dashboard uses deletePortfolio.
 */
export async function performPortfolioDelete(
  portfolioId: string,
  token: string,
  deleteFn: (id: string, token: string) => Promise<unknown>
): Promise<DeleteOutcome> {
  try {
    await deleteFn(portfolioId, token);
    return { kind: "deleted" };
  } catch (error) {
    const resolution = resolveDeleteFailure(error);
    if (resolution.action === "session-expired") return { kind: "session-expired" };
    if (resolution.action === "already-deleted") return { kind: "already-deleted" };
    return { kind: "error", message: resolution.message };
  }
}
