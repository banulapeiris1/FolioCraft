import { z } from "zod";
import type {
  CvLayoutAnalysis,
  StructuredCvData,
} from "../../types/cv.types";
import { renderCvPageImage } from "./cvLayout.service";

/**
 * Strict Zod schema for validated Gemini structured multimodal CV output.
 */
const toSectionType = (
  val: unknown
):
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "achievements"
  | "leadership"
  | "extracurricular"
  | "certifications"
  | "volunteering"
  | "other"
  | "unknown" => {
  const s = String(val || "").toLowerCase().trim();
  if (s.includes("proj")) return "projects";
  if (s.includes("extra") || s.includes("activit") || s.includes("club"))
    return "extracurricular";
  if (s.includes("lead") || s.includes("presid")) return "leadership";
  if (s.includes("achieve") || s.includes("award") || s.includes("honor"))
    return "achievements";
  if (s.includes("exp") || s.includes("work") || s.includes("employ"))
    return "experience";
  if (s.includes("edu") || s.includes("acad")) return "education";
  if (s.includes("skill") || s.includes("competenc")) return "skills";
  if (s.includes("sum") || s.includes("profile") || s.includes("about"))
    return "summary";
  if (s.includes("cert")) return "certifications";
  if (s.includes("volunt")) return "volunteering";
  return "other";
};

export interface GeminiCvEntity {
  title?: string;
  name?: string;
  activity?: string;
  role?: string;
  organization?: string;
  company?: string;
  position?: string;
  institution?: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  technologies?: string[];
  githubUrl?: string;
  liveUrl?: string;
  confidence?: "high" | "medium" | "low";
  [key: string]: unknown;
}

export const GeminiCvEntitySchema: z.ZodType<GeminiCvEntity> = z.union([
  z.string().transform((val) => ({
    title: val,
    name: val,
    activity: val,
    description: val,
    role: undefined as string | undefined,
    organization: undefined as string | undefined,
    company: undefined as string | undefined,
    position: undefined as string | undefined,
    institution: undefined as string | undefined,
    degree: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
    technologies: undefined as string[] | undefined,
    githubUrl: undefined as string | undefined,
    liveUrl: undefined as string | undefined,
    confidence: undefined as "high" | "medium" | "low" | undefined,
  })),
  z.record(z.string(), z.unknown()).transform((obj) => ({
    title:
      typeof obj.title === "string"
        ? obj.title
        : typeof obj.name === "string"
        ? obj.name
        : undefined,
    name: typeof obj.name === "string" ? obj.name : undefined,
    activity:
      typeof obj.activity === "string"
        ? obj.activity
        : typeof obj.title === "string"
        ? obj.title
        : typeof obj.name === "string"
        ? obj.name
        : undefined,
    role:
      typeof obj.role === "string"
        ? obj.role
        : typeof obj.position === "string"
        ? obj.position
        : undefined,
    organization:
      typeof obj.organization === "string"
        ? obj.organization
        : typeof obj.company === "string"
        ? obj.company
        : undefined,
    company: typeof obj.company === "string" ? obj.company : undefined,
    position: typeof obj.position === "string" ? obj.position : undefined,
    institution:
      typeof obj.institution === "string" ? obj.institution : undefined,
    degree: typeof obj.degree === "string" ? obj.degree : undefined,
    startDate: typeof obj.startDate === "string" ? obj.startDate : undefined,
    endDate: typeof obj.endDate === "string" ? obj.endDate : undefined,
    description:
      typeof obj.description === "string" ? obj.description : undefined,
    technologies: Array.isArray(obj.technologies)
      ? obj.technologies.map(String)
      : undefined,
    githubUrl: typeof obj.githubUrl === "string" ? obj.githubUrl : undefined,
    liveUrl: typeof obj.liveUrl === "string" ? obj.liveUrl : undefined,
    confidence: (obj.confidence === "high" ||
      obj.confidence === "medium" ||
      obj.confidence === "low"
      ? obj.confidence
      : undefined) as "high" | "medium" | "low" | undefined,
  })),
]);

export const GeminiCvSectionSchema = z.union([
  z.string().transform((val) => ({
    sectionType: toSectionType(val),
    title: val,
    items: [],
  })),
  z.record(z.string(), z.unknown()).transform((obj) => ({
    sectionType: toSectionType(obj.sectionType || obj.title),
    title: String(obj.title || obj.sectionType || "Unknown Section"),
    page: typeof obj.page === "number" ? obj.page : undefined,
    confidence: typeof obj.confidence === "number" ? obj.confidence : undefined,
    items: Array.isArray(obj.items)
      ? (obj.items as unknown[]).map((i) =>
          typeof i === "string"
            ? { title: i, activity: i, description: i }
            : (i as Record<string, unknown>)
        )
      : [],
  })),
]);

