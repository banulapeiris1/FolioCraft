import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAchievements,
  extractEducation,
  extractExperience,
  extractLeadership,
  extractPersonalInfo,
  extractProjects,
  extractSkills,
  extractStructuredCv,
} from "./structuredExtraction.service";
import { classifySkills } from "./skillClassification.service";
import { detectCvSections } from "./sectionDetection.service";
import type { DetectedCvSections } from "../types/cv.types";

test("CV-06: Structured CV Extraction Service Unit Tests", async (t) => {
  // 1. Full realistic CV test
  await t.test("1. Full realistic CV extracts all structured entities accurately", () => {
    const rawCv = `
Banula Peiris
Full Stack Software Engineer
banula@example.com | +94 77 123 4567 | Colombo, Sri Lanka
https://linkedin.com/in/banulapeiris | https://github.com/banulapeiris | https://banula.dev

SUMMARY
Seasoned software engineer with 4+ years of experience designing and developing scalable web applications.
Passionate about TypeScript, cloud architectures, and clean code principles.

EXPERIENCE
Senior Software Engineer - Tech Solutions (2022 - Present)
- Architected and deployed microservices handling 1M daily requests.
- Mentored junior engineers and led code reviews.

Software Engineer | Web Solutions (Jan 2020 - Dec 2021)
- Built interactive frontend applications with React and Tailwind.
- Implemented real-time messaging pipeline.

EDUCATION
BSc (Hons) in Information Technology
University of Moratuwa
2024 - 2028
First Class Honours

SKILLS
Technical Skills:
Frontend:
React, Next.js, TypeScript

Backend:
Node.js, Express, PostgreSQL, Redis

DevOps:
Docker, AWS

PROJECTS
FolioCraft Portfolio Builder
- Engineered dynamic template renderer and CV parsing engine.
- Implemented live preview with zero layout shift.
Technologies: React, Node.js, PostgreSQL, Tailwind CSS

CareFirst Healthcare System
- Healthcare scheduling and appointment system.
Technologies: Next.js, Express, MongoDB
`;

    const sections = detectCvSections(rawCv);
    const structured = extractStructuredCv(sections);

    // Personal
    assert.equal(structured.personal.fullName, "Banula Peiris");
    assert.equal(structured.personal.email, "banula@example.com");
    assert.equal(structured.personal.phone, "+94 77 123 4567");
    assert.equal(structured.personal.location, "Colombo, Sri Lanka");
    assert.equal(structured.personal.linkedin, "https://linkedin.com/in/banulapeiris");
    assert.equal(structured.personal.github, "https://github.com/banulapeiris");
    assert.equal(structured.personal.website, "https://banula.dev");
    assert.match(structured.personal.summary!, /Seasoned software engineer with 4\+ years/);

    // Experience
    assert.equal(structured.experience.length, 2);
    assert.equal(structured.experience[0]?.company, "Tech Solutions");
    assert.equal(structured.experience[0]?.position, "Senior Software Engineer");
    assert.equal(structured.experience[0]?.startDate, "2022");
    assert.equal(structured.experience[0]?.endDate, undefined);
    assert.equal(structured.experience[0]?.isCurrent, true);
    assert.match(structured.experience[0]?.description!, /Architected and deployed microservices/);

    assert.equal(structured.experience[1]?.company, "Web Solutions");
    assert.equal(structured.experience[1]?.position, "Software Engineer");
    assert.equal(structured.experience[1]?.startDate, "Jan 2020");
    assert.equal(structured.experience[1]?.endDate, "Dec 2021");
    assert.equal(structured.experience[1]?.isCurrent, false);

    // Education
    assert.equal(structured.education.length, 1);
    assert.equal(structured.education[0]?.institution, "University of Moratuwa");
    assert.equal(structured.education[0]?.degree, "BSc (Hons)");
    assert.equal(structured.education[0]?.field, "Information Technology");
    assert.equal(structured.education[0]?.startDate, "2024");
    assert.equal(structured.education[0]?.endDate, "2028");
    assert.equal(structured.education[0]?.description, "First Class Honours");

    // Skills
    assert.ok(structured.skills.length >= 7);
    const skillNames = structured.skills.map((s) => s.name);
    assert.ok(skillNames.includes("React"));
    assert.ok(skillNames.includes("Next.js"));
    assert.ok(skillNames.includes("TypeScript"));
    assert.ok(skillNames.includes("Node.js"));
    assert.ok(skillNames.includes("Docker"));

    // Projects
    assert.equal(structured.projects.length, 2);
    assert.equal(structured.projects[0]?.title, "FolioCraft Portfolio Builder");
    assert.deepEqual(structured.projects[0]?.technologies, [
      "React",
      "Node.js",
      "PostgreSQL",
      "Tailwind CSS",
    ]);
    assert.match(structured.projects[0]?.description!, /Engineered dynamic template renderer/);

    assert.equal(structured.projects[1]?.title, "CareFirst Healthcare System");
    assert.deepEqual(structured.projects[1]?.technologies, [
      "Next.js",
      "Express",
      "MongoDB",
    ]);
  });

  // 2. Email extraction
  await t.test("2. Extracts various valid email formats", () => {
    const res1 = extractPersonalInfo("John Doe\njohn.doe@company.org\nPhone: 1234567");
    assert.equal(res1.email, "john.doe@company.org");

    const res2 = extractPersonalInfo("Jane Smith | jane_developer+work@sub.domain.co.uk");
    assert.equal(res2.email, "jane_developer+work@sub.domain.co.uk");
  });

  // 3. Phone extraction
  await t.test("3. Extracts standard phone number formats and guards against isolated years", () => {
    const res1 = extractPersonalInfo("Name\n(555) 123-4567\n2024");
    assert.equal(res1.phone, "(555) 123-4567");

    const res2 = extractPersonalInfo("Name\n+1 555-987-6543");
    assert.equal(res2.phone, "+1 555-987-6543");

    const res3 = extractPersonalInfo("Name\n+94 77 123 4567");
    assert.equal(res3.phone, "+94 77 123 4567");

    // Year-only should NOT be extracted as phone
    const resNoPhone = extractPersonalInfo("Name\nGraduated in 2024");
    assert.equal(resNoPhone.phone, undefined);
  });

  // 4. Website / LinkedIn / GitHub extraction
  await t.test("4. Extracts Website, LinkedIn, and GitHub links reliably", () => {
    const header = `
Alex Morgan
alex@example.com
linkedin.com/in/alexmorgan
github.com/alexmorgan
https://alexmorgan.dev
`;
    const res = extractPersonalInfo(header);
    assert.equal(res.linkedin, "https://linkedin.com/in/alexmorgan");
    assert.equal(res.github, "https://github.com/alexmorgan");
    assert.equal(res.website, "https://alexmorgan.dev");
  });

  // 5. Conservative full-name extraction
  await t.test("5. Extracts full name conservatively and leaves undefined if uncertain", () => {
    const validHeader = "Alexander Hamilton\nSoftware Engineer\nalex@example.com";
    assert.equal(extractPersonalInfo(validHeader).fullName, "Alexander Hamilton");

    // Title / resume string should NOT become full name
    const invalidHeader1 = "CURRICULUM VITAE\nSoftware Engineer\nemail@test.com";
    assert.equal(extractPersonalInfo(invalidHeader1).fullName, undefined);

    // Single word name should be rejected by conservative rule
    const singleWordHeader = "Madonna\nmadonna@example.com";
    assert.equal(extractPersonalInfo(singleWordHeader).fullName, undefined);

    // Line with numbers or symbols should be rejected
    const lineWithNumbers = "John Doe 123\njohn@example.com";
    assert.equal(extractPersonalInfo(lineWithNumbers).fullName, undefined);
  });

  // 6. Summary extraction
  await t.test("6. Summary extracted directly and cleans excessive newlines", () => {
    const summaryText = "  Dedicated engineer with expertise in distributed systems.\n\n\nProven track record.  ";
    const res = extractPersonalInfo(undefined, summaryText);
    assert.equal(
      res.summary,
      "Dedicated engineer with expertise in distributed systems.\n\nProven track record."
    );
  });

  // 7. Multiple experience entries
  await t.test("7. Extracts multiple experience entries separated by blank lines", () => {
    const expText = `
Lead Developer | Alpha Corp (2021 - 2023)
- Managed core platform services

Junior Developer - Beta Inc (2019 - 2021)
- Built automated tests
`;
    const entries = extractExperience(expText);
    assert.equal(entries.length, 2);
    assert.equal(entries[0]?.company, "Alpha Corp");
    assert.equal(entries[0]?.position, "Lead Developer");
    assert.equal(entries[0]?.startDate, "2021");
    assert.equal(entries[0]?.endDate, "2023");
    assert.equal(entries[0]?.isCurrent, false);

    assert.equal(entries[1]?.company, "Beta Inc");
    assert.equal(entries[1]?.position, "Junior Developer");
    assert.equal(entries[1]?.startDate, "2019");
    assert.equal(entries[1]?.endDate, "2021");
    assert.equal(entries[1]?.isCurrent, false);
  });

  // 8. "Present" current experience
  await t.test("8. 'Present' marks isCurrent: true and leaves endDate undefined", () => {
    const expText = `
Software Engineer at Global Cloud (March 2022 - Present)
- Developing cloud microservices
`;
    const entries = extractExperience(expText);
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.isCurrent, true);
    assert.equal(entries[0]?.startDate, "March 2022");
    assert.equal(entries[0]?.endDate, undefined);
    assert.equal(entries[0]?.company, "Global Cloud");
    assert.equal(entries[0]?.position, "Software Engineer");
  });

  // 9. Multiple education entries
  await t.test("9. Extracts multiple education entries with degree, field, and institution", () => {
    const eduText = `
BSc in Computer Science
University of California, Berkeley
2016 - 2020

Master of Science in Artificial Intelligence
Stanford University
2020 - 2022
`;
    const entries = extractEducation(eduText);
    assert.equal(entries.length, 2);

    assert.equal(entries[0]?.institution, "University of California, Berkeley");
    assert.equal(entries[0]?.degree, "BSc");
    assert.equal(entries[0]?.field, "Computer Science");
    assert.equal(entries[0]?.startDate, "2016");
    assert.equal(entries[0]?.endDate, "2020");

    assert.equal(entries[1]?.institution, "Stanford University");
    assert.equal(entries[1]?.degree, "Master of Science");
    assert.equal(entries[1]?.field, "Artificial Intelligence");
    assert.equal(entries[1]?.startDate, "2020");
    assert.equal(entries[1]?.endDate, "2022");
  });

  // 10. Comma-separated skills
  await t.test("10. Parses comma-separated skills and strips category prefixes", () => {
    const skillsText = "Languages: JavaScript, TypeScript, Python, Go, Rust";
    const skills = extractSkills(skillsText);
    assert.deepEqual(
      skills.map((s) => s.name),
      ["JavaScript", "TypeScript", "Python", "Go", "Rust"]
    );
  });

  // 11. Bullet / list skills
  await t.test("11. Parses bullet and list skills cleanly", () => {
    const skillsText = `
• Docker
* Kubernetes
- Terraform
• PostgreSQL
`;
    const skills = extractSkills(skillsText);
    assert.deepEqual(
      skills.map((s) => s.name),
      ["Docker", "Kubernetes", "Terraform", "PostgreSQL"]
    );
  });

  // 12. Project extraction
  await t.test("12. Parses project title, description, and technologies correctly", () => {
    const projText = `
FolioCraft
Open source web portfolio builder.
Allows developers to generate personal sites.
Technologies: TypeScript, React, PostgreSQL

E-Commerce API
High performance payment processing engine.
Tech Stack: Go, gRPC, Redis
`;
    const projects = extractProjects(projText);
    assert.equal(projects.length, 2);

    assert.equal(projects[0]?.title, "FolioCraft");
    assert.match(projects[0]?.description!, /Open source web portfolio builder/);
    assert.deepEqual(projects[0]?.technologies, [
      "TypeScript",
      "React",
      "PostgreSQL",
    ]);

    assert.equal(projects[1]?.title, "E-Commerce API");
    assert.match(projects[1]?.description!, /High performance payment processing engine/);
    assert.deepEqual(projects[1]?.technologies, ["Go", "gRPC", "Redis"]);
  });

  // 13. Missing fields
  await t.test("13. Safely handles missing sections without hallucinating values", () => {
    const emptySections: DetectedCvSections = detectCvSections("");

    const structured = extractStructuredCv(emptySections);
    assert.deepEqual(structured.personal, {});
    assert.deepEqual(structured.experience, []);
    assert.deepEqual(structured.education, []);
    assert.deepEqual(structured.skills, []);
    assert.deepEqual(structured.projects, []);
  });

  // 14. Malformed / unusual text
  await t.test("14. Handles malformed or unusual text gracefully without throwing", () => {
    const malformedExp = `
Random unstructured notes without dates or company separators.
Some more text.
`;
    const exp = extractExperience(malformedExp);
    assert.ok(Array.isArray(exp));

    const malformedSkills = "::: ;;; ??? \n\n ---";
    const skills = extractSkills(malformedSkills);
    assert.deepEqual(skills, []);
  });

  // 15. No hallucinated fields
  await t.test("15. Does not invent or hallucinate fields when text lacks them", () => {
    const cvText = `
EXPERIENCE
Software Engineer
`;
    const sections = detectCvSections(cvText);
    const structured = extractStructuredCv(sections);

    assert.equal(structured.experience[0]?.company, "");
    assert.equal(structured.experience[0]?.startDate, undefined);
    assert.equal(structured.experience[0]?.endDate, undefined);
    assert.equal(structured.experience[0]?.isCurrent, false);
    assert.equal(structured.personal.fullName, undefined);
    assert.equal(structured.personal.email, undefined);
  });

  // 16. Different section orders
  await t.test("16. Produces identical structured output regardless of section appearance order", () => {
    const order1 = `
John Doe
john@example.com

SKILLS
TypeScript, React

EDUCATION
University of Moratuwa
2020 - 2024
`;

    const order2 = `
John Doe
john@example.com

EDUCATION
University of Moratuwa
2020 - 2024

SKILLS
TypeScript, React
`;

    const res1 = extractStructuredCv(detectCvSections(order1));
    const res2 = extractStructuredCv(detectCvSections(order2));

    assert.equal(res1.personal.fullName, res2.personal.fullName);
    assert.equal(res1.personal.email, res2.personal.email);
    assert.deepEqual(res1.skills, res2.skills);
    assert.deepEqual(res1.education, res2.education);
  });

  // 17. Dates inside descriptions must not become employment dates
  await t.test("17. Years mentioned inside description bullet points are NOT used as employment dates", () => {
    const expText = `
Staff Engineer - CloudCorp (2020 - Present)
- In 2021, launched multi-region clusters.
- In 2022 - 2023, reduced latency by 50%.
`;

    const entries = extractExperience(expText);
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.startDate, "2020");
    assert.equal(entries[0]?.endDate, undefined);
    assert.equal(entries[0]?.isCurrent, true);
    assert.match(entries[0]?.description!, /In 2021, launched multi-region clusters/);
    assert.match(entries[0]?.description!, /In 2022 - 2023, reduced latency by 50%/);
  });

  // ========================================================================
  // PHASE 2 EXPLICIT TEST SUITE (Tests 1 through 26)
  // ========================================================================
  await t.test("Phase 2: Structured Entity Extraction & Section Segmentation", async (p2) => {
    // --- EXPERIENCE (1 to 7) ---

    // 1. Two separate jobs with dates
    await p2.test("1. Two separate jobs with dates", () => {
      const text = `ABC Technologies
Software Engineer
2022 - 2024
- Built scalable web services.

XYZ Solutions
Senior Engineer
2024 - Present
- Led distributed systems team.`;

      const entries = extractExperience(text);
      assert.equal(entries.length, 2);
      assert.equal(entries[0]?.company, "ABC Technologies");
      assert.equal(entries[0]?.position, "Software Engineer");
      assert.equal(entries[0]?.startDate, "2022");
      assert.equal(entries[0]?.endDate, "2024");
      assert.equal(entries[0]?.isCurrent, false);

      assert.equal(entries[1]?.company, "XYZ Solutions");
      assert.equal(entries[1]?.position, "Senior Engineer");
      assert.equal(entries[1]?.startDate, "2024");
      assert.equal(entries[1]?.endDate, undefined);
      assert.equal(entries[1]?.isCurrent, true);
    });

    // 2. Two jobs without blank lines
    await p2.test("2. Two jobs without blank lines", () => {
      const text = `ABC Technologies
Software Engineer Intern
June 2025 - August 2025
- Developed REST APIs
- Worked with React and Node.js
XYZ Solutions
Junior Developer
September 2025 - Present
- Built web applications
- Maintained PostgreSQL databases`;

      const entries = extractExperience(text);
      assert.equal(entries.length, 2);
      assert.equal(entries[0]?.company, "ABC Technologies");
      assert.equal(entries[0]?.position, "Software Engineer Intern");
      assert.equal(entries[0]?.startDate, "June 2025");
      assert.equal(entries[0]?.endDate, "August 2025");
      assert.equal(entries[0]?.isCurrent, false);

      assert.equal(entries[1]?.company, "XYZ Solutions");
      assert.equal(entries[1]?.position, "Junior Developer");
      assert.equal(entries[1]?.startDate, "September 2025");
      assert.equal(entries[1]?.endDate, undefined);
      assert.equal(entries[1]?.isCurrent, true);
    });

    // 3. Present/current role
    await p2.test("3. Present/current role sets isCurrent: true and endDate: undefined", () => {
      const text = `Tech Innovations
Frontend Lead
January 2024 - Ongoing
- Managing design system.`;

      const entries = extractExperience(text);
      assert.equal(entries.length, 1);
      assert.equal(entries[0]?.isCurrent, true);
      assert.equal(entries[0]?.endDate, undefined);
      assert.equal(entries[0]?.startDate, "January 2024");
    });

    // 4. Multiple roles at the same company
    await p2.test("4. Multiple roles at the same company inherit company name", () => {
      const text = `ABC Company

Software Engineer
2025 - Present
- Built web applications.

Software Engineer Intern
2024 - 2025
- Contributed to code base.`;

      const entries = extractExperience(text);
      assert.equal(entries.length, 2);
      assert.equal(entries[0]?.company, "ABC Company");
      assert.equal(entries[0]?.position, "Software Engineer");
      assert.equal(entries[0]?.isCurrent, true);

      assert.equal(entries[1]?.company, "ABC Company");
      assert.equal(entries[1]?.position, "Software Engineer Intern");
      assert.equal(entries[1]?.startDate, "2024");
      assert.equal(entries[1]?.endDate, "2025");
      assert.equal(entries[1]?.isCurrent, false);
    });

    // 5. Different date formats
    await p2.test("5. Supports diverse date formats (en-dash, MM/YYYY, YYYY/MM, words)", () => {
      const formats = [
        "2024 - 2025",
        "2024 – 2025",
        "Jan 2024 - Dec 2025",
        "January 2024 – Present",
        "06/2024 - 08/2025",
        "2024/06 - 2025/08",
      ];

      for (const fmt of formats) {
        const text = `Acme Labs\nDeveloper\n${fmt}\n- Developed tools.`;
        const entries = extractExperience(text);
        assert.equal(entries.length, 1, `Failed to parse format: ${fmt}`);
        assert.ok(entries[0]?.startDate, `Missing startDate for format: ${fmt}`);
      }
    });

    // 6. Description bullets do not consume next role
    await p2.test("6. Description bullets do not consume next role or company", () => {
      const text = `Company Alpha
Backend Engineer
2023 - 2024
- Implemented microservices
- Configured CI/CD pipeline
Company Beta
Frontend Engineer
2024 - Present
- Designed UI components`;

      const entries = extractExperience(text);
      assert.equal(entries.length, 2);
      assert.doesNotMatch(entries[0]?.description || "", /Company Beta/);
      assert.doesNotMatch(entries[0]?.description || "", /Frontend Engineer/);
      assert.match(entries[0]?.description || "", /Implemented microservices/);
    });

    // 7. Next section is not included in experience
    await p2.test("7. Next section is not included in experience", () => {
      const rawCv = `EXPERIENCE
Staff Engineer
TechCorp
2023 - 2024
- Core platform architecture.

EDUCATION
BSc in Computer Science
University of Moratuwa`;

      const structured = extractStructuredCv(detectCvSections(rawCv));
      assert.equal(structured.experience.length, 1);
      assert.doesNotMatch(structured.experience[0]?.description || "", /EDUCATION/);
      assert.doesNotMatch(structured.experience[0]?.description || "", /University of Moratuwa/);
      assert.equal(structured.education.length, 1);
    });

    // --- PROJECTS (8 to 12) ---

    // 8. Two projects without blank lines
    await p2.test("8. Two projects without blank lines are segmented into two projects", () => {
      const text = `Project Alpha
Description of alpha.
Technologies: React
Project Beta
Description of beta.
Technologies: Node.js`;

      const projects = extractProjects(text);
      assert.equal(projects.length, 2);
      assert.equal(projects[0]?.title, "Project Alpha");
      assert.equal(projects[1]?.title, "Project Beta");
    });

    // 9. Three projects with technology lines
    await p2.test("9. Three projects with technology lines parsed correctly", () => {
      const text = `Shipment Alerting System
A shipment monitoring platform...
Technologies: Next.js, React, Node.js

CareFirst
A home-based care management system...
Technologies: React, Node.js, MongoDB

Performance Tracking System
A tracking system...
Technologies: Node.js, PostgreSQL`;

      const projects = extractProjects(text);
      assert.equal(projects.length, 3);
      assert.equal(projects[0]?.title, "Shipment Alerting System");
      assert.deepEqual(projects[0]?.technologies, ["Next.js", "React", "Node.js"]);

      assert.equal(projects[1]?.title, "CareFirst");
      assert.deepEqual(projects[1]?.technologies, ["React", "Node.js", "MongoDB"]);

      assert.equal(projects[2]?.title, "Performance Tracking System");
      assert.deepEqual(projects[2]?.technologies, ["Node.js", "PostgreSQL"]);
    });

    // 10. Projects containing GitHub URLs
    await p2.test("10. Projects containing GitHub URLs extract githubUrl field", () => {
      const text = `FolioCraft Portfolio Builder
A web application to turn CVs into portfolios.
GitHub: https://github.com/user/foliocraft
Technologies: React, Node.js, TypeScript`;

      const projects = extractProjects(text);
      assert.equal(projects.length, 1);
      assert.equal(projects[0]?.githubUrl, "https://github.com/user/foliocraft");
      assert.doesNotMatch(projects[0]?.description || "", /https:\/\/github\.com/);
    });

    // 11. Project descriptions containing blank lines
    await p2.test("11. Project descriptions containing blank lines are kept in single project", () => {
      const text = `Inventory System
First paragraph describing inventory architecture.

Second paragraph detailing real-time updates and synchronization.
Technologies: React, Redis`;

      const projects = extractProjects(text);
      assert.equal(projects.length, 1);
      assert.equal(projects[0]?.title, "Inventory System");
      assert.match(projects[0]?.description!, /First paragraph/);
      assert.match(projects[0]?.description!, /Second paragraph/);
    });

    // 12. Next section is not included in project description
    await p2.test("12. Next section is not included in project description", () => {
      const rawCv = `PROJECTS
CareFirst
Healthcare management platform.
Technologies: React

SKILLS
TypeScript, React`;

      const structured = extractStructuredCv(detectCvSections(rawCv));
      assert.equal(structured.projects.length, 1);
      assert.doesNotMatch(structured.projects[0]?.description || "", /SKILLS/);
      assert.doesNotMatch(structured.projects[0]?.description || "", /TypeScript/);
    });

    // --- SKILLS (13 to 21) ---

    // 13. Categorize programming languages
    await p2.test("13. Categorize programming languages", () => {
      const { categorizedSkills } = classifySkills([
        { name: "Python" },
        { name: "TypeScript" },
        { name: "Java" },
        { name: "Go" },
      ]);
      const names = categorizedSkills.languages.map((s) => s.name);
      assert.ok(names.includes("Python"));
      assert.ok(names.includes("TypeScript"));
      assert.ok(names.includes("Java"));
      assert.ok(names.includes("Go"));
    });

    // 14. Categorize frontend technologies
    await p2.test("14. Categorize frontend technologies", () => {
      const { categorizedSkills } = classifySkills([
        { name: "react" },
        { name: "Next.js" },
        { name: "tailwind css" },
      ]);
      const names = categorizedSkills.frontend.map((s) => s.name);
      assert.ok(names.includes("React"));
      assert.ok(names.includes("Next.js"));
      assert.ok(names.includes("Tailwind CSS"));
    });

    // 15. Categorize backend technologies
    await p2.test("15. Categorize backend technologies", () => {
      const { categorizedSkills } = classifySkills([
        { name: "node.js" },
        { name: "Express" },
        { name: "Spring Boot" },
      ]);
      const names = categorizedSkills.backend.map((s) => s.name);
      assert.ok(names.includes("Node.js"));
      assert.ok(names.includes("Express"));
      assert.ok(names.includes("Spring Boot"));
    });

    // 16. Categorize databases
    await p2.test("16. Categorize databases", () => {
      const { categorizedSkills } = classifySkills([
        { name: "PostgreSQL" },
        { name: "MongoDB" },
        { name: "Redis" },
      ]);
      const names = categorizedSkills.databases.map((s) => s.name);
      assert.ok(names.includes("PostgreSQL"));
      assert.ok(names.includes("MongoDB"));
      assert.ok(names.includes("Redis"));
    });

    // 17. Categorize tools
    await p2.test("17. Categorize tools", () => {
      const { categorizedSkills } = classifySkills([
        { name: "Git" },
        { name: "Docker" },
        { name: "Kubernetes" },
        { name: "AWS" },
      ]);
      const names = categorizedSkills.tools.map((s) => s.name);
      assert.ok(names.includes("Git"));
      assert.ok(names.includes("Docker"));
      assert.ok(names.includes("Kubernetes"));
      assert.ok(names.includes("AWS"));
    });

    // 18. Categorize soft skills
    await p2.test("18. Categorize soft skills", () => {
      const { categorizedSkills } = classifySkills([
        { name: "Communication" },
        { name: "Leadership" },
        { name: "Time Management" },
      ]);
      const names = categorizedSkills.softSkills.map((s) => s.name);
      assert.ok(names.includes("Communication"));
      assert.ok(names.includes("Leadership"));
      assert.ok(names.includes("Time Management"));
    });

    // 19. Unknown skills go to other
    await p2.test("19. Unknown skills go to other category", () => {
      const { categorizedSkills } = classifySkills([
        { name: "EasyEDA" },
        { name: "CustomProprietaryTool" },
      ]);
      const names = categorizedSkills.other.map((s) => s.name);
      assert.ok(names.includes("EasyEDA"));
      assert.ok(names.includes("CustomProprietaryTool"));
    });

    // 20. Duplicate skills are removed
    await p2.test("20. Duplicate skills are removed case-insensitively", () => {
      const { flatSkills } = classifySkills([
        { name: "React" },
        { name: "react" },
        { name: "REACT" },
      ]);
      assert.equal(flatSkills.length, 1);
      assert.equal(flatSkills[0]?.name, "React");
    });

    // 21. Achievements are not classified as skills
    await p2.test("21. Achievements and headers are rejected from skills", () => {
      const { flatSkills } = classifySkills([
        { name: "HackX 9.0 Semifinalist" },
        { name: "Winner of National Hackathon" },
        { name: "Leadership Experience" },
      ]);
      assert.equal(flatSkills.length, 0);
    });

    // --- ACHIEVEMENTS (22) ---

    // 22. Hackathon achievement extraction
    await p2.test("22. Hackathon achievement extraction", () => {
      const text = `HackX 9.0
Semifinalist
2024`;

      const achievements = extractAchievements(text);
      assert.equal(achievements.length, 1);
      assert.equal(achievements[0]?.title, "HackX 9.0");
      assert.equal(achievements[0]?.description, "Semifinalist");
      assert.equal(achievements[0]?.date, "2024");
      assert.equal(achievements[0]?.confidence, "high");
    });

    // --- LEADERSHIP (23) ---

    // 23. Leadership entry extraction
    await p2.test("23. Leadership entry extraction", () => {
      const text = `President
Computer Science Society
2023 - 2024
- Organized annual tech symposium.`;

      const leadership = extractLeadership(text);
      assert.equal(leadership.length, 1);
      assert.equal(leadership[0]?.role, "President");
      assert.equal(leadership[0]?.organization, "Computer Science Society");
      assert.equal(leadership[0]?.startDate, "2023");
      assert.equal(leadership[0]?.endDate, "2024");
      assert.match(leadership[0]?.description!, /Organized annual tech symposium/);
      assert.equal(leadership[0]?.confidence, "high");
    });

    // --- CONFIDENCE (24 to 26) ---

    // 24. Complete experience gets high confidence
    await p2.test("24. Complete experience gets high confidence", () => {
      const text = `Acme Corp\nSoftware Engineer\n2022 - 2024\n- Work.`;
      const entries = extractExperience(text);
      assert.equal(entries[0]?.confidence, "high");
    });

    // 25. Incomplete experience gets lower confidence
    await p2.test("25. Incomplete experience without dates gets medium confidence", () => {
      const text = `Acme Corp\nSoftware Engineer\nNo dates specified here.`;
      const entries = extractExperience(text);
      assert.equal(entries[0]?.confidence, "medium");
    });

    // 26. Known skill gets high confidence
    await p2.test("26. Known skill gets high confidence", () => {
      const { flatSkills } = classifySkills([{ name: "Python" }]);
      assert.equal(flatSkills[0]?.confidence, "high");
    });
  });
});
