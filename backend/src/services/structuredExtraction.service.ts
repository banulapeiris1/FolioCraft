import type {
  CategorizedSkills,
  Confidence,
  CvSectionType,
  DetectedCvSections,
  ReviewIssue,
  SectionDetail,
  SectionStatus,
  StructuredCvAchievement,
  StructuredCvData,
  StructuredCvEducation,
  StructuredCvExperience,
  StructuredCvLeadership,
  StructuredCvPersonal,
  StructuredCvProject,
  StructuredCvSkill,
} from "../types/cv.types";
import { classifySkills } from "./skillClassification.service";

export type {
  StructuredCvAchievement,
  StructuredCvData,
  StructuredCvEducation,
  StructuredCvExperience,
  StructuredCvLeadership,
  StructuredCvPersonal,
  StructuredCvProject,
  StructuredCvSkill,
};

/**
 * Regex constants for deterministic date parsing across experience, education, and leadership.
 * Supports:
 * - 2024 - 2025
 * - 2024 – 2025 (en-dash)
 * - Jan 2024 - Dec 2025
 * - January 2024 – Present
 * - 06/2024 - 08/2025
 * - 2024/06 - 2025/08
 * - Ongoing / Current / Present / Now
 */
const MONTH_NAMES =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const YEAR = "(?:19|20)\\d{2}";
const NUMERIC_DATE = `(?:(?:0?[1-9]|1[0-2])[-/](?:19|20)\\d{2}|(?:19|20)\\d{2}[-/](?:0?[1-9]|1[0-2]))`;
const WORD_DATE = `(?:${MONTH_NAMES}[.,]?\\s+)?${YEAR}`;
const DATE_POINT = `(?:${NUMERIC_DATE}|${WORD_DATE})`;
const END_DATE_POINT = `(?:${DATE_POINT}|Present|Current|Ongoing|Now)`;

export const DATE_RANGE_REGEX = new RegExp(
  `(?<startDate>${DATE_POINT})\\s*(?:-|–|—|to)\\s*(?<endDate>${END_DATE_POINT})`,
  "i"
);

/**
 * Common education institution and degree detection indicators.
 */
const DEGREE_INDICATORS =
  /\b(?:bachelor|master|doctor|phd|b\.?sc|m\.?sc|b\.?a|m\.?a|b\.?eng|m\.?eng|diploma|associate|degree|certificate)\b/i;
const INSTITUTION_INDICATORS =
  /\b(?:university|college|institute|school|academy|polytechnic|faculty)\b/i;

/**
 * Common job position indicators.
 */
const POSITION_KEYWORDS =
  /\b(?:engineer|developer|intern|internship|specialist|lead|architect|manager|consultant|analyst|administrator|designer|officer|associate|director|founder|co-founder|vp|head|instructor|assistant|trainee|coordinator|programmer|scientist|specialist)\b/i;

/**
 * Common company indicators.
 */
const COMPANY_KEYWORDS =
  /\b(?:technologies|technology|solutions|corp|corporation|inc|llc|ltd|limited|labs|studio|systems|company|co\.|group|enterprises|services|agency|software|consulting)\b/i;

/**
 * Project technology line indicator.
 */
const TECH_LINE_REGEX =
  /^(?:technologies|tech\s+stack|tools|built\s+with|stack)\s*:\s*(.+)$/i;

/**
 * GitHub and Live URL detection regexes for projects.
 */
const GITHUB_URL_REGEX =
  /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?/i;
