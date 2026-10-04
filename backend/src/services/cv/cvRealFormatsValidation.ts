import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
// Load backend .env before any service initialization
dotenv.config();

import { executeHybridCvPipeline } from "./cvPipeline.service";
import {
  DefaultGeminiCvClient,
  executeGeminiMultimodalCvParse,
  shouldUseGemini,
} from "./cvAiParser.service";
import { analyzeCvLayout, renderCvPageImage } from "./cvLayout.service";
import { detectCvSections } from "../sectionDetection.service";
import { extractStructuredCv } from "../structuredExtraction.service";
import { reconcileCvExtraction } from "./cvReconciliation.service";

/**
 * Creates a valid PDF-1.4 binary buffer with exact spatial coordinates and font sizes.
 */
export function createPdfBuffer(
  lines: Array<{ x: number; y: number; size: number; text: string }>
): Buffer {
  let stream = "BT\n";
  for (const line of lines) {
    const escaped = line.text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    stream += `/F1 ${line.size} Tf\n`;
    stream += `${line.x} ${line.y} Td\n`;
    stream += `(${escaped}) Tj\n`;
    stream += `-${line.x} -${line.y} Td\n`; // reset position
  }
  stream += "ET\n";

  const streamLen = Buffer.byteLength(stream);
  const pdfContent =
    "%PDF-1.4\n" +
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n" +
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n" +
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n` +
    `4 0 obj << /Length ${streamLen} >>\nstream\n${stream}endstream\nendobj\n` +
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n" +
    "xref\n0 6\n0000000000 65535 f \n" +
    "trailer << /Size 6 /Root 1 0 R >>\nstartxref\n500\n%%EOF\n";

  return Buffer.from(pdfContent);
}

export interface ValidationReport {
  testName: string;
  originalSections: string[];
  deterministic: {
    sections: Record<string, string>;
    projectTitles: string[];
    extracurricularCount: number;
    experienceCount: number;
    achievementsCount: number;
    leadershipCount: number;
  };
  visualLayout: {
    layoutType: string;
    columnCount: number;
    hasSidebar: boolean;
    sidebarPosition?: string;
    visualHeadings: string[];
  };
  geminiTriggered: boolean;
  geminiReason?: string;
  geminiResultSummary?: string;
  reconciliation: {
    applied: boolean;
    notes: string[];
  };
  finalClassification: {
    projects: Array<{ title: string; tech: string[]; confidence?: string }>;
    extracurricular: Array<{ activity: string; role?: string; confidence?: string }>;
    experience: Array<{ company: string; position: string; confidence?: string }>;
    achievements: Array<{ title: string; confidence?: string }>;
    leadership: Array<{ role: string; org?: string; confidence?: string }>;
  };
  reviewIssues: Array<{ section: string; field: string; message: string; severity: string }>;
  assertionsPassed: boolean;
  notes: string[];
}

export async function runAllValidationTests(): Promise<{
  reports: ValidationReport[];
  geminiRealCallSuccess: boolean;
  allPassed: boolean;
}> {
  const reports: ValidationReport[] = [];
  let allPassed = true;

  console.log("==================================================================");
  console.log("   FOLICRAFT HYBRID CV PARSING REAL-FORMAT VALIDATION SUITE");
  console.log("==================================================================");
  console.log(`GEMINI_API_KEY present: ${Boolean(process.env.GEMINI_API_KEY)}`);
  console.log(`GEMINI_MODEL: ${process.env.GEMINI_MODEL || "gemini-3.8-flash"}`);

  const offlineMockClient = {
    async callMultimodal() {
      return {
        success: false,
        error: "Deterministic format testing mode (Gemini reserved for dedicated real multimodal test)",
      };
    },
  };

  // -------------------------------------------------------------------------
  // TEST 1: Single-Column CV (Standard Top-to-Bottom Layout)
  // -------------------------------------------------------------------------
  {
    console.log("\n>>> TEST 1: Single-Column CV");
    const pdf = createPdfBuffer([
      { x: 72, y: 750, size: 16, text: "DILSHAN SILVA" },
      { x: 72, y: 735, size: 10, text: "dilshan@example.com | Full Stack Developer | Colombo, Sri Lanka" },
      { x: 72, y: 710, size: 14, text: "SUMMARY" },
      { x: 72, y: 695, size: 10, text: "Passionate developer with 4 years building scalable web services." },
      { x: 72, y: 670, size: 14, text: "TECHNICAL SKILLS" },
      { x: 72, y: 655, size: 10, text: "TypeScript, React, Node.js, Express, PostgreSQL, Redis, Docker" },
      { x: 72, y: 630, size: 14, text: "WORK EXPERIENCE" },
      { x: 72, y: 615, size: 11, text: "Software Engineer - Lanka Byte Technologies" },
      { x: 72, y: 600, size: 10, text: "Jan 2022 - Present | Colombo" },
      { x: 72, y: 585, size: 10, text: "Architected event-driven microservices reducing latency." },
      { x: 72, y: 560, size: 11, text: "Junior Developer - Apex Digital" },
      { x: 72, y: 545, size: 10, text: "Mar 2020 - Dec 2021" },
      { x: 72, y: 530, size: 10, text: "Built responsive UI components in React." },
      { x: 72, y: 505, size: 14, text: "PROJECTS" },
      { x: 72, y: 490, size: 11, text: "FolioCraft App" },
      { x: 72, y: 475, size: 10, text: "Collaborative portfolio management platform for developers." },
      { x: 72, y: 460, size: 10, text: "Technologies: TypeScript, React, PostgreSQL" },
      { x: 72, y: 445, size: 10, text: "https://github.com/dilshans/foliocraft" },
      { x: 72, y: 420, size: 11, text: "Cloud Metrics Monitor" },
      { x: 72, y: 405, size: 10, text: "Lightweight system resource dashboard." },
      { x: 72, y: 390, size: 10, text: "Technologies: Node.js, Docker" },
      { x: 72, y: 375, size: 10, text: "https://github.com/dilshans/metrics-monitor" },
    ]);

    const result = await executeHybridCvPipeline(pdf, { geminiClient: offlineMockClient });
    const passed =
      result.layout.layoutType === "single-column" &&
      result.structuredData.projects.length === 2 &&
      result.structuredData.experience.length === 2;

    if (!passed) allPassed = false;

    reports.push({
      testName: "Single-Column CV",
      originalSections: ["SUMMARY", "TECHNICAL SKILLS", "WORK EXPERIENCE", "PROJECTS"],
      deterministic: {
        sections: Object.fromEntries(
          Object.entries(result.structuredData.sectionStatuses || {}).map(([k, v]) => [k, v || ""])
        ),
        projectTitles: result.structuredData.projects.map((p) => p.title),
        extracurricularCount: result.structuredData.extracurricular?.length || 0,
        experienceCount: result.structuredData.experience.length,
        achievementsCount: result.structuredData.achievements?.length || 0,
        leadershipCount: result.structuredData.leadership?.length || 0,
      },
      visualLayout: {
        layoutType: result.layout.layoutType,
        columnCount: result.layout.columnCount,
        hasSidebar: result.layout.sidebar.detected,
        visualHeadings: result.layout.visualHeadings.map((h) => h.text),
      },
      geminiTriggered: result.geminiUsed,
      geminiReason: result.structuredData.parsingMetadata?.geminiReason,
      reconciliation: {
        applied: Boolean(result.structuredData.parsingMetadata?.reconciliationApplied),
        notes: result.structuredData.parsingMetadata?.reconciliationNotes || [],
      },
      finalClassification: {
        projects: result.structuredData.projects.map((p) => ({
          title: p.title,
          tech: p.technologies,
          confidence: p.confidence,
        })),
        extracurricular: (result.structuredData.extracurricular || []).map((e) => ({
          activity: e.activity,
          role: e.role,
          confidence: e.confidence,
        })),
        experience: result.structuredData.experience.map((e) => ({
          company: e.company,
          position: e.position,
          confidence: e.confidence,
        })),
        achievements: (result.structuredData.achievements || []).map((a) => ({
          title: a.title,
          confidence: a.confidence,
        })),
        leadership: (result.structuredData.leadership || []).map((l) => ({
          role: l.role,
          org: l.organization,
          confidence: l.confidence,
        })),
      },
      reviewIssues: (result.structuredData.reviewIssues || []).map((i) => ({
        section: i.section,
        field: i.field,
        message: i.message,
        severity: i.severity,
      })),
      assertionsPassed: passed,
      notes: [
        `Detected layout: ${result.layout.layoutType}`,
        `Projects parsed: ${result.structuredData.projects.map((p) => p.title).join(", ")}`,
        `Experiences parsed: ${result.structuredData.experience.map((e) => e.company).join(", ")}`,
      ],
    });
  }

  // -------------------------------------------------------------------------
  // TEST 2: Projects vs Extracurricular Activities
  // -------------------------------------------------------------------------
  {
    console.log("\n>>> TEST 2: Projects vs Extracurricular Activities");
    const pdf = createPdfBuffer([
      { x: 72, y: 750, size: 16, text: "SANDUNI FERNANDO" },
      { x: 72, y: 735, size: 10, text: "sanduni.fernando@example.com | Colombo, Sri Lanka" },
      { x: 72, y: 710, size: 14, text: "EDUCATION" },
      { x: 72, y: 695, size: 11, text: "BSc in Computer Science - University of Moratuwa" },
      { x: 72, y: 680, size: 10, text: "2020 - 2024" },
      { x: 72, y: 650, size: 14, text: "PROJECTS" },
      { x: 72, y: 635, size: 11, text: "Intelligent Shipment Alerting System" },
      { x: 72, y: 620, size: 10, text: "Automated tracking system with real-time push notifications." },
      { x: 72, y: 605, size: 10, text: "Technologies: React, Node.js, RabbitMQ" },
      { x: 72, y: 590, size: 10, text: "https://github.com/sanduni/shipment-alerts" },
      { x: 72, y: 565, size: 11, text: "Portfolio Website" },
      { x: 72, y: 550, size: 10, text: "Personal responsive showcase built using Next.js." },
      { x: 72, y: 535, size: 10, text: "https://sanduni.me" },
      { x: 72, y: 505, size: 14, text: "EXTRACURRICULAR ACTIVITIES" },
      { x: 72, y: 490, size: 11, text: "University Cricket Team" },
      { x: 72, y: 475, size: 10, text: "Vice Captain (2022 - 2023)" },
      { x: 72, y: 460, size: 10, text: "Led inter-faculty tournament teams and practice." },
      { x: 72, y: 435, size: 11, text: "IEEE Student Branch" },
      { x: 72, y: 420, size: 10, text: "Active Member" },
      { x: 72, y: 405, size: 10, text: "Assisted in organizing national robotics symposium." },
      { x: 72, y: 380, size: 11, text: "Event Organizer - TechFest 2023" },
      { x: 72, y: 365, size: 10, text: "Managed stage logistics for 500+ attendees." },
    ]);

    const result = await executeHybridCvPipeline(pdf, { geminiClient: offlineMockClient });

    const projectTitles = result.structuredData.projects.map((p) => p.title.toLowerCase());
    const extraTitles = (result.structuredData.extracurricular || []).map((e) =>
      e.activity.toLowerCase()
    );

    // Verify Cricket Team or IEEE is NEVER inside projects!
    const sportsInProjects = projectTitles.some((t) =>
      t.includes("cricket") || t.includes("ieee") || t.includes("event organizer")
    );
    const hasProjects = projectTitles.length === 2;
    const hasExtracurricular = (result.structuredData.extracurricular?.length || 0) >= 2;
    const passed = !sportsInProjects && hasProjects && hasExtracurricular;

    if (!passed) allPassed = false;

    reports.push({
      testName: "Projects vs Extracurricular Activities",
      originalSections: ["EDUCATION", "PROJECTS", "EXTRACURRICULAR ACTIVITIES"],
      deterministic: {
        sections: Object.fromEntries(
          Object.entries(result.structuredData.sectionStatuses || {}).map(([k, v]) => [k, v || ""])
        ),
        projectTitles: result.structuredData.projects.map((p) => p.title),
        extracurricularCount: result.structuredData.extracurricular?.length || 0,
        experienceCount: result.structuredData.experience.length,
        achievementsCount: result.structuredData.achievements?.length || 0,
        leadershipCount: result.structuredData.leadership?.length || 0,
      },
      visualLayout: {
        layoutType: result.layout.layoutType,
        columnCount: result.layout.columnCount,
        hasSidebar: result.layout.sidebar.detected,
        visualHeadings: result.layout.visualHeadings.map((h) => h.text),
      },
      geminiTriggered: result.geminiUsed,
      geminiReason: result.structuredData.parsingMetadata?.geminiReason,
      reconciliation: {
        applied: Boolean(result.structuredData.parsingMetadata?.reconciliationApplied),
        notes: result.structuredData.parsingMetadata?.reconciliationNotes || [],
      },
      finalClassification: {
        projects: result.structuredData.projects.map((p) => ({
          title: p.title,
          tech: p.technologies,
          confidence: p.confidence,
        })),
        extracurricular: (result.structuredData.extracurricular || []).map((e) => ({
          activity: e.activity,
          role: e.role,
          confidence: e.confidence,
        })),
        experience: result.structuredData.experience.map((e) => ({
          company: e.company,
          position: e.position,
          confidence: e.confidence,
        })),
        achievements: (result.structuredData.achievements || []).map((a) => ({
          title: a.title,
          confidence: a.confidence,
        })),
        leadership: (result.structuredData.leadership || []).map((l) => ({
          role: l.role,
          org: l.organization,
          confidence: l.confidence,
        })),
      },
      reviewIssues: (result.structuredData.reviewIssues || []).map((i) => ({
        section: i.section,
        field: i.field,
        message: i.message,
        severity: i.severity,
      })),
      assertionsPassed: passed,
      notes: [
        `Sports/Clubs in projects: ${sportsInProjects ? "FAILED (LEAKED)" : "PASSED (CLEAN)"}`,
        `Projects: ${result.structuredData.projects.map((p) => p.title).join(", ")}`,
        `Extracurricular: ${(result.structuredData.extracurricular || []).map((e) => e.activity).join(", ")}`,
      ],
    });
  }

  // -------------------------------------------------------------------------
  // TEST 3: Projects + Leadership + Achievements Separation
  // -------------------------------------------------------------------------
  {
    console.log("\n>>> TEST 3: Projects + Leadership + Achievements");
    const pdf = createPdfBuffer([
      { x: 72, y: 750, size: 16, text: "KAMAL PERERA" },
      { x: 72, y: 735, size: 10, text: "kamal@example.com | Colombo, Sri Lanka" },
      { x: 72, y: 705, size: 14, text: "PROJECTS" },
      { x: 72, y: 690, size: 11, text: "Smart Health Diagnostics Engine" },
      { x: 72, y: 675, size: 10, text: "AI-assisted medical symptom analyzer." },
      { x: 72, y: 660, size: 10, text: "Technologies: Python, PyTorch, FastAPI" },
      { x: 72, y: 645, size: 10, text: "https://github.com/kamalp/health-diagnostics" },
      { x: 72, y: 615, size: 14, text: "ACHIEVEMENTS" },
      { x: 72, y: 600, size: 10, text: "1st Place - National Hackathon 2023" },
      { x: 72, y: 585, size: 10, text: "Dean's List - Faculty of Information Technology (2021, 2022)" },
      { x: 72, y: 570, size: 10, text: "Finalist - Imagine Cup 2022" },
      { x: 72, y: 540, size: 14, text: "LEADERSHIP" },
      { x: 72, y: 525, size: 11, text: "President" },
      { x: 72, y: 510, size: 10, text: "Computer Society" },
      { x: 72, y: 495, size: 10, text: "2023 - Present" },
      { x: 72, y: 480, size: 10, text: "Directed executive committee of 15 members." },
      { x: 72, y: 455, size: 11, text: "Vice Chair" },
      { x: 72, y: 440, size: 10, text: "IEEE WIE Affinity Group" },
      { x: 72, y: 425, size: 10, text: "2022 - 2023" },
      { x: 72, y: 410, size: 10, text: "Coordinated outreach workshops for schools." },
    ]);

    const result = await executeHybridCvPipeline(pdf, { geminiClient: offlineMockClient });

    const passed =
      result.structuredData.projects.length === 1 &&
      (result.structuredData.achievements?.length || 0) >= 2 &&
      (result.structuredData.leadership?.length || 0) >= 1;

    if (!passed) allPassed = false;

    reports.push({
      testName: "Projects + Leadership + Achievements Separation",
      originalSections: ["PROJECTS", "ACHIEVEMENTS", "LEADERSHIP"],
      deterministic: {
        sections: Object.fromEntries(
          Object.entries(result.structuredData.sectionStatuses || {}).map(([k, v]) => [k, v || ""])
        ),
        projectTitles: result.structuredData.projects.map((p) => p.title),
        extracurricularCount: result.structuredData.extracurricular?.length || 0,
        experienceCount: result.structuredData.experience.length,
        achievementsCount: result.structuredData.achievements?.length || 0,
        leadershipCount: result.structuredData.leadership?.length || 0,
      },
      visualLayout: {
        layoutType: result.layout.layoutType,
        columnCount: result.layout.columnCount,
        hasSidebar: result.layout.sidebar.detected,
        visualHeadings: result.layout.visualHeadings.map((h) => h.text),
      },
      geminiTriggered: result.geminiUsed,
      geminiReason: result.structuredData.parsingMetadata?.geminiReason,
      reconciliation: {
        applied: Boolean(result.structuredData.parsingMetadata?.reconciliationApplied),
        notes: result.structuredData.parsingMetadata?.reconciliationNotes || [],
      },
      finalClassification: {
        projects: result.structuredData.projects.map((p) => ({
          title: p.title,
          tech: p.technologies,
          confidence: p.confidence,
        })),
        extracurricular: (result.structuredData.extracurricular || []).map((e) => ({
          activity: e.activity,
          role: e.role,
          confidence: e.confidence,
        })),
        experience: result.structuredData.experience.map((e) => ({
          company: e.company,
          position: e.position,
          confidence: e.confidence,
        })),
        achievements: (result.structuredData.achievements || []).map((a) => ({
          title: a.title,
          confidence: a.confidence,
        })),
        leadership: (result.structuredData.leadership || []).map((l) => ({
          role: l.role,
          org: l.organization,
          confidence: l.confidence,
        })),
      },
      reviewIssues: (result.structuredData.reviewIssues || []).map((i) => ({
        section: i.section,
        field: i.field,
        message: i.message,
        severity: i.severity,
      })),
      assertionsPassed: passed,
      notes: [
        `Projects count: ${result.structuredData.projects.length}`,
        `Achievements count: ${result.structuredData.achievements?.length || 0}`,
        `Leadership count: ${result.structuredData.leadership?.length || 0}`,
      ],
    });
  }

  // -------------------------------------------------------------------------
  // TEST 4: Two-Column CV Layout
  // -------------------------------------------------------------------------
  {
    console.log("\n>>> TEST 4: Two-Column CV Layout");
    // Left column at x=72 (width ~200), Right column at x=320 (width ~240)
    const pdf = createPdfBuffer([
      { x: 72, y: 750, size: 16, text: "KAVINDA DE SILVA" },
      { x: 72, y: 735, size: 10, text: "kavinda@example.com | +94 71 234 5678" },

      // Left column: Skills & Education
      { x: 72, y: 700, size: 14, text: "TECHNICAL SKILLS" },
      { x: 72, y: 680, size: 10, text: "React, Next.js, TypeScript" },
      { x: 72, y: 665, size: 10, text: "Node.js, Express, NestJS" },
      { x: 72, y: 650, size: 10, text: "PostgreSQL, MongoDB, Redis" },
      { x: 72, y: 635, size: 10, text: "Docker, Kubernetes, AWS" },
      { x: 72, y: 605, size: 14, text: "EDUCATION" },
      { x: 72, y: 585, size: 10, text: "BSc Information Systems" },
      { x: 72, y: 570, size: 10, text: "University of Colombo" },
      { x: 72, y: 555, size: 10, text: "2018 - 2022" },

      // Right column: Experience & Projects
      { x: 320, y: 700, size: 14, text: "WORK EXPERIENCE" },
      { x: 320, y: 680, size: 11, text: "Senior Software Engineer" },
      { x: 320, y: 665, size: 10, text: "Sysco LABS Sri Lanka" },
      { x: 320, y: 650, size: 10, text: "2022 - Present" },
      { x: 320, y: 635, size: 10, text: "Led engineering squad on enterprise ordering platform." },
      { x: 320, y: 605, size: 14, text: "PROJECTS" },
      { x: 320, y: 585, size: 11, text: "Supply Chain Dispatcher" },
      { x: 320, y: 570, size: 10, text: "Real-time fleet tracking and load assignment." },
      { x: 320, y: 555, size: 10, text: "Technologies: TypeScript, NestJS, Kafka" },
      { x: 320, y: 540, size: 10, text: "https://github.com/kavinda/dispatcher" },
    ]);

    const result = await executeHybridCvPipeline(pdf, { geminiClient: offlineMockClient });

    const isMultiColumn =
      result.layout.layoutType === "two-column" || result.layout.columnCount === 2;
    const skillsFound = result.structuredData.skills.length > 0;
    const expFound = result.structuredData.experience.length > 0;
    const projFound = result.structuredData.projects.length > 0;
    const passed = isMultiColumn && skillsFound && expFound && projFound;

    if (!passed) allPassed = false;

    reports.push({
      testName: "Two-Column CV Layout",
      originalSections: ["TECHNICAL SKILLS", "EDUCATION", "WORK EXPERIENCE", "PROJECTS"],
      deterministic: {
        sections: Object.fromEntries(
          Object.entries(result.structuredData.sectionStatuses || {}).map(([k, v]) => [k, v || ""])
        ),
        projectTitles: result.structuredData.projects.map((p) => p.title),
        extracurricularCount: result.structuredData.extracurricular?.length || 0,
        experienceCount: result.structuredData.experience.length,
        achievementsCount: result.structuredData.achievements?.length || 0,
        leadershipCount: result.structuredData.leadership?.length || 0,
      },
      visualLayout: {
        layoutType: result.layout.layoutType,
        columnCount: result.layout.columnCount,
        hasSidebar: result.layout.sidebar.detected,
        visualHeadings: result.layout.visualHeadings.map((h) => h.text),
      },
      geminiTriggered: result.geminiUsed,
      geminiReason: result.structuredData.parsingMetadata?.geminiReason,
      reconciliation: {
        applied: Boolean(result.structuredData.parsingMetadata?.reconciliationApplied),
        notes: result.structuredData.parsingMetadata?.reconciliationNotes || [],
      },
      finalClassification: {
        projects: result.structuredData.projects.map((p) => ({
          title: p.title,
          tech: p.technologies,
          confidence: p.confidence,
        })),
        extracurricular: (result.structuredData.extracurricular || []).map((e) => ({
          activity: e.activity,
          role: e.role,
          confidence: e.confidence,
        })),
        experience: result.structuredData.experience.map((e) => ({
          company: e.company,
          position: e.position,
          confidence: e.confidence,
        })),
        achievements: (result.structuredData.achievements || []).map((a) => ({
          title: a.title,
          confidence: a.confidence,
        })),
        leadership: (result.structuredData.leadership || []).map((l) => ({
          role: l.role,
          org: l.organization,
          confidence: l.confidence,
        })),
      },
      reviewIssues: (result.structuredData.reviewIssues || []).map((i) => ({
        section: i.section,
        field: i.field,
        message: i.message,
        severity: i.severity,
      })),
      assertionsPassed: passed,
      notes: [
        `Layout classified as: ${result.layout.layoutType} (columns: ${result.layout.columnCount})`,
        `Skills count: ${result.structuredData.skills.length}`,
        `Experience count: ${result.structuredData.experience.length}`,
        `Projects count: ${result.structuredData.projects.length}`,
      ],
    });
  }

  // -------------------------------------------------------------------------
  // TEST 5: Sidebar Layout with Contact & Skills in Left Sidebar
  // -------------------------------------------------------------------------
  {
    console.log("\n>>> TEST 5: Sidebar Layout (Left Sidebar)");
    // Left column at x=45 (narrow ratio < 0.35), Right main column at x=250
    const pdf = createPdfBuffer([
      { x: 250, y: 750, size: 18, text: "NUWAN WICKRAMASINGHE" },
      { x: 250, y: 730, size: 11, text: "Full Stack Cloud Engineer" },

      // Left Sidebar: narrow column
      { x: 45, y: 700, size: 12, text: "CONTACT" },
      { x: 45, y: 685, size: 9, text: "nuwan@example.com" },
      { x: 45, y: 670, size: 9, text: "+94 77 555 1234" },
      { x: 45, y: 655, size: 9, text: "Colombo, Sri Lanka" },
      { x: 45, y: 625, size: 12, text: "CORE COMPETENCIES" },
      { x: 45, y: 610, size: 9, text: "Go, Kubernetes, AWS" },
      { x: 45, y: 595, size: 9, text: "Docker, TypeScript" },
      { x: 45, y: 580, size: 9, text: "PostgreSQL, Redis" },

      // Main Column: Experience & Projects
      { x: 250, y: 700, size: 14, text: "WORK HISTORY" },
      { x: 250, y: 680, size: 11, text: "Software Engineer - CodeGen International" },
      { x: 250, y: 665, size: 10, text: "2022 - Present" },
      { x: 250, y: 650, size: 10, text: "Core booking engine development using microservices." },
      { x: 250, y: 620, size: 14, text: "PROJECT WORK" },
      { x: 250, y: 600, size: 11, text: "Distributed Task Queue" },
      { x: 250, y: 585, size: 10, text: "High-throughput task dispatcher with retry mechanism." },
      { x: 250, y: 570, size: 10, text: "Technologies: Go, Redis" },
      { x: 250, y: 555, size: 10, text: "https://github.com/nuwanw/task-queue" },
      { x: 250, y: 525, size: 14, text: "CAMPUS INVOLVEMENT" },
      { x: 250, y: 505, size: 11, text: "Rotaract Club" },
      { x: 250, y: 490, size: 10, text: "Director of Community Service (2020 - 2021)" },
    ]);

    const result = await executeHybridCvPipeline(pdf, { geminiClient: offlineMockClient });

    const hasSidebarSignal =
      result.layout.sidebar.detected || result.layout.layoutType !== "single-column";
    const experienceCorrect = result.structuredData.experience.length >= 1;
    const projectCorrect = result.structuredData.projects.length >= 1;
    const extracurricularCorrect = (result.structuredData.extracurricular?.length || 0) >= 1;
    const passed =
      hasSidebarSignal && experienceCorrect && projectCorrect && extracurricularCorrect;

    if (!passed) allPassed = false;

    reports.push({
      testName: "Sidebar Layout with Unusual Section Headings",
      originalSections: ["CONTACT", "CORE COMPETENCIES", "WORK HISTORY", "PROJECT WORK", "CAMPUS INVOLVEMENT"],
      deterministic: {
        sections: Object.fromEntries(
          Object.entries(result.structuredData.sectionStatuses || {}).map(([k, v]) => [k, v || ""])
        ),
        projectTitles: result.structuredData.projects.map((p) => p.title),
        extracurricularCount: result.structuredData.extracurricular?.length || 0,
        experienceCount: result.structuredData.experience.length,
        achievementsCount: result.structuredData.achievements?.length || 0,
        leadershipCount: result.structuredData.leadership?.length || 0,
      },
      visualLayout: {
        layoutType: result.layout.layoutType,
        columnCount: result.layout.columnCount,
        hasSidebar: result.layout.sidebar.detected,
        sidebarPosition: result.layout.sidebar.position,
        visualHeadings: result.layout.visualHeadings.map((h) => h.text),
      },
      geminiTriggered: result.geminiUsed,
      geminiReason: result.structuredData.parsingMetadata?.geminiReason,
      reconciliation: {
        applied: Boolean(result.structuredData.parsingMetadata?.reconciliationApplied),
        notes: result.structuredData.parsingMetadata?.reconciliationNotes || [],
      },
      finalClassification: {
        projects: result.structuredData.projects.map((p) => ({
          title: p.title,
          tech: p.technologies,
          confidence: p.confidence,
        })),
        extracurricular: (result.structuredData.extracurricular || []).map((e) => ({
          activity: e.activity,
          role: e.role,
          confidence: e.confidence,
        })),
        experience: result.structuredData.experience.map((e) => ({
          company: e.company,
          position: e.position,
          confidence: e.confidence,
        })),
        achievements: (result.structuredData.achievements || []).map((a) => ({
          title: a.title,
          confidence: a.confidence,
        })),
        leadership: (result.structuredData.leadership || []).map((l) => ({
          role: l.role,
          org: l.organization,
          confidence: l.confidence,
        })),
      },
      reviewIssues: (result.structuredData.reviewIssues || []).map((i) => ({
        section: i.section,
        field: i.field,
        message: i.message,
        severity: i.severity,
      })),
      assertionsPassed: passed,
      notes: [
        `Sidebar detected: ${result.layout.sidebar.detected ? `YES (${result.layout.sidebar.position})` : "NO"}`,
        `Unusual heading 'WORK HISTORY' mapped to experience: ${result.structuredData.experience.length > 0}`,
        `Unusual heading 'PROJECT WORK' mapped to projects: ${result.structuredData.projects.length > 0}`,
        `Unusual heading 'CAMPUS INVOLVEMENT' mapped to extracurricular: ${(result.structuredData.extracurricular?.length || 0) > 0}`,
      ],
    });
  }

  // -------------------------------------------------------------------------
  // TEST 6: Multiple Projects & Multiple Work Experiences (No Accidental Merging)
  // -------------------------------------------------------------------------
  {
    console.log("\n>>> TEST 6: Multiple Projects & Multiple Experiences (No Merging)");
    const pdf = createPdfBuffer([
      { x: 72, y: 750, size: 16, text: "MALIK FERNANDO" },
      { x: 72, y: 735, size: 10, text: "malik@example.com | Senior Cloud Engineer" },

      { x: 72, y: 705, size: 14, text: "WORK EXPERIENCE" },
      // Role 1
      { x: 72, y: 685, size: 11, text: "Principal Engineer" },
      { x: 72, y: 670, size: 10, text: "Apex Cloud Services" },
      { x: 72, y: 655, size: 10, text: "Jan 2023 - Present" },
      { x: 72, y: 640, size: 10, text: "Lead architect for multi-region cloud infrastructure." },
      // Role 2
      { x: 72, y: 615, size: 11, text: "Senior Software Engineer" },
      { x: 72, y: 600, size: 10, text: "Virtusa Corp" },
      { x: 72, y: 585, size: 10, text: "Jun 2020 - Dec 2022" },
      { x: 72, y: 570, size: 10, text: "Built enterprise financial microservices." },
      // Role 3
      { x: 72, y: 545, size: 11, text: "Software Engineer" },
      { x: 72, y: 530, size: 10, text: "IFS World" },
      { x: 72, y: 515, size: 10, text: "Jan 2018 - May 2020" },
      { x: 72, y: 500, size: 10, text: "ERP module developer focusing on supply chain logistics." },

      { x: 72, y: 470, size: 14, text: "PROJECTS" },
      // Project 1
      { x: 72, y: 450, size: 11, text: "KubeTraffic Ingress Controller" },
      { x: 72, y: 435, size: 10, text: "Custom ingress controller with dynamic canary routing." },
      { x: 72, y: 420, size: 10, text: "Technologies: Go, Kubernetes, Envoy" },
      { x: 72, y: 405, size: 10, text: "https://github.com/malik/kubetraffic" },
      // Project 2
      { x: 72, y: 380, size: 11, text: "Postgres Failover Sentinel" },
      { x: 72, y: 365, size: 10, text: "High availability quorum manager for stateful clusters." },
      { x: 72, y: 350, size: 10, text: "Technologies: Python, Raft, Docker" },
      { x: 72, y: 335, size: 10, text: "https://github.com/malik/pg-sentinel" },
      // Project 3
      { x: 72, y: 310, size: 11, text: "Serverless Image Resizer" },
      { x: 72, y: 295, size: 10, text: "Event-driven edge thumbnail generator." },
      { x: 72, y: 280, size: 10, text: "Technologies: TypeScript, AWS Lambda, S3" },
      { x: 72, y: 265, size: 10, text: "https://github.com/malik/image-resizer" },
    ]);

    const result = await executeHybridCvPipeline(pdf, { geminiClient: offlineMockClient });

    const expCount = result.structuredData.experience.length;
    const projCount = result.structuredData.projects.length;

    // Both should have exactly 3 distinct entries, never merged!
    const passed = expCount === 3 && projCount === 3;
    if (!passed) allPassed = false;

    reports.push({
      testName: "Multiple Projects & Multiple Experiences (No Accidental Merging)",
      originalSections: ["WORK EXPERIENCE", "PROJECTS"],
      deterministic: {
        sections: Object.fromEntries(
          Object.entries(result.structuredData.sectionStatuses || {}).map(([k, v]) => [k, v || ""])
        ),
        projectTitles: result.structuredData.projects.map((p) => p.title),
        extracurricularCount: result.structuredData.extracurricular?.length || 0,
        experienceCount: expCount,
        achievementsCount: result.structuredData.achievements?.length || 0,
        leadershipCount: result.structuredData.leadership?.length || 0,
      },
      visualLayout: {
        layoutType: result.layout.layoutType,
        columnCount: result.layout.columnCount,
        hasSidebar: result.layout.sidebar.detected,
        visualHeadings: result.layout.visualHeadings.map((h) => h.text),
      },
      geminiTriggered: result.geminiUsed,
      geminiReason: result.structuredData.parsingMetadata?.geminiReason,
      reconciliation: {
        applied: Boolean(result.structuredData.parsingMetadata?.reconciliationApplied),
        notes: result.structuredData.parsingMetadata?.reconciliationNotes || [],
      },
      finalClassification: {
        projects: result.structuredData.projects.map((p) => ({
          title: p.title,
          tech: p.technologies,
          confidence: p.confidence,
        })),
        extracurricular: (result.structuredData.extracurricular || []).map((e) => ({
          activity: e.activity,
          role: e.role,
          confidence: e.confidence,
        })),
        experience: result.structuredData.experience.map((e) => ({
          company: e.company,
          position: e.position,
          confidence: e.confidence,
        })),
        achievements: (result.structuredData.achievements || []).map((a) => ({
          title: a.title,
          confidence: a.confidence,
        })),
        leadership: (result.structuredData.leadership || []).map((l) => ({
          role: l.role,
          org: l.organization,
          confidence: l.confidence,
        })),
      },
      reviewIssues: (result.structuredData.reviewIssues || []).map((i) => ({
        section: i.section,
        field: i.field,
        message: i.message,
        severity: i.severity,
      })),
      assertionsPassed: passed,
      notes: [
        `Expected 3 experiences, got: ${expCount} (${result.structuredData.experience.map((e) => e.company).join(", ")})`,
        `Expected 3 projects, got: ${projCount} (${result.structuredData.projects.map((p) => p.title).join(", ")})`,
      ],
    });
  }

  // -------------------------------------------------------------------------
  // TEST 7: Real Gemini Multimodal AI Request (Requirement 9 & 10)
  // -------------------------------------------------------------------------
  let geminiRealCallSuccess = false;
  if (process.env.GEMINI_API_KEY) {
    console.log("\n>>> TEST 7: REAL Gemini Multimodal AI Request with Text and Page Image");
    try {
      const ambiguousPdf = createPdfBuffer([
        { x: 72, y: 750, size: 16, text: "THARINDU JAYALATH" },
        { x: 72, y: 735, size: 10, text: "tharindu@example.com | Colombo, Sri Lanka" },
        { x: 72, y: 700, size: 14, text: "PROJECTS" },
        { x: 72, y: 680, size: 11, text: "Real-time Vehicle Telematics" },
        { x: 72, y: 665, size: 10, text: "IoT telemetry dashboard with MQTT alerts." },
        { x: 72, y: 650, size: 10, text: "Technologies: Go, MQTT, InfluxDB, Grafana" },
        { x: 72, y: 620, size: 14, text: "EXTRACURRICULAR ACTIVITIES" },
        { x: 72, y: 600, size: 11, text: "University Rowing Crew" },
        { x: 72, y: 585, size: 10, text: "Senior Oarsman (2021 - 2023)" },
        { x: 72, y: 570, size: 10, text: "Competed in national university regattas." },
      ]);

      const client = new DefaultGeminiCvClient(
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_MODEL || "gemini-3.8-flash"
      );

      // Render image of page 1 to verify both image and text are passed
      const pageImageBuf = await renderCvPageImage(ambiguousPdf, 1);
      console.log(`Page 1 rendered to image buffer: ${pageImageBuf.length} bytes`);

      const textExtraction = detectCvSections(
        "THARINDU JAYALATH\nPROJECTS\nReal-time Vehicle Telematics\nTechnologies: Go\nEXTRACURRICULAR ACTIVITIES\nUniversity Rowing Crew\nSenior Oarsman"
      );

      let geminiResponse = await client.callMultimodal({
        pageImages: [
          {
            pageNumber: 1,
            imageBase64: pageImageBuf.toString("base64"),
            mimeType: "image/png",
          },
        ],
        pageTexts: [
          {
            pageNumber: 1,
            text: "THARINDU JAYALATH\nPROJECTS\nReal-time Vehicle Telematics\nTechnologies: Go\nEXTRACURRICULAR ACTIVITIES\nUniversity Rowing Crew\nSenior Oarsman",
          },
        ],
        detectedSectionsContext: "projects: detected, extracurricular: detected",
        ambiguityReason: "Verify separation between Telematics project and Rowing extracurricular activity",
      });

      let retries = 0;
      while (!geminiResponse.success && geminiResponse.error?.includes("429") && retries < 3) {
        retries++;
        console.log(`Rate limit (429) encountered. Waiting 15s for quota refill (attempt ${retries}/3)...`);
        await new Promise((resolve) => setTimeout(resolve, 15000));
        geminiResponse = await client.callMultimodal({
          pageImages: [
            {
              pageNumber: 1,
              imageBase64: pageImageBuf.toString("base64"),
              mimeType: "image/png",
            },
          ],
          pageTexts: [
            {
              pageNumber: 1,
              text: "THARINDU JAYALATH\nPROJECTS\nReal-time Vehicle Telematics\nTechnologies: Go\nEXTRACURRICULAR ACTIVITIES\nUniversity Rowing Crew\nSenior Oarsman",
            },
          ],
          detectedSectionsContext: "projects: detected, extracurricular: detected",
          ambiguityReason: "Verify separation between Telematics project and Rowing extracurricular activity",
        });
      }

      console.log(`Gemini response success: ${geminiResponse.success}`);
      if (geminiResponse.success && geminiResponse.data) {
        geminiRealCallSuccess = true;
        console.log(`Gemini classified projects: ${geminiResponse.data.projects.map((p) => p.title || p.name).join(", ")}`);
        console.log(`Gemini classified extracurricular: ${geminiResponse.data.extracurricular.map((e) => e.activity || e.name || e.title).join(", ")}`);
      } else {
        console.warn(`Gemini call error: ${geminiResponse.error}`);
      }
    } catch (err) {
      console.error("Gemini test failed with exception:", err);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 8: Resilience to Gemini Failure (Requirement 11)
  // -------------------------------------------------------------------------
  {
    console.log("\n>>> TEST 8: Gemini Failure Resilience (Fallback to Deterministic)");
    const testPdf = createPdfBuffer([
      { x: 72, y: 750, size: 16, text: "RESILIENCE TEST USER" },
      { x: 72, y: 730, size: 10, text: "resilience@example.com" },
      { x: 72, y: 700, size: 14, text: "PROJECTS" },
      { x: 72, y: 680, size: 11, text: "Offline Sync Engine" },
      { x: 72, y: 665, size: 10, text: "CRDT-based data sync engine." },
      { x: 72, y: 650, size: 10, text: "Technologies: Rust, WebAssembly" },
    ]);

    // Mock failing Gemini client that returns HTTP 500 / Network Error
    const failingClient = {
      async callMultimodal() {
        return {
          success: false,
          statusCode: 500,
          error: "Simulated Gemini upstream 500 Internal Server Error",
        };
      },
    };

    const result = await executeHybridCvPipeline(testPdf, {
      geminiClient: failingClient,
      forceGemini: true,
    });

    // Verify deterministic parsing continues cleanly and structuredData contains the project!
    const passed =
      result.structuredData.projects.length === 1 &&
      result.structuredData.projects[0]?.title.includes("Offline Sync Engine");

    if (!passed) allPassed = false;

    reports.push({
      testName: "Gemini Failure Resilience (Graceful Deterministic Fallback)",
      originalSections: ["PROJECTS"],
      deterministic: {
        sections: Object.fromEntries(
          Object.entries(result.structuredData.sectionStatuses || {}).map(([k, v]) => [k, v || ""])
        ),
        projectTitles: result.structuredData.projects.map((p) => p.title),
        extracurricularCount: result.structuredData.extracurricular?.length || 0,
        experienceCount: result.structuredData.experience.length,
        achievementsCount: result.structuredData.achievements?.length || 0,
        leadershipCount: result.structuredData.leadership?.length || 0,
      },
      visualLayout: {
        layoutType: result.layout.layoutType,
        columnCount: result.layout.columnCount,
        hasSidebar: result.layout.sidebar.detected,
        visualHeadings: result.layout.visualHeadings.map((h) => h.text),
      },
      geminiTriggered: result.geminiUsed,
      geminiReason: "Simulated upstream failure test",
      reconciliation: {
        applied: Boolean(result.structuredData.parsingMetadata?.reconciliationApplied),
        notes: result.structuredData.parsingMetadata?.reconciliationNotes || [],
      },
      finalClassification: {
        projects: result.structuredData.projects.map((p) => ({
          title: p.title,
          tech: p.technologies,
          confidence: p.confidence,
        })),
        extracurricular: (result.structuredData.extracurricular || []).map((e) => ({
          activity: e.activity,
          role: e.role,
          confidence: e.confidence,
        })),
        experience: result.structuredData.experience.map((e) => ({
          company: e.company,
          position: e.position,
          confidence: e.confidence,
        })),
        achievements: (result.structuredData.achievements || []).map((a) => ({
          title: a.title,
          confidence: a.confidence,
        })),
        leadership: (result.structuredData.leadership || []).map((l) => ({
          role: l.role,
          org: l.organization,
          confidence: l.confidence,
        })),
      },
      reviewIssues: (result.structuredData.reviewIssues || []).map((i) => ({
        section: i.section,
        field: i.field,
        message: i.message,
        severity: i.severity,
      })),
      assertionsPassed: Boolean(passed),
      notes: [
        `Gemini failure was caught gracefully: ${result.structuredData.projects.length === 1}`,
        `Project retained from deterministic: ${result.structuredData.projects[0]?.title}`,
      ],
    });
  }

  return { reports, geminiRealCallSuccess, allPassed };
}

// Run immediately if invoked directly
runAllValidationTests()
  .then((res) => {
    console.log("\n==================================================================");
    console.log("   DETAILED TEST RESULTS");
    console.log("==================================================================");
    for (const r of res.reports) {
      console.log(`[${r.assertionsPassed ? "PASS" : "FAIL"}] ${r.testName}`);
      for (const n of r.notes) {
        console.log(`   - ${n}`);
      }
    }
    console.log("------------------------------------------------------------------");
    console.log(`VALIDATION SUMMARY: All Tests Passed = ${res.allPassed}`);
    console.log(`Gemini Real Multimodal Call Succeeded = ${res.geminiRealCallSuccess ? "YES" : "NO"}`);
    console.log("==================================================================");
    process.exit(res.allPassed && res.geminiRealCallSuccess ? 0 : 1);
  })
  .catch((err) => {
    console.error("FATAL ERROR in validation runner:", err);
    process.exit(1);
  });
