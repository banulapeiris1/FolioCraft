import type {
  Confidence,
  CvSectionType,
  DetectedCvSections,
  SectionDetail,
  SectionStatus,
  UnknownSectionDetail,
} from "../types/cv.types";

export type {
  Confidence,
  CvSectionType,
  DetectedCvSections,
  SectionDetail,
  SectionStatus,
  UnknownSectionDetail,
};

/**
 * All canonical section types recognized by FolioCraft.
 */
export const ALL_CANONICAL_SECTIONS: CvSectionType[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "achievements",
  "leadership",
  "extracurricular",
];

/**
 * Deterministic regex patterns for detecting canonical CV section headings.
 */
const SECTION_PATTERNS: Record<CvSectionType, RegExp[]> = {
  summary: [
    /^(?:professional\s+|career\s+|executive\s+|personal\s+)?summary$/i,
    /^(?:professional\s+|personal\s+)?profile$/i,
    /^about(?:\s+me)?$/i,
    /^(?:career\s+)?objective$/i,
    /^(?:brief\s+)?bio(?:graphy)?$/i,
    /^overview$/i,
    /^personal\s+statement$/i,
  ],
  experience: [
    /^(?:work|professional|employment|career|relevant|internship|practical|industry)\s+experience$/i,
    /^(?:work|employment|career|job)\s+history$/i,
    /^experience$/i,
    /^employment$/i,
    /^(?:career|work)\s+background$/i,
    /^internships?(?:\s+experience)?$/i,
    /^professional\s+background$/i,
    /^(?:relevant|recent)\s+work$/i,
  ],
  education: [
    /^(?:educational|academic)\s+background$/i,
    /^(?:academic|education)\s+history$/i,
    /^(?:academic\s+|educational\s+)?qualifications$/i,
    /^education(?:\s+(?:&|and)\s+(?:qualifications|training|certifications?))?$/i,
    /^degrees(?:\s+(?:&|and)\s+certificates)?$/i,
    /^academic\s+credentials$/i,
    /^educational\s+qualifications$/i,
  ],
  skills: [
    /^(?:technical|core|key|professional|it|programming|primary|relevant)\s+skills$/i,
    /^skills(?:\s+(?:&|and)\s+(?:technologies|tools|competencies|proficiencies|abilities))?$/i,
    /^technical\s+skills(?:\s+(?:&|and)\s+(?:technologies|tools))?$/i,
    /^(?:tools|technologies)(?:\s+(?:&|and)\s+(?:skills|frameworks))?$/i,
    /^(?:core\s+|key\s+)?competencies$/i,
    /^(?:technical\s+)?expertise$/i,
    /^tech(?:nical)?\s+stack$/i,
    /^technologies$/i,
    /^programming\s+languages$/i,
    /^technical\s+proficiencies$/i,
    /^skills$/i,
  ],
  projects: [
    /^(?:personal|academic|selected|key|technical|portfolio|software|recent|featured|independent|open\s+source)\s+projects$/i,
    /^projects(?:\s+(?:&|and)\s+(?:experience|achievements|portfolio))?$/i,
    /^project\s+work$/i,
    /^projects$/i,
  ],
  achievements: [
    /^(?:awards?\s+(?:&|and)\s+)?achievements?$/i,
    /^(?:honors?\s+(?:&|and)\s+)?awards?$/i,
    /^honors?(?:\s+(?:&|and)\s+awards?)?$/i,
    /^key\s+achievements?$/i,
    /^(?:notable\s+)?accomplishments?$/i,
    /^competitions?(?:\s+(?:&|and)\s+hackathons?)?$/i,
    /^hackathons?$/i,
    /^scholarships?(?:\s+(?:&|and)\s+awards?)?$/i,
    /^achievements?$/i,
  ],
  leadership: [
    /^(?:leadership|leadership\s+(?:&|and)\s+(?:activities|extracurriculars?|involvement|volunteering))$/i,
    /^leadership\s+experience$/i,
    /^leadership\s+roles?$/i,
    /^(?:positions\s+of\s+)?responsibility$/i,
    /^community\s+leadership$/i,
    /^leadership$/i,
  ],
  extracurricular: [
    /^(?:extra-?curricular\s+activities|extra-?curriculars?|activities\s+(?:&|and)\s+societies|clubs?\s+(?:&|and)\s+societies)$/i,
    /^(?:extracurricular|extra-curricular)(?:\s+involvement)?$/i,
    /^(?:campus|university|student)\s+(?:activities|involvement)$/i,
    /^co-?curricular(?:\s+activities)?$/i,
    /^activities$/i,
  ],
};

