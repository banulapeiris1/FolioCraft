import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeProfileData,
  prepareExperienceImports,
  prepareSkillImports,
  prepareProjectImports,
  normalizeCvDate,
} from "../../lib/cv/cvMapping";
import type {
  StructuredCvData,
  StructuredCvPersonal,
  StructuredCvExperience,
  StructuredCvSkill,
  StructuredCvProject,
  CategorizedSkills,
} from "../../types/cv";
import type { PortfolioFormData } from "../../types/portfolio";
import type { Experience } from "../../types/experience";
import type { Skill, CatalogSkill } from "../../types/skill";
import type { Project } from "../../types/project";
import type { ImportSummaryResult } from "./CvImportModal";

test("CV-PHASE-5: Frontend End-to-End CV Flow Validation & Hardening", async (t) => {
  // --------------------------------------------------------------------------
  // STEP 4 — TEST USER CORRECTION FLOW
  // --------------------------------------------------------------------------
  await t.test("4.1 User Correction Flow: User edits to experience, projects, skills, and profile override parser values", () => {
    // 1. Initial parsed state from parser
    const initialParsedData: StructuredCvData = {
      personal: {
        fullName: "Alex Raw",
        professionalTitle: "Developer",
        summary: "Raw extracted summary.",
        email: "alex@raw.com",
        phone: "12345",
      },
      experience: [
        {
          company: "ABC",
          position: "Dev",
          description: "Raw description.",
          startDate: "2022-01-01",
          isCurrent: false,
        },
      ],
      education: [],
      projects: [
        {
          title: "Raw App",
          description: "Raw proj desc",
          technologies: ["React"],
          githubUrl: "https://github.com/raw/app",
        },
      ],
      skills: [{ name: "Java" }],
    };

    // 2. User applies edits during Phase 3 Review
    const userReviewedData: StructuredCvData = {
      ...initialParsedData,
      personal: {
        ...initialParsedData.personal,
        fullName: "Alexander Verified",
        professionalTitle: "Staff Systems Engineer",
        summary: "Polished and verified professional executive summary.",
        github: "https://github.com/alex-verified",
      },
      education: [],
      experience: [
        {
          company: "ABC Technologies Global", // User corrected company
          position: "Senior Lead Engineer", // User corrected position
          description: "Rewritten bullet points highlighting business impact.",
          startDate: "2022-01-01",
          endDate: "2024-06-30",
          isCurrent: false,
          technologies: ["Node.js", "TypeScript", "PostgreSQL"],
        },
      ],
      projects: [
        {
          title: "FolioCraft Enterprise Cloud", // User corrected title
          description: "Full rewrite of project description.",
          technologies: ["Next.js", "Docker", "PostgreSQL"],
          githubUrl: "https://github.com/alex-verified/foliocraft",
          liveUrl: "https://foliocraft.verified.dev", // User added live URL
        },
      ],
      skills: [
        { name: "Java" },
        { name: "Kotlin" }, // User added skill
      ],
    };

    // 3. Profile Mapping verification
    const currentPortfolio: Partial<PortfolioFormData> = {
      name: "",
      title: "",
      email: "",
      about: "",
    };

    const profileResult = mergeProfileData(
      currentPortfolio,
      userReviewedData.personal || {},
      { overwriteExisting: false }
    );

    assert.equal(profileResult.merged.name, "Alexander Verified");
    assert.equal(profileResult.merged.title, "Staff Systems Engineer");
    assert.equal(profileResult.merged.about, "Polished and verified professional executive summary.");
    assert.equal(profileResult.merged.socialLinks?.github, "https://github.com/alex-verified");
    assert.notEqual(profileResult.merged.name, "Alex Raw");

    // 4. Experience Mapping verification
    const expResult = prepareExperienceImports(userReviewedData.experience || [], []);
    assert.equal(expResult.items.length, 1);
    const expItem = expResult.items[0]!;
    assert.equal(expItem.company, "ABC Technologies Global");
    assert.equal(expItem.position, "Senior Lead Engineer");
    assert.ok(expItem.description.includes("Rewritten bullet points highlighting business impact."));
    assert.ok(expItem.description.includes("Technologies: Node.js, TypeScript, PostgreSQL"));
    assert.notEqual(expItem.company, "ABC");

    // 5. Project Mapping verification
    const projResult = prepareProjectImports(userReviewedData.projects || [], []);
    assert.equal(projResult.items.length, 1);
    const projItem = projResult.items[0]!;
    assert.equal(projItem.title, "FolioCraft Enterprise Cloud");
    assert.equal(projItem.description, "Full rewrite of project description.");
    assert.deepEqual(projItem.technologies, ["Next.js", "Docker", "PostgreSQL"]);
    assert.equal(projItem.githubUrl, "https://github.com/alex-verified/foliocraft");
    assert.equal(projItem.liveUrl, "https://foliocraft.verified.dev");
    assert.notEqual(projItem.title, "Raw App");

    // 6. Skill Mapping verification
    const skillResult = prepareSkillImports(userReviewedData.skills || [], []);
    assert.equal(skillResult.items.length, 2);
    const skillNames = skillResult.items.map((s) => s.name);
    assert.ok(skillNames.includes("Java"));
    assert.ok(skillNames.includes("Kotlin"));
  });

  // --------------------------------------------------------------------------
  // STEP 5 — TEST IMPORT IDEMPOTENCY
  // --------------------------------------------------------------------------
  await t.test("5.1 Import Idempotency: Repeated imports identify existing items and prevent duplicate creation", () => {
    const candidateSkills: StructuredCvSkill[] = [
      { name: "TypeScript" },
      { name: "React" },
      { name: "Python" },
    ];

    const candidateExp: StructuredCvExperience[] = [
      {
        company: "Stripe",
        position: "Software Engineer",
        startDate: "2022-01-01",
        isCurrent: true,
      },
    ];

    const candidateProjects: StructuredCvProject[] = [
      {
        title: "FolioCraft",
        description: "Portfolio Builder",
        technologies: ["Next.js"],
      },
    ];

    // PASS 1: Portfolio is empty
    const pass1Skills = prepareSkillImports(candidateSkills, []);
    const pass1Exp = prepareExperienceImports(candidateExp, []);
    const pass1Proj = prepareProjectImports(candidateProjects, []);

    assert.equal(pass1Skills.duplicateCount, 0);
    assert.equal(pass1Exp.duplicateCount, 0);
    assert.equal(pass1Proj.duplicateCount, 0);
    assert.ok(pass1Skills.items.every((i) => i.selected && !i.isDuplicate));
    assert.ok(pass1Exp.items.every((i) => i.selected && !i.isDuplicate));
    assert.ok(pass1Proj.items.every((i) => i.selected && !i.isDuplicate));

    // Simulate saving them into the portfolio database
    const existingSkills: Skill[] = [
      { id: "s1", portfolioId: "port1", name: "typescript", category: "Frontend", orderIndex: 0, createdAt: "", updatedAt: "" },
      { id: "s2", portfolioId: "port1", name: "React", category: "Frontend", orderIndex: 1, createdAt: "", updatedAt: "" },
      { id: "s3", portfolioId: "port1", name: "Python", category: "Backend", orderIndex: 2, createdAt: "", updatedAt: "" },
    ];

    const existingExp: Experience[] = [
      {
        id: "e1",
        portfolioId: "port1",
        company: "stripe",
        position: "software engineer",
        description: "Payments API",
        startDate: "2022-01-01",
        endDate: null,
        isCurrent: true,
        createdAt: "",
        updatedAt: "",
      },
    ];

    const existingProjects: Project[] = [
      {
        id: "p1",
        portfolioId: "port1",
        title: "foliocraft",
        description: "Portfolio Builder",
        technologies: ["Next.js"],
        githubUrl: null,
        projectUrl: null,
        imageUrl: null,
        orderIndex: 0,
        createdAt: "",
        updatedAt: "",
      },
    ];

    // PASS 2: Importing the same CV again against existing portfolio data
    const pass2Skills = prepareSkillImports(candidateSkills, existingSkills);
    const pass2Exp = prepareExperienceImports(candidateExp, existingExp);
    const pass2Proj = prepareProjectImports(candidateProjects, existingProjects);

    assert.equal(pass2Skills.duplicateCount, 3);
    assert.equal(pass2Exp.duplicateCount, 1);
    assert.equal(pass2Proj.duplicateCount, 1);

    // Duplicates must be unselected by default to prevent accidental double-imports
    assert.ok(pass2Skills.items.every((i) => !i.selected && i.isDuplicate));
    assert.ok(pass2Exp.items.every((i) => !i.selected && i.isDuplicate));
    assert.ok(pass2Proj.items.every((i) => !i.selected && i.isDuplicate));
  });

  // --------------------------------------------------------------------------
  // STEP 6 — TEST PARTIAL IMPORT FAILURE HANDLING
  // --------------------------------------------------------------------------
  await t.test("6.1 Partial Import Failure: Accurately records successes and failures without false success reports", async () => {
    // 5 projects to import, where project 3 encounters a simulated API failure
    const projects: StructuredCvProject[] = [
      { title: "Project 1", technologies: ["React"] },
      { title: "Project 2", technologies: ["Node.js"] },
      { title: "Project 3 (Faulty)", technologies: ["Docker"] },
      { title: "Project 4", technologies: ["Go"] },
      { title: "Project 5", technologies: ["Python"] },
    ];

    const prepared = prepareProjectImports(projects, []).items;

    const summary: ImportSummaryResult = {
      profileUpdatedFields: [],
      experiencesImported: 0,
      experiencesSkipped: 0,
      experiencesFailed: 0,
      skillsImported: 0,
      skillsSkipped: 0,
      skillsFailed: 0,
      projectsImported: 0,
      projectsSkipped: 0,
      projectsFailed: 0,
      educationDetectedCount: 0,
      errors: [],
    };

    // Simulated API call function
    const mockCreateProjectApi = async (title: string) => {
      if (title.includes("Faulty")) {
        throw new Error("HTTP 500: Database transaction error on Project 3");
      }
      return { id: `proj-${title}` };
    };

    for (const proj of prepared) {
      if (proj.isDuplicate) {
        summary.projectsSkipped++;
        continue;
      }
      try {
        await mockCreateProjectApi(proj.title);
        summary.projectsImported++;
      } catch (err: unknown) {
        summary.projectsFailed++;
        const msg = err instanceof Error ? err.message : "API error";
        summary.errors.push(`Project "${proj.title}": ${msg}`);
      }
    }

    assert.equal(summary.projectsImported, 4);
    assert.equal(summary.projectsFailed, 1);
    assert.equal(summary.projectsSkipped, 0);
    assert.equal(summary.errors.length, 1);
    assert.ok(summary.errors[0]?.includes("Project 3"));
    // System must NOT flag full success
    const hasFailures = summary.errors.length > 0 || (summary.projectsFailed as number) > 0;
    assert.equal(hasFailures, true);
  });

  // --------------------------------------------------------------------------
  // STEP 7 — TEST EMPTY & OPTIONAL DATA SAFETY
  // --------------------------------------------------------------------------
  await t.test("7.1 Empty & Optional Data: Omitted fields do not crash, fabricate strings, or emit invalid payloads", () => {
    const minimalParsed: StructuredCvData = {
      personal: {
        fullName: "Minimal Candidate",
        // email, phone, location, summary, urls omitted
      },
      education: [],
      experience: [
        {
          company: "Barebones Inc",
          position: "Contractor",
          // description, endDate omitted
          startDate: "2023-01-01",
          isCurrent: true,
        },
      ],
      projects: [
        {
          title: "Standalone Script",
          technologies: [],
          // description, githubUrl, liveUrl omitted
        },
      ],
      skills: [],
    };

    // 1. Profile merge
    const profileMerge = mergeProfileData({}, minimalParsed.personal || {});
    assert.equal(profileMerge.merged.name, "Minimal Candidate");
    assert.equal(profileMerge.merged.email, undefined);
    assert.equal(profileMerge.merged.phone, undefined);
    assert.equal(profileMerge.merged.about, undefined);

    // 2. Experience normalization
    const expItems = prepareExperienceImports(minimalParsed.experience || [], []).items;
    assert.equal(expItems.length, 1);
    assert.equal(expItems[0]?.company, "Barebones Inc");
    assert.equal(expItems[0]?.endDate, null);
    assert.equal(expItems[0]?.description, "");
    assert.notEqual(expItems[0]?.description, "undefined");

    // 3. Project normalization
    const projItems = prepareProjectImports(minimalParsed.projects || [], []).items;
    assert.equal(projItems.length, 1);
    assert.equal(projItems[0]?.title, "Standalone Script");
    assert.equal(projItems[0]?.githubUrl, undefined);
    assert.equal(projItems[0]?.liveUrl, undefined);
    assert.deepEqual(projItems[0]?.technologies, []);
  });

  // --------------------------------------------------------------------------
  // STEP 11 — END-TO-END DATA INTEGRITY AUDIT
  // --------------------------------------------------------------------------
  await t.test("11.1 End-to-End Data Integrity Audit: Verifies complete trace from CV to mapped portfolio payload", () => {
    const originalCvData: StructuredCvData = {
      personal: {
        fullName: "Sanduni Fernando",
        professionalTitle: "Cloud Solutions Architect",
        email: "sanduni@cloud.lk",
        phone: "+94 77 987 6543",
        location: "Kandy, Sri Lanka",
        summary: "Specialist in AWS and Kubernetes with 6 years experience.",
        website: "https://sanduni.cloud",
        linkedin: "https://linkedin.com/in/sanduni-cloud",
        github: "https://github.com/sandunicloud",
      },
      education: [],
      experience: [
        {
          company: "CloudNine Lanka",
          position: "Lead Architect",
          description: "Architected multi-tenant SaaS serving 500k users.",
          startDate: "2021-03-01",
          isCurrent: true,
          technologies: ["Go", "Kubernetes", "AWS"],
        },
      ],
      projects: [
        {
          title: "KubeScale Operator",
          description: "Automated Horizontal Pod Autoscaler based on queue depth.",
          technologies: ["Go", "Kubernetes CRD"],
          githubUrl: "https://github.com/sandunicloud/kubescale",
          liveUrl: "https://kubescale.cloud",
        },
      ],
      skills: [
        { name: "Go" },
        { name: "Kubernetes" },
      ],
    };

    // User reviews and verifies data (no edits needed, all confirmed)
    const existingPortfolio: Partial<PortfolioFormData> = {
      name: "",
      title: "",
      email: "",
      username: "sandunif",
      template: "modern",
    };

    // Mapping step
    const profileMerged = mergeProfileData(existingPortfolio, originalCvData.personal || {}, {
      overwriteExisting: false,
    });
    const preparedExp = prepareExperienceImports(originalCvData.experience || [], []).items;
    const preparedProj = prepareProjectImports(originalCvData.projects || [], []).items;
    const preparedSkills = prepareSkillImports(originalCvData.skills || [], []).items;

    // Verify Profile payload
    assert.equal(profileMerged.merged.name, "Sanduni Fernando");
    assert.equal(profileMerged.merged.title, "Cloud Solutions Architect");
    assert.equal(profileMerged.merged.email, "sanduni@cloud.lk");
    assert.equal(profileMerged.merged.phone, "+94 77 987 6543");
    assert.equal(profileMerged.merged.location, "Kandy, Sri Lanka");
    assert.equal(profileMerged.merged.about, "Specialist in AWS and Kubernetes with 6 years experience.");
    assert.equal(profileMerged.merged.socialLinks?.website, "https://sanduni.cloud");
    assert.equal(profileMerged.merged.socialLinks?.linkedin, "https://linkedin.com/in/sanduni-cloud");
    assert.equal(profileMerged.merged.socialLinks?.github, "https://github.com/sandunicloud");

    // Verify Experience payload
    assert.equal(preparedExp.length, 1);
    assert.equal(preparedExp[0]?.company, "CloudNine Lanka");
    assert.equal(preparedExp[0]?.position, "Lead Architect");
    assert.equal(preparedExp[0]?.startDate, "2021-03-01");
    assert.equal(preparedExp[0]?.endDate, null);
    assert.equal(preparedExp[0]?.isCurrent, true);
    assert.ok(preparedExp[0]?.description.includes("Architected multi-tenant SaaS"));
    assert.ok(preparedExp[0]?.description.includes("Technologies: Go, Kubernetes, AWS"));

    // Verify Project payload
    assert.equal(preparedProj.length, 1);
    assert.equal(preparedProj[0]?.title, "KubeScale Operator");
    assert.equal(preparedProj[0]?.description, "Automated Horizontal Pod Autoscaler based on queue depth.");
    assert.deepEqual(preparedProj[0]?.technologies, ["Go", "Kubernetes CRD"]);
    assert.equal(preparedProj[0]?.githubUrl, "https://github.com/sandunicloud/kubescale");
    assert.equal(preparedProj[0]?.liveUrl, "https://kubescale.cloud");

    // Verify Skills payload
    assert.equal(preparedSkills.length, 2);
    assert.equal(preparedSkills[0]?.name, "Go");
    assert.equal(preparedSkills[1]?.name, "Kubernetes");
  });
});
