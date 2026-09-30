import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCvDate,
  isValidCalendarDate,
  mergeProfileData,
  prepareExperienceImports,
  prepareSkillImports,
  prepareProjectImports,
} from "./cvMapping";
import type {
  StructuredCvPersonal,
  StructuredCvExperience,
  StructuredCvSkill,
  StructuredCvProject,
} from "@/types/cv";
import type { PortfolioFormData } from "@/types/portfolio";
import type { Experience } from "@/types/experience";
import type { Skill, CatalogSkill } from "@/types/skill";
import type { Project } from "@/types/project";

test("CV-09: Mapping & Normalization Utilities Test Suite", async (t) => {
  // -------------------------------------------------------------
  // Section 1: Date Normalization Tests
  // -------------------------------------------------------------
  await t.test("1.1 Date Normalizer: ISO YYYY-MM-DD valid dates", () => {
    const res = normalizeCvDate("2022-06-15");
    assert.equal(res.isValid, true);
    assert.equal(res.date, "2022-06-15");
    assert.equal(res.isCurrentIndicator, false);
  });

  await t.test("1.2 Date Normalizer: Year only converts to YYYY-01-01", () => {
    const res = normalizeCvDate("2020");
    assert.equal(res.isValid, true);
    assert.equal(res.date, "2020-01-01");
    assert.equal(res.isCurrentIndicator, false);
  });

  await t.test("1.3 Date Normalizer: Full month name + year (e.g. 'May 2021')", () => {
    const res = normalizeCvDate("May 2021");
    assert.equal(res.isValid, true);
    assert.equal(res.date, "2021-05-01");
  });

  await t.test("1.4 Date Normalizer: Abbreviated month name + year (e.g. 'Jan 2022', 'Sept. 2020')", () => {
    const res1 = normalizeCvDate("Jan 2022");
    assert.equal(res1.isValid, true);
    assert.equal(res1.date, "2022-01-01");

    const res2 = normalizeCvDate("Sept. 2020");
    assert.equal(res2.isValid, true);
    assert.equal(res2.date, "2020-09-01");
  });

  await t.test("1.5 Date Normalizer: Slash or dash month-year (e.g. '05/2021', '2021-08')", () => {
    const res1 = normalizeCvDate("05/2021");
    assert.equal(res1.isValid, true);
    assert.equal(res1.date, "2021-05-01");

    const res2 = normalizeCvDate("2021-08");
    assert.equal(res2.isValid, true);
    assert.equal(res2.date, "2021-08-01");
  });

  await t.test("1.6 Date Normalizer: Present / Current / Now flags current role with null date", () => {
    for (const val of ["Present", "current", "NOW", "present"]) {
      const res = normalizeCvDate(val);
      assert.equal(res.isValid, true);
      assert.equal(res.date, null);
      assert.equal(res.isCurrentIndicator, true);
    }
  });

  await t.test("1.7 Date Normalizer: Empty, null, or undefined returns null without error", () => {
    assert.equal(normalizeCvDate(null).date, null);
    assert.equal(normalizeCvDate(undefined).date, null);
    assert.equal(normalizeCvDate("").date, null);
    assert.equal(normalizeCvDate("   ").date, null);
  });

  await t.test("1.8 Date Normalizer: Invalid or ambiguous values return isValid: false", () => {
    const res1 = normalizeCvDate("not-a-date");
    assert.equal(res1.isValid, false);
    assert.equal(res1.date, null);

    // Invalid calendar date: February 31st
    const res2 = normalizeCvDate("2021-02-31");
    assert.equal(res2.isValid, false);
    assert.equal(res2.date, null);
  });

  await t.test("1.9 Calendar Date validator strictly handles leap years and day counts", () => {
    assert.equal(isValidCalendarDate("2024-02-29"), true); // 2024 is leap year
    assert.equal(isValidCalendarDate("2023-02-29"), false); // 2023 is not
    assert.equal(isValidCalendarDate("2022-04-31"), false); // April has 30 days
  });

  // -------------------------------------------------------------
  // Section 2: Profile Merge Tests
  // -------------------------------------------------------------
  await t.test("2.1 Profile Merge: Empty profile fields receive parsed CV values", () => {
    const current: Partial<PortfolioFormData> = {
      name: "",
      title: "Fullstack Developer",
      username: "alex-mercer",
      email: "",
      phone: "",
      location: "",
      about: "",
      socialLinks: {},
      template: "modern",
    };

    const parsed: StructuredCvPersonal = {
      fullName: "Alex Mercer",
      email: "alex@example.com",
      phone: "+1 555 1234",
      location: "San Francisco, CA",
      summary: "Passionate engineer with experience in distributed systems.",
      website: "https://alex.dev",
      linkedin: "https://linkedin.com/in/alexmercer",
      github: "https://github.com/alexmercer",
    };

    const result = mergeProfileData(current, parsed);

    assert.equal(result.merged.name, "Alex Mercer");
    assert.equal(result.merged.email, "alex@example.com");
    assert.equal(result.merged.phone, "+1 555 1234");
    assert.equal(result.merged.location, "San Francisco, CA");
    assert.equal(result.merged.about, parsed.summary);
    assert.equal(result.merged.socialLinks?.website, "https://alex.dev");
    assert.equal(result.merged.socialLinks?.linkedin, "https://linkedin.com/in/alexmercer");
    assert.equal(result.merged.socialLinks?.github, "https://github.com/alexmercer");

    // Title and username must stay preserved
    assert.equal(result.merged.title, "Fullstack Developer");
    assert.equal(result.merged.username, "alex-mercer");
    assert.equal(result.merged.template, "modern");
  });

  await t.test("2.2 Profile Merge: Preserves existing non-empty values by default (non-destructive)", () => {
    const current: Partial<PortfolioFormData> = {
      name: "Existing Name",
      title: "Senior Lead",
      username: "my-handle",
      email: "current@folio.com",
      phone: "+1 000 0000",
      location: "New York, NY",
      about: "My custom crafted bio",
      socialLinks: {
        github: "https://github.com/existinguser",
      },
    };

    const parsed: StructuredCvPersonal = {
      fullName: "CV Replacement Name",
      email: "cv@new.com",
      phone: "+1 999 9999",
      location: "Boston, MA",
      summary: "Different CV summary",
      github: "https://github.com/cvuser",
      linkedin: "https://linkedin.com/in/cvuser", // was empty, so should be added
    };

    const result = mergeProfileData(current, parsed, { overwriteExisting: false });

    // Existing fields remain unchanged
    assert.equal(result.merged.name, "Existing Name");
    assert.equal(result.merged.email, "current@folio.com");
    assert.equal(result.merged.phone, "+1 000 0000");
    assert.equal(result.merged.location, "New York, NY");
    assert.equal(result.merged.about, "My custom crafted bio");
    assert.equal(result.merged.socialLinks?.github, "https://github.com/existinguser");

    // Empty fields get populated
    assert.equal(result.merged.socialLinks?.linkedin, "https://linkedin.com/in/cvuser");

    // Username and title untouched
    assert.equal(result.merged.username, "my-handle");
    assert.equal(result.merged.title, "Senior Lead");

    // Preserved fields tracked
    assert.ok(result.preservedFields.includes("name"));
    assert.ok(result.preservedFields.includes("email"));
  });

  await t.test("2.3 Profile Merge: Does not mutate the original current object", () => {
    const current: Partial<PortfolioFormData> = {
      name: "",
      socialLinks: { twitter: "https://x.com/dev" },
    };
    const parsed: StructuredCvPersonal = { fullName: "Jane Doe" };

    const result = mergeProfileData(current, parsed);
    assert.equal(current.name, "");
    assert.equal(result.merged.name, "Jane Doe");
  });

  // -------------------------------------------------------------
  // Section 3: Experience Mapping & Deduplication Tests
  // -------------------------------------------------------------
  await t.test("3.1 Experience: Maps fields, normalizes dates, and handles current role", () => {
    const parsed: StructuredCvExperience[] = [
      {
        company: "Stripe",
        position: "Senior Engineer",
        description: "Payments API platform",
        startDate: "Jan 2021",
        endDate: "Present",
        isCurrent: true,
      },
      {
        company: "Google",
        position: "Software Engineer",
        description: "Search infra",
        startDate: "2018",
        endDate: "2020",
        isCurrent: false,
      },
    ];

    const { items, duplicateCount } = prepareExperienceImports(parsed, []);
    assert.equal(duplicateCount, 0);
    assert.equal(items.length, 2);

    // Item 1 (Current role)
    assert.equal(items[0]!.company, "Stripe");
    assert.equal(items[0]!.position, "Senior Engineer");
    assert.equal(items[0]!.startDate, "2021-01-01");
    assert.equal(items[0]!.endDate, null);
    assert.equal(items[0]!.isCurrent, true);
    assert.equal(items[0]!.isDateValid, true);
    assert.equal(items[0]!.selected, true);

    // Item 2 (Past role)
    assert.equal(items[1]!.company, "Google");
    assert.equal(items[1]!.startDate, "2018-01-01");
    assert.equal(items[1]!.endDate, "2020-01-01");
    assert.equal(items[1]!.isCurrent, false);
    assert.equal(items[1]!.isDateValid, true);
  });

  await t.test("3.2 Experience: Deduplicates against existing experiences (company + position case-insensitive)", () => {
    const existing: Experience[] = [
      {
        id: "exp-1",
        portfolioId: "port-1",
        company: "Meta",
        position: "Frontend Architect",
        description: null,
        startDate: "2020-01-01",
        endDate: null,
        isCurrent: true,
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
    ];

    const parsed: StructuredCvExperience[] = [
      {
        company: "meta", // matches existing case-insensitively
        position: "frontend architect",
        startDate: "2020-01-01",
        isCurrent: true,
      },
      {
        company: "Apple", // new item
        position: "iOS Engineer",
        startDate: "2022-01-01",
        isCurrent: false,
      },
    ];

    const { items, duplicateCount } = prepareExperienceImports(parsed, existing);
    assert.equal(duplicateCount, 1);
    assert.equal(items[0]!.isDuplicate, true);
    assert.equal(items[0]!.selected, false); // Duplicate unselected by default

    assert.equal(items[1]!.isDuplicate, false);
    assert.equal(items[1]!.selected, true);
  });

  await t.test("3.3 Experience: Flags items with ambiguous dates for manual review", () => {
    const parsed: StructuredCvExperience[] = [
      {
        company: "Startup",
        position: "Founder",
        startDate: "some invalid date string",
        isCurrent: false,
      },
    ];

    const { items } = prepareExperienceImports(parsed, []);
    assert.equal(items[0]!.needsDateReview, true);
    assert.equal(items[0]!.isDateValid, false);
  });

  // -------------------------------------------------------------
  // Section 4: Skills Mapping & Category Resolution Tests
  // -------------------------------------------------------------
  await t.test("4.1 Skills: Matches category from catalog case-insensitively", () => {
    const catalog: CatalogSkill[] = [
      { id: "c-1", name: "React", category: "Frontend" },
      { id: "c-2", name: "Node.js", category: "Backend" },
      { id: "c-3", name: "PostgreSQL", category: "Database" },
    ];

    const parsed: StructuredCvSkill[] = [
      { name: "react" }, // lowercase
      { name: "Node.js" },
    ];

    const { items, duplicateCount } = prepareSkillImports(parsed, [], catalog);
    assert.equal(duplicateCount, 0);
    assert.equal(items.length, 2);

    assert.equal(items[0]!.name, "react");
    assert.equal(items[0]!.category, "Frontend");
    assert.equal(items[0]!.isFromCatalog, true);

    assert.equal(items[1]!.name, "Node.js");
    assert.equal(items[1]!.category, "Backend");
    assert.equal(items[1]!.isFromCatalog, true);
  });

  await t.test("4.2 Skills: Falls back to 'Other' when skill not in catalog", () => {
    const catalog: CatalogSkill[] = [
      { id: "c-1", name: "React", category: "Frontend" },
    ];

    const parsed: StructuredCvSkill[] = [
      { name: "UncommonCustomLib" },
    ];

    const { items } = prepareSkillImports(parsed, [], catalog);
    assert.equal(items[0]!.category, "Other");
    assert.equal(items[0]!.isFromCatalog, false);
  });

  await t.test("4.3 Skills: Deduplicates against existing portfolio skills case-insensitively", () => {
    const existing: Skill[] = [
      {
        id: "s-1",
        portfolioId: "p-1",
        name: "TypeScript",
        category: "Frontend",
        orderIndex: 0,
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
    ];

    const parsed: StructuredCvSkill[] = [
      { name: "typescript" }, // duplicate
      { name: "GraphQL" }, // new
    ];

    const { items, duplicateCount } = prepareSkillImports(parsed, existing, []);
    assert.equal(duplicateCount, 1);
    assert.equal(items[0]!.isDuplicate, true);
    assert.equal(items[0]!.selected, false);

    assert.equal(items[1]!.isDuplicate, false);
    assert.equal(items[1]!.selected, true);
  });

  // -------------------------------------------------------------
  // Section 5: Projects Mapping & Deduplication Tests
  // -------------------------------------------------------------
  await t.test("5.1 Projects: Preserves title, description, and technologies", () => {
    const parsed: StructuredCvProject[] = [
      {
        title: "FolioCraft",
        description: "Developer portfolio platform",
        technologies: ["Next.js", "Express", "PostgreSQL"],
      },
    ];

    const { items, duplicateCount } = prepareProjectImports(parsed, []);
    assert.equal(duplicateCount, 0);
    assert.equal(items[0]!.title, "FolioCraft");
    assert.equal(items[0]!.description, "Developer portfolio platform");
    assert.deepEqual(items[0]!.technologies, ["Next.js", "Express", "PostgreSQL"]);
    assert.equal(items[0]!.selected, true);
  });

  await t.test("5.2 Projects: Deduplicates by title case-insensitively", () => {
    const existing: Project[] = [
      {
        id: "pr-1",
        portfolioId: "port-1",
        title: "Home-Based Care System",
        description: "Healthcare portal",
        technologies: ["React", "NestJS"],
        githubUrl: null,
        projectUrl: null,
        imageUrl: null,
        orderIndex: 0,
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
    ];

    const parsed: StructuredCvProject[] = [
      {
        title: "home-based care system", // duplicate
        description: "A care platform",
        technologies: ["React"],
      },
      {
        title: "New AI SaaS", // new
        description: "AI workflow engine",
        technologies: ["Python"],
      },
    ];

    const { items, duplicateCount } = prepareProjectImports(parsed, existing);
    assert.equal(duplicateCount, 1);
    assert.equal(items[0]!.isDuplicate, true);
    assert.equal(items[0]!.selected, false);

    assert.equal(items[1]!.isDuplicate, false);
    assert.equal(items[1]!.selected, true);
  });
});