const LIVE_URL_REGEX =
  /https?:\/\/(?!github\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i;

/**
 * Extracts candidate personal and contact info from header text and summary.
 */
export function extractPersonalInfo(
  headerText?: string,
  summaryText?: string
): StructuredCvPersonal {
  const result: StructuredCvPersonal = {};

  if (summaryText && summaryText.trim()) {
    result.summary = summaryText.trim().replace(/\n{3,}/g, "\n\n");
  }

  if (!headerText || !headerText.trim()) {
    return result;
  }

  const rawHeader = headerText.trim();
  const lines = rawHeader
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Email extraction
  const emailMatch = rawHeader.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  if (emailMatch) {
    result.email = emailMatch[0].trim();
  }

  // 2. Phone extraction (7 to 15 digits, handles intl prefixes and standard delimiters)
  const phoneCandidates = rawHeader.match(
    /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}/g
  );
  if (phoneCandidates) {
    for (const candidate of phoneCandidates) {
      const digitsOnly = candidate.replace(/\D/g, "");
      // Guard against isolated years or zip codes
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        result.phone = candidate.trim();
        break;
      }
    }
  }

  // 3. URLs (LinkedIn, GitHub, Website)
  const linkedinMatch = rawHeader.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|profile)\/[\w-]+/i
  );
  if (linkedinMatch) {
    result.linkedin = linkedinMatch[0].startsWith("http")
      ? linkedinMatch[0]
      : `https://${linkedinMatch[0]}`;
  }

  const githubMatch = rawHeader.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i
  );
  if (githubMatch) {
    result.github = githubMatch[0].startsWith("http")
      ? githubMatch[0]
      : `https://${githubMatch[0]}`;
  }

  const generalUrlRegex =
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(?:com|org|net|io|dev|app|me|co|tech|info)(?:\/[^\s,)]*)?/gi;
  const urlMatches = rawHeader.match(generalUrlRegex);
  if (urlMatches) {
    for (const url of urlMatches) {
      if (/linkedin\.com|github\.com/i.test(url)) continue;
      // Skip if it's the domain of the email address
      if (result.email && result.email.endsWith(`@${url}`)) continue;
      result.website = url.startsWith("http") ? url : `https://${url}`;
      break;
    }
  }

  // 4. Location extraction
  for (const line of lines) {
    // Check for explicit "Location: ..." or "City, Country"
    const locMatch = line.match(/^(?:location|address)\s*:\s*(.+)$/i);
    if (locMatch && locMatch[1]) {
      result.location = locMatch[1].trim();
      break;
    }

    // Split compound lines (e.g., "email | phone | Colombo, Sri Lanka")
    const segments = line.split(/[|•]/).map((s) => s.trim());
    for (const segment of segments) {
      if (
        !segment.includes("@") &&
        !/https?:\/\/|\.com|\.dev/i.test(segment) &&
        !/\d{3,}/.test(segment) &&
        /^[A-Za-z\s]+,\s*[A-Za-z\s]+$/.test(segment) &&
        segment.length <= 50
      ) {
        result.location = segment;
        break;
      }
    }
    if (result.location) break;
  }

  // 5. Full name extraction (conservative: first clean line of header)
  if (lines.length > 0) {
    const firstLine = lines[0]!.replace(/^name\s*:\s*/i, "").trim();

    // Rejection criteria
    const isUnsafe =
      /[@\d/\\:<>{}[\]()+=*#]/.test(firstLine) ||
      /curriculum\s+vitae|resume|portfolio|contact|engineer|developer|profile|about/i.test(
        firstLine
      ) ||
      firstLine.length > 40;

    if (!isUnsafe) {
      const words = firstLine.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const allCapitalized = words.every((w) =>
          /^[A-Z][a-zA-Z'.-]*$/.test(w)
        );
        if (allCapitalized) {
          result.fullName = firstLine;
        }
      }
    }
  }

  return result;
}

/**
 * Helper to determine position and company from candidate header lines,
 * supporting inheritance of company for multiple roles under one employer.
 */
function parseRoleAndCompany(
  lines: string[],
  fallbackCompany: string = ""
): { company: string; position: string } {
  if (lines.length === 0) {
    return { company: fallbackCompany, position: "" };
  }

  if (lines.length === 1) {
    const single = lines[0]!.trim();
    for (const sep of [" | ", " at ", " @ ", " - "]) {
      if (single.includes(sep)) {
        const parts = single.split(sep).map((p) => p.trim());
        const part0 = parts[0] || "";
        const part1 = parts[1] || "";
        if (POSITION_KEYWORDS.test(part1) && !POSITION_KEYWORDS.test(part0)) {
          return { company: part0, position: part1 };
        }
        return { position: part0, company: part1 };
      }
    }

    if (POSITION_KEYWORDS.test(single)) {
      return { position: single, company: fallbackCompany };
    }
    return { position: single, company: fallbackCompany };
  }

  const line0 = lines[0]!.trim();
  const line1 = lines[1]!.trim();

  // If line 0 is position and line 1 is company
  if (POSITION_KEYWORDS.test(line0) && !POSITION_KEYWORDS.test(line1)) {
    return { position: line0, company: line1 };
  }
  // If line 1 is position and line 0 is company
  if (POSITION_KEYWORDS.test(line1) && !POSITION_KEYWORDS.test(line0)) {
    return { position: line1, company: line0 };
  }

  // Check company keywords
  if (COMPANY_KEYWORDS.test(line0) && !COMPANY_KEYWORDS.test(line1)) {
    return { company: line0, position: line1 };
  }
  if (COMPANY_KEYWORDS.test(line1) && !COMPANY_KEYWORDS.test(line0)) {
    return { company: line1, position: line0 };
  }

  return { company: line0, position: line1 };
}

