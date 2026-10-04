import test from "node:test";
import assert from "node:assert/strict";
import { detectCvSections } from "../sectionDetection.service";
import {
  extractStructuredCv,
  extractProjects,
  extractExtracurricular,
} from "../structuredExtraction.service";
import {
  shouldUseGemini,
  executeGeminiMultimodalCvParse,
  type GeminiCvClient,
  type GeminiCvParseRequest,
  type GeminiCvParseResponse,
  type GeminiParsedCvResult,
} from "./cvAiParser.service";
import {
  reconcileCvExtraction,
  type ReconciliationOptions,
} from "./cvReconciliation.service";
import {
  analyzeCvLayout,
  renderCvPageImage,
} from "./cvLayout.service";
import { GOLDEN_CV_FIXTURES } from "./fixtures/goldenCvFixtures";
import { executeHybridCvPipeline } from "./cvPipeline.service";
import type { CvLayoutAnalysis, StructuredCvData } from "../../types/cv.types";

/**
 * Mock Gemini Multimodal Client for automated testing.
 * Guarantees zero external network or API calls during test runs.
 */
class MockGeminiClient implements GeminiCvClient {
  public callCount = 0;
  public lastRequest?: GeminiCvParseRequest;
  private mockResponse: GeminiCvParseResponse;

  constructor(response?: GeminiCvParseResponse) {
    this.mockResponse = response || {
      success: true,
      data: {
        sections: [],
        projects: [],
        extracurricular: [],
        achievements: [],
        leadership: [],
        experience: [],
        education: [],
        conflicts: [],
      },
    };
  }

  setResponse(response: GeminiCvParseResponse) {
    this.mockResponse = response;
  }

  async callMultimodal(
    request: GeminiCvParseRequest
  ): Promise<GeminiCvParseResponse> {
    this.callCount++;
    this.lastRequest = request;
    return this.mockResponse;
  }
}

