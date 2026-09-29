import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanHeadingLine,
  detectCvSections,
  matchKnownSection,
  matchUnknownSectionHeading,
} from "./sectionDetection.service";

test("CV-05: CV Section Detection Service Unit Tests", async (t) => {
  // Test A: Normal CV containing all 5 core sections
  await t.test("A. Normal CV detects all 5 standard sections in expected order", () => {
    const rawCv = `
John Doe
Full Stack Developer
john.doe@example.com | 555-1234

SUMMARY
Seasoned software engineer with 5 years building scalable web apps.

EXPERIENCE
Senior Software Engineer - Tech Solutions (2022 - Present)
- Architected REST and GraphQL APIs.
- Mentored junior engineers.

EDUCATION
B.Sc. in Computer Science
State University (2018 - 2022)

SKILLS
- TypeScript, JavaScript, Python
- React, Next.js, Express, PostgreSQL

PROJECTS
FolioCraft Portfolio Builder
- Developed interactive web resume generator.
`;

    const result = detectCvSections(rawCv);

    assert.deepEqual(result.detectedOrder, [
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
    ]);

    assert.equal(
      result.headerText,
      "John Doe\nFull Stack Developer\njohn.doe@example.com | 555-1234"
    );
    assert.equal(
      result.summary,
      "Seasoned software engineer with 5 years building scalable web apps."
    );
    assert.match(result.experience!, /Senior Software Engineer - Tech Solutions/);
    assert.match(result.education!, /B\.Sc\. in Computer Science/);
    assert.match(result.skills!, /TypeScript, JavaScript, Python/);
    assert.match(result.projects!, /FolioCraft Portfolio Builder/);
  });

  // Test B: Different heading variants
  await t.test("B. Recognizes heading variants (Professional Summary, Work Experience, Academic Background, Technical Skills, Personal Projects)", () => {
    const cvWithVariants = `
Jane Smith

PROFESSIONAL SUMMARY
Passionate frontend specialist.

WORK EXPERIENCE
Frontend Lead - Digital Agency (2021 - Present)
- Built web portals.

ACADEMIC BACKGROUND
Master of Engineering in Computing
Oxford Institute, 2020

TECHNICAL SKILLS & TECHNOLOGIES
JavaScript, React, Vue, CSS3, Vite

PERSONAL PROJECTS
Personal Blog & Portfolio
- Open source developer portfolio.
`;

    const result = detectCvSections(cvWithVariants);

    assert.deepEqual(result.detectedOrder, [
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
    ]);
    assert.equal(result.summary, "Passionate frontend specialist.");
    assert.match(result.experience!, /Frontend Lead - Digital Agency/);
    assert.match(result.education!, /Master of Engineering in Computing/);
    assert.match(result.skills!, /JavaScript, React, Vue, CSS3, Vite/);
    assert.match(result.projects!, /Personal Blog & Portfolio/);
  });

  // Test C: Case-insensitivity
  await t.test("C. Matches headings case-insensitively (UPPERCASE, lowercase, Title Case, mixed case)", () => {
    const rawCv = `
profile
Enthusiastic developer.

wOrK eXpErIeNcE
Developer at Startup (2023)

EDUCATION
B.Sc. Software Engineering

technical skills
Node.js, Docker, Kubernetes

Selected Projects
E-Commerce Platform
`;

    const result = detectCvSections(rawCv);

    assert.deepEqual(result.detectedOrder, [
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
    ]);
    assert.equal(result.summary, "Enthusiastic developer.");
    assert.equal(result.experience, "Developer at Startup (2023)");
    assert.equal(result.education, "B.Sc. Software Engineering");
    assert.equal(result.skills, "Node.js, Docker, Kubernetes");
    assert.equal(result.projects, "E-Commerce Platform");
  });

  // Test D: Headings with surrounding whitespace and punctuation
  await t.test("D. Tolerates decorative punctuation and whitespace (colons, markdown hashes, dashes, bullets)", () => {
    const rawCv = `
  ## Professional Profile:  
Passionate developer profile text.

--- WORK EXPERIENCE ---
Tech Corp: 2020 - Present

• Academic Background :
B.Tech in IT

[ Technical Skills ]:
TypeScript, Golang

3. Key Projects ---:
Microservices Migration
`;

    const result = detectCvSections(rawCv);

    assert.deepEqual(result.detectedOrder, [
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
    ]);
    assert.equal(result.summary, "Passionate developer profile text.");
    assert.equal(result.experience, "Tech Corp: 2020 - Present");
    assert.equal(result.education, "B.Tech in IT");
    assert.equal(result.skills, "TypeScript, Golang");
    assert.equal(result.projects, "Microservices Migration");
  });

  // Test E: False positive avoidance in normal sentences
  await t.test("E. Normal sentences containing heading keywords are NOT treated as section headings", () => {
    const rawCv = `
PROFILE
I have over 7 years of work experience in software engineering.
My core technical skills include cloud infrastructure and distributed systems.
I have led academic background research projects in distributed computing.

EXPERIENCE
Staff Engineer (2020 - Present)
Led projects that improved experience for 2 million active users.
Demonstrated strong skills in system optimization.
`;

    const result = detectCvSections(rawCv);

    // Only "PROFILE" and "EXPERIENCE" should be detected as sections
    assert.deepEqual(result.detectedOrder, ["summary", "experience"]);
    assert.equal(result.education, undefined);
    assert.equal(result.skills, undefined);
    assert.equal(result.projects, undefined);

    assert.match(
      result.summary!,
      /I have over 7 years of work experience in software engineering\./
    );
    assert.match(
      result.summary!,
      /My core technical skills include cloud infrastructure and distributed systems\./
    );
    assert.match(
      result.experience!,
      /Led projects that improved experience for 2 million active users\./
    );
  });

  // Test F: Missing sections handling
  await t.test("F. Handles missing sections without inventing keys or defaults", () => {
    const cvMissingSections = `
Alex Morgan
alex@example.com

EXPERIENCE
Backend Engineer at CloudCorp (2022 - Present)

SKILLS
Go, Rust, Python, PostgreSQL
`;

    const result = detectCvSections(cvMissingSections);

    assert.deepEqual(result.detectedOrder, ["experience", "skills"]);
    assert.equal(result.summary, undefined);
    assert.equal(result.education, undefined);
    assert.equal(result.projects, undefined);
    assert.equal(result.experience, "Backend Engineer at CloudCorp (2022 - Present)");
    assert.equal(result.skills, "Go, Rust, Python, PostgreSQL");
  });

  // Test G: Unknown headings handling
  await t.test("G. Safely captures unknown headings in unknownSections without discarding document", () => {
    const cvWithUnknown = `
John Doe

EDUCATION
B.Sc. in Computer Science

CERTIFICATIONS
- AWS Certified Developer Associate
- Certified Kubernetes Administrator

LANGUAGES
English (Native), French (Fluent)
`;

    const result = detectCvSections(cvWithUnknown);

    assert.deepEqual(result.detectedOrder, ["education"]);
    assert.equal(result.education, "B.Sc. in Computer Science");
    assert.ok(result.unknownSections);
    assert.match(
      result.unknownSections["CERTIFICATIONS"] || "",
      /AWS Certified Developer Associate/
    );
    assert.match(
      result.unknownSections["LANGUAGES"] || "",
      /English \(Native\), French \(Fluent\)/
    );
  });

  // Test H: Empty and whitespace-only input
  await t.test("H. Handles empty or whitespace-only inputs safely", () => {
    const emptyResult = detectCvSections("");
    assert.deepEqual(emptyResult.detectedOrder, []);
    assert.equal(emptyResult.rawText, "");
    assert.equal(emptyResult.summary, undefined);
    assert.equal(emptyResult.experience, undefined);

    const whitespaceResult = detectCvSections("   \n\n\t  \r\n  ");
    assert.deepEqual(whitespaceResult.detectedOrder, []);
  });

  // Test I: Multiple sections in different orders
  await t.test("I. Preserves exact appearance order when sections are ordered non-standardly", () => {
    const nonStandardOrderCv = `
EDUCATION
Master of Science

SKILLS
TypeScript, React

PROJECTS
FolioCraft

WORK EXPERIENCE
Software Developer at Acme

SUMMARY
Summary at the bottom.
`;

    const result = detectCvSections(nonStandardOrderCv);

    assert.deepEqual(result.detectedOrder, [
      "education",
      "skills",
      "projects",
      "experience",
      "summary",
    ]);
  });

  // Test J: Content integrity and correct section assignment
  await t.test("J. Section content remains intact, multiline, and strictly assigned to its section", () => {
    const cv = `
Candidate Name
Title / Contact

EXPERIENCE
Line 1: Company A - Software Engineer
Line 2: - Designed PostgreSQL database schema
Line 3: - Configured Docker containers

EDUCATION
Line 4: University of Westminster
Line 5: Degree in Software Engineering (First Class)
`;

    const result = detectCvSections(cv);

    assert.equal(result.headerText, "Candidate Name\nTitle / Contact");
    assert.equal(
      result.experience,
      "Line 1: Company A - Software Engineer\nLine 2: - Designed PostgreSQL database schema\nLine 3: - Configured Docker containers"
    );
    assert.equal(
      result.education,
      "Line 4: University of Westminster\nLine 5: Degree in Software Engineering (First Class)"
    );
  });

  // Helper unit tests
  await t.test("cleanHeadingLine() strips bullets, hashes, and decorative punctuation", () => {
    assert.equal(cleanHeadingLine("### Experience :"), "Experience");
    assert.equal(cleanHeadingLine("• 1. Technical Skills ---"), "Technical Skills");
    assert.equal(cleanHeadingLine("[ Professional Summary ]"), "Professional Summary");
  });

  await t.test("matchKnownSection() accurately identifies section types or returns null", () => {
    assert.equal(matchKnownSection("Work History"), "experience");
    assert.equal(matchKnownSection("Core Competencies"), "skills");
    assert.equal(matchKnownSection("Educational Background"), "education");
    assert.equal(matchKnownSection("About Me"), "summary");
    assert.equal(matchKnownSection("Selected Projects"), "projects");
    assert.equal(matchKnownSection("I have 10 years of experience."), null);
  });

  await t.test("matchUnknownSectionHeading() detects non-core heading patterns", () => {
    assert.equal(matchUnknownSectionHeading("CERTIFICATIONS"), "CERTIFICATIONS");
    assert.equal(matchUnknownSectionHeading("Volunteer Experience"), "Volunteer Experience");
    assert.equal(matchUnknownSectionHeading("I am certified in AWS."), null);
  });
});
