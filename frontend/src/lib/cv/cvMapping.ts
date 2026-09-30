/**
 * CV Data Mapping, Normalization, and Deduplication Utilities (CV-09)
 *
 * Provides non-destructive transformations from StructuredCvData
 * to PortfolioForm, Experience, Skill, and Project data models.
 */

import type {
  StructuredCvPersonal,
  StructuredCvExperience,
  StructuredCvSkill,
  StructuredCvProject,
} from "@/types/cv";
import type { PortfolioFormData } from "@/types/portfolio";
import type { Experience } from "@/types/experience";
import type { Skill, CatalogSkill } from "@/types/skill";
import type { Project } from "@/types/project";

// ============================================================================
// 1. DATE NORMALIZATION
// ============================================================================

export interface NormalizedDateResult {
  date: string | null; // YYYY-MM-DD or null
  isValid: boolean;
  isCurrentIndicator: boolean;
  raw: string;
}

const MONTH_MAP: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  september: "09",
  sept: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

/**
 * Strictly validates that a string is a real calendar date in YYYY-MM-DD format.
 */
export function isValidCalendarDate(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [yearStr, monthStr, dayStr] = val.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Normalizes freeform CV date strings into strict YYYY-MM-DD format.
 * Never invents today's date.
 */
export function normalizeCvDate(dateStr?: string | null): NormalizedDateResult {
  if (!dateStr || !dateStr.trim()) {
    return { date: null, isValid: true, isCurrentIndicator: false, raw: "" };
  }

  const raw = dateStr.trim();
  const lower = raw.toLowerCase();

  // Present / Current / Now indicators
  if (/^(?:present|current|now)$/i.test(lower)) {
    return { date: null, isValid: true, isCurrentIndicator: true, raw };
  }

  // Exact ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    if (isValidCalendarDate(raw)) {
      return { date: raw, isValid: true, isCurrentIndicator: false, raw };
    }
    return { date: null, isValid: false, isCurrentIndicator: false, raw };
  }

  // Year only: e.g. "2021" -> "2021-01-01"
  if (/^\d{4}$/.test(raw)) {
    const yr = Number(raw);
    if (yr >= 1950 && yr <= 2100) {
      return {
        date: `${raw}-01-01`,
        isValid: true,
        isCurrentIndicator: false,
        raw,
      };
    }
    return { date: null, isValid: false, isCurrentIndicator: false, raw };
  }

  // Month and Year: e.g. "May 2021", "Jan 2022", "September, 2020"
  const monthYearMatch = raw.match(
    /^([A-Za-z]+)[,\s.]+(\d{4})$/
  );
  if (monthYearMatch) {
    const monthName = monthYearMatch[1]!.toLowerCase();
    const year = monthYearMatch[2]!;
    const monthNum = MONTH_MAP[monthName];
    if (monthNum) {
      const candidate = `${year}-${monthNum}-01`;
      if (isValidCalendarDate(candidate)) {
        return {
          date: candidate,
          isValid: true,
          isCurrentIndicator: false,
          raw,
        };
      }
    }
  }

  // Year and Month: e.g. "2021-05", "2021/05"
  const yearMonthMatch = raw.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonthMatch) {
    const year = yearMonthMatch[1]!;
    const month = yearMonthMatch[2]!.padStart(2, "0");
    const candidate = `${year}-${month}-01`;
    if (isValidCalendarDate(candidate)) {
      return {
        date: candidate,
        isValid: true,
        isCurrentIndicator: false,
        raw,
      };
    }
  }

  // Month / Year with digits: e.g. "05/2021" or "5/2021"
  const digitMonthYearMatch = raw.match(/^(\d{1,2})[-/](\d{4})$/);
  if (digitMonthYearMatch) {
    const month = digitMonthYearMatch[1]!.padStart(2, "0");
    const year = digitMonthYearMatch[2]!;
    const candidate = `${year}-${month}-01`;
    if (isValidCalendarDate(candidate)) {
      return {
        date: candidate,
        isValid: true,
        isCurrentIndicator: false,
        raw,
      };
    }
  }

  // Unparseable / ambiguous date format
  return { date: null, isValid: false, isCurrentIndicator: false, raw };
}

