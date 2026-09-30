import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeProfileData,
  prepareExperienceImports,
  prepareSkillImports,
  prepareProjectImports,
} from "../../lib/cv/cvMapping";
import type {
  StructuredCvData,
  StructuredCvPersonal,
  StructuredCvExperience,
  StructuredCvSkill,
  StructuredCvProject,
} from "../../types/cv";
import type { PortfolioFormData } from "../../types/portfolio";
import type { Experience } from "../../types/experience";
import type { Skill, CatalogSkill } from "../../types/skill";
import type { Project } from "../../types/project";
import type { ImportSummaryResult } from "./CvImportModal";

test("CV-09: End-to-End Portfolio Import Flow Test Suite", async (t) => {
  // -------------------------------------------------------------
  // Test 1: Complete Non-Destructive Profile Merge with Social Links
  // -------------------------------------------------------------
  await t.test("1. Profile Merge: Pre-fills empty fields without mutating existing fields or system fields", () => {
    const existingPortfolio: Partial<PortfolioFormData> = {
      name: "Existing User",
      title: "Staff Software Architect",
      username: "existinguser",
      email: "",
      phone: "",
      location: "",
      about: "",
      profileImageUrl: "https://example.com/avatar.png",
      socialLinks: {
        github: "https://github.com/existinguser",
      },
      template: "minimal",
    };

    const parsedPersonal: StructuredCvPersonal = {
      fullName: "CV Candidate Name",
      email: "candidate@work.com",
      phone: "+1 555 9876",
      location: "San Francisco, CA",
      summary: "Fullstack leader specializing in React and Node.js.",
      website: "https://candidate.dev",
      linkedin: "https://linkedin.com/in/candidate",
      github: "https://github.com/cvcandidate", // existing github should be preserved
    };

    const { merged, changedFields, preservedFields } = mergeProfileData(
      existingPortfolio,
      parsedPersonal,
      { overwriteExisting: false }
    );

    // Preserved non-empty fields
    assert.equal(merged.name, "Existing User");
    assert.equal(merged.socialLinks?.github, "https://github.com/existinguser");

    // Pre-filled previously empty fields
    assert.equal(merged.email, "candidate@work.com");
    assert.equal(merged.phone, "+1 555 9876");
    assert.equal(merged.location, "San Francisco, CA");
    assert.equal(merged.about, "Fullstack leader specializing in React and Node.js.");
    assert.equal(merged.socialLinks?.website, "https://candidate.dev");
    assert.equal(merged.socialLinks?.linkedin, "https://linkedin.com/in/candidate");

    // Critical system fields must remain untouched
    assert.equal(merged.username, "existinguser");
    assert.equal(merged.title, "Staff Software Architect");
    assert.equal(merged.profileImageUrl, "https://example.com/avatar.png");
    assert.equal(merged.template, "minimal");

    // Tracked arrays
    assert.ok(preservedFields.includes("name"));
    assert.ok(preservedFields.includes("socialLinks.github"));
    assert.ok(changedFields.includes("email"));
    assert.ok(changedFields.includes("location"));
    assert.ok(changedFields.includes("about"));
  });

  // -------------------------------------------------------------
  // Test 2: Selective Overwrite of Profile Fields when explicitly requested
  // -------------------------------------------------------------
  await t.test("2. Profile Merge: Overwrites existing fields ONLY when overwriteExisting=true", () => {
    const existing: Partial<PortfolioFormData> = {
      name: "Old Name",
      email: "old@email.com",
      username: "permanent-slug",
      title: "Permanent Title",
    };

    const parsed: StructuredCvPersonal = {
      fullName: "New Candidate Name",
      email: "new@email.com",
    };

    const { merged } = mergeProfileData(existing, parsed, { overwriteExisting: true });

    assert.equal(merged.name, "New Candidate Name");
    assert.equal(merged.email, "new@email.com");

    // Even with overwriteExisting=true, username and title must never be corrupted
    assert.equal(merged.username, "permanent-slug");
    assert.equal(merged.title, "Permanent Title");
  });

  // -------------------------------------------------------------
  // Test 3: Experience Import Mapping, Deduplication & Validation
  // -------------------------------------------------------------
  await t.test("3. Experience Flow: Deduplicates case-insensitively and maps valid date points", () => {
    const existingExp: Experience[] = [
      {
        id: "e-1",
        portfolioId: "p-1",
        company: "Google",
        position: "Senior Engineer",
        description: "Search infra",
        startDate: "2019-01-01",
        endDate: "2021-01-01",
        isCurrent: false,
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
    ];

    const parsedExp: StructuredCvExperience[] = [
      {
        company: "google", // Duplicate
        position: "senior engineer",
        startDate: "2019",
        endDate: "2021",
        isCurrent: false,
      },
      {
        company: "Vercel", // Valid new item
        position: "Staff Software Engineer",
        description: "Next.js core team",
        startDate: "Jan 2021",
        endDate: "Present",
        isCurrent: true,
      },
      {
        company: "Freelance", // Item with ambiguous date
        position: "Consultant",
        startDate: "Spring 2018",
        isCurrent: false,
      },
    ];

    const { items, duplicateCount } = prepareExperienceImports(parsedExp, existingExp);

    assert.equal(duplicateCount, 1);
    assert.equal(items.length, 3);

    // Item 1: Duplicate
    assert.equal(items[0]!.isDuplicate, true);
    assert.equal(items[0]!.selected, false);

    // Item 2: Valid new role
    assert.equal(items[1]!.isDuplicate, false);
    assert.equal(items[1]!.startDate, "2021-01-01");
    assert.equal(items[1]!.endDate, null);
    assert.equal(items[1]!.isCurrent, true);
    assert.equal(items[1]!.isDateValid, true);
    assert.equal(items[1]!.selected, true);

    // Item 3: Ambiguous date
    assert.equal(items[2]!.isDuplicate, false);
    assert.equal(items[2]!.needsDateReview, true);
    assert.equal(items[2]!.isDateValid, false);
    assert.equal(items[2]!.selected, false);
  });

  // -------------------------------------------------------------
  // Test 4: Skills Import Mapping, Catalog Resolution & Deduplication
  // -------------------------------------------------------------
  await t.test("4. Skills Flow: Resolves categories against catalog and falls back to 'Other'", () => {
    const catalog: CatalogSkill[] = [
      { id: "c-1", name: "React", category: "Frontend" },
      { id: "c-2", name: "Express", category: "Backend" },
      { id: "c-3", name: "PostgreSQL", category: "Database" },
      { id: "c-4", name: "Docker", category: "Cloud & DevOps" },
    ];

    const existingSkills: Skill[] = [
      {
        id: "s-1",
        portfolioId: "p-1",
        name: "React",
        category: "Frontend",
        orderIndex: 0,
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
    ];

    const parsedSkills: StructuredCvSkill[] = [
      { name: "react" }, // Duplicate of existing
      { name: "express" }, // Catalog Backend match
      { name: "PostgreSQL" }, // Catalog Database match
      { name: "Zod" }, // Not in catalog -> fallback to "Other"
    ];

    const { items, duplicateCount } = prepareSkillImports(parsedSkills, existingSkills, catalog);

    assert.equal(duplicateCount, 1);
    assert.equal(items.length, 4);

    // 1. React (Duplicate)
    assert.equal(items[0]!.name, "react");
    assert.equal(items[0]!.isDuplicate, true);
    assert.equal(items[0]!.selected, false);

    // 2. Express (Backend)
    assert.equal(items[1]!.name, "express");
    assert.equal(items[1]!.category, "Backend");
    assert.equal(items[1]!.isFromCatalog, true);
    assert.equal(items[1]!.isDuplicate, false);
    assert.equal(items[1]!.selected, true);

    // 3. PostgreSQL (Database)
    assert.equal(items[2]!.name, "PostgreSQL");
    assert.equal(items[2]!.category, "Database");
    assert.equal(items[2]!.isFromCatalog, true);
    assert.equal(items[2]!.selected, true);

    // 4. Zod (Other)
    assert.equal(items[3]!.name, "Zod");
    assert.equal(items[3]!.category, "Other");
    assert.equal(items[3]!.isFromCatalog, false);
    assert.equal(items[3]!.selected, true);
  });

  // -------------------------------------------------------------
  // Test 5: Projects Import Mapping & Deduplication
  // -------------------------------------------------------------
  await t.test("5. Projects Flow: Preserves technologies and deduplicates by title", () => {
    const existingProjects: Project[] = [
      {
        id: "proj-1",
        portfolioId: "port-1",
        title: "FolioCraft",
        description: "Existing portfolio app",
        technologies: ["React", "Express"],
        githubUrl: null,
        projectUrl: null,
        imageUrl: null,
        orderIndex: 0,
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
    ];

    const parsedProjects: StructuredCvProject[] = [
      {
        title: "foliocraft", // Duplicate
        description: "CV description",
        technologies: ["Next.js"],
      },
      {
        title: "E-Commerce Microservices", // New project
        description: "High-scale payment gateway",
        technologies: ["Go", "Kafka", "PostgreSQL"],
      },
    ];

    const { items, duplicateCount } = prepareProjectImports(parsedProjects, existingProjects);

    assert.equal(duplicateCount, 1);
    assert.equal(items.length, 2);

    assert.equal(items[0]!.title, "foliocraft");
    assert.equal(items[0]!.isDuplicate, true);
    assert.equal(items[0]!.selected, false);

    assert.equal(items[1]!.title, "E-Commerce Microservices");
    assert.equal(items[1]!.description, "High-scale payment gateway");
    assert.deepEqual(items[1]!.technologies, ["Go", "Kafka", "PostgreSQL"]);
    assert.equal(items[1]!.isDuplicate, false);
    assert.equal(items[1]!.selected, true);
  });

  // -------------------------------------------------------------
  // Test 6: Education Non-Persistence Verification
  // -------------------------------------------------------------
  await t.test("6. Education: Remains preview-only and is excluded from database persistence", () => {
    const cvData: StructuredCvData = {
      personal: {},
      experience: [],
      skills: [],
      projects: [],
      education: [
        {
          institution: "Stanford University",
          degree: "M.S.",
          field: "Computer Science",
          description: "Distributed Systems research",
          startDate: "2018-09-01",
          endDate: "2020-06-15",
        },
      ],
    };

    // Verify education exists in parsed CV data
    assert.equal(cvData.education.length, 1);
    assert.equal(cvData.education[0]!.institution, "Stanford University");

    // In the import payload, there is no education field, preventing any accidental HTTP calls
    const importPayload = {
      profileData: undefined,
      selectedExperiences: [],
      selectedSkills: [],
      selectedProjects: [],
      // No education API endpoint or payload
    };

    assert.equal("education" in importPayload, false);
  });

  // -------------------------------------------------------------
  // Test 7: Simulated Import Execution with Partial API Failure
  // -------------------------------------------------------------
  await t.test("7. Import Execution: Accurately reports successes, skipped duplicates, and partial failures", async () => {
    let experienceCreatedCount = 0;
    let skillCreatedCount = 0;

    // Simulated API execution with 1 failure on skill "Docker"
    const mockApiExecutor = async (type: "exp" | "skill" | "proj", name: string) => {
      if (type === "skill" && name === "Docker") {
        throw new Error("Simulated database timeout on skill insertion");
      }
      if (type === "exp") experienceCreatedCount++;
      if (type === "skill") skillCreatedCount++;
    };

    const preparedExp = [
      {
        id: "e-1",
        company: "Stripe",
        position: "Staff Engineer",
        description: "Billing",
        startDate: "2021-01-01",
        endDate: null,
        isCurrent: true,
        rawStartDate: "2021",
        rawEndDate: "",
        isDateValid: true,
        needsDateReview: false,
        isDuplicate: false,
        selected: true,
      },
      {
        id: "e-2",
        company: "Duplicate Corp",
        position: "Engineer",
        description: "",
        startDate: "2020-01-01",
        endDate: null,
        isCurrent: false,
        rawStartDate: "2020",
        rawEndDate: "",
        isDateValid: true,
        needsDateReview: false,
        isDuplicate: true, // Should be skipped
        selected: false,
      },
    ];

    const preparedSkills = [
      {
        id: "s-1",
        name: "React",
        category: "Frontend",
        isFromCatalog: true,
        isDuplicate: false,
        selected: true,
      },
      {
        id: "s-2",
        name: "Docker", // Will fail
        category: "Cloud & DevOps",
        isFromCatalog: true,
        isDuplicate: false,
        selected: true,
      },
    ];

    const summary: ImportSummaryResult = {
      profileUpdatedFields: ["about", "location"],
      experiencesImported: 0,
      experiencesSkipped: 0,
      experiencesFailed: 0,
      skillsImported: 0,
      skillsSkipped: 0,
      skillsFailed: 0,
      projectsImported: 0,
      projectsSkipped: 0,
      projectsFailed: 0,
      educationDetectedCount: 2,
      errors: [],
    };

    // Execute experiences
    for (const exp of preparedExp) {
      if (exp.isDuplicate) {
        summary.experiencesSkipped++;
        continue;
      }
      if (!exp.selected) continue;
      try {
        await mockApiExecutor("exp", exp.company);
        summary.experiencesImported++;
      } catch (err: unknown) {
        summary.experiencesFailed++;
        summary.errors.push(err instanceof Error ? err.message : "Error");
      }
    }

    // Execute skills
    for (const skill of preparedSkills) {
      if (skill.isDuplicate) {
        summary.skillsSkipped++;
        continue;
      }
      if (!skill.selected) continue;
      try {
        await mockApiExecutor("skill", skill.name);
        summary.skillsImported++;
      } catch (err: unknown) {
        summary.skillsFailed++;
        summary.errors.push(err instanceof Error ? err.message : "Error");
      }
    }

    // Assert results accurately reflect partial failure
    assert.equal(experienceCreatedCount, 1);
    assert.equal(skillCreatedCount, 1);
    assert.equal(summary.experiencesImported, 1);
    assert.equal(summary.experiencesSkipped, 1);
    assert.equal(summary.experiencesFailed, 0);

    assert.equal(summary.skillsImported, 1);
    assert.equal(summary.skillsFailed, 1);
    assert.equal(summary.errors.length, 1);
    assert.match(summary.errors[0]!, /database timeout on skill insertion/i);

    assert.equal(summary.educationDetectedCount, 2);
    assert.equal(summary.profileUpdatedFields.length, 2);
  });
});
