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
 * Human-readable tenure derived from experience dates: "2 yrs 3 mos", "8 mos".
 * Returns "" when the start date is missing/invalid or the range is negative.
 * `now` is injectable so the result is deterministic in tests.
 */
export function formatTenure(
  startDate?: string | null,
  endDate?: string | null,
  isCurrent?: boolean,
  now: Date = new Date()
): string {
  const parse = (value?: string | null): number | null => {
    const [y, m] = (value || "").split("-").map((part) => parseInt(part, 10));
    if (!Number.isFinite(y)) return null;
    return y * 12 + ((Number.isFinite(m) ? m : 1) - 1);
  };
  const start = parse(startDate);
  if (start === null) return "";
  const end = isCurrent || !endDate ? (isCurrent ? now.getFullYear() * 12 + now.getMonth() : null) : parse(endDate);
  if (end === null || end < start) return "";
  const total = end - start + 1;
  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "yr" : "yrs"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "mo" : "mos"}`);
  return parts.join(" ");
}

/** Up to two initials for monogram marks: "Jane van Doe" -> "JD"; empty -> "P". */
export function getInitials(name?: string | null): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "P";
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

/** Display label for a social platform key: "github" -> "GitHub". */
export function socialPlatformLabel(key: string): string {
  const normalized = key.trim();
  const lower = normalized.toLowerCase();
  if (lower === "linkedin") return "LinkedIn";
  if (lower === "github") return "GitHub";
  if (lower === "twitter" || lower === "x") return "X / Twitter";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export interface SafeSocialLink {
  platform: string;
  label: string;
  href: string;
}

/** Social links with unsafe or empty URLs removed (Phase 13 templates). */
export function getSafeSocialLinks(links?: Record<string, string | undefined> | null): SafeSocialLink[] {
  return Object.entries(links || {})
    .map(([platform, url]) => ({ platform, label: socialPlatformLabel(platform), href: safeExternalUrl(url) }))
    .filter((link): link is SafeSocialLink => link.href !== null);
}

export interface PortfolioStats {
  projects: number;
  skills: number;
  roles: number;
  /** Distinct technologies across all projects (case-insensitive). */
  technologies: number;
  /** Year of the earliest experience start date, or null when unknown. */
  since: number | null;
}

/** Counts derived purely from existing portfolio data — nothing is invented. */
export function getPortfolioStats(data: PortfolioViewData): PortfolioStats {
  const techs = new Set<string>();
  for (const project of data.projects) {
    for (const tech of project.technologies || []) techs.add(tech.trim().toLowerCase());
  }
  techs.delete("");
  const years = data.experiences
    .map((exp) => parseInt((exp.startDate || "").slice(0, 4), 10))
    .filter((year) => Number.isFinite(year) && year > 1900);
  return {
    projects: data.projects.length,
    skills: data.skills.length,
    roles: data.experiences.length,
    technologies: techs.size,
    since: years.length > 0 ? Math.min(...years) : null,
  };
}

/**
 * Groups projects (in display order) under each technology they use, most-used
 * technology first, then alphabetical. Spelling of the first occurrence wins.
 */
export function groupProjectsByTechnology(projects: Project[]): Array<[string, Project[]]> {
  const groups = new Map<string, { label: string; projects: Project[] }>();
  for (const project of sortProjects(projects)) {
    const seen = new Set<string>();
    for (const raw of project.technologies || []) {
      const label = raw.trim();
      const key = label.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const group = groups.get(key) || { label, projects: [] };
      group.projects.push(project);
      groups.set(key, group);
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.projects.length - a.projects.length || a.label.localeCompare(b.label))
    .map((g) => [g.label, g.projects]);
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
