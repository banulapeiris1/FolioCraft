import type { CvSectionType, DetectedCvSections } from "../types/cv.types";

export type { CvSectionType, DetectedCvSections };

/**
 * Deterministic regex patterns for detecting standard CV section headings.
 */
const SECTION_PATTERNS: Record<CvSectionType, RegExp[]> = {
  summary: [
    /^(?:professional\s+|career\s+|executive\s+|personal\s+)?summary$/i,
    /^(?:professional\s+|personal\s+)?profile$/i,
    /^about\s+me$/i,
    /^(?:career\s+)?objective$/i,
    /^(?:brief\s+)?bio(?:graphy)?$/i,
    /^overview$/i,
  ],
  experience: [
    /^(?:work|professional|employment|career|relevant|internship|practical)\s+experience$/i,
    /^(?:work|employment|career|job)\s+history$/i,
    /^experience$/i,
    /^employment$/i,
    /^work\s+background$/i,
    /^internships?$/i,
  ],
  education: [
    /^(?:educational|academic)\s+background$/i,
    /^(?:academic|education)\s+history$/i,
    /^(?:academic\s+)?qualifications$/i,
    /^education(?:\s+(?:&|and)\s+qualifications)?$/i,
    /^degrees(?:\s+(?:&|and)\s+certificates)?$/i,
  ],
  skills: [
    /^(?:technical|core|key|professional|it|programming|primary|relevant)\s+skills$/i,
    /^skills(?:\s+(?:&|and)\s+(?:technologies|tools|competencies))?$/i,
    /^technical\s+skills(?:\s+(?:&|and)\s+technologies)?$/i,
    /^(?:tools|technologies)(?:\s+(?:&|and)\s+skills)?$/i,
    /^(?:core\s+)?competencies$/i,
    /^(?:technical\s+)?expertise$/i,
    /^tech(?:nical)?\s+stack$/i,
    /^skills$/i,
  ],
  projects: [
    /^(?:personal|academic|selected|key|technical|portfolio|software|recent|featured)\s+projects$/i,
    /^projects(?:\s+(?:&|and)\s+(?:experience|achievements))?$/i,
    /^projects$/i,
  ],
};

/**
 * Common non-core section headings recognized to prevent unrecognized headings
 * from inadvertently being merged into previous sections.
 */
const KNOWN_NON_CORE_PATTERNS: RegExp[] = [
  /^(?:certifications?|certificates?)(?:\s+(?:&|and)\s+licenses?)?$/i,
  /^(?:licenses?|licensures?)$/i,
  /^(?:awards?|honors?)(?:\s+(?:&|and)\s+(?:achievements?|scholarships?))?$/i,
  /^(?:achievements?|accomplishments?)$/i,
  /^(?:publications?|research(?:\s+papers?)?)$/i,
  /^(?:languages?|language\s+proficiency)$/i,
  /^(?:volunteer(?:ing)?|community\s+service|volunteer\s+experience)$/i,
  /^(?:interests?|hobbies?|extracurriculars?|activities)$/i,
  /^(?:references?|referees?)$/i,
  /^(?:courses?|coursework|training)$/i,
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
    /^(?:i|we|my|our|he|she|they|worked|responsible|developed|managed|demonstrated|over\s+\d+)\b/i.test(
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
 * Checks if a line resembles an unknown/custom section heading (e.g. "CERTIFICATIONS", "AWARDS").
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
    /^(?:i|we|my|our|he|she|they|worked|responsible|developed|managed|demonstrated|over\s+\d+)\b/i.test(
      trimmed
    )
  ) {
    return null;
  }

  const cleaned = cleanHeadingLine(trimmed);
  if (!cleaned || cleaned.length < 3) {
    return null;
  }

  // Known non-core section patterns (e.g., Certifications, Publications)
  for (const pattern of KNOWN_NON_CORE_PATTERNS) {
    if (pattern.test(cleaned)) {
      return cleaned;
    }
  }

  // Short uppercase heading (e.g., "HONORS", "LEADERSHIP")
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
 *
 * Captures any introductory header/profile text (before the first section) in headerText,
 * and preserves unknown headings/sections in unknownSections.
 */
export function detectCvSections(rawText: string): DetectedCvSections {
  if (!rawText || !rawText.trim()) {
    return {
      detectedOrder: [],
      rawText: rawText || "",
    };
  }

  const lines = rawText.split(/\r?\n/);

  type ActiveTarget =
    | { type: "header" }
    | { type: "core"; section: CvSectionType }
    | { type: "unknown"; title: string };

  let activeTarget: ActiveTarget = { type: "header" };

  const headerLines: string[] = [];
  const coreSectionLines: Partial<Record<CvSectionType, string[]>> = {};
  const unknownSectionLines: Record<string, string[]> = {};
  const detectedOrder: CvSectionType[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;

    // 1. Check for core known section heading
    const coreMatch = matchKnownSection(rawLine);
    if (coreMatch) {
      activeTarget = { type: "core", section: coreMatch };
      if (!detectedOrder.includes(coreMatch)) {
        detectedOrder.push(coreMatch);
      }
      if (!coreSectionLines[coreMatch]) {
        coreSectionLines[coreMatch] = [];
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

  const result: DetectedCvSections = {
    detectedOrder,
    rawText,
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
    }
  }

  const trimmedUnknown: Record<string, string> = {};
  for (const [title, uLines] of Object.entries(unknownSectionLines)) {
    const text = uLines.join("\n").trim();
    if (text) {
      trimmedUnknown[title] = text;
    }
  }
  if (Object.keys(trimmedUnknown).length > 0) {
    result.unknownSections = trimmedUnknown;
  }

  return result;
}