/**
 * Extracts structured work experience records from the experience section.
 * Operates across line boundaries, isolates multiple jobs without blank lines,
 * supports multiple roles under one company, and recognizes ongoing roles.
 */
export function extractExperience(
  experienceText?: string
): StructuredCvExperience[] {
  if (!experienceText || !experienceText.trim()) {
    return [];
  }

  const rawLines = experienceText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return [];

  // Find all date range line indices (ignoring lines starting with bullets)
  const dateIndices: number[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]!;
    if (/^[-*•]/.test(line)) continue;
    if (DATE_RANGE_REGEX.test(line)) {
      dateIndices.push(i);
    }
  }

  // Fallback to block splitting if no dates detected
  if (dateIndices.length === 0) {
    const blocks = experienceText
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);

    const results: StructuredCvExperience[] = [];
    for (const block of blocks) {
      const bLines = block
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (bLines.length === 0) continue;
      const { company, position } = parseRoleAndCompany(bLines.slice(0, 2));
      const desc = bLines
        .slice(2)
        .map((l) => l.replace(/^[-*•]\s*/, ""))
        .join("\n");

      results.push({
        company,
        position,
        description: desc || undefined,
        isCurrent: false,
        confidence: company && position ? "medium" : "low",
      });
    }
    return results;
  }

  const entries: StructuredCvExperience[] = [];
  let lastCompany = "";

  for (let k = 0; k < dateIndices.length; k++) {
    const dateIdx = dateIndices[k]!;
    const dateLine = rawLines[dateIdx]!;
    const dateMatch = dateLine.match(DATE_RANGE_REGEX);

    let startDate: string | undefined;
    let endDate: string | undefined;
    let isCurrent = false;

    if (dateMatch && dateMatch.groups) {
      startDate = dateMatch.groups["startDate"]?.trim();
      const rawEnd = dateMatch.groups["endDate"]?.trim();
      if (rawEnd) {
        if (/^(?:present|current|ongoing|now)$/i.test(rawEnd)) {
          isCurrent = true;
          endDate = undefined;
        } else {
          endDate = rawEnd;
        }
      }
    }

    const prevDateIdx = k > 0 ? dateIndices[k - 1]! : -1;

    // Check if the date line itself contains role/company text
    const inlineWithoutDate = dateLine
      .replace(DATE_RANGE_REGEX, "")
      .replace(/[()]/g, "")
      .trim();

    const headerCandidates: string[] = [];

    // Scan backwards from dateIdx - 1 down to prevDateIdx + 1
    let backIdx = dateIdx - 1;
    const collectedBackwards: string[] = [];

    while (backIdx > prevDateIdx) {
      const line = rawLines[backIdx]!;
      // Stop if bullet point
      if (/^[-*•]/.test(line)) break;
      // Stop if lengthy narrative sentence
      if (line.length > 70 && /[.?!]$/.test(line)) break;
      collectedBackwards.unshift(line);
      if (collectedBackwards.length >= 2) break;
      backIdx--;
    }

    if (inlineWithoutDate) {
      headerCandidates.push(inlineWithoutDate);
    }
    headerCandidates.push(...collectedBackwards);

    const { company, position } = parseRoleAndCompany(
      headerCandidates,
      lastCompany
    );
    if (company) {
      lastCompany = company;
    }

    // Description lines for this entry start at dateIdx + 1,
    // and go up to the start of the next entry's header lines
    const nextDateIdx =
      k + 1 < dateIndices.length ? dateIndices[k + 1]! : rawLines.length;

    let nextHeaderCount = 0;
    let nextBack = nextDateIdx - 1;
    while (nextBack > dateIdx) {
      const line = rawLines[nextBack]!;
      if (/^[-*•]/.test(line)) break;
      if (line.length > 70 && /[.?!]$/.test(line)) break;
      nextHeaderCount++;
      if (nextHeaderCount >= 2) break;
      nextBack--;
    }

    const descEnd = nextDateIdx - nextHeaderCount;
    const descLines: string[] = [];
    for (let d = dateIdx + 1; d < descEnd; d++) {
      const dLine = rawLines[d]!;
      descLines.push(dLine.replace(/^[-*•]\s*/, ""));
    }

    const confidence: Confidence =
      company && position && startDate
        ? "high"
        : company && position
        ? "medium"
        : "low";

    entries.push({
      company,
      position,
      startDate,
      endDate,
      isCurrent,
      description: descLines.length > 0 ? descLines.join("\n") : undefined,
      confidence,
    });
  }

  return entries;
}

