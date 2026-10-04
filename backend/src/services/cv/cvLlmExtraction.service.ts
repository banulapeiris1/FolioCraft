import { z } from "zod";
import type {
  CategorizedSkills,
  Confidence,
  EntitySource,
  ReviewIssue,
  SectionStatus,
  StructuredCvAchievement,
  StructuredCvData,
  StructuredCvEducation,
  StructuredCvExperience,
  StructuredCvExtracurricular,
  StructuredCvLeadership,
  StructuredCvProject,
  StructuredCvSkill,
} from "../../types/cv.types";
import { classifySkill, type SkillCategory } from "../skillClassification.service";
import { renderCvPageImage } from "./cvLayout.service";

/**
 * Full-document LLM extraction.
 *
 * Rule-based parsing cannot reliably handle the variety of CV templates
 * (wrapped bullet lines, two-column layouts, grouped skill rows, unusual
 * headings). This service asks Gemini for the complete structured CV using a
 * strict response schema, then grounds every value against the extracted PDF
 * text so hallucinated contact details or entities are dropped or flagged.
 */

const SKILL_CATEGORIES = [
  "languages",
  "frontend",
  "backend",
  "databases",
  "tools",
  "softSkills",
  "other",
] as const;

const nullableString = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const stringList = z
  .array(z.string())
  .nullish()
  .transform((v) => (v || []).map((s) => s.trim()).filter(Boolean));

export const LlmCvSchema = z.object({
  personal: z
    .object({
      fullName: nullableString,
      professionalTitle: nullableString,
      email: nullableString,
      phone: nullableString,
      location: nullableString,
      website: nullableString,
      linkedin: nullableString,
      github: nullableString,
      summary: nullableString,
    })
    .nullish()
    .transform((v) => v || {}),
  experience: z
    .array(
      z.object({
        company: nullableString,
        position: nullableString,
        location: nullableString,
        startDate: nullableString,
        endDate: nullableString,
        isCurrent: z.boolean().nullish(),
        description: nullableString,
      })
    )
    .nullish()
    .transform((v) => v || []),
  education: z
    .array(
      z.object({
        institution: nullableString,
        degree: nullableString,
        field: nullableString,
        grade: nullableString,
        startDate: nullableString,
        endDate: nullableString,
        description: nullableString,
      })
    )
    .nullish()
    .transform((v) => v || []),
  skills: z
    .array(
      z.object({
        name: z.string(),
        category: z.string().nullish(),
      })
    )
    .nullish()
    .transform((v) => v || []),
  projects: z
    .array(
      z.object({
        title: nullableString,
        role: nullableString,
        startDate: nullableString,
        endDate: nullableString,
        description: nullableString,
        technologies: stringList,
        githubUrl: nullableString,
        liveUrl: nullableString,
      })
    )
    .nullish()
    .transform((v) => v || []),
  achievements: z
    .array(
      z.object({
        title: nullableString,
        description: nullableString,
        date: nullableString,
      })
    )
    .nullish()
    .transform((v) => v || []),
  leadership: z
    .array(
      z.object({
        role: nullableString,
        organization: nullableString,
        startDate: nullableString,
        endDate: nullableString,
        description: nullableString,
      })
    )
    .nullish()
    .transform((v) => v || []),
  extracurricular: z
    .array(
      z.object({
        activity: nullableString,
        role: nullableString,
        organization: nullableString,
        startDate: nullableString,
        endDate: nullableString,
        description: nullableString,
      })
    )
    .nullish()
    .transform((v) => v || []),
});

export type LlmCvResult = z.infer<typeof LlmCvSchema>;

// Gemini responseSchema (OpenAPI subset). Every property is listed as required
// (nullable where optional); otherwise Gemini silently omits most fields.
const str = { type: "STRING", nullable: true };
const strArr = { type: "ARRAY", items: { type: "STRING" } };
const obj = (properties: Record<string, unknown>) => ({
  type: "OBJECT",
  properties,
  required: Object.keys(properties),
  propertyOrdering: Object.keys(properties),
});
const arr = (properties: Record<string, unknown>) => ({
  type: "ARRAY",
  items: obj(properties),
});

