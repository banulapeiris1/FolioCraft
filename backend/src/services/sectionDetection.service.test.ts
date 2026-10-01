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

  // Phase 1 Explicit Requirements Test Scenarios (Tests 1 through 12)
  await t.test("Phase 1: Explicit 12 Section Detection Scenarios", async (p1) => {
    // Test 1: WORK EXPERIENCE
    await p1.test("Test 1: 'WORK EXPERIENCE' heading is detected as experience", () => {
      const cv = "WORK EXPERIENCE\nSoftware Engineer at TechCorp\n2022 - Present";
      const result = detectCvSections(cv);
      assert.equal(result.details.experience.status, "detected");
      assert.equal(result.details.experience.confidence, "high");
      assert.match(result.experience!, /Software Engineer at TechCorp/);
    });

    // Test 2: Professional Experience
    await p1.test("Test 2: 'Professional Experience' heading is detected as experience", () => {
      const cv = "Professional Experience\nBackend Lead at Cloud Solutions\n2021 - 2024";
      const result = detectCvSections(cv);
      assert.equal(result.details.experience.status, "detected");
      assert.equal(result.details.experience.confidence, "high");
      assert.match(result.experience!, /Backend Lead at Cloud Solutions/);
    });

    // Test 3: Technical Skills
    await p1.test("Test 3: 'Technical Skills' heading is detected as skills", () => {
      const cv = "Technical Skills\nJavaScript, TypeScript, React, Node.js";
      const result = detectCvSections(cv);
      assert.equal(result.details.skills.status, "detected");
      assert.equal(result.details.skills.confidence, "high");
      assert.match(result.skills!, /JavaScript, TypeScript/);
    });

    // Test 4: Tech Stack
    await p1.test("Test 4: 'Tech Stack' heading is detected as skills", () => {
      const cv = "Tech Stack\nPostgreSQL, Redis, Docker, Kubernetes";
      const result = detectCvSections(cv);
      assert.equal(result.details.skills.status, "detected");
      assert.equal(result.details.skills.confidence, "high");
      assert.match(result.skills!, /PostgreSQL, Redis/);
    });

    // Test 5: Academic Qualifications
    await p1.test("Test 5: 'Academic Qualifications' heading is detected as education", () => {
      const cv = "Academic Qualifications\nBSc in Computer Science, University of Moratuwa";
      const result = detectCvSections(cv);
      assert.equal(result.details.education.status, "detected");
      assert.equal(result.details.education.confidence, "high");
      assert.match(result.education!, /BSc in Computer Science/);
    });

    // Test 6: Technical Projects
    await p1.test("Test 6: 'Technical Projects' heading is detected as projects", () => {
      const cv = "Technical Projects\nFolioCraft - AI CV to Portfolio Builder\nReact, Node";
      const result = detectCvSections(cv);
      assert.equal(result.details.projects.status, "detected");
      assert.equal(result.details.projects.confidence, "high");
      assert.match(result.projects!, /FolioCraft/);
    });

    // Test 7: Achievements
    await p1.test("Test 7: 'Achievements' heading is detected as achievements", () => {
      const cv = "Achievements\nWinner of National Hackathon 2024\nDean's List 2023";
      const result = detectCvSections(cv);
      assert.equal(result.details.achievements.status, "detected");
      assert.equal(result.details.achievements.confidence, "high");
      assert.match(result.achievements!, /Winner of National Hackathon 2024/);
    });

    // Test 8: Leadership Experience
    await p1.test("Test 8: 'Leadership Experience' heading is detected as leadership", () => {
      const cv = "Leadership Experience\nPresident, Computer Science Society (2023 - 2024)";
      const result = detectCvSections(cv);
      assert.equal(result.details.leadership.status, "detected");
      assert.equal(result.details.leadership.confidence, "high");
      assert.match(result.leadership!, /President, Computer Science Society/);
    });

    // Test 9: CV with no Experience heading
    await p1.test("Test 9: CV with no Experience heading marks experience as 'needs_review'", () => {
      const cv = "Jane Doe\njane@example.com\n\nEDUCATION\nBSc in IT\n\nSKILLS\nPython, SQL";
      const result = detectCvSections(cv);
      assert.equal(result.details.experience.status, "needs_review");
      assert.equal(result.details.experience.confidence, "low");
      assert.equal(result.experience, undefined);
    });

    // Test 10: Unknown section
    await p1.test("Test 10: Unknown section 'CERTIFICATIONS' is preserved in unknownSections and unknownDetails", () => {
      const cv = "CERTIFICATIONS\nAWS Certified Cloud Practitioner\nHashiCorp Terraform Associate";
      const result = detectCvSections(cv);
      assert.ok(result.unknownSections);
      assert.match(
        result.unknownSections["CERTIFICATIONS"] || "",
        /AWS Certified Cloud Practitioner/
      );
      assert.ok(result.unknownDetails);
      const certDetail = result.unknownDetails.find(
        (u) => u.name.toUpperCase() === "CERTIFICATIONS"
      );
      assert.ok(certDetail);
      assert.equal(certDetail.status, "detected");
      assert.match(certDetail.text, /AWS Certified Cloud Practitioner/);
    });

    // Test 11: Normal sentence containing the word 'experience'
    await p1.test("Test 11: Normal sentence 'I have experience working with React and Node.js.' does NOT create an experience section", () => {
      const cv = "SUMMARY\nI have experience working with React and Node.js.\n\nEDUCATION\nBSc in Computer Science";
      const result = detectCvSections(cv);
      assert.equal(result.details.experience.status, "needs_review");
      assert.equal(result.experience, undefined);
      assert.match(
        result.summary!,
        /I have experience working with React and Node\.js\./
      );
      assert.match(result.education!, /BSc in Computer Science/);
    });

    // Test 12: Multiple sections without blank lines
    await p1.test("Test 12: Multiple sections without blank lines are isolated to their own content", () => {
      const cv = `WORK EXPERIENCE
ABC Company
Software Engineer
2025 - Present
Built applications.
EDUCATION
University of Moratuwa
BSc in IT
SKILLS
React
Node.js`;
      const result = detectCvSections(cv);
      assert.equal(result.details.experience.status, "detected");
      assert.equal(result.details.education.status, "detected");
      assert.equal(result.details.skills.status, "detected");

      assert.equal(
        result.experience,
        "ABC Company\nSoftware Engineer\n2025 - Present\nBuilt applications."
      );
      assert.equal(
        result.education,
        "University of Moratuwa\nBSc in IT"
      );
      assert.equal(
        result.skills,
        "React\nNode.js"
      );
    });
  });
});