/**
 * Extracts structured education records from the education section.
 */
export function extractEducation(
  educationText?: string
): StructuredCvEducation[] {
  if (!educationText || !educationText.trim()) {
    return [];
  }

  const rawBlocks = educationText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const entries: StructuredCvEducation[] = [];

  for (const block of rawBlocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    let dateMatch: RegExpMatchArray | null = null;
    let startDate: string | undefined;
    let endDate: string | undefined;

    const remainingLines: string[] = [];

    for (const line of lines) {
      if (!dateMatch && DATE_RANGE_REGEX.test(line)) {
        dateMatch = line.match(DATE_RANGE_REGEX);
        if (dateMatch && dateMatch.groups) {
          startDate = dateMatch.groups["startDate"]?.trim();
          endDate = dateMatch.groups["endDate"]?.trim();
        }
        const stripped = line
          .replace(DATE_RANGE_REGEX, "")
          .replace(/[()]/g, "")
          .trim();
        if (stripped) {
          remainingLines.push(stripped);
        }
      } else {
        remainingLines.push(line);
      }
    }

    let institution = "";
    let rawDegreeLine = "";
    const descLines: string[] = [];

    for (const line of remainingLines) {
      if (INSTITUTION_INDICATORS.test(line) && !institution) {
        institution = line;
      } else if (DEGREE_INDICATORS.test(line) && !rawDegreeLine) {
        rawDegreeLine = line;
      } else if (!institution && !rawDegreeLine) {
        if (DEGREE_INDICATORS.test(line)) {
          rawDegreeLine = line;
        } else {
          institution = line;
        }
      } else {
        descLines.push(line);
      }
    }

    if (!institution && remainingLines.length > 0) {
      institution = remainingLines[0]!;
    }

    let degree: string | undefined;
    let field: string | undefined;

    if (rawDegreeLine) {
      const inMatch = rawDegreeLine.match(/^(.+?)\s+in\s+(.+)$/i);
      if (inMatch) {
        degree = inMatch[1]?.trim();
        field = inMatch[2]?.trim();
      } else {
        degree = rawDegreeLine;
      }
    }

    const confidence: Confidence =
      institution && degree ? "high" : institution ? "medium" : "low";

    entries.push({
      institution,
      degree,
      field,
      description: descLines.length > 0 ? descLines.join("\n") : undefined,
      startDate,
      endDate,
      confidence,
    });
  }

  return entries;
}

/**
 * Extracts structured skill entries from the skills section.
 */
export function extractSkills(skillsText?: string): StructuredCvSkill[] {
  if (!skillsText || !skillsText.trim()) {
    return [];
  }

  const lines = skillsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const skills: StructuredCvSkill[] = [];
  const seen = new Set<string>();

  const CATEGORY_PREFIX_REGEX =
    /^(?:languages?|frameworks?|libraries|databases?|frontend|backend|cloud|devops|tools|platforms|technologies|skills|web technologies|technical skills|other|core)\s*:\s*/i;

  for (const line of lines) {
    if (/^[A-Za-z\s&/]+\s*:$/.test(line)) {
      continue;
    }

    const cleanedLine = line.replace(CATEGORY_PREFIX_REGEX, "").trim();
    if (!cleanedLine) continue;

    const withoutBullets = cleanedLine.replace(/^[-*•]\s*/, "");
    const rawTokens = withoutBullets.split(/[,|]/);

    for (let token of rawTokens) {
      token = token
        .replace(/^[-*•\d.)\]\s]+/, "")
        .replace(/[;:]+$/, "")
        .trim();

      if (!token) continue;
      if (token.length > 50 || /^[^a-zA-Z0-9+#.]+$/.test(token)) continue;

      const lower = token.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        skills.push({ name: token });
      }
    }
  }

  return skills;
}