// ============================================================================
// 2. PROFILE MERGE (NON-DESTRUCTIVE)
// ============================================================================

export interface ProfileMergeOptions {
  overwriteExisting?: boolean;
}

export interface ProfileMergeResult {
  merged: Partial<PortfolioFormData>;
  changedFields: string[];
  preservedFields: string[];
}

/**
 * Merges parsed CV personal information into existing portfolio form data.
 * Non-destructive: preserves existing non-empty fields by default.
 * Never modifies username, title, profileImageUrl, template, or published.
 */
export function mergeProfileData(
  current: Partial<PortfolioFormData>,
  parsed: StructuredCvPersonal,
  options: ProfileMergeOptions = {}
): ProfileMergeResult {
  const overwrite = options.overwriteExisting ?? false;
  const merged: Partial<PortfolioFormData> = {
    ...current,
    socialLinks: { ...(current.socialLinks || {}) },
  };

  const changedFields: string[] = [];
  const preservedFields: string[] = [];

  const updateField = (
    fieldKey: "name" | "email" | "phone" | "location" | "about",
    parsedVal?: string
  ) => {
    if (!parsedVal || !parsedVal.trim()) return;

    const currentVal = current[fieldKey];
    const isCurrentEmpty = !currentVal || !currentVal.trim();

    if (isCurrentEmpty || overwrite) {
      merged[fieldKey] = parsedVal.trim();
      changedFields.push(fieldKey);
    } else {
      preservedFields.push(fieldKey);
    }
  };

  const updateSocialLink = (
    platform: "website" | "linkedin" | "github",
    parsedUrl?: string
  ) => {
    if (!parsedUrl || !parsedUrl.trim()) return;

    const currentLinks = current.socialLinks || {};
    const currentUrl = currentLinks[platform];
    const isCurrentEmpty = !currentUrl || !currentUrl.trim();

    if (isCurrentEmpty || overwrite) {
      merged.socialLinks![platform] = parsedUrl.trim();
      changedFields.push(`socialLinks.${platform}`);
    } else {
      preservedFields.push(`socialLinks.${platform}`);
    }
  };

  // Map candidate fields
  updateField("name", parsed.fullName);
  updateField("email", parsed.email);
  updateField("phone", parsed.phone);
  updateField("location", parsed.location);
  updateField("about", parsed.summary);

  updateSocialLink("website", parsed.website);
  updateSocialLink("linkedin", parsed.linkedin);
  updateSocialLink("github", parsed.github);

  // Strictly preserve immutable or identity fields
  merged.username = current.username;
  merged.title = current.title;
  merged.profileImageUrl = current.profileImageUrl;
  merged.template = current.template;

  return { merged, changedFields, preservedFields };
}

// ============================================================================
// 3. EXPERIENCE MAPPING & DEDUPLICATION
// ============================================================================

export interface PreparedExperience {
  id: string; // generated temporary UI id
  company: string;
  position: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  rawStartDate: string;
  rawEndDate: string;
  isDateValid: boolean;
  needsDateReview: boolean;
  isDuplicate: boolean;
  selected: boolean;
}

export function prepareExperienceImports(
  parsedList: StructuredCvExperience[],
  existingList: Experience[] = []
): { items: PreparedExperience[]; duplicateCount: number } {
  const existingSet = new Set(
    existingList.map(
      (e) => `${e.company.toLowerCase().trim()}:::${e.position.toLowerCase().trim()}`
    )
  );

  const seenInBatch = new Set<string>();
  let duplicateCount = 0;

  const items: PreparedExperience[] = parsedList.map((cvExp, idx) => {
    const company = cvExp.company?.trim() || "";
    const position = cvExp.position?.trim() || "";
    const description = cvExp.description?.trim() || "";

    const key = `${company.toLowerCase()}:::${position.toLowerCase()}`;
    const isDuplicate = existingSet.has(key) || seenInBatch.has(key);

    if (isDuplicate) {
      duplicateCount++;
    } else {
      seenInBatch.add(key);
    }

    const startNorm = normalizeCvDate(cvExp.startDate);
    const endNorm = normalizeCvDate(cvExp.endDate);

    const isCurrent = cvExp.isCurrent || endNorm.isCurrentIndicator;
    const finalEndDate = isCurrent ? null : endNorm.date;

    const isDateValid = startNorm.isValid && (isCurrent || endNorm.isValid);
    const hasStartDate = Boolean(startNorm.date);

    return {
      id: `cv-exp-${idx}-${Date.now()}`,
      company,
      position,
      description,
      startDate: startNorm.date,
      endDate: finalEndDate,
      isCurrent,
      rawStartDate: cvExp.startDate || "",
      rawEndDate: cvExp.endDate || "",
      isDateValid: isDateValid && hasStartDate,
      needsDateReview: !startNorm.date || (!isCurrent && !endNorm.date && Boolean(cvExp.endDate)),
      isDuplicate,
      selected: !isDuplicate && Boolean(company && position && startNorm.date),
    };
  });

  return { items, duplicateCount };
}