export const GEMINI_RESPONSE_SCHEMA = obj({
  personal: obj({
    fullName: str,
    professionalTitle: str,
    email: str,
    phone: str,
    location: str,
    website: str,
    linkedin: str,
    github: str,
    summary: str,
  }),
  experience: arr({
    company: str,
    position: str,
    location: str,
    startDate: str,
    endDate: str,
    isCurrent: { type: "BOOLEAN" },
    description: str,
  }),
  education: arr({
    institution: str,
    degree: str,
    field: str,
    grade: str,
    startDate: str,
    endDate: str,
    description: str,
  }),
  skills: arr({
    name: { type: "STRING" },
    category: { type: "STRING", enum: [...SKILL_CATEGORIES] },
  }),
  projects: arr({
    title: str,
    role: str,
    startDate: str,
    endDate: str,
    description: str,
    technologies: strArr,
    githubUrl: str,
    liveUrl: str,
  }),
  achievements: arr({ title: str, description: str, date: str }),
  leadership: arr({
    role: str,
    organization: str,
    startDate: str,
    endDate: str,
    description: str,
  }),
  extracurricular: arr({
    activity: str,
    role: str,
    organization: str,
    startDate: str,
    endDate: str,
    description: str,
  }),
});

export const CV_EXTRACTION_PROMPT = `You extract structured data from a CV/resume.
You receive page images and the text layer extracted from the same PDF. Use the images to understand layout (columns, sidebars, which lines belong together) and the text layer for exact spelling.

Rules:
- Copy values exactly as written. Never invent, guess, or "improve" names, emails, phone numbers, URLs, dates, or organisations. Use null when a value is not present.
- Fix only PDF text-layer artefacts: re-join words hyphenated across lines, and join lines of one sentence/bullet that wrapped onto the next line.
- One entry per real item. A wrapped continuation line of a bullet is NEVER a new entry. Template placeholder text (e.g. "Short summary of your work") must be ignored.
- description: keep the bullet points as separate lines joined with "\\n", without bullet symbols.
- Dates: keep the CV's format (e.g. "09/2025", "2023", "Jan 2024"). Use "Present" for ongoing roles and set isCurrent=true.
- personal.github / linkedin / website: full URL or handle exactly as printed. personal.location is the candidate's address/city, not a job location.
- skills: one entry per individual technology/skill. Split grouped rows ("HTML, CSS, JS" or "HTML CSS JS") into separate skills. Group labels such as "Client-Side", "Server-Side" or "Development & Operations" are NOT skills. Category: languages (programming/markup languages), frontend (UI frameworks/libraries), backend (server runtimes/frameworks), databases, tools (DevOps, cloud, VCS, design tools, methodologies like Scrum/Agile), softSkills, other.
- projects: software/hardware/academic things the candidate built. technologies: list from "Technologies:"/"Tech stack" lines or parentheses in the title area. A "Technologies: ..." line goes into technologies, not description.
- experience: employment, internships, and technical roles in labs/companies/startups.
- leadership: elected or appointed leading roles (president, team lead, captain, chair) in clubs/societies/communities.
- extracurricular: club memberships, volunteering, sports, societies and events that are not leadership roles.
- achievements: awards, competition placings, scholarships, certifications.
- education: degree programmes and school qualifications. Put GPA/class/results in grade. Put subject results lists in description.
- Ignore referees/references, page footers and template watermarks (e.g. "Powered by enhancv").`;

export interface CvLlmRequest {
  pageImages: Array<{ pageNumber: number; imageBase64: string; mimeType: string }>;
  pageTexts: Array<{ pageNumber: number; text: string }>;
}

export interface CvLlmResponse {
  success: boolean;
  data?: LlmCvResult;
  error?: string;
}

export interface CvLlmClient {
  extractCv(request: CvLlmRequest): Promise<CvLlmResponse>;
}

export function isLlmExtractionConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

export class GeminiCvLlmClient implements CvLlmClient {
  private apiKey: string;
  private models: string[];
  private timeoutMs: number;

  constructor(apiKey?: string, model?: string, timeoutMs = 120000) {
    this.apiKey =
      apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    const primary = model || process.env.GEMINI_MODEL || "gemini-flash-latest";
    const fallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest";
    this.models = primary === fallback ? [primary] : [primary, fallback];
    this.timeoutMs = timeoutMs;
  }