/**
 * Helper to determine if a line possesses project title characteristics.
 */
function isLikelyProjectTitle(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 70) return false;
  if (/^[-*•]/.test(trimmed)) return false;
  if (/[.?!;]$/.test(trimmed)) return false;
  if (TECH_LINE_REGEX.test(trimmed)) return false;
  if (/^(?:github|demo|live|url|link|repo)\s*:/i.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (
    /^(?:developed|built|created|implemented|responsible|this|an?|the)\b/i.test(
      trimmed
    )
  )
    return false;
  return true;
}

/**
 * Extracts structured project entries from the projects section.
 * Segments projects reliably across lines without requiring blank lines,
 * and extracts associated technologies and GitHub/live URLs.
 */
export function extractProjects(projectsText?: string): StructuredCvProject[] {
  if (!projectsText || !projectsText.trim()) {
    return [];
  }

  const rawLines = projectsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return [];

  interface RawProjectAccumulator {
    rawTitle: string;
    descLines: string[];
    technologies: string[];
    githubUrl?: string;
    liveUrl?: string;
  }

  const accumulators: RawProjectAccumulator[] = [];
  let current: RawProjectAccumulator | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]!;
    const isTitle = isLikelyProjectTitle(line);

    if (
      isTitle &&
      (!current ||
        current.descLines.length > 0 ||
        current.technologies.length > 0 ||
        current.githubUrl ||
        current.liveUrl)
    ) {
      if (current) {
        accumulators.push(current);
      }
      current = {
        rawTitle: line,
        descLines: [],
        technologies: [],
      };
      continue;
    }

    if (!current) {
      current = {
        rawTitle: line,
        descLines: [],
        technologies: [],
      };
      continue;
    }

    // Technology line
    const techMatch = line.match(TECH_LINE_REGEX);
    if (techMatch && techMatch[1]) {
      const tokens = techMatch[1]
        .split(/[,|]/)
        .map((t) => t.trim())
        .filter(Boolean);
      current.technologies = [...new Set([...current.technologies, ...tokens])];
      continue;
    }

    // GitHub URL
    const ghExplicit = line.match(/^github\s*:\s*(https?:\/\/[^\s]+)/i);
    if (ghExplicit && ghExplicit[1]) {
      current.githubUrl = ghExplicit[1].trim();
      continue;
    }
    const ghGeneral = line.match(GITHUB_URL_REGEX);
    if (ghGeneral && !current.githubUrl) {
      current.githubUrl = ghGeneral[0].trim();
      const stripped = line
        .replace(GITHUB_URL_REGEX, "")
        .replace(/^github\s*:\s*/i, "")
        .trim();
      if (stripped) {
        current.descLines.push(stripped);
      }
      continue;
    }

    // Live / Demo URL
    const liveExplicit = line.match(
      /^(?:demo|live|url|website)\s*:\s*(https?:\/\/[^\s]+)/i
    );
    if (liveExplicit && liveExplicit[1]) {
      current.liveUrl = liveExplicit[1].trim();
      continue;
    }
    const liveGeneral = line.match(LIVE_URL_REGEX);
    if (liveGeneral && !current.liveUrl && !GITHUB_URL_REGEX.test(line)) {
      current.liveUrl = liveGeneral[0].trim();
      const stripped = line
        .replace(LIVE_URL_REGEX, "")
        .replace(/^(?:demo|live|url|website)\s*:\s*/i, "")
        .trim();
      if (stripped) {
        current.descLines.push(stripped);
      }
      continue;
    }

    // Description lines
    const cleanDesc = line.replace(/^[-*•]\s*/, "").trim();
    if (cleanDesc) {
      current.descLines.push(cleanDesc);
    }
  }

  if (current) {
    accumulators.push(current);
  }

  const projects: StructuredCvProject[] = [];

  for (const acc of accumulators) {
    let title = acc.rawTitle.replace(/^[-*•\d.)\]\s]+/, "").trim();
    let inlineTech: string[] = [];

    // Check for inline tech in title parentheses e.g. "FolioCraft (React, TypeScript)"
    const parenMatch = title.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (parenMatch && /,/.test(parenMatch[2]!)) {
      title = parenMatch[1]!.trim();
      inlineTech = parenMatch[2]!
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const allTech = [...new Set([...inlineTech, ...acc.technologies])];
    const desc =
      acc.descLines.length > 0 ? acc.descLines.join("\n") : undefined;

    const confidence: Confidence =
      title && (desc || allTech.length > 0) ? "high" : title ? "medium" : "low";

    projects.push({
      title,
      description: desc,
      technologies: allTech,
      githubUrl: acc.githubUrl,
      liveUrl: acc.liveUrl,
      confidence,
    });
  }

  return projects;
}

