import type {
  DetectedCvSections,
  StructuredCvData,
  StructuredCvEducation,
  StructuredCvExperience,
  StructuredCvPersonal,
  StructuredCvProject,
  StructuredCvSkill,
} from "../types/cv.types";

export type {
  StructuredCvData,
  StructuredCvEducation,
  StructuredCvExperience,
  StructuredCvPersonal,
  StructuredCvProject,
  StructuredCvSkill,
};

/**
 * Regex constants for deterministic date parsing.
 */
const MONTH_NAMES =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const YEAR = "(?:19|20)\\d{2}";
const DATE_POINT = `(?:${MONTH_NAMES}\\s+)?${YEAR}`;
const END_DATE_POINT = `(?:${DATE_POINT}|Present|Current|Now)`;
const DATE_RANGE_REGEX = new RegExp(
  `\\b(?<startDate>${DATE_POINT})\\s*(?:-|–|—|to)\\s*(?<endDate>${END_DATE_POINT})\\b`,
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
 * Extracts structured work experience records from the experience section.
 */
export function extractExperience(
  experienceText?: string
): StructuredCvExperience[] {
  if (!experienceText || !experienceText.trim()) {
    return [];
  }

  const rawBlocks = experienceText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const entries: StructuredCvExperience[] = [];

  for (const block of rawBlocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    let dateMatch: RegExpMatchArray | null = null;
    let dateLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      // Ignore bullet points to avoid treating arbitrary years in descriptions as dates
      if (/^[-*•]/.test(lines[i]!)) continue;

      const m = lines[i]!.match(DATE_RANGE_REGEX);
      if (m) {
        dateMatch = m;
        dateLineIndex = i;
        break;
      }
    }

    let startDate: string | undefined;
    let endDate: string | undefined;
    let isCurrent = false;

    if (dateMatch && dateMatch.groups) {
      startDate = dateMatch.groups["startDate"]?.trim();
      const rawEnd = dateMatch.groups["endDate"]?.trim();
      if (rawEnd) {
        if (/^(?:present|current|now)$/i.test(rawEnd)) {
          isCurrent = true;
          endDate = undefined;
        } else {
          endDate = rawEnd;
        }
      }
    }

    let company = "";
    let position = "";
    const descLines: string[] = [];
    const headerLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (/^[-*•]/.test(line)) {
        descLines.push(line.replace(/^[-*•]\s*/, ""));
      } else if (i <= Math.max(dateLineIndex, 1) && descLines.length === 0) {
        const withoutDate = line
          .replace(DATE_RANGE_REGEX, "")
          .replace(/[()]/g, "")
          .trim();
        if (withoutDate) {
          headerLines.push(withoutDate);
        }
      } else {
        descLines.push(line);
      }
    }

    if (headerLines.length === 1) {
      const single = headerLines[0]!;
      if (single.includes(" | ")) {
        const parts = single.split(" | ").map((p) => p.trim());
        position = parts[0] || "";
        company = parts[1] || "";
      } else if (single.includes(" at ")) {
        const parts = single.split(" at ").map((p) => p.trim());
        position = parts[0] || "";
        company = parts[1] || "";
      } else if (single.includes(" - ")) {
        const parts = single.split(" - ").map((p) => p.trim());
        position = parts[0] || "";
        company = parts[1] || "";
      } else {
        position = single;
      }
    } else if (headerLines.length >= 2) {
      if (headerLines[0]!.includes(" | ") || headerLines[0]!.includes(" - ")) {
        const sep = headerLines[0]!.includes(" | ") ? " | " : " - ";
        const parts = headerLines[0]!.split(sep).map((p) => p.trim());
        position = parts[0] || "";
        company = parts[1] || "";
      } else {
        position = headerLines[0]!;
        company = headerLines[1]!;
      }
    }

    entries.push({
      company,
      position,
      description: descLines.length > 0 ? descLines.join("\n") : undefined,
      startDate,
      endDate,
      isCurrent,
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
      // Try to split on " in "
      const inMatch = rawDegreeLine.match(/^(.+?)\s+in\s+(.+)$/i);
      if (inMatch) {
        degree = inMatch[1]?.trim();
        field = inMatch[2]?.trim();
      } else {
        degree = rawDegreeLine;
      }
    }

    entries.push({
      institution,
      degree,
      field,
      description: descLines.length > 0 ? descLines.join("\n") : undefined,
      startDate,
      endDate,
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
    // If line is ONLY a category label like "Frontend:" or "Technical Skills:", skip it
    if (/^[A-Za-z\s&/]+\s*:$/.test(line)) {
      continue;
    }

    // Strip category prefix if embedded in the line, e.g. "Frontend: React, Next.js"
    const cleanedLine = line.replace(CATEGORY_PREFIX_REGEX, "").trim();
    if (!cleanedLine) continue;

    // First strip leading bullet characters
    const withoutBullets = cleanedLine.replace(/^[-*•]\s*/, "");

    // Split on commas or pipes
    const rawTokens = withoutBullets.split(/[,|]/);

    for (let token of rawTokens) {
      token = token
        .replace(/^[-*•\d.)\]\s]+/, "")
        .replace(/[;:]+$/, "")
        .trim();

      if (!token) continue;
      // Skip strings that are too long or purely punctuation
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
 * Extracts structured project entries from the projects section.
 */
export function extractProjects(projectsText?: string): StructuredCvProject[] {
  if (!projectsText || !projectsText.trim()) {
    return [];
  }

  const rawBlocks = projectsText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const projects: StructuredCvProject[] = [];
  const TECH_LINE_REGEX =
    /^(?:technologies|tech\s+stack|tools|built\s+with|stack)\s*:\s*(.+)$/i;

  for (const block of rawBlocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    const rawTitle = lines[0]!.replace(/^[-*•\d.)\]\s]+/, "").trim();
    let title = rawTitle;
    let inlineTech: string[] = [];

    // Check for inline tech in title parentheses e.g. "FolioCraft (React, TypeScript)"
    const parenMatch = rawTitle.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (parenMatch && /,/.test(parenMatch[2]!)) {
      title = parenMatch[1]!.trim();
      inlineTech = parenMatch[2]!
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const descLines: string[] = [];
    let detectedTech: string[] = inlineTech;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!;
      const techMatch = line.match(TECH_LINE_REGEX);
      if (techMatch && techMatch[1]) {
        const tokens = techMatch[1]
          .split(/[,|]/)
          .map((t) => t.trim())
          .filter(Boolean);
        detectedTech = [...new Set([...detectedTech, ...tokens])];
      } else {
        const cleanDescLine = line.replace(/^[-*•]\s*/, "").trim();
        if (cleanDescLine) {
          descLines.push(cleanDescLine);
        }
      }
    }

    projects.push({
      title,
      description: descLines.length > 0 ? descLines.join("\n") : undefined,
      technologies: detectedTech,
    });
  }

  return projects;
}

/**
 * Main CV-06 structured extraction pipeline.
 * Deterministically transforms detected CV sections into structured CV data.
 */
export function extractStructuredCv(
  sections: DetectedCvSections
): StructuredCvData {
  return {
    personal: extractPersonalInfo(sections.headerText, sections.summary),
    experience: extractExperience(sections.experience),
    education: extractEducation(sections.education),
    skills: extractSkills(sections.skills),
    projects: extractProjects(sections.projects),
  };
}
