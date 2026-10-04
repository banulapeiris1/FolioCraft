import test from "node:test";
import assert from "node:assert/strict";
import { detectCvSections } from "./sectionDetection.service";
import { extractStructuredCv } from "./structuredExtraction.service";

test("CV-PHASE-5: Comprehensive Realistic CV Scenarios & Pipeline Validation", async (t) => {
  // --------------------------------------------------------------------------
  // SCENARIO A — Standard Full CV
  // --------------------------------------------------------------------------
  await t.test("Scenario A: Standard CV extracts all major sections and structured entities correctly", () => {
    const rawCv = `
Nimal Jayasuriya
Full Stack Engineer
nimal@example.com | +94 71 234 5678 | Colombo, Sri Lanka
https://github.com/nimalj | https://linkedin.com/in/nimalj | https://nimal.dev

SUMMARY
Results-driven software engineer with 5 years of experience in distributed systems.

TECHNICAL SKILLS
TypeScript, React, Node.js, PostgreSQL, Docker, AWS

WORK EXPERIENCE
Senior Software Engineer
LankaCloud Systems
Jan 2023 - Present
- Led migration of monolith to cloud-native microservices.
- Improved API latency by 45%.

Software Engineer
Colombo Tech Labs
Jun 2020 - Dec 2022
- Developed customer-facing dashboard using React and GraphQL.

EDUCATION
BSc in Computer Science
University of Colombo
2016 - 2020

PROJECTS
FolioCraft Suite
Modern portfolio builder for software engineers.
Built with Next.js, Express, and PostgreSQL.
Technologies: Next.js, Express, PostgreSQL
https://github.com/nimalj/foliocraft
https://foliocraft.app
`;

    const sections = detectCvSections(rawCv);
    assert.ok(sections.summary);
    assert.ok(sections.skills);
    assert.ok(sections.experience);
    assert.ok(sections.education);
    assert.ok(sections.projects);

    const parsed = extractStructuredCv(sections);
    assert.equal(parsed.personal?.fullName, "Nimal Jayasuriya");
    assert.equal(parsed.personal?.email, "nimal@example.com");
    assert.equal(parsed.personal?.phone, "+94 71 234 5678");
    assert.equal(parsed.personal?.location, "Colombo, Sri Lanka");
    assert.equal(parsed.personal?.github, "https://github.com/nimalj");
    assert.equal(parsed.personal?.linkedin, "https://linkedin.com/in/nimalj");
    assert.equal(parsed.personal?.website, "https://nimal.dev");

    assert.equal(parsed.experience?.length, 2);
    assert.equal(parsed.experience?.[0]?.company, "LankaCloud Systems");
    assert.equal(parsed.experience?.[0]?.isCurrent, true);
    assert.equal(parsed.experience?.[1]?.company, "Colombo Tech Labs");
    assert.equal(parsed.experience?.[1]?.isCurrent, false);

    assert.equal(parsed.education?.length, 1);
    assert.equal(parsed.education?.[0]?.institution, "University of Colombo");

    assert.equal(parsed.projects?.length, 1);
    assert.equal(parsed.projects?.[0]?.title, "FolioCraft Suite");
    assert.equal(parsed.projects?.[0]?.githubUrl, "https://github.com/nimalj/foliocraft");
    assert.equal(parsed.projects?.[0]?.liveUrl, "https://foliocraft.app");
  });

  // --------------------------------------------------------------------------
  // SCENARIO B — Diverse Section Headings
  // --------------------------------------------------------------------------
  await t.test("Scenario B: Handles diverse and alternative section headings", () => {
    const rawCv = `
Kasun Perera
kasun@mail.com

CAREER BACKGROUND
Principal Engineer
Global Systems
2022 - Present
- Core architecture.

ACADEMIC QUALIFICATIONS
Bachelor of Engineering
National Institute of Technology
2017 - 2021

TECHNICAL PROFICIENCIES
Go, Rust, Kubernetes, Terraform

SELECTED PROJECTS
Cloud Mesh Orchestrator
High performance service mesh controller.
Technologies: Go, Kubernetes
https://github.com/kasun/mesh
`;

    const sections = detectCvSections(rawCv);
    assert.ok(sections.experience, "Should detect CAREER BACKGROUND as experience");
    assert.ok(sections.education, "Should detect ACADEMIC QUALIFICATIONS as education");
    assert.ok(sections.skills, "Should detect TECHNICAL PROFICIENCIES as skills");
    assert.ok(sections.projects, "Should detect SELECTED PROJECTS as projects");

    const parsed = extractStructuredCv(sections);
    assert.equal(parsed.experience?.length, 1);
    assert.equal(parsed.experience?.[0]?.company, "Global Systems");
    assert.equal(parsed.education?.length, 1);
    assert.equal(parsed.education?.[0]?.institution, "National Institute of Technology");
    assert.ok(parsed.skills?.some((s) => s.name.toLowerCase() === "go"));
    assert.equal(parsed.projects?.length, 1);
    assert.equal(parsed.projects?.[0]?.title, "Cloud Mesh Orchestrator");
  });

  // --------------------------------------------------------------------------
  // SCENARIO C — Multiple Jobs at the Same Company
  // --------------------------------------------------------------------------
  await t.test("Scenario C: Multiple jobs at the same company remain separate experience records", () => {
    const rawCv = `
Jane Dev
jane@dev.com

WORK EXPERIENCE
Software Engineer
ABC Company
2024 - Present
- Developed payment APIs.

Intern Software Engineer
ABC Company
2023 - 2024
- Assisted in building CI/CD pipeline.
`;

    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.experience?.length, 2, "Should parse two distinct experience entries");
    assert.equal(parsed.experience?.[0]?.company, "ABC Company");
    assert.equal(parsed.experience?.[0]?.position, "Software Engineer");
    assert.equal(parsed.experience?.[0]?.isCurrent, true);

    assert.equal(parsed.experience?.[1]?.company, "ABC Company");
    assert.equal(parsed.experience?.[1]?.position, "Intern Software Engineer");
    assert.equal(parsed.experience?.[1]?.isCurrent, false);
  });

  // --------------------------------------------------------------------------
  // SCENARIO D — Multiple Companies with Same Job Title
  // --------------------------------------------------------------------------
  await t.test("Scenario D: Multiple companies with same job title remain separate records", () => {
    const rawCv = `
Alex Smith
alex@smith.com

EXPERIENCE
Software Engineer
ABC Tech
2023 - Present
- Backend systems.

Software Engineer
XYZ Solutions
2021 - 2023
- Frontend systems.
`;

    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.experience?.length, 2);
    assert.equal(parsed.experience?.[0]?.company, "ABC Tech");
    assert.equal(parsed.experience?.[0]?.position, "Software Engineer");
    assert.equal(parsed.experience?.[1]?.company, "XYZ Solutions");
    assert.equal(parsed.experience?.[1]?.position, "Software Engineer");
  });

  // --------------------------------------------------------------------------
  // SCENARIO E — Projects with Multiple Paragraphs & URLs
  // --------------------------------------------------------------------------
  await t.test("Scenario E: Projects with multiple paragraphs and URLs preserve description and URLs without merging", () => {
    const rawCv = `
Sam Developer
sam@example.com

PROJECTS
CareSync Healthcare Portal
An enterprise clinical health coordination platform.

The system connects doctors with outpatients through encrypted telehealth channels.
Features include automated SMS notifications and real-time appointment scheduling.

Technologies: React, Node.js, WebRTC, PostgreSQL
https://github.com/samdev/caresync
https://caresync.health

FinTrack Analytics
A lightweight personal finance tracker.

Provides weekly summaries and multi-currency exchange calculations.

Technologies: Vue.js, SQLite
https://github.com/samdev/fintrack
`;

    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.projects?.length, 2);
    const p1 = parsed.projects?.[0];
    const p2 = parsed.projects?.[1];

    assert.equal(p1?.title, "CareSync Healthcare Portal");
    assert.ok(p1?.description?.includes("enterprise clinical health coordination"));
    assert.ok(p1?.description?.includes("connects doctors with outpatients"));
    assert.equal(p1?.githubUrl, "https://github.com/samdev/caresync");
    assert.equal(p1?.liveUrl, "https://caresync.health");

    assert.equal(p2?.title, "FinTrack Analytics");
    assert.ok(p2?.description?.includes("personal finance tracker"));
    assert.equal(p2?.githubUrl, "https://github.com/samdev/fintrack");
  });

  // --------------------------------------------------------------------------
  // SCENARIO F — Skills Mixed with Achievements
  // --------------------------------------------------------------------------
  await t.test("Scenario F: Skills and Achievements are segmented cleanly and not mixed", () => {
    const rawCv = `
Candidate Name
candidate@example.com

SKILLS
React, Node.js, Python, PostgreSQL, Docker

ACHIEVEMENTS
Winner - National Hackathon 2024
Dean's List Academic Honor 2022
Best Final Year Research Project
`;

    const sections = detectCvSections(rawCv);
    assert.ok(sections.skills);
    assert.ok(sections.achievements);

    const parsed = extractStructuredCv(sections);
    const skillNames = (parsed.skills || []).map((s) => s.name.toLowerCase());

    assert.ok(skillNames.includes("react"));
    assert.ok(skillNames.includes("python"));
    assert.equal(skillNames.some((s) => s.includes("winner")), false, "Achievements must not be in skills");
    assert.equal(skillNames.some((s) => s.includes("hackathon")), false, "Achievements must not be in skills");

    assert.equal(parsed.achievements?.length, 3);
    assert.ok(parsed.achievements?.[0]?.title.includes("Winner - National Hackathon"));
  });

  // --------------------------------------------------------------------------
  // SCENARIO G — Leadership Section
  // --------------------------------------------------------------------------
  await t.test("Scenario G: Leadership roles remain separate from work experience and skills", () => {
    const rawCv = `
Candidate Name
candidate@example.com

LEADERSHIP
President
Computing Society, University of Moratuwa
2023 - 2024
- Organized tech talks and workshops for 500+ students.

Committee Member
Developer Student Club
2022 - 2023
- Mentored junior peers in web development.
`;

    const sections = detectCvSections(rawCv);
    assert.ok(sections.leadership);

    const parsed = extractStructuredCv(sections);
    assert.equal(parsed.leadership?.length, 2);
    assert.equal(parsed.leadership?.[0]?.role, "President");
    assert.equal(parsed.leadership?.[0]?.organization, "Computing Society, University of Moratuwa");
    assert.equal(parsed.leadership?.[1]?.role, "Committee Member");
    // Work experience should not have received these
    assert.equal(parsed.experience?.length, 0);
  });

  // --------------------------------------------------------------------------
  // SCENARIO H — Missing Sections & Review Issues
  // --------------------------------------------------------------------------
  await t.test("Scenario H: Missing sections clearly surface review issues and do not fabricate data", () => {
    const rawCv = `
Fresh Graduate
grad@student.com

EDUCATION
BSc in Software Engineering
SLIIT
2020 - 2024

PROJECTS
Student Attendance App
Mobile app for attendance tracking.
Technologies: Flutter, Firebase
`;

    const sections = detectCvSections(rawCv);
    assert.equal(Boolean(sections.experience), false);
    assert.equal(Boolean(sections.skills), false);

    const parsed = extractStructuredCv(sections);
    assert.equal(parsed.experience?.length, 0);
    assert.equal(parsed.skills?.length, 0);
    assert.equal(parsed.education?.length, 1);
    assert.equal(parsed.projects?.length, 1);

    // Verify review issues reflect missing experience or skills
    const issueSections = (parsed.reviewIssues || []).map((i) => i.section);
    assert.ok(issueSections.includes("experience") || issueSections.includes("skills"));
  });

  // --------------------------------------------------------------------------
  // SCENARIO I — Current Employment
  // --------------------------------------------------------------------------
  await t.test("Scenario I: Current employment sets isCurrent: true and leaves endDate undefined", () => {
    const rawCv = `
Dev Person
dev@test.com

EXPERIENCE
Staff Engineer
LankaTech Innovations
Jan 2024 - Present
- Core cloud infra.
`;

    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.experience?.length, 1);
    assert.equal(parsed.experience?.[0]?.isCurrent, true);
    assert.equal(parsed.experience?.[0]?.endDate, undefined);
  });

  // --------------------------------------------------------------------------
  // SCENARIO J — Diverse Date Formats
  // --------------------------------------------------------------------------
  await t.test("Scenario J: Robustly extracts varied date formats across experience entries", () => {
    const rawCv = `
Dev Candidate
dev@example.com

EXPERIENCE
Role One
Company Alpha
Jan 2024 - Present
- Ongoing work

Role Two
Company Beta
January 2022 - Dec 2023
- Word months

Role Three
Company Gamma
06/2020 - 12/2021
- Numeric slash

Role Four
Company Delta
2018 - 2020
- Year only
`;

    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.experience?.length, 4);
    assert.equal(parsed.experience?.[0]?.startDate, "Jan 2024");
    assert.equal(parsed.experience?.[0]?.isCurrent, true);

    assert.equal(parsed.experience?.[1]?.startDate, "January 2022");
    assert.equal(parsed.experience?.[1]?.endDate, "Dec 2023");

    assert.equal(parsed.experience?.[2]?.startDate, "06/2020");
    assert.equal(parsed.experience?.[2]?.endDate, "12/2021");

    assert.equal(parsed.experience?.[3]?.startDate, "2018");
    assert.equal(parsed.experience?.[3]?.endDate, "2020");
  });

  // --------------------------------------------------------------------------
  // SCENARIO K — Case-Insensitive Duplicate Skills
  // --------------------------------------------------------------------------
  await t.test("Scenario K: Duplicate skills with different casing are deduplicated deterministically", () => {
    const rawCv = `
Skill Person
dev@test.com

SKILLS
Java, java, JAVA, JavaScript, TypeScript, typescript
`;

    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    const names = (parsed.skills || []).map((s) => s.name.toLowerCase());
    assert.equal(names.filter((n) => n === "java").length, 1, "Java should appear only once");
    assert.equal(names.filter((n) => n === "javascript").length, 1);
    assert.equal(names.filter((n) => n === "typescript").length, 1);
  });

  // --------------------------------------------------------------------------
  // SCENARIO L — URL Preservation Across All Sections
  // --------------------------------------------------------------------------
  await t.test("Scenario L: URLs in header and projects are extracted accurately", () => {
    const rawCv = `
Dev Person
dev@portfolio.dev
https://github.com/devperson
https://linkedin.com/in/devperson-lead
https://devperson.tech

PROJECTS
OpenSource Auth Provider
OAuth2 authentication service.
Technologies: Rust, Actix
https://github.com/devperson/auth-service
https://auth.devperson.tech
`;

    const sections = detectCvSections(rawCv);
    const parsed = extractStructuredCv(sections);

    assert.equal(parsed.personal?.github, "https://github.com/devperson");
    assert.equal(parsed.personal?.linkedin, "https://linkedin.com/in/devperson-lead");
    assert.equal(parsed.personal?.website, "https://devperson.tech");

    assert.equal(parsed.projects?.length, 1);
    assert.equal(parsed.projects?.[0]?.githubUrl, "https://github.com/devperson/auth-service");
    assert.equal(parsed.projects?.[0]?.liveUrl, "https://auth.devperson.tech");
  });

  // --------------------------------------------------------------------------
  // PDF Edge Cases: Minimal / Empty Text Handling
  // --------------------------------------------------------------------------
  await t.test("PDF Edge Cases: Handles empty text and minimal content gracefully without throwing", () => {
    const emptyResult = detectCvSections("");
    assert.equal(emptyResult.detectedOrder.length, 0);

    const parsedEmpty = extractStructuredCv(emptyResult);
    assert.ok(parsedEmpty.reviewIssues);
    assert.ok(parsedEmpty.reviewIssues.length > 0);

    const minimalText = "John Doe\njohn@example.com\n";
    const minimalSections = detectCvSections(minimalText);
    const parsedMinimal = extractStructuredCv(minimalSections);
    assert.equal(parsedMinimal.personal?.fullName, "John Doe");
    assert.equal(parsedMinimal.personal?.email, "john@example.com");
  });
});