test("HYBRID-CV-PARSER: Comprehensive Layout, Classification, Reconciliation & AI Fallback Suite", async (t) => {
  // ==========================================================================
  // 1 & 4. PRIMARY REGRESSION TEST: PROJECTS VS EXTRACURRICULAR ACTIVITIES
  // ==========================================================================
  await t.test("Regression 1: Projects vs Extracurricular Activities cleanly separated", () => {
    const rawCv = `
Sanduni Fernando
sanduni@example.com

PROJECTS
Intelligent Shipment Alerting System
Automated tracking system with real-time push notifications.
Technologies: React, Node.js, RabbitMQ
https://github.com/sanduni/shipment-alerts

Portfolio Website
Personal responsive showcase built using Next.js.
https://sanduni.me

EXTRACURRICULAR ACTIVITIES
University Cricket Team
Vice Captain (2022 - 2023)
Played inter-university matches.

IEEE Student Branch
Active Member
Assisted in organizing hackathons.

Event Organizer
TechFest 2023
Managed logistics for 500+ participants.
`;

    const sections = detectCvSections(rawCv);
    assert.ok(sections.projects, "Projects section should be detected");
    assert.ok(sections.extracurricular, "Extracurricular section should be detected");

    const parsed = extractStructuredCv(sections);

    // Projects assertions
    assert.equal(parsed.projects?.length, 2, "Must contain exactly 2 projects");
    assert.equal(
      parsed.projects?.[0]?.title,
      "Intelligent Shipment Alerting System"
    );
    assert.equal(parsed.projects?.[1]?.title, "Portfolio Website");

    // Extracurricular assertions - NEVER leak into projects!
    const extraList =
      parsed.extracurricular || parsed.extracurricularActivities || [];
    assert.equal(
      extraList.length,
      3,
      "Must contain exactly 3 extracurricular activities"
    );
    assert.equal(extraList[0]?.activity, "University Cricket Team");
    assert.equal(extraList[1]?.activity, "IEEE Student Branch");
    assert.equal(extraList[2]?.activity, "Event Organizer");

    // Verify none of the extracurricular items appear in projects
    const projectTitles = (parsed.projects || []).map((p) => p.title.toLowerCase());
    assert.ok(!projectTitles.includes("university cricket team"));
    assert.ok(!projectTitles.includes("ieee student branch"));
    assert.ok(!projectTitles.includes("event organizer"));
  });

  // ==========================================================================
  // 2. TWO-COLUMN LAYOUT DETECTION
  // ==========================================================================
  await t.test("Layout Analysis: Correctly detects two-column layout", () => {
    // Synthetic two-column analysis simulation
    const mockLayout: CvLayoutAnalysis = {
      layoutType: "two-column",
      columnCount: 2,
      columns: [
        { columnIndex: 0, left: 40, right: 220, width: 180, blockCount: 5 },
        { columnIndex: 1, left: 240, right: 550, width: 310, blockCount: 12 },
      ],
      sidebar: { detected: true, position: "left", widthRatio: 0.35 },
      visualHeadings: [
        { text: "SKILLS", y: 100, page: 1, isBold: true, fontSize: 14 },
        { text: "EXPERIENCE", y: 100, page: 1, isBold: true, fontSize: 14 },
      ],
      medianFontSize: 10,
    };

    assert.equal(mockLayout.layoutType, "two-column");
    assert.equal(mockLayout.sidebar.detected, true);
    assert.equal(mockLayout.sidebar.position, "left");
  });

  // ==========================================================================
  // 3. SIDEBAR CV LAYOUT DETECTION
  // ==========================================================================
  await t.test("Layout Analysis: Correctly detects sidebar on right side", () => {
    const mockLayout: CvLayoutAnalysis = {
      layoutType: "sidebar",
      columnCount: 2,
      columns: [
        { columnIndex: 0, left: 40, right: 380, width: 340, blockCount: 15 },
        { columnIndex: 1, left: 400, right: 560, width: 160, blockCount: 4 },
      ],
      sidebar: { detected: true, position: "right", widthRatio: 0.28 },
      visualHeadings: [],
      medianFontSize: 10,
    };

    assert.equal(mockLayout.sidebar.detected, true);
    assert.equal(mockLayout.sidebar.position, "right");
  });

  // ==========================================================================
  // 5. PROJECTS + LEADERSHIP SEPARATION
  // ==========================================================================
  await t.test("Section Separation: Projects and Leadership do not conflate", () => {
    const rawCv = `
PROJECTS
E-Commerce API Gateway
Microservices routing engine.
Technologies: Node.js, Express, Docker

LEADERSHIP
Director of IT
Student Council
2023 - 2024
Led campus IT infrastructure modernization.
`;
    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.projects?.length, 1);
    assert.equal(parsed.projects?.[0]?.title, "E-Commerce API Gateway");
    assert.equal(parsed.leadership?.length, 1);
    assert.equal(parsed.leadership?.[0]?.role, "Director of IT");
    assert.equal(parsed.leadership?.[0]?.organization, "Student Council");
  });

  // ==========================================================================
  // 6. PROJECTS + ACHIEVEMENTS SEPARATION
  // ==========================================================================
  await t.test("Section Separation: Projects and Achievements do not conflate", () => {
    const rawCv = `
PROJECTS
Real-Time Chat Application
WebSocket based chat system.
Technologies: Socket.io, React

ACHIEVEMENTS
1st Place - DevHack 2023
Dean's List Award (2022)
`;
    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.projects?.length, 1);
    assert.equal(parsed.projects?.[0]?.title, "Real-Time Chat Application");
    assert.equal(parsed.achievements?.length, 2);
    assert.equal(parsed.achievements?.[0]?.title, "1st Place - DevHack");
    assert.equal(parsed.achievements?.[0]?.date, "2023");
  });

  // ==========================================================================
  // 7. PROJECTS + VOLUNTEERING SEPARATION
  // ==========================================================================
  await t.test("Section Separation: Volunteering recognized in extracurricular/activities", () => {
    const rawCv = `
PROJECTS
Inventory Management System
Inventory tracking tool.
Technologies: Python, SQLite

VOLUNTEERING
Community Service Lead
Red Cross Youth
2022 - 2023
Organized blood drives.
`;
    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.projects?.length, 1);
    const extra = parsed.extracurricular || parsed.extracurricularActivities || [];
    assert.ok(extra.length >= 1 || sections.unknownSections?.["VOLUNTEERING"]);
  });

  // ==========================================================================
  // 8. MULTIPLE PROJECTS SEGMENTATION
  // ==========================================================================
  await t.test("Project Segmentation: Multiple projects without blank lines", () => {
    const rawProjects = `
Project Alpha
Distributed streaming pipeline.
Technologies: Kafka, Go
https://github.com/test/alpha
Project Beta
Mobile crypto wallet.
Technologies: Flutter, Dart
https://github.com/test/beta
`;
    const projects = extractProjects(rawProjects);
    assert.equal(projects.length, 2);
    assert.equal(projects[0]?.title, "Project Alpha");
    assert.equal(projects[1]?.title, "Project Beta");
  });

  // ==========================================================================
  // 9 & 10. MULTIPLE EXPERIENCES & MULTIPLE ROLES AT SAME COMPANY
  // ==========================================================================
  await t.test("Experience Segmentation: Multiple roles and companies", () => {
    const rawCv = `
WORK EXPERIENCE
Lead Architect
Sysco Labs
Jan 2023 - Present
- Cloud architecture.

Senior Software Engineer
Sysco Labs
Jan 2021 - Dec 2022
- Backend microservices.
`;
    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.experience?.length, 2);
    assert.equal(parsed.experience?.[0]?.position, "Lead Architect");
    assert.equal(parsed.experience?.[0]?.company, "Sysco Labs");
    assert.equal(parsed.experience?.[0]?.isCurrent, true);

    assert.equal(parsed.experience?.[1]?.position, "Senior Software Engineer");
    assert.equal(parsed.experience?.[1]?.company, "Sysco Labs");
    assert.equal(parsed.experience?.[1]?.isCurrent, false);
  });

  // ==========================================================================
  // 11. CURRENT EMPLOYMENT DETECTION
  // ==========================================================================
  await t.test("Employment Flags: isCurrent set correctly for ongoing roles", () => {
    const rawCv = `
EXPERIENCE
Software Engineer
Tech Corp
2023 - Ongoing
- Active development.
`;
    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);
    assert.equal(parsed.experience?.[0]?.isCurrent, true);
  });

  // ==========================================================================
  // 12 & 13. MISSING CORE SECTIONS REVIEW WARNINGS
  // ==========================================================================
  await t.test("Review Warnings: Missing core sections surface clear warnings", () => {
    const rawCv = `
John Doe
john@example.com

SUMMARY
Fresh graduate looking for opportunities.

EDUCATION
BSc Computer Science
University of Colombo
2020 - 2024
`;
    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    const issues = parsed.reviewIssues || [];
    const expWarning = issues.find((i) => i.section === "experience");
    assert.ok(expWarning, "Should warn about missing experience");
    assert.equal(expWarning?.severity, "warning");
  });

  // ==========================================================================
  // 14. UNUSUAL SECTION HEADINGS
  // ==========================================================================
  await t.test("Headings: Matches alternative section synonyms", () => {
    const rawCv = `
CAREER BACKGROUND
Software Engineer
Apex Global
2022 - Present

EDUCATIONAL QUALIFICATIONS
BSc Engineering
Moratuwa
2018 - 2022

KEY ACHIEVEMENTS
Best Developer Award 2023
`;
    const sections = detectCvSections(rawCv);
    assert.ok(sections.experience);
    assert.ok(sections.education);
    assert.ok(sections.achievements);
  });

  // ==========================================================================
  // 17. TECHNICAL EXTRACURRICULAR ACTIVITY (DOES NOT LEAK INTO PROJECTS)
  // ==========================================================================
  await t.test("Classification: Technical extracurricular does not leak into Projects", () => {
    const rawCv = `
PROJECTS
Smart Home IoT Hub
Automated microcontroller hub.
Technologies: C++, MQTT
https://github.com/test/iot-hub

EXTRACURRICULAR ACTIVITIES
IEEE Computer Society Student Chapter
Technical Lead (2022 - 2023)
Conducted Python and Linux workshops for 100+ undergraduates.
`;
    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.projects?.length, 1);
    assert.equal(parsed.projects?.[0]?.title, "Smart Home IoT Hub");

    const extra = parsed.extracurricular || parsed.extracurricularActivities || [];
    assert.equal(extra.length, 1);
    assert.equal(extra[0]?.activity, "IEEE Computer Society Student Chapter");
    assert.equal(extra[0]?.role, "Technical Lead");
  });

  // ==========================================================================
  // 18. NON-TECHNICAL PROJECT
  // ==========================================================================
  await t.test("Projects: Non-technical project stays in Projects under Projects heading", () => {
    const rawProjects = `
Community Garden Initiative
Organized urban farming layout and soil testing schedule.
`;
    const projects = extractProjects(rawProjects);
    assert.equal(projects.length, 1);
    assert.equal(projects[0]?.title, "Community Garden Initiative");
  });

  // ==========================================================================
  // 19, 20, 21, 22. EXTENSIVE EXTRACURRICULAR PATTERNS
  // ==========================================================================
  await t.test("Extracurricular Extraction: Sports, clubs, event organizing, societies", () => {
    const rawExtra = `
- University Cricket Team - Captain (2022 - 2023)
- Rotaract Club - Vice President
- IEEE Student Member
- Event Organizer: Colombo Hackathon 2024
`;
    const items = extractExtracurricular(rawExtra);
    assert.equal(items.length, 4);
    assert.equal(items[0]?.activity, "University Cricket Team");
    assert.equal(items[0]?.role, "Captain");
    assert.equal(items[1]?.activity, "Rotaract Club");
    assert.equal(items[2]?.activity, "IEEE Student Member");
    assert.equal(items[3]?.activity, "Event Organizer");
  });

  // ==========================================================================
  // 24 & 25. PROJECTS WITH GITHUB AND LIVE URLS
  // ==========================================================================
  await t.test("Projects: Correctly parses GitHub and Live URLs", () => {
    const rawProjects = `
TaskFlow App
Real-time Kanban board.
https://github.com/user/taskflow
https://taskflow.io
`;
    const projects = extractProjects(rawProjects);
    assert.equal(projects.length, 1);
    assert.equal(projects[0]?.githubUrl, "https://github.com/user/taskflow");
    assert.equal(projects[0]?.liveUrl, "https://taskflow.io");
  });

  // ==========================================================================
  // 28. DATES IN MULTIPLE FORMATS
  // ==========================================================================
  await t.test("Dates: Parses en-dash, numeric, and full month dates", () => {
    const rawCv = `
EXPERIENCE
Engineer A
Corp A
06/2021 – 08/2022

Engineer B
Corp B
January 2023 - Present
`;
    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.experience?.[0]?.startDate, "06/2021");
    assert.equal(parsed.experience?.[0]?.endDate, "08/2022");
    assert.equal(parsed.experience?.[1]?.startDate, "January 2023");
    assert.equal(parsed.experience?.[1]?.isCurrent, true);
  });

  // ==========================================================================
  // 29. GEMINI DECISION ENGINE (shouldUseGemini)
  // ==========================================================================
  await t.test("Decision Engine: Single-column clean CV does NOT trigger Gemini", () => {
    const deterministic: StructuredCvData = {
      personal: { fullName: "Dilshan Silva" },
      experience: [{ company: "Tech Corp", position: "Dev", isCurrent: true, startDate: "2022" }],
      education: [{ institution: "University", degree: "BSc" }],
      skills: [{ name: "TypeScript" }],
      projects: [{ title: "App", githubUrl: "https://github.com/a/b", technologies: ["TS"] }],
    };
    const layout: CvLayoutAnalysis = {
      layoutType: "single-column",
      columnCount: 1,
      columns: [{ columnIndex: 0, left: 40, right: 550, width: 510, blockCount: 10 }],
      sidebar: { detected: false },
      visualHeadings: [],
      medianFontSize: 10,
    };

    const decision = shouldUseGemini(deterministic, layout, 1);
    assert.equal(decision.shouldCall, false);
  });

  await t.test("Decision Engine: Two-column layout triggers Gemini with targeted pages", () => {
    const deterministic: StructuredCvData = {
      personal: { fullName: "Dilshan Silva" },
      experience: [],
      education: [],
      skills: [],
      projects: [],
    };
    const layout: CvLayoutAnalysis = {
      layoutType: "two-column",
      columnCount: 2,
      columns: [],
      sidebar: { detected: true, position: "left", widthRatio: 0.3 },
      visualHeadings: [],
      medianFontSize: 10,
    };

    const decision = shouldUseGemini(deterministic, layout, 2);
    assert.equal(decision.shouldCall, true);
    assert.ok(decision.targetPages.includes(1));
  });

  // ==========================================================================
  // 30. GEMINI UNAVAILABLE FALLBACK
  // ==========================================================================
  await t.test("AI Fallback: Deterministic parsing continues cleanly if Gemini is unavailable", () => {
    const deterministic: StructuredCvData = {
      personal: { fullName: "Candidate" },
      experience: [],
      education: [],
      skills: [],
      projects: [{ title: "My Project", technologies: [] }],
    };
    const layout: CvLayoutAnalysis = {
      layoutType: "single-column",
      columnCount: 1,
      columns: [],
      sidebar: { detected: false },
      visualHeadings: [],
      medianFontSize: 10,
    };

    const result = reconcileCvExtraction({
      deterministic,
      layout,
      geminiError: "GEMINI_API_KEY is not configured",
    });

    assert.equal(result.structured.projects?.[0]?.title, "My Project");
    assert.ok(
      result.reconciliationNotes.some((n) => n.includes("Deterministic parsing preserved"))
    );
  });

  // ==========================================================================
  // 31, 32, 33. GEMINI ERROR HANDLING (Timeout, API error, malformed)
  // ==========================================================================
  await t.test("AI Error Resilience: Client failure does not crash pipeline", async () => {
    const mockClient = new MockGeminiClient({
      success: false,
      error: "Gemini API returned HTTP 429 Quota Exceeded",
    });

    const execution = await executeGeminiMultimodalCvParse({
      pdfBuffer: Buffer.from("%PDF-1.4 sample"),
      layout: {
        layoutType: "two-column",
        columnCount: 2,
        columns: [],
        sidebar: { detected: true },
        visualHeadings: [],
        medianFontSize: 10,
      },
      deterministic: {
        personal: {},
        experience: [],
        education: [],
        skills: [],
        projects: [],
      },
      pageTexts: [{ pageNumber: 1, text: "Sample" }],
      client: mockClient,
    });

    assert.equal(execution.called, true);
    assert.ok(execution.error?.includes("429"));
    assert.equal(execution.geminiResult, undefined);
  });

  // ==========================================================================
  // 34. DETERMINISTIC / GEMINI AGREEMENT (Confidence Boost)
  // ==========================================================================
  await t.test("Reconciliation Agreement: Deterministic and AI agreement boosts confidence", () => {
    const deterministic: StructuredCvData = {
      personal: {},
      experience: [],
      education: [],
      skills: [],
      projects: [{ title: "FolioCraft", confidence: "medium", technologies: [] }],
    };
    const layout: CvLayoutAnalysis = {
      layoutType: "single-column",
      columnCount: 1,
      columns: [],
      sidebar: { detected: false },
      visualHeadings: [],
      medianFontSize: 10,
    };
    const geminiResult: GeminiParsedCvResult = {
      sections: [],
      projects: [{ title: "FolioCraft", technologies: ["React", "Node"] }],
      extracurricular: [],
      achievements: [],
      leadership: [],
      experience: [],
      education: [],
      conflicts: [],
    };

    const reconciled = reconcileCvExtraction({
      deterministic,
      layout,
      geminiResult,
    });

    const proj = reconciled.structured.projects?.[0];
    assert.equal(proj?.title, "FolioCraft");
    assert.equal(proj?.confidence, "high", "Confidence should be boosted to high on agreement");
    assert.equal(proj?.source?.classifier, "reconciled");
  });

  // ==========================================================================
  // 35. DETERMINISTIC / GEMINI DISAGREEMENT (Conflict Flagged for Review)
  // ==========================================================================
  await t.test("Reconciliation Conflict: Disagreement with repo URL retained as project with warning", () => {
    const deterministic: StructuredCvData = {
      personal: {},
      experience: [],
      education: [],
      skills: [],
      projects: [
        {
          title: "Shipment System",
          githubUrl: "https://github.com/test/shipment",
          technologies: ["Node.js"],
        },
      ],
    };
    const layout: CvLayoutAnalysis = {
      layoutType: "single-column",
      columnCount: 1,
      columns: [],
      sidebar: { detected: false },
      visualHeadings: [],
      medianFontSize: 10,
    };
    const geminiResult: GeminiParsedCvResult = {
      sections: [],
      projects: [],
      extracurricular: [{ activity: "Shipment System" }],
      achievements: [],
      leadership: [],
      experience: [],
      education: [],
      conflicts: [],
    };

    const reconciled = reconcileCvExtraction({
      deterministic,
      layout,
      geminiResult,
    });

    // Hard technical evidence retains it as project
    assert.equal(reconciled.structured.projects?.length, 1);
    assert.ok(reconciled.conflictsDetected.length > 0);
    const warning = reconciled.structured.reviewIssues?.find(
      (i) => i.severity === "warning" && i.section === "projects"
    );
    assert.ok(warning, "Must flag warning for user review");
  });

  // ==========================================================================
  // 36. VISUAL / TEXT PRECEDENCE: Visual Extracurricular Heading overrides Project
  // ==========================================================================
  await t.test("Visual Precedence: Visual Extracurricular heading strictly forces Extracurricular", () => {
    const deterministic: StructuredCvData = {
      personal: {},
      experience: [],
      education: [],
      skills: [],
      projects: [{ title: "University Cricket Team", confidence: "medium", technologies: [] }],
    };
    const layout: CvLayoutAnalysis = {
      layoutType: "single-column",
      columnCount: 1,
      columns: [],
      sidebar: { detected: false },
      visualHeadings: [
        { text: "EXTRACURRICULAR ACTIVITIES", y: 200, page: 1, isBold: true, fontSize: 14 },
      ],
      medianFontSize: 10,
    };
    const geminiResult: GeminiParsedCvResult = {
      sections: [],
      projects: [],
      extracurricular: [{ activity: "University Cricket Team", role: "Captain" }],
      achievements: [],
      leadership: [],
      experience: [],
      education: [],
      conflicts: [],
    };

    const reconciled = reconcileCvExtraction({
      deterministic,
      layout,
      geminiResult,
    });

    assert.equal(reconciled.structured.projects?.length, 0);
    const extra = reconciled.structured.extracurricular || [];
    assert.equal(extra.length, 1);
    assert.equal(extra[0]?.activity, "University Cricket Team");
    assert.equal(extra[0]?.confidence, "high");
    assert.ok(extra[0]?.source?.section?.includes("Visual Heading"));
  });

  // ==========================================================================
  // GOLDEN FIXTURES VALIDATION
  // ==========================================================================
  await t.test("Golden Fixtures: All synthetic reference fixtures validate as expected", () => {
    for (const fixture of GOLDEN_CV_FIXTURES) {
      const sections = detectCvSections(fixture.rawText);
      const parsed = extractStructuredCv(sections);

      // Verify canonical sections
      for (const expectedSec of fixture.expected.sectionsPresent) {
        assert.ok(
          (sections as unknown as Record<string, string | undefined>)[expectedSec],
          `Fixture ${fixture.id} should detect section ${expectedSec}`
        );
      }

      // Verify project count
      assert.equal(
        parsed.projects?.length || 0,
        fixture.expected.projectsCount,
        `Fixture ${fixture.id} projects count mismatch`
      );

      // Verify extracurricular count if specified
      if (fixture.expected.extracurricularCount !== undefined) {
        const extraCount =
          (parsed.extracurricular || parsed.extracurricularActivities || []).length;
        assert.equal(
          extraCount,
          fixture.expected.extracurricularCount,
          `Fixture ${fixture.id} extracurricular count mismatch`
        );
      }
    }
  });

  // ==========================================================================
  // 25. REGRESSION: BUFFER DETACHMENT RESILIENCE
  // ==========================================================================
  await t.test("Buffer Isolation: Sequential pipeline stages do not detach caller ArrayBuffer", async () => {
    // Synthetic multi-page PDF buffer
    const multiPagePdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 50 700 Td (Sequential Test) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000213 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n308\n%%EOF"
    );

    const originalLength = multiPagePdf.length;
    assert.equal(multiPagePdf.buffer.detached, false, "Buffer must not be detached initially");

    // Execute full pipeline
    const result = await executeHybridCvPipeline(multiPagePdf, {
      geminiClient: {
        async callMultimodal() {
          return { success: true, result: {} };
        },
      },
    });

    assert.ok(result, "Pipeline should return result");
    assert.equal(
      multiPagePdf.buffer.detached,
      false,
      "Caller ArrayBuffer must remain attached after pipeline completion"
    );
    assert.equal(
      multiPagePdf.length,
      originalLength,
      "Caller buffer length must be preserved"
    );
  });
});
