import type { Project } from "@/types/project";
import type { Experience } from "@/types/experience";
import type { Skill } from "@/types/skill";
import type { PortfolioViewData } from "../types";

/**
 * Pure, framework-free model for the multi-page public portfolio (Phase 12).
 *
 * Holds URL building, project slugs, ordering and previous/next resolution so
 * that routes and presentation components stay thin and this logic stays
 * unit-testable.
 */

export type SitePageKey = "home" | "about" | "projects" | "experience";

export interface SiteNavItem {
  key: SitePageKey;
  label: string;
  href: string;
}

export interface ProjectEntry {
  project: Project;
  slug: string;
  /** Zero-based position in display order. */
  index: number;
}

export interface ProjectLocation {
  entry: ProjectEntry;
  previous: ProjectEntry | null;
  next: ProjectEntry | null;
  total: number;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function portfolioPaths(username: string) {
  const base = `/u/${encodeURIComponent(username)}`;
  return {
    home: base,
    about: `${base}/about`,
    projects: `${base}/projects`,
    experience: `${base}/experience`,
    project: (slug: string) => `${base}/projects/${encodeURIComponent(slug)}`,
  };
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/** Display order used by every template: orderIndex ascending (stable). */
export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

/** Display order used by every template: current roles first, then newest. */
export function sortExperiences(experiences: Experience[]): Experience[] {
  return [...experiences].sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    return (b.startDate || "").localeCompare(a.startDate || "");
  });
}

/** Groups skills by category (defaulting to "Technologies"), ordered by orderIndex. */
export function groupSkills(skills: Skill[]): Array<[string, Skill[]]> {
  const groups: Record<string, Skill[]> = {};
  for (const skill of skills) {
    const category = (skill.category || "").trim() || "Technologies";
    (groups[category] ||= []).push(skill);
  }
  for (const list of Object.values(groups)) {
    list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }
  return Object.entries(groups);
}

// ---------------------------------------------------------------------------
// Project slugs
// ---------------------------------------------------------------------------

const MAX_SLUG_LENGTH = 80;

/**
 * URL-safe slug from free text: "Café API (v2)!" -> "cafe-api-v2".
 * Long slugs are cut at the last word boundary within MAX_SLUG_LENGTH.
 */
export function slugify(text: string): string {
  const full = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (full.length <= MAX_SLUG_LENGTH) return full;
  const cut = full.slice(0, MAX_SLUG_LENGTH);
  const lastBreak = cut.lastIndexOf("-");
  return lastBreak > 0 ? cut.slice(0, lastBreak) : cut;
}

/**
 * Assigns a unique, deterministic slug to every project in display order.
 *
 * - Base slug comes from the title.
 * - Duplicates get "-2", "-3", … in display order (first occurrence keeps the base).
 * - Titles with no URL-safe characters fall back to "project-<position>".
 */
export function buildProjectEntries(projects: Project[]): ProjectEntry[] {
  const used = new Set<string>();
  return sortProjects(projects).map((project, index) => {
    const base = slugify(project.title || "") || `project-${index + 1}`;
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix++}`;
    }
    used.add(slug);
    return { project, slug, index };
  });
}

function normalizeSlugParam(raw: string): string {
  let value = raw || "";
  try {
    value = decodeURIComponent(value);
  } catch {
    // Malformed escape sequences simply won't match any slug.
  }
  return value.trim().toLowerCase();
}

/** Finds a project by slug with its neighbours; null for unknown slugs. */
export function findProjectBySlug(
  entries: ProjectEntry[],
  rawSlug: string
): ProjectLocation | null {
  const slug = normalizeSlugParam(rawSlug);
  if (!slug) return null;
  const position = entries.findIndex((entry) => entry.slug === slug);
  if (position === -1) return null;
  return {
    entry: entries[position],
    previous: position > 0 ? entries[position - 1] : null,
    next: position < entries.length - 1 ? entries[position + 1] : null,
    total: entries.length,
  };
}

/** Lookup used by templates to link project cards to their detail page. */
export function createProjectHrefResolver(
  username: string,
  projects: Project[]
): (project: Project) => string | undefined {
  const paths = portfolioPaths(username);
  const slugById = new Map(buildProjectEntries(projects).map((e) => [e.project.id, e.slug]));
  return (project) => {
    const slug = slugById.get(project.id);
    return slug ? paths.project(slug) : undefined;
  };
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/**
 * Site navigation items. Home and About are always present; Projects and
 * Experience only appear when they have content, or when they are the page
 * being viewed (so an empty page opened directly still shows as current).
 */
export function getSiteNavItems(
  data: PortfolioViewData,
  username: string,
  current?: SitePageKey
): SiteNavItem[] {
  const paths = portfolioPaths(username);
  const items: SiteNavItem[] = [
    { key: "home", label: "Home", href: paths.home },
    { key: "about", label: "About", href: paths.about },
  ];
  if (data.projects.length > 0 || current === "projects") {
    items.push({ key: "projects", label: "Projects", href: paths.projects });
  }
  if (data.experiences.length > 0 || current === "experience") {
    items.push({ key: "experience", label: "Experience", href: paths.experience });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Formatting & link safety
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonth(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  const monthIndex = parseInt(month, 10) - 1;
  if (year && monthIndex >= 0 && monthIndex < 12) return `${MONTHS[monthIndex]} ${year}`;
  return dateStr;
}

export function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
  isCurrent?: boolean
): string {
  if (!startDate) return "";
  const start = formatMonth(startDate);
  if (isCurrent) return `${start} — Present`;
  if (endDate) return `${start} — ${formatMonth(endDate)}`;
  return start;
}

/**
 * Returns a safe external http(s) URL, or null when the value cannot be made
 * safe (e.g. `javascript:` / `data:` schemes). Bare domains get https://.
 */
export function safeExternalUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}
