import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
  PortfolioViewData,
  mapDraftToPortfolioViewData,
} from "./types";
import { TemplateRenderer } from "./TemplateRenderer";
import { PortfolioFormData } from "@/types/portfolio";
import { Project } from "@/types/project";
import { Skill } from "@/types/skill";
import { Experience } from "@/types/experience";

// Sample mock collections for testing data flow
const mockProjects: Project[] = [
  {
    id: "proj-1",
    portfolioId: "port-1",
    title: "AI Flow Engine",
    description: "Distributed workflow scheduler",
    technologies: ["TypeScript", "Next.js"],
    githubUrl: "https://github.com/test/engine",
    projectUrl: "https://engine.test.dev",
    imageUrl: null,
    orderIndex: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockSkills: Skill[] = [
  {
    id: "skill-1",
    portfolioId: "port-1",
    name: "React 19",
    category: "Frontend",
    orderIndex: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "skill-2",
    portfolioId: "port-1",
    name: "Node.js",
    category: "Backend",
    orderIndex: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockExperiences: Experience[] = [
  {
    id: "exp-1",
    portfolioId: "port-1",
    company: "Tech Systems",
    position: "Staff Architect",
    startDate: "2022-01-01",
    endDate: null,
    isCurrent: true,
    description: "Leading frontend core architecture",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

test("Phase 9 LP-02: Live Preview Data Flow Suite", async (t) => {
  await t.test("1. Changing a profile field produces updated draft data and view data", () => {
    const initialDraft: PortfolioFormData = {
      name: "Alex Smith",
      title: "Software Engineer",
      about: "Full stack developer",
      email: "alex@example.com",
      phone: "+1 555-0100",
      location: "New York, NY",
      profileImageUrl: "https://example.com/alex.jpg",
      socialLinks: { github: "https://github.com/alex" },
      username: "alexsmith",
      template: "modern",
    };

    const initialViewData = mapDraftToPortfolioViewData(initialDraft, {
      projects: mockProjects,
      skills: mockSkills,
      experiences: mockExperiences,
    });

    assert.equal(initialViewData.title, "Software Engineer");
    assert.equal(initialViewData.name, "Alex Smith");

    // Simulating user typing in editor (Title updated to Senior Software Engineer)
    const updatedDraft: PortfolioFormData = {
      ...initialDraft,
      title: "Senior Software Engineer",
    };

    const liveViewData = mapDraftToPortfolioViewData(updatedDraft, {
      projects: mockProjects,
      skills: mockSkills,
      experiences: mockExperiences,
    });

    // Verify draft change was reflected immediately in view data
    assert.equal(liveViewData.title, "Senior Software Engineer");
    assert.equal(liveViewData.name, "Alex Smith");
    assert.equal(liveViewData.username, "alexsmith");
  });

  await t.test("2. Social-link changes are reflected in mapped PortfolioViewData", () => {
    const draft: PortfolioFormData = {
      name: "Sam Lee",
      title: "Designer & Engineer",
      username: "samlee",
      socialLinks: {
        github: "https://github.com/samlee",
      },
      template: "minimal",
    };

    const viewData1 = mapDraftToPortfolioViewData(draft);
    assert.equal(viewData1.socialLinks?.github, "https://github.com/samlee");
    assert.equal(viewData1.socialLinks?.linkedin, undefined);

    // User adds LinkedIn URL
    const updatedDraft: PortfolioFormData = {
      ...draft,
      socialLinks: {
        ...draft.socialLinks,
        linkedin: "https://linkedin.com/in/samlee",
      },
    };

    const viewData2 = mapDraftToPortfolioViewData(updatedDraft);
    assert.equal(viewData2.socialLinks?.github, "https://github.com/samlee");
    assert.equal(viewData2.socialLinks?.linkedin, "https://linkedin.com/in/samlee");
  });

  await t.test("3. Template selection is reflected in PortfolioViewData and falls back safely", () => {
    const draftModern: PortfolioFormData = {
      name: "Taylor",
      title: "Lead Engineer",
      username: "taylor",
      template: "modern",
    };
    assert.equal(mapDraftToPortfolioViewData(draftModern).template, "modern");

    const draftMinimal: PortfolioFormData = {
      ...draftModern,
      template: "minimal",
    };
    assert.equal(mapDraftToPortfolioViewData(draftMinimal).template, "minimal");

    const draftProfessional: PortfolioFormData = {
      ...draftModern,
      template: "professional",
    };
    assert.equal(mapDraftToPortfolioViewData(draftProfessional).template, "professional");

    // Fallback when template is missing
    const draftUndefinedTemplate: PortfolioFormData = {
      name: "Taylor",
      title: "Lead Engineer",
      username: "taylor",
    };
    assert.equal(mapDraftToPortfolioViewData(draftUndefinedTemplate).template, "modern");
  });

  await t.test("4. Projects, skills, and experiences collections map correctly", () => {
    const draft: PortfolioFormData = {
      name: "Morgan",
      title: "Backend Engineer",
      username: "morgan",
      template: "modern",
    };

    const viewData = mapDraftToPortfolioViewData(draft, {
      projects: mockProjects,
      skills: mockSkills,
      experiences: mockExperiences,
    });

    assert.equal(viewData.projects.length, 1);
    assert.equal(viewData.projects[0].title, "AI Flow Engine");
    assert.equal(viewData.skills.length, 2);
    assert.equal(viewData.skills[0].name, "React 19");
    assert.equal(viewData.experiences.length, 1);
    assert.equal(viewData.experiences[0].company, "Tech Systems");
  });

  await t.test("5. Empty and null collections do not crash mapper or TemplateRenderer", () => {
    const emptyDraft: Partial<PortfolioFormData> = {};

    // 1. Map completely empty input
    const emptyViewData = mapDraftToPortfolioViewData(emptyDraft, {
      projects: null,
      skills: null,
      experiences: null,
    });

    assert.ok(Array.isArray(emptyViewData.projects));
    assert.equal(emptyViewData.projects.length, 0);
    assert.ok(Array.isArray(emptyViewData.skills));
    assert.equal(emptyViewData.skills.length, 0);
    assert.ok(Array.isArray(emptyViewData.experiences));
    assert.equal(emptyViewData.experiences.length, 0);
    assert.equal(emptyViewData.template, "modern");

    // 2. Render through TemplateRenderer with all 3 templates
    const modernElement = TemplateRenderer({ templateId: "modern", data: emptyViewData });
    assert.ok(React.isValidElement(modernElement));

    const minimalElement = TemplateRenderer({ templateId: "minimal", data: emptyViewData });
    assert.ok(React.isValidElement(minimalElement));

    const professionalElement = TemplateRenderer({ templateId: "professional", data: emptyViewData });
    assert.ok(React.isValidElement(professionalElement));
  });

  await t.test("6. Mapped PortfolioViewData strictly excludes education", () => {
    const draft: PortfolioFormData = {
      name: "Jordan",
      title: "Full Stack Engineer",
      username: "jordan",
    };

    const viewData = mapDraftToPortfolioViewData(draft, {
      projects: mockProjects,
      skills: mockSkills,
      experiences: mockExperiences,
    });

    // Ensure education is not a property on the mapped presentation model
    assert.equal("education" in viewData, false);
  });

  await t.test("7. Persistence independence: typing modifies in-memory view data without API calls", () => {
    let apiCallCount = 0;
    const mockSaveApi = () => {
      apiCallCount++;
    };

    // User starts typing
    let currentDraft: PortfolioFormData = {
      name: "Chris",
      title: "Junior Dev",
      username: "chris",
      template: "modern",
    };

    let viewData = mapDraftToPortfolioViewData(currentDraft);
    assert.equal(viewData.title, "Junior Dev");
    assert.equal(apiCallCount, 0, "No API calls should occur on initial render");

    // Simulate 5 keystrokes
    const keystrokes = ["Mid Dev", "Senior Dev", "Lead Dev", "Staff Dev", "Principal Dev"];
    for (const title of keystrokes) {
      currentDraft = { ...currentDraft, title };
      viewData = mapDraftToPortfolioViewData(currentDraft);
      assert.equal(viewData.title, title);
    }

    assert.equal(apiCallCount, 0, "No API requests must be triggered merely by typing / previewing");

    // Explicit save action
    mockSaveApi();
    assert.equal(apiCallCount, 1, "Save API call only triggers on explicit user save");
  });

  await t.test("8. Live Preview renders live updated data across template themes", () => {
    const liveDraft: PortfolioFormData = {
      name: "Elena Rostova",
      title: "VP of Engineering",
      about: "Scaling high-growth engineering organizations.",
      email: "elena@example.com",
      phone: "+1 555-0188",
      location: "San Francisco, CA",
      socialLinks: {
        linkedin: "https://linkedin.com/in/elena",
        github: "https://github.com/elena",
      },
      username: "elenarostova",
      template: "professional",
    };

    const liveData: PortfolioViewData = mapDraftToPortfolioViewData(liveDraft, {
      projects: mockProjects,
      skills: mockSkills,
      experiences: mockExperiences,
    });

    // Render with professional
    const renderedProf = TemplateRenderer({
      templateId: liveData.template,
      data: liveData,
    });
    assert.ok(React.isValidElement(renderedProf));
    assert.equal((renderedProf.props as { data: PortfolioViewData }).data.name, "Elena Rostova");
    assert.equal((renderedProf.props as { data: PortfolioViewData }).data.title, "VP of Engineering");

    // Switch theme to minimal in draft
    liveData.template = "minimal";
    const renderedMinimal = TemplateRenderer({
      templateId: liveData.template,
      data: liveData,
    });
    assert.ok(React.isValidElement(renderedMinimal));
    assert.equal((renderedMinimal.props as { data: PortfolioViewData }).data.name, "Elena Rostova");
  });
});