  /** Retries overloaded/rate-limited responses, then moves to the fallback model. */
  private async post(body: string, signal: AbortSignal): Promise<Response> {
    const delaysMs = [0, 2000, 5000];
    let last: Response | undefined;
    for (const model of this.models) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`;
      for (const delay of delaysMs) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        last = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
          signal,
          body,
        });
        if (last.status !== 429 && last.status !== 503 && last.status !== 500) return last;
      }
    }
    return last!;
  }

  async extractCv(request: CvLlmRequest): Promise<CvLlmResponse> {
    if (!this.apiKey) {
      return { success: false, error: "GEMINI_API_KEY is not configured." };
    }

    const parts: Array<Record<string, unknown>> = [];
    for (const img of request.pageImages) {
      parts.push({ text: `--- Page ${img.pageNumber} image ---` });
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.imageBase64 } });
    }
    for (const pt of request.pageTexts) {
      parts.push({ text: `--- Page ${pt.pageNumber} extracted text ---\n${pt.text}` });
    }
    parts.push({ text: "Extract the complete CV into the JSON schema." });

    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: CV_EXTRACTION_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESPONSE_SCHEMA,
        temperature: 0,
      },
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.post(body, controller.signal);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          error: `Gemini API returned HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        };
      }

      const rawJson = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      };
      const text = (rawJson.candidates?.[0]?.content?.parts || [])
        .filter((p) => !p.thought && typeof p.text === "string")
        .map((p) => p.text)
        .join("");

      if (!text) {
        return { success: false, error: "Gemini returned an empty response." };
      }

      const parsed = JSON.parse(
        text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
      );
      const validated = LlmCvSchema.safeParse(parsed);
      if (!validated.success) {
        return {
          success: false,
          error: `Gemini response failed schema validation: ${validated.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
        };
      }
      return { success: true, data: validated.data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Gemini request failed: ${msg}` };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ---------------------------------------------------------------------------
// Grounding: every value must be traceable to the PDF text layer.
// ---------------------------------------------------------------------------

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[‐-―−]/g, "-")
    .replace(/[^a-z0-9@.+/:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(text: string): string {
  return text.replace(/\D+/g, "");
}

function stripUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

/**
 * Share of a value's significant words that appear in the source text.
 * Tolerates re-joined line wraps and punctuation changes.
 */
export function groundingScore(value: string, normalizedSource: string): number {
  const words = normalizeForMatch(value)
    .split(" ")
    .filter((w) => w.length > 2);
  if (words.length === 0) return 1;
  const found = words.filter((w) => normalizedSource.includes(w)).length;
  return found / words.length;
}

function confidenceFromScore(score: number): Confidence {
  if (score >= 0.9) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

function source(section: string, text: string, confidence: Confidence): EntitySource {
  return { section, text, classifier: "gemini", confidence };
}

/** Removes undefined-valued keys so results satisfy exactOptionalPropertyTypes. */
function compact<T extends object>(value: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as T;
}

function cleanDate(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/[‐-―]/g, "-").trim() || undefined;
}

function isCurrentDate(value?: string): boolean {
  return Boolean(value && /present|current|ongoing|now/i.test(value));
}

/**
 * Converts a validated LLM result into StructuredCvData, dropping
 * contact details not present in the PDF and lowering confidence for
 * entities whose text cannot be found in the document.
 */
export function mapLlmResultToStructuredCv(
  llm: LlmCvResult,
  rawText: string
): StructuredCvData {
  const normalizedSource = normalizeForMatch(rawText);
  const sourceDigits = digitsOnly(rawText);
  const sourceNoSpace = normalizedSource.replace(/\s+/g, "");
  const reviewIssues: ReviewIssue[] = [];

  const flagUngrounded = (section: string, label: string, score: number) => {
    if (score < 0.6) {
      reviewIssues.push({
        field: section,
        section,
        message: `"${label}" could not be matched to the text in your CV. Please verify it.`,
        severity: "warning",
        value: label,
      });
    }
  };

  // Personal info: exact-match grounding for identifiers.
  const p = llm.personal as Partial<Record<keyof StructuredCvData["personal"], string>>;
  const personalDraft: Record<string, string | undefined> = {};
  const keepIfGrounded = (value: string | undefined, check: (v: string) => boolean) =>
    value && check(value) ? value : undefined;

  personalDraft.email = keepIfGrounded(p.email, (v) =>
    normalizedSource.includes(v.toLowerCase())
  );
  personalDraft.phone = keepIfGrounded(p.phone, (v) => {
    const d = digitsOnly(v);
    return d.length >= 7 && sourceDigits.includes(d.replace(/^0+/, ""));
  });
  for (const key of ["website", "linkedin", "github"] as const) {
    personalDraft[key] = keepIfGrounded(p[key], (v) =>
      sourceNoSpace.includes(stripUrl(v).replace(/\s+/g, ""))
    );
  }
  for (const key of ["fullName", "professionalTitle", "location", "summary"] as const) {
    const value = p[key];
    if (value && groundingScore(value, normalizedSource) >= 0.6) {
      personalDraft[key] = value;
    }
  }
  const personal = personalDraft;
  // A bare GitHub handle is common ("github: johndoe"); expose it as a URL.
  if (personal.github && !/github\.com/i.test(personal.github)) {
    personal.github = `https://github.com/${personal.github.replace(/^@/, "")}`;
  }
  if (personal.linkedin && !/linkedin\.com/i.test(personal.linkedin)) {
    personal.linkedin = `https://www.linkedin.com/in/${personal.linkedin.replace(/^@/, "")}`;
  }

  const experience: StructuredCvData["experience"] = llm.experience
    .filter((e) => e.company || e.position)
    .map((e) => {
      const label = [e.position, e.company].filter(Boolean).join(" at ");
      const score = groundingScore(label, normalizedSource);
      flagUngrounded("experience", label, score);
      return compact<StructuredCvExperience>({
        company: e.company || "",
        position: e.position || "",
        description: e.description,
        startDate: cleanDate(e.startDate),
        endDate: cleanDate(e.endDate),
        isCurrent: Boolean(e.isCurrent) || isCurrentDate(e.endDate),
        confidence: confidenceFromScore(score),
      });
    });

  const education: StructuredCvData["education"] = llm.education
    .filter((e) => e.institution || e.degree)
    .map((e) => {
      const label = [e.degree, e.institution].filter(Boolean).join(", ");
      const score = groundingScore(label, normalizedSource);
      flagUngrounded("education", label, score);
      const grade =
        e.grade && !/^(?:gpa|cgpa|grade|class)/i.test(e.grade) ? `Grade: ${e.grade}` : e.grade;
      const description = [grade, e.description]
        .filter(Boolean)
        .join("\n");
      return compact<StructuredCvEducation>({
        institution: e.institution || "",
        degree: e.degree,
        field: e.field,
        description: description || undefined,
        startDate: cleanDate(e.startDate),
        endDate: cleanDate(e.endDate),
        confidence: confidenceFromScore(score),
      });
    });

  // Skills: prefer the catalog's canonical name/category, fall back to the LLM category.
  const categorizedSkills: CategorizedSkills = {
    languages: [],
    frontend: [],
    backend: [],
    databases: [],
    tools: [],
    softSkills: [],
    other: [],
  };
  const skills: StructuredCvSkill[] = [];
  const seen = new Set<string>();
  for (const s of llm.skills) {
    const name = s.name.trim();
    if (!name || name.length > 40) continue;
    const catalog = classifySkill(name);
    const llmCategory = (SKILL_CATEGORIES as readonly string[]).includes(s.category || "")
      ? (s.category as SkillCategory)
      : "other";
    const category = catalog.confidence === "high" ? catalog.category : llmCategory;
    const finalName = catalog.confidence === "high" ? catalog.name : name;
    const key = finalName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const score = groundingScore(name, normalizedSource);
    if (score < 0.5) continue; // skill not in the CV at all
    const skill: StructuredCvSkill = {
      name: finalName,
      category,
      confidence: catalog.confidence === "high" ? "high" : "medium",
    };
    skills.push(skill);
    categorizedSkills[category].push(skill);
  }

  const projects: StructuredCvData["projects"] = llm.projects
    .filter((pr) => pr.title)
    .map((pr) => {
      const title = pr.title!;
      const score = groundingScore(title, normalizedSource);
      flagUngrounded("projects", title, score);
      const urlOk = (u?: string) =>
        u && sourceNoSpace.includes(stripUrl(u).replace(/\s+/g, "")) ? u : undefined;
      const confidence = confidenceFromScore(score);
      return compact<StructuredCvProject>({
        title,
        description: pr.description,
        technologies: pr.technologies,
        githubUrl: urlOk(pr.githubUrl),
        liveUrl: urlOk(pr.liveUrl),
        confidence,
        source: source("Projects", title, confidence),
      });
    });

  const achievements = llm.achievements
    .filter((a) => a.title)
    .map((a) => {
      const score = groundingScore(a.title!, normalizedSource);
      flagUngrounded("achievements", a.title!, score);
      const confidence = confidenceFromScore(score);
      return compact<StructuredCvAchievement>({
        title: a.title!,
        description: a.description,
        date: cleanDate(a.date),
        confidence,
        source: source("Achievements", a.title!, confidence),
      });
    });

  const leadership = llm.leadership
    .filter((l) => l.role)
    .map((l) => {
      const label = [l.role, l.organization].filter(Boolean).join(", ");
      const score = groundingScore(label, normalizedSource);
      flagUngrounded("leadership", label, score);
      const confidence = confidenceFromScore(score);
      return compact<StructuredCvLeadership>({
        role: l.role!,
        organization: l.organization,
        description: l.description,
        startDate: cleanDate(l.startDate),
        endDate: cleanDate(l.endDate),
        confidence,
        source: source("Leadership", label, confidence),
      });
    });

  const extracurricular = llm.extracurricular
    .filter((x) => x.activity || x.organization)
    .map((x) => {
      const activity = x.activity || x.organization!;
      const score = groundingScore(activity, normalizedSource);
      flagUngrounded("extracurricular", activity, score);
      const confidence = confidenceFromScore(score);
      return compact<StructuredCvExtracurricular>({
        activity,
        role: x.role,
        organization: x.organization,
        description: x.description,
        startDate: cleanDate(x.startDate),
        endDate: cleanDate(x.endDate),
        confidence,
        source: source("Extracurricular Activities", activity, confidence),
      });
    });

  for (const key of ["fullName", "email"] as const) {
    if (!personal[key]) {
      reviewIssues.push({
        field: key,
        section: "personal",
        message: `${key === "fullName" ? "Full name" : "Email"} was not found in the CV. Please add it.`,
        severity: "warning",
      });
    }
  }

  const status = (n: number): SectionStatus => (n > 0 ? "detected" : "not_detected");

  return compact<StructuredCvData>({
    personal: compact<StructuredCvData["personal"]>(personal),
    experience,
    education,
    skills,
    projects,
    categorizedSkills,
    achievements: achievements.length > 0 ? achievements : undefined,
    leadership: leadership.length > 0 ? leadership : undefined,
    extracurricular: extracurricular.length > 0 ? extracurricular : undefined,
    extracurricularActivities: extracurricular.length > 0 ? extracurricular : undefined,
    reviewIssues: reviewIssues.length > 0 ? reviewIssues : undefined,
    sectionStatuses: {
      summary: personal.summary ? "detected" : "not_detected",
      experience: status(experience.length),
      education: status(education.length),
      skills: status(skills.length),
      projects: status(projects.length),
      achievements: status(achievements.length),
      leadership: status(leadership.length),
      extracurricular: status(extracurricular.length),
    },
    rawText,
  });
}

/**
 * Renders up to `maxPages` pages and runs full-document LLM extraction.
 */
export async function executeLlmCvExtraction(options: {
  pdfBuffer: Buffer;
  pageTexts: string[];
  rawText: string;
  client?: CvLlmClient | undefined;
  maxPages?: number;
}): Promise<{ structured?: StructuredCvData; error?: string }> {
  const client = options.client || new GeminiCvLlmClient();
  const pageCount = Math.min(options.pageTexts.length || 1, options.maxPages ?? 4);

  const pageImages: CvLlmRequest["pageImages"] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    try {
      const img = await renderCvPageImage(options.pdfBuffer, pageNumber);
      if (img.length > 0) {
        pageImages.push({ pageNumber, imageBase64: img.toString("base64"), mimeType: "image/png" });
      }
    } catch {
      // Text layer alone is still useful if rendering fails.
    }
  }

  const response = await client.extractCv({
    pageImages,
    pageTexts: options.pageTexts
      .slice(0, pageCount)
      .map((text, idx) => ({ pageNumber: idx + 1, text })),
  });

  if (!response.success || !response.data) {
    return { error: response.error || "LLM extraction failed" };
  }

  return { structured: mapLlmResultToStructuredCv(response.data, options.rawText) };
}