/**
 * Extracts structured achievement records from the achievements section.
 */
export function extractAchievements(
  achievementsText?: string
): StructuredCvAchievement[] {
  if (!achievementsText || !achievementsText.trim()) return [];

  const rawBlocks = achievementsText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const achievements: StructuredCvAchievement[] = [];

  for (const block of rawBlocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    // If every line is a bullet item or list item with dates/keywords, treat each as an achievement
    const bulletLines = lines.filter((l) => /^[-*•]/.test(l));
    const datedLines = lines.filter((l) => /\b(?:19|20)\d{2}\b/.test(l));
    const isKeywordList =
      lines.length > 1 &&
      lines.every((l) =>
        /^(?:winner|award|honor|dean|best|first|1st|2nd|3rd|semifinalist|finalist|scholarship|champion|gold|silver|bronze)/i.test(
          l.replace(/^[-*•]\s*/, "")
        )
      );

    if (
      (bulletLines.length > 0 && bulletLines.length === lines.length) ||
      datedLines.length > 1 ||
      isKeywordList
    ) {
      for (const line of lines) {
        const cleaned = line.replace(/^[-*•]\s*/, "").trim();
        const dateMatch = cleaned.match(
          /\(?\b((?:19|20)\d{2}(?:\s*[-–—]\s*(?:19|20)\d{2})?)\b\)?/
        );
        const date = dateMatch ? dateMatch[1] : undefined;
        let title = cleaned;
        if (dateMatch) {
          title = cleaned
            .replace(dateMatch[0], "")
            .replace(/[-–—]\s*$/, "")
            .replace(/^\s*[-–—]/, "")
            .trim();
        }

        achievements.push({
          title: title || cleaned,
          date,
          confidence: "high",
        });
      }
      continue;
    }

    const title = lines[0]!.replace(/^[-*•]\s*/, "").trim();
    let description: string | undefined;
    let date: string | undefined;

    if (lines.length >= 2) {
      const rest = lines.slice(1);
      const descParts: string[] = [];
      for (const r of rest) {
        const dMatch = r.match(
          /\b((?:19|20)\d{2}(?:\s*[-–—]\s*(?:19|20)\d{2})?)\b/
        );
        if (dMatch && !date && (r.length <= 15 || /^\(?\d{4}/.test(r))) {
          date = dMatch[1];
        } else {
          descParts.push(r.replace(/^[-*•]\s*/, "").trim());
        }
      }
      if (descParts.length > 0) {
        description = descParts.join("\n");
      }
    }

    achievements.push({
      title,
      description,
      date,
      confidence: title ? "high" : "low",
    });
  }

  return achievements;
}

/**
 * Extracts structured leadership records from the leadership section.
 */
export function extractLeadership(
  leadershipText?: string
): StructuredCvLeadership[] {
  if (!leadershipText || !leadershipText.trim()) return [];

  const rawBlocks = leadershipText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const leadershipEntries: StructuredCvLeadership[] = [];

  for (const block of rawBlocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    let startDate: string | undefined;
    let endDate: string | undefined;
    let dateLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const m = lines[i]!.match(DATE_RANGE_REGEX);
      if (m && m.groups) {
        startDate = m.groups["startDate"]?.trim();
        const rawEnd = m.groups["endDate"]?.trim();
        if (rawEnd && /^(?:present|current|ongoing|now)$/i.test(rawEnd)) {
          endDate = undefined;
        } else {
          endDate = rawEnd;
        }
        dateLineIdx = i;
        break;
      }
    }

    let role = "";
    let organization = "";
    const descLines: string[] = [];
    const headerLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (i === dateLineIdx) {
        const withoutDate = lines[i]!
          .replace(DATE_RANGE_REGEX, "")
          .replace(/[()]/g, "")
          .trim();
        if (withoutDate) {
          headerLines.push(withoutDate);
        }
        continue;
      }
      if (/^[-*•]/.test(lines[i]!)) {
        descLines.push(lines[i]!.replace(/^[-*•]\s*/, "").trim());
      } else if (headerLines.length < 2 && descLines.length === 0) {
        headerLines.push(lines[i]!);
      } else {
        descLines.push(lines[i]!);
      }
    }

    if (headerLines.length === 1) {
      const single = headerLines[0]!;
      for (const sep of [" | ", " at ", " - ", ", "]) {
        if (single.includes(sep)) {
          const parts = single.split(sep).map((p) => p.trim());
          role = parts[0] || "";
          organization = parts[1] || "";
          break;
        }
      }
      if (!role) role = single;
    } else if (headerLines.length >= 2) {
      role = headerLines[0]!;
      organization = headerLines[1]!;
    }

    const confidence: Confidence =
      role && organization ? "high" : role ? "medium" : "low";

    leadershipEntries.push({
      role,
      organization: organization || undefined,
      startDate,
      endDate,
      description: descLines.length > 0 ? descLines.join("\n") : undefined,
      confidence,
    });
  }

  return leadershipEntries;
}