// ============================================================================
// 4. SKILLS MAPPING, CATEGORY RESOLUTION & DEDUPLICATION
// ============================================================================

export interface PreparedSkill {
  id: string; // generated temporary UI id
  name: string;
  category: string;
  isFromCatalog: boolean;
  isDuplicate: boolean;
  selected: boolean;
}

/**
 * Resolves skill category against predefined catalog and deduplicates
 * against existing portfolio skills.
 */
export function prepareSkillImports(
  parsedList: StructuredCvSkill[],
  existingList: Skill[] = [],
  catalogList: CatalogSkill[] = []
): { items: PreparedSkill[]; duplicateCount: number } {
  // Existing skills lowercase lookup
  const existingSet = new Set(
    existingList.map((s) => s.name.toLowerCase().trim())
  );

  // Catalog lowercase lookup
  const catalogMap = new Map<string, string>();
  for (const catSkill of catalogList) {
    catalogMap.set(catSkill.name.toLowerCase().trim(), catSkill.category.trim());
  }

  const seenInBatch = new Set<string>();
  let duplicateCount = 0;

  const items: PreparedSkill[] = [];

  for (let idx = 0; idx < parsedList.length; idx++) {
    const rawName = parsedList[idx]?.name?.trim() || "";
    if (!rawName) continue;

    const lower = rawName.toLowerCase();
    const isDuplicate = existingSet.has(lower) || seenInBatch.has(lower);

    if (isDuplicate) {
      duplicateCount++;
    } else {
      seenInBatch.add(lower);
    }

    const catalogCat = catalogMap.get(lower);
    const category = catalogCat || "Other";

    items.push({
      id: `cv-skill-${idx}-${Date.now()}`,
      name: rawName,
      category,
      isFromCatalog: Boolean(catalogCat),
      isDuplicate,
      selected: !isDuplicate,
    });
  }

  return { items, duplicateCount };
}

// ============================================================================
// 5. PROJECTS MAPPING & DEDUPLICATION
// ============================================================================

export interface PreparedProject {
  id: string; // generated temporary UI id
  title: string;
  description: string;
  technologies: string[];
  isDuplicate: boolean;
  selected: boolean;
}

export function prepareProjectImports(
  parsedList: StructuredCvProject[],
  existingList: Project[] = []
): { items: PreparedProject[]; duplicateCount: number } {
  const existingSet = new Set(
    existingList.map((p) => p.title.toLowerCase().trim())
  );

  const seenInBatch = new Set<string>();
  let duplicateCount = 0;

  const items: PreparedProject[] = parsedList.map((cvProj, idx) => {
    const title = cvProj.title?.trim() || "";
    const description = cvProj.description?.trim() || "";
    const technologies = Array.isArray(cvProj.technologies)
      ? cvProj.technologies.map((t) => t.trim()).filter(Boolean)
      : [];

    const lower = title.toLowerCase();
    const isDuplicate = existingSet.has(lower) || seenInBatch.has(lower);

    if (isDuplicate) {
      duplicateCount++;
    } else {
      seenInBatch.add(lower);
    }

    return {
      id: `cv-proj-${idx}-${Date.now()}`,
      title,
      description,
      technologies,
      isDuplicate,
      selected: !isDuplicate && Boolean(title),
    };
  });

  return { items, duplicateCount };
}