/**
 * Common non-core section headings recognized to prevent unrecognized headings
 * from inadvertently being merged into previous sections.
 */
const KNOWN_NON_CORE_PATTERNS: RegExp[] = [
  /^(?:certifications?|certificates?)(?:\s+(?:&|and)\s+(?:licenses?|licensures?|training))?$/i,
  /^(?:licenses?|licensures?)$/i,
  /^(?:courses?|coursework|training)$/i,
  /^(?:publications?|research(?:\s+papers?)?)$/i,
  /^(?:languages?|language\s+proficiency)$/i,
  /^(?:volunteer(?:ing)?|community\s+service|volunteer\s+experience)$/i,
  /^(?:interests?|hobbies?)$/i,
  /^(?:references?|referees?)$/i,
  /^(?:patents?|intellectual\s+property)$/i,
  /^(?:speaking|presentations?|talks?)$/i,
  /^(?:affiliations?|memberships?)$/i,
];

/**
 * Strips formatting adornments (Markdown hashes, bullets, numbering, dashes, trailing colons)
 * from a potential heading line before pattern evaluation.
 */
export function cleanHeadingLine(rawLine: string): string {
  return rawLine
    .replace(/^#+\s*/, "") // Markdown headers (#, ##, ###)
    .replace(/^(?:(?:\d+\.|\d+\)|\*|-|•|–|—)\s*)+/, "") // Bullets, dashes, numbers
    .replace(/[:\s\-_=~]+$/, "") // Trailing colons, decorative dashes, underlines
    .replace(/^\[(.*)\]$/, "$1") // Square brackets [Heading]
    .replace(/\s+/g, " ") // Normalize internal whitespace runs
    .trim();
}

/**
 * Checks if a given text line matches any known logical CV section heading.
 * Returns the matched CvSectionType, or null if the line is not a known heading.
 */
export function matchKnownSection(line: string): CvSectionType | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 50) {
    return null;
  }

  // Reject lines ending with sentence punctuation (. ? ! , ;)
  if (/[.?!,;]$/.test(trimmed)) {
    return null;
  }

  // Headings typically consist of 1-6 words
  const words = trimmed.split(/\s+/);
  if (words.length > 6) {
    return null;
  }

  // Reject common sentence opening words/pronouns to avoid false positives
  if (
    /^(?:i|we|my|our|he|she|they|worked|responsible|developed|managed|demonstrated|over\s+\d+|have|having|with|experienced\s+in)\b/i.test(
      trimmed
    )
  ) {
    return null;
  }

  const cleaned = cleanHeadingLine(trimmed);
  if (!cleaned) {
    return null;
  }

  for (const [sectionType, patterns] of Object.entries(SECTION_PATTERNS) as [
    CvSectionType,
    RegExp[]
  ][]) {
    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        return sectionType;
      }
    }
  }

  return null;
}

/**
 * Checks if a line resembles an unknown/custom section heading (e.g. "PUBLICATIONS", "REFERENCES").
 * Returns the cleaned heading label or null.
 */
export function matchUnknownSectionHeading(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 40) {
    return null;
  }

  if (/[.?!,;]$/.test(trimmed)) {
    return null;
  }

  const words = trimmed.split(/\s+/);
  if (words.length > 4) {
    return null;
  }

  if (
    /^(?:i|we|my|our|he|she|they|worked|responsible|developed|managed|demonstrated|over\s+\d+|have|having|with)\b/i.test(
      trimmed
    )
  ) {
    return null;
  }

  const cleaned = cleanHeadingLine(trimmed);
  if (!cleaned || cleaned.length < 3) {
    return null;
  }

  // Known non-core section patterns (e.g., Publications, Languages, Interests)
  for (const pattern of KNOWN_NON_CORE_PATTERNS) {
    if (pattern.test(cleaned)) {
      return cleaned;
    }
  }

  // Short uppercase heading (e.g., "SPEAKING", "AFFILIATIONS")
  const isAllCaps = cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned);
  if (isAllCaps && words.length <= 3) {
    return cleaned;
  }

  return null;
}

/**
 * Deterministically segments extracted CV plain text into logical sections:
 * - summary
 * - experience
 * - education
 * - skills
 * - projects
 * - achievements
 * - leadership
 *
 * Captures any introductory header/profile text (before the first section) in headerText,
 * preserves unknown headings/sections in unknownSections and unknownDetails,
 * and attaches detailed section metadata in `details`.
 */
