import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  LlmCvSchema,
  mapLlmResultToStructuredCv,
  type CvLlmClient,
} from "./cvLlmExtraction.service";
import { executeHybridCvPipeline } from "./cvPipeline.service";

const RAW_TEXT = `BANULA PEIRIS
Full Stack Developer
0711834925 banula@example.com https://github.com/banula
PROJECTS
School Management System - Linfield Labs
https://github.com/linfieldlabs/school-management-system
Developed the Parent and Student portal modules, enabling real-time
communication between school and guardians through automated
notification systems.
SKILLS
Client-Side
HTML CSS JS React`;

function llmResult(overrides: Record<string, unknown> = {}) {
  return LlmCvSchema.parse({
    personal: {
      fullName: "BANULA PEIRIS",
      professionalTitle: "Full Stack Developer",
      email: "banula@example.com",
      phone: "0711834925",
      github: "https://github.com/banula",
      linkedin: null,
    },
    experience: [],
    education: [],
    skills: [
      { name: "HTML", category: "languages" },
      { name: "JS", category: "languages" },
      { name: "React", category: "frontend" },
    ],
    projects: [
      {
        title: "School Management System - Linfield Labs",
        description:
          "Developed the Parent and Student portal modules, enabling real-time communication between school and guardians through automated notification systems.",
        technologies: [],
        githubUrl: "https://github.com/linfieldlabs/school-management-system",
      },
    ],
    achievements: [],
    leadership: [],
    extracurricular: [],
    ...overrides,
  });
}

test("LLM CV extraction mapping", async (t) => {
  await t.test("keeps grounded personal details and entities", () => {
    const cv = mapLlmResultToStructuredCv(llmResult(), RAW_TEXT);
    assert.equal(cv.personal.fullName, "BANULA PEIRIS");
    assert.equal(cv.personal.email, "banula@example.com");
    assert.equal(cv.personal.phone, "0711834925");
    assert.equal(cv.personal.github, "https://github.com/banula");
    assert.equal(cv.projects.length, 1);
    assert.equal(cv.projects[0]!.confidence, "high");
    assert.equal(
      cv.projects[0]!.githubUrl,
      "https://github.com/linfieldlabs/school-management-system"
    );
  });

  await t.test("drops contact details that are not in the PDF text", () => {
    const cv = mapLlmResultToStructuredCv(
      llmResult({
        personal: {
          fullName: "BANULA PEIRIS",
          email: "invented@example.com",
          phone: "0779999999",
          linkedin: "https://linkedin.com/in/someone",
        },
      }),
      RAW_TEXT
    );
    assert.equal(cv.personal.email, undefined);
    assert.equal(cv.personal.phone, undefined);
    assert.equal(cv.personal.linkedin, undefined);
    assert.ok(cv.reviewIssues?.some((i) => i.field === "email"));
  });

  await t.test("flags entities that cannot be matched to the CV text", () => {
    const cv = mapLlmResultToStructuredCv(
      llmResult({
        projects: [{ title: "Quantum Blockchain Marketplace", technologies: [] }],
      }),
      RAW_TEXT
    );
    assert.equal(cv.projects[0]!.confidence, "low");
    assert.ok(
      cv.reviewIssues?.some((i) => i.section === "projects" && i.severity === "warning")
    );
  });

  await t.test("canonicalises and categorises individual skills", () => {
    const cv = mapLlmResultToStructuredCv(llmResult(), RAW_TEXT);
    const names = cv.skills.map((s) => s.name);
    assert.deepEqual(names, ["HTML", "JavaScript", "React"]);
    assert.equal(cv.categorizedSkills?.frontend[0]?.name, "React");
    assert.equal(cv.categorizedSkills?.other.length, 0);
  });

  await t.test("pipeline uses the LLM client and falls back when it fails", async () => {
    const pdf = readFileSync(
      path.join(__dirname, "../../../test/fixtures/sample-cv.pdf")
    );

    const okClient: CvLlmClient = {
      async extractCv(request) {
        assert.ok(request.pageTexts.length > 0);
        return { success: true, data: llmResult() };
      },
    };
    const ok = await executeHybridCvPipeline(pdf, { llmClient: okClient });
    assert.equal(ok.structuredData.parsingMetadata?.parserVersion, "3.0-llm");

    const failingClient: CvLlmClient = {
      async extractCv() {
        return { success: false, error: "HTTP 503" };
      },
    };
    const fallback = await executeHybridCvPipeline(pdf, {
      llmClient: failingClient,
      geminiClient: {
        async callMultimodal() {
          return { success: false, error: "offline" };
        },
      },
    });
    assert.equal(fallback.structuredData.parsingMetadata?.parserVersion, "2.0-hybrid");
    assert.ok(
      fallback.structuredData.reviewIssues?.some((i) =>
        /AI extraction was unavailable/.test(i.message)
      )
    );
  });
});