const toArray = (val: unknown): unknown[] => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object") return [val];
  if (typeof val === "string" && val.trim().length > 0) return [val];
  return [];
};

export const GeminiParsedCvSchema = z.preprocess((raw: unknown) => {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const root =
    (record.data as Record<string, unknown>) ||
    (record.result as Record<string, unknown>) ||
    record;

  return {
    sections: toArray(root.sections),
    projects: toArray(root.projects),
    extracurricular: toArray(
      root.extracurricular ||
        root.extracurricularActivities ||
        root.activities ||
        root.clubs
    ),
    achievements: toArray(root.achievements || root.awards || root.honors),
    leadership: toArray(root.leadership || root.positions),
    experience: toArray(
      root.experience || root.workExperience || root.workHistory
    ),
    education: toArray(root.education),
    conflicts: Array.isArray(root.conflicts) ? root.conflicts.map(String) : [],
    notes: typeof root.notes === "string" ? root.notes : undefined,
  };
}, z.object({
  sections: z.array(GeminiCvSectionSchema).default([]),
  projects: z.array(GeminiCvEntitySchema).default([]),
  extracurricular: z.array(GeminiCvEntitySchema).default([]),
  achievements: z.array(GeminiCvEntitySchema).default([]),
  leadership: z.array(GeminiCvEntitySchema).default([]),
  experience: z.array(GeminiCvEntitySchema).default([]),
  education: z.array(GeminiCvEntitySchema).default([]),
  conflicts: z.array(z.string()).default([]),
  notes: z.string().optional(),
}));

export type GeminiParsedCvResult = z.infer<typeof GeminiParsedCvSchema>;

export interface GeminiCvParseRequest {
  pageImages: Array<{ pageNumber: number; imageBase64: string; mimeType: string }>;
  pageTexts: Array<{ pageNumber: number; text: string }>;
  detectedSectionsContext: string;
  ambiguityReason: string;
}

export interface GeminiCvParseResponse {
  success: boolean;
  data?: GeminiParsedCvResult;
  error?: string;
  statusCode?: number;
}

export interface GeminiDecision {
  shouldCall: boolean;
  reason: string;
  targetPages: number[];
}

/**
 * Deterministically analyzes the extracted CV structure and visual layout
 * to decide whether Gemini Multimodal fallback is warranted.
 *
 * Rules:
 * - Simple single-column CVs with high confidence and distinct sections DO NOT trigger Gemini.
 * - Triggers when:
 *   1. Projects vs Extracurricular / Leadership ambiguity is detected
 *   2. Multi-column or sidebar layout is detected where lines could be visually intertwined
 *   3. Missing core sections (e.g. experience status is 'needs_review' or empty)
 *   4. Visual headings detected by layout analysis were missed by text parser
 *   5. Review issues indicate entity ambiguities
 */
