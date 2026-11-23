import { cache } from "react";
import { getPublicPortfolio, ApiError } from "@/lib/api";
import type { PortfolioViewData } from "@/templates/types";
import type { Project } from "@/types/project";
import type { Skill } from "@/types/skill";
import type { Experience } from "@/types/experience";
import { normalizeAnimationStyle } from "@/templates/motion/motionConfig";

/**
 * Public portfolio data access for the /u/:username route family (Phase 12).
 *
 * Every public page (home, about, projects, project detail, experience) loads
 * its data through `loadPublicPortfolio`, so username validation, error mapping
 * and response normalization live in exactly one place. The loader is wrapped
 * in React `cache()`, so a page and its `generateMetadata` share a single
 * backend request per server render.
 */

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidUsernameFormat(username: string | null | undefined): boolean {
  if (!username) return false;
  const trimmed = username.trim();
  return trimmed.length >= 3 && trimmed.length <= 50 && USERNAME_PATTERN.test(trimmed);
}

export type PublicPortfolioResult =
  | { status: "ok"; data: PortfolioViewData; username: string }
  | { status: "invalid"; username: string }
  | { status: "not-found" }
  | { status: "unavailable" };

// ---------------------------------------------------------------------------
// Validation helpers — the public API is trusted but not assumed well-formed.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeProject(raw: unknown): Project | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const title = str(raw.title).trim();
  if (!id || !title) return null;
  return {
    id,
    portfolioId: str(raw.portfolioId),
    title,
    description: nullableStr(raw.description),
    technologies: Array.isArray(raw.technologies)
      ? raw.technologies
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    githubUrl: nullableStr(raw.githubUrl),
    projectUrl: nullableStr(raw.projectUrl),
    imageUrl: nullableStr(raw.imageUrl),
    orderIndex: num(raw.orderIndex),
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

function normalizeSkill(raw: unknown): Skill | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const name = str(raw.name).trim();
  if (!id || !name) return null;
  return {
    id,
    portfolioId: str(raw.portfolioId),
    name,
    category: str(raw.category),
    orderIndex: num(raw.orderIndex),
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

function normalizeExperience(raw: unknown): Experience | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const position = str(raw.position).trim();
  const company = str(raw.company).trim();
  if (!id || (!position && !company)) return null;
  return {
    id,
    portfolioId: str(raw.portfolioId),
    company,
    position,
    description: nullableStr(raw.description),
    startDate: str(raw.startDate),
    endDate: nullableStr(raw.endDate),
    isCurrent: raw.isCurrent === true,
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

function normalizeList<T>(value: unknown, normalize: (raw: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalize).filter((item): item is T => item !== null);
}

function normalizeSocialLinks(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const links: Record<string, string> = {};
  for (const [key, url] of Object.entries(value)) {
    if (typeof url === "string" && url.trim()) links[key] = url;
  }
  return links;
}

/**
 * Converts a raw public API portfolio payload into a safe PortfolioViewData.
 * Malformed collection items are dropped instead of crashing a template.
 */
export function normalizePublicPortfolio(
  raw: unknown,
  fallbackUsername: string
): PortfolioViewData {
  const p = isRecord(raw) ? raw : {};
  return {
    name: str(p.name),
    title: str(p.title),
    about: nullableStr(p.about),
    email: nullableStr(p.email),
    phone: nullableStr(p.phone),
    location: nullableStr(p.location),
    profileImageUrl: nullableStr(p.profileImageUrl),
    socialLinks: normalizeSocialLinks(p.socialLinks),
    username: str(p.username) || fallbackUsername,
    projects: normalizeList(p.projects, normalizeProject),
    skills: normalizeList(p.skills, normalizeSkill),
    experiences: normalizeList(p.experiences, normalizeExperience),
    template: str(p.template) || "modern",
    // Phase 14: saved style; missing/unknown values fall back to "subtle".
    animationStyle: normalizeAnimationStyle(p.animationStyle),
  };
}

/**
 * Loads a published portfolio by username and maps every outcome to a typed
 * result. Unpublished and nonexistent portfolios both map to "not-found" so
 * drafts cannot be enumerated.
 */
export const loadPublicPortfolio = cache(
  async (rawUsername: string): Promise<PublicPortfolioResult> => {
    const trimmed = (rawUsername || "").trim();
    if (!isValidUsernameFormat(trimmed)) {
      return { status: "invalid", username: trimmed };
    }

    const username = trimmed.toLowerCase();

    try {
      const response = await getPublicPortfolio(username, { cache: "no-store" });
      if (!response || !isRecord(response.portfolio)) {
        return { status: "not-found" };
      }
      return {
        status: "ok",
        username,
        data: normalizePublicPortfolio(response.portfolio, username),
      };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) return { status: "not-found" };
        if (err.status === 400) return { status: "invalid", username: trimmed };
      }
      return { status: "unavailable" };
    }
  }
);

/**
 * Absolute-or-relative canonical URL for a public portfolio path.
 */
export function canonicalUrl(path: string): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  return appUrl ? `${appUrl}${path}` : path;
}

/**
 * Metadata for invalid-username and service-unavailable responses. These
 * pages render with HTTP 200, so they are explicitly marked noindex
 * (resolves Phase 10 limitation L2).
 */
export const PORTFOLIO_NOT_FOUND_METADATA = {
  title: "Portfolio Not Found | FolioCraft",
  description: "The requested developer portfolio could not be found or is not published.",
  robots: { index: false, follow: false },
} as const;