/**
 * Main structured CV extraction pipeline.
 * Transforms detected CV sections into structured, classified CV entities.
 */
export function extractStructuredCv(
  sections: DetectedCvSections
): StructuredCvData {
  const sectionStatuses: Partial<Record<CvSectionType, SectionStatus>> = {};
  if (sections.details) {
    for (const [sec, detail] of Object.entries(sections.details) as [
      CvSectionType,
      SectionDetail
    ][]) {
      sectionStatuses[sec] = detail.status;
    }
  }

  const reviewIssues: ReviewIssue[] = [];

  const personal = extractPersonalInfo(sections.headerText, sections.summary);
  const experience = extractExperience(sections.experience);
  const education = extractEducation(sections.education);
  const rawSkills = extractSkills(sections.skills);
  const { flatSkills, categorizedSkills } = classifySkills(rawSkills);
  const projects = extractProjects(sections.projects);
  const achievements = extractAchievements(sections.achievements);
  const leadership = extractLeadership(sections.leadership);

  // Generate Review Issues for meaningful ambiguities
  for (const exp of experience) {
    if (!exp.startDate) {
      reviewIssues.push({
        field: "startDate",
        section: "experience",
        message: `Experience entry for "${exp.position || "Role"}" at "${exp.company || "Company"}" is missing a start date.`,
        severity: "warning",
      });
    }
    if (!exp.company || !exp.position) {
      reviewIssues.push({
        field: "company",
        section: "experience",
        message:
          "Experience entry has incomplete role or company information.",
        severity: "warning",
      });
    }
  }

  for (const p of projects) {
    if (!p.description && p.technologies.length === 0) {
      reviewIssues.push({
        field: "description",
        section: "projects",
        message: `Project "${p.title}" is missing description or technologies.`,
        severity: "info",
      });
    }
  }

  for (const s of flatSkills) {
    if (s.category === "other" && s.confidence === "medium") {
      reviewIssues.push({
        field: "name",
        section: "skills",
        message: `Skill "${s.name}" could not be categorized automatically.`,
        severity: "info",
        value: s.name,
      });
    }
  }

  // Surface review issues when core sections are completely missing
  if (
    experience.length === 0 &&
    sections.details?.experience?.status === "needs_review"
  ) {
    reviewIssues.push({
      field: "experience",
      section: "experience",
      message: "No work experience section was detected in the CV. Please review if this is intentional.",
      severity: "warning",
    });
  }

  if (
    flatSkills.length === 0 &&
    (!sections.details?.skills || sections.details.skills.status === "not_detected")
  ) {
    reviewIssues.push({
      field: "skills",
      section: "skills",
      message: "No skills section was detected in the CV.",
      severity: "info",
    });
  }

  return {
    personal,
    experience,
    education,
    skills: flatSkills,
    projects,
    categorizedSkills,
    achievements: achievements.length > 0 ? achievements : undefined,
    leadership: leadership.length > 0 ? leadership : undefined,
    reviewIssues: reviewIssues.length > 0 ? reviewIssues : undefined,
    sectionStatuses,
    rawText: sections.rawText,
  };
}