export function shouldUseGemini(
  deterministic: StructuredCvData,
  layout: CvLayoutAnalysis,
  totalPages: number = 1
): GeminiDecision {
  const targetPages = new Set<number>();

  // 1. Projects vs Extracurricular ambiguity:
  // If there are projects with no tech/repo/description, or items flagged as ambiguous
  const suspiciousProjects = (deterministic.projects || []).filter((p) => {
    const hasTechOrUrl =
      Boolean(p.githubUrl) ||
      Boolean(p.liveUrl) ||
      (p.technologies && p.technologies.length > 0);
    return !hasTechOrUrl && (!p.description || p.description.length < 30);
  });

  if (suspiciousProjects.length > 0) {
    // Collect pages where projects were found or default to page 1-2
    targetPages.add(1);
    if (totalPages > 1) targetPages.add(2);
    return {
      shouldCall: true,
      reason: `Projects vs Extracurricular ambiguity detected: ${suspiciousProjects.length} project(s) lack clear technical or URL signals.`,
      targetPages: Array.from(targetPages),
    };
  }

  // 2. Multi-column or complex sidebar layout:
  if (layout.layoutType !== "single-column" || layout.sidebar.detected) {
    for (let p = 1; p <= Math.min(totalPages, 2); p++) {
      targetPages.add(p);
    }
    return {
      shouldCall: true,
      reason: `Complex layout detected (${layout.layoutType}${
        layout.sidebar.detected ? " with sidebar" : ""
      }) requiring visual column reconciliation.`,
      targetPages: Array.from(targetPages),
    };
  }

  // 3. Visual headings detected in layout that are missing in detected canonical sections:
  const canonicalSet = new Set(
    Object.keys(deterministic.sectionStatuses || {})
  );
  const unmappedVisualHeadings = layout.visualHeadings.filter(
    (vh) =>
      vh.page <= 2 &&
      !canonicalSet.has(vh.text.toLowerCase().trim()) &&
      /^(?:projects|activities|extracurricular|experience|leadership|awards|achievements)/i.test(
        vh.text
      )
  );

  if (unmappedVisualHeadings.length > 0) {
    unmappedVisualHeadings.forEach((vh) => targetPages.add(vh.page));
    return {
      shouldCall: true,
      reason: `Layout detected visual headings not clearly parsed in text: ${unmappedVisualHeadings
        .map((h) => h.text)
        .join(", ")}`,
      targetPages: Array.from(targetPages),
    };
  }

  // 4. Missing core sections with warning-level review issues:
  const hasCriticalWarning = (deterministic.reviewIssues || []).some(
    (issue) =>
      issue.severity === "warning" &&
      (issue.section === "experience" || issue.section === "projects")
  );

  if (hasCriticalWarning) {
    targetPages.add(1);
    return {
      shouldCall: true,
      reason: "Critical section detection warnings require visual second opinion.",
      targetPages: Array.from(targetPages),
    };
  }

  return {
    shouldCall: false,
    reason: "Deterministic parsing is confident with standard layout.",
    targetPages: [],
  };
}

/**
 * Interface allowing test mocking of the Gemini Multimodal AI call.
 */
export interface GeminiCvClient {
  callMultimodal(request: GeminiCvParseRequest): Promise<GeminiCvParseResponse>;
}

/**
 * Default production Gemini client calling Google Generative Language REST API.
 */