export function createDefaultDetails(): Record<CvSectionType, SectionDetail> {
  return {
    summary: { status: "not_detected", confidence: "low", text: "" },
    // If experience is not detected, mark as needs_review to distinguish from "no experience"
    experience: { status: "needs_review", confidence: "low", text: "" },
    education: { status: "not_detected", confidence: "low", text: "" },
    skills: { status: "not_detected", confidence: "low", text: "" },
    projects: { status: "not_detected", confidence: "low", text: "" },
    achievements: { status: "not_detected", confidence: "low", text: "" },
    leadership: { status: "not_detected", confidence: "low", text: "" },
    extracurricular: { status: "not_detected", confidence: "low", text: "" },
  };
}

export function detectCvSections(rawText: string): DetectedCvSections {
  if (!rawText || !rawText.trim()) {
    const details = createDefaultDetails();
    return {
      detectedOrder: [],
      rawText: rawText || "",
      details,
      sections: details,
    };
  }

  const lines = rawText.split(/\r?\n/);

  type ActiveTarget =
    | { type: "header" }
    | { type: "core"; section: CvSectionType; heading: string }
    | { type: "unknown"; title: string };

  let activeTarget: ActiveTarget = { type: "header" };

  const headerLines: string[] = [];
  const coreSectionLines: Partial<Record<CvSectionType, string[]>> = {};
  const coreSectionHeadings: Partial<Record<CvSectionType, string>> = {};
  const unknownSectionLines: Record<string, string[]> = {};
  const detectedOrder: CvSectionType[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;

    // 1. Check for core known section heading
    const coreMatch = matchKnownSection(rawLine);
    if (coreMatch) {
      activeTarget = {
        type: "core",
        section: coreMatch,
        heading: cleanHeadingLine(rawLine),
      };
      if (!detectedOrder.includes(coreMatch)) {
        detectedOrder.push(coreMatch);
      }
      if (!coreSectionLines[coreMatch]) {
        coreSectionLines[coreMatch] = [];
        coreSectionHeadings[coreMatch] = cleanHeadingLine(rawLine);
      }
      continue;
    }

    // 2. Check for unknown section heading
    const unknownMatch = matchUnknownSectionHeading(rawLine);
    if (unknownMatch) {
      activeTarget = { type: "unknown", title: unknownMatch };
      if (!unknownSectionLines[unknownMatch]) {
        unknownSectionLines[unknownMatch] = [];
      }
      continue;
    }

    // 3. Accumulate content lines into current section
    if (activeTarget.type === "header") {
      headerLines.push(rawLine);
    } else if (activeTarget.type === "core") {
      coreSectionLines[activeTarget.section]!.push(rawLine);
    } else if (activeTarget.type === "unknown") {
      unknownSectionLines[activeTarget.title]!.push(rawLine);
    }
  }

  const details = createDefaultDetails();

  const result: DetectedCvSections = {
    detectedOrder,
    rawText,
    details,
    sections: details,
  };

  const trimmedHeader = headerLines.join("\n").trim();
  if (trimmedHeader) {
    result.headerText = trimmedHeader;
  }

  for (const [sec, sLines] of Object.entries(coreSectionLines) as [
    CvSectionType,
    string[]
  ][]) {
    const text = sLines.join("\n").trim();
    if (text) {
      result[sec] = text;
      details[sec] = {
        status: "detected",
        confidence: "high",
        text,
        heading: coreSectionHeadings[sec],
      };
    } else {
      // Heading was detected but section content is empty
      details[sec] = {
        status: "needs_review",
        confidence: "medium",
        text: "",
        heading: coreSectionHeadings[sec],
      };
    }
  }

  const trimmedUnknown: Record<string, string> = {};
  const unknownDetails: UnknownSectionDetail[] = [];

  for (const [title, uLines] of Object.entries(unknownSectionLines)) {
    const text = uLines.join("\n").trim();
    if (text) {
      trimmedUnknown[title] = text;
      unknownDetails.push({
        name: title,
        text,
        status: "detected",
        confidence: "medium",
      });
    }
  }

  if (Object.keys(trimmedUnknown).length > 0) {
    result.unknownSections = trimmedUnknown;
    result.unknownDetails = unknownDetails;
  }

  return result;
}