export class DefaultGeminiCvClient implements GeminiCvClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey =
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "";
    this.model = model || process.env.GEMINI_MODEL || "gemini-flash-latest";
  }

  async callMultimodal(
    request: GeminiCvParseRequest
  ): Promise<GeminiCvParseResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "GEMINI_API_KEY is not configured in environment.",
      };
    }

    const systemInstruction = `
You are an expert CV/resume visual layout and entity parser.
Analyze both the provided CV page images and the extracted text carefully.

Your primary objective is ACCURATE SECTION AND ENTITY CLASSIFICATION:
1. DISTINGUISH PROJECTS FROM EXTRACURRICULAR ACTIVITIES:
   - Visual section heading takes highest priority.
   - Items under "EXTRACURRICULAR ACTIVITIES", "ACTIVITIES", "CLUBS & SOCIETIES", "VOLUNTEERING" must be placed in 'extracurricular', NEVER in 'projects'.
   - Examples of extracurricular: University Cricket Team, IEEE Student Member, Event Organizer, Rotaract Club, Hackathon Organizer, Sports Captain.
   - Items under "PROJECTS", "TECHNICAL PROJECTS", "SOFTWARE PROJECTS" are 'projects' (e.g. Intelligent Shipment Alerting System, Portfolio Website, Web Application).
2. DISTINGUISH LEADERSHIP, ACHIEVEMENTS, AND EXPERIENCE:
   - Awards, scholarships, hackathon wins -> achievements
   - Club president, team lead, board positions -> leadership
   - Professional employment, internships -> experience
3. Preserve two-column and sidebar structure:
   - Identify which text belongs to the sidebar (e.g. Skills, Contact) vs the main column (Experience, Projects).
4. Output strict JSON matching the schema provided. Do not wrap with markdown code fences if response_mime_type is JSON.
`;

    // Construct parts array for Gemini API (images + text)
    const parts: Array<Record<string, unknown>> = [
      { text: systemInstruction },
      {
        text: `Ambiguity Context: ${request.ambiguityReason}\nDetected Sections: ${request.detectedSectionsContext}`,
      },
    ];

    for (const img of request.pageImages) {
      parts.push({
        text: `--- CV Page ${img.pageNumber} Image ---`,
      });
      parts.push({
        inline_data: {
          mime_type: img.mimeType,
          data: img.imageBase64,
        },
      });
    }

    for (const pt of request.pageTexts) {
      parts.push({
        text: `--- Extracted Text for Page ${pt.pageNumber} ---\n${pt.text}`,
      });
    }

    parts.push({
      text: `Please classify the sections and entities on these pages into JSON conforming to:
{
  "sections": [{"sectionType": "...", "title": "...", "page": 1, "confidence": 0.95, "items": []}],
  "projects": [{"title": "...", "description": "...", "technologies": [], "githubUrl": "...", "liveUrl": "..."}],
  "extracurricular": [{"activity": "...", "role": "...", "organization": "...", "description": "..."}],
  "experience": [{"company": "...", "position": "...", "startDate": "...", "endDate": "...", "description": "..."}],
  "achievements": [{"title": "...", "description": "...", "date": "..."}],
  "leadership": [{"role": "...", "organization": "...", "startDate": "...", "description": "..."}],
  "conflicts": []
}`,
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      let response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (response.status === 503 || response.status === 429) {
        // Transient server load spike — wait 1.5s and retry once
        await new Promise((resolve) => setTimeout(resolve, 1500));
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1,
            },
          }),
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          statusCode: response.status,
          error: `Gemini API returned HTTP ${response.status}: ${errorText.slice(
            0,
            200
          )}`,
        };
      }

      const rawJson = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const candidateText =
        rawJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        return {
          success: false,
          error: "Gemini API returned empty response candidates.",
        };
      }

      // Parse JSON and validate against schema
      let parsedObj: unknown;
      try {
        parsedObj = JSON.parse(candidateText.trim());
      } catch {
        // Strip markdown backticks if returned despite json mime type
        const stripped = candidateText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        parsedObj = JSON.parse(stripped);
      }

      const validated = GeminiParsedCvSchema.safeParse(parsedObj);
      if (!validated.success) {
        const details = validated.error.issues
          .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
          .join("; ");
        return {
          success: false,
          error: `Gemini response schema validation failed: ${details} | RAW: ${candidateText.slice(0, 300)}`,
        };
      }

      return {
        success: true,
        data: validated.data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Gemini multimodal request failed: ${msg}`,
      };
    }
  }
}

/**
 * Service to execute Gemini multimodal CV parsing for ambiguous pages.
 */
export async function executeGeminiMultimodalCvParse(options: {
  pdfBuffer: Buffer;
  layout: CvLayoutAnalysis;
  deterministic: StructuredCvData;
  pageTexts?: Array<{ pageNumber: number; text: string }>;
  client?: GeminiCvClient;
}): Promise<{
  called: boolean;
  reason?: string;
  pagesAnalyzed: number[];
  geminiResult?: GeminiParsedCvResult;
  error?: string;
}> {
  const { pdfBuffer, layout, deterministic, pageTexts = [] } = options;
  const client = options.client || new DefaultGeminiCvClient();

  const decision = shouldUseGemini(
    deterministic,
    layout,
    pageTexts.length || 1
  );

  if (!decision.shouldCall) {
    return {
      called: false,
      reason: decision.reason,
      pagesAnalyzed: [],
    };
  }

  // Render images for the targeted ambiguous pages
  const pageImages: Array<{
    pageNumber: number;
    imageBase64: string;
    mimeType: string;
  }> = [];

  for (const pageNum of decision.targetPages) {
    try {
      const imgBuffer = await renderCvPageImage(pdfBuffer, pageNum);
      if (imgBuffer && imgBuffer.length > 0) {
        pageImages.push({
          pageNumber: pageNum,
          imageBase64: imgBuffer.toString("base64"),
          mimeType: "image/png",
        });
      }
    } catch {
      // Gracefully continue with text context if page rendering is unavailable or corrupted
    }
  }

  // Filter page texts to targeted pages
  const targetPageTexts = pageTexts.filter((pt) =>
    decision.targetPages.includes(pt.pageNumber)
  );

  const detectedSectionsContext = Object.entries(
    deterministic.sectionStatuses || {}
  )
    .map(([sec, status]) => `${sec}: ${status}`)
    .join(", ");

  const response = await client.callMultimodal({
    pageImages,
    pageTexts: targetPageTexts,
    detectedSectionsContext,
    ambiguityReason: decision.reason,
  });

  if (!response.success || !response.data) {
    return {
      called: true,
      reason: decision.reason,
      pagesAnalyzed: decision.targetPages,
      error: response.error || "Gemini processing failed without explicit error",
    };
  }

  return {
    called: true,
    reason: decision.reason,
    pagesAnalyzed: decision.targetPages,
    geminiResult: response.data,
  };
}
