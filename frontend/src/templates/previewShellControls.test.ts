import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mapDraftToPortfolioViewData } from "./types";
import {
  PreviewShell,
  DEVICE_WIDTHS,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
} from "@/components/portfolio/PreviewShell";
import { PortfolioFormData } from "@/types/portfolio";
import { Project } from "@/types/project";
import { Skill } from "@/types/skill";
import { Experience } from "@/types/experience";

// Sample mock data for LP-03 Preview Shell testing
const mockProjects: Project[] = [
  {
    id: "proj-1",
    portfolioId: "port-1",
    title: "Quantum Compiler",
    description: "Next-gen AST optimization engine",
    technologies: ["Rust", "TypeScript"],
    githubUrl: "https://github.com/test/compiler",
    projectUrl: "https://compiler.dev",
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
    name: "TypeScript",
    category: "Languages",
    orderIndex: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockExperiences: Experience[] = [
  {
    id: "exp-1",
    portfolioId: "port-1",
    company: "Cloud Scale Inc",
    position: "Principal Architect",
    startDate: "2021-06-01",
    endDate: null,
    isCurrent: true,
    description: "Leading cloud native platform infrastructure",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const sampleDraft: PortfolioFormData = {
  name: "Marcus Vance",
  title: "Principal Platform Architect",
  about: "Specializing in distributed systems and developer tooling.",
  email: "marcus@example.com",
  phone: "+1 555-0199",
  location: "Austin, TX",
  profileImageUrl: "https://example.com/marcus.jpg",
  socialLinks: {
    github: "https://github.com/marcus",
    linkedin: "https://linkedin.com/in/marcus",
  },
  username: "marcusvance",
  template: "modern",
};

test("Phase 9 LP-03: Preview Shell & Layout Controls Suite", async (t) => {
  await t.test("1. PreviewShell renders as a valid React element and markup with default desktop viewport", () => {
    const viewData = mapDraftToPortfolioViewData(sampleDraft, {
      projects: mockProjects,
      skills: mockSkills,
      experiences: mockExperiences,
    });

    const element = React.createElement(PreviewShell, {
      data: viewData,
      templateId: viewData.template,
    });

    assert.ok(React.isValidElement(element), "PreviewShell must return a valid React element");
    const html = renderToStaticMarkup(element);
    assert.ok(html.includes('data-testid="preview-shell"'), "Rendered HTML must include preview-shell test ID");
    assert.ok(html.includes('data-testid="device-controls"'), "Rendered HTML must include device-controls");
    assert.ok(html.includes('data-testid="zoom-controls"'), "Rendered HTML must include zoom-controls");
  });

  await t.test("2. Device viewport constants define accurate target widths", () => {
    assert.equal(DEVICE_WIDTHS.desktop, "100%", "Desktop viewport must occupy full container width");
    assert.equal(DEVICE_WIDTHS.tablet, "768px", "Tablet viewport must emulate standard 768px width");
    assert.equal(DEVICE_WIDTHS.mobile, "375px", "Mobile viewport must emulate standard 375px width");
  });

  await t.test("3. Zoom constraints define sensible bounds and step increments", () => {
    assert.equal(MIN_ZOOM, 0.5, "Minimum zoom scale must be 0.5 (50%)");
    assert.equal(MAX_ZOOM, 1.5, "Maximum zoom scale must be 1.5 (150%)");
    assert.equal(ZOOM_STEP, 0.1, "Zoom step must increment/decrement by 0.1 (10%)");
  });

  await t.test("4. Device selection configures appropriate viewport frames", () => {
    const viewData = mapDraftToPortfolioViewData(sampleDraft);

    // Desktop
    const desktopHtml = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: viewData, initialDevice: "desktop" })
    );
    assert.ok(desktopHtml.includes("w-full max-w-full"), "Desktop mode should apply full container width");

    // Tablet
    const tabletHtml = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: viewData, initialDevice: "tablet" })
    );
    assert.ok(tabletHtml.includes("w-[768px]"), "Tablet mode should apply 768px frame width");
    assert.ok(tabletHtml.includes("tablet-speaker-indicator"), "Tablet mode should include tablet bezel indicator");

    // Mobile
    const mobileHtml = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: viewData, initialDevice: "mobile" })
    );
    assert.ok(mobileHtml.includes("w-[375px]"), "Mobile mode should apply 375px frame width");
    assert.ok(mobileHtml.includes("mobile-notch-indicator"), "Mobile mode should include mobile notch indicator");
  });

  await t.test("5. Live unsaved draft updates flow synchronously to PreviewShell", () => {
    // 1. Initial draft
    let draft: PortfolioFormData = { ...sampleDraft };
    let liveData = mapDraftToPortfolioViewData(draft, {
      projects: mockProjects,
      skills: mockSkills,
      experiences: mockExperiences,
    });
    let html = renderToStaticMarkup(React.createElement(PreviewShell, { data: liveData }));
    assert.ok(html.includes("Marcus Vance"));
    assert.ok(html.includes("Principal Platform Architect"));

    // 2. User edits title without saving
    draft = { ...draft, title: "Distinguished Engineer" };
    liveData = mapDraftToPortfolioViewData(draft, {
      projects: mockProjects,
      skills: mockSkills,
      experiences: mockExperiences,
    });
    assert.equal(liveData.title, "Distinguished Engineer");

    html = renderToStaticMarkup(React.createElement(PreviewShell, { data: liveData }));
    assert.ok(html.includes("Distinguished Engineer"), "Unsaved title update must be present in preview markup");

    // 3. User updates template theme from modern to professional
    draft = { ...draft, template: "professional" };
    liveData = mapDraftToPortfolioViewData(draft, {
      projects: mockProjects,
      skills: mockSkills,
      experiences: mockExperiences,
    });
    assert.equal(liveData.template, "professional");

    html = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: liveData, templateId: "professional" })
    );
    assert.ok(html.includes("template-professional"), "Rendered preview should switch to professional theme");
  });

  await t.test("6. Initial zoom scale applies CSS transform styling accurately", () => {
    const viewData = mapDraftToPortfolioViewData(sampleDraft);

    const html120 = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: viewData, initialZoom: 1.2 })
    );
    assert.ok(html120.includes("scale(1.2)"), "CSS transform should scale by 1.2");
    assert.ok(html120.includes("120%"), "Zoom indicator should display 120%");

    const html80 = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: viewData, initialZoom: 0.8 })
    );
    assert.ok(html80.includes("scale(0.8)"), "CSS transform should scale by 0.8");
    assert.ok(html80.includes("80%"), "Zoom indicator should display 80%");
  });

  await t.test("7. Empty and minimal collections do not throw inside PreviewShell", () => {
    const emptyViewData = mapDraftToPortfolioViewData(
      { name: "New User", username: "newuser" },
      { projects: [], skills: [], experiences: [] }
    );

    const desktopHtml = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: emptyViewData, initialDevice: "desktop" })
    );
    assert.ok(desktopHtml.includes("New User"));

    const tabletHtml = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: emptyViewData, initialDevice: "tablet" })
    );
    assert.ok(tabletHtml.includes("New User"));

    const mobileHtml = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: emptyViewData, initialDevice: "mobile" })
    );
    assert.ok(mobileHtml.includes("New User"));
  });

  await t.test("8. Accessibility: controls render accessible toolbar and aria tags", () => {
    const viewData = mapDraftToPortfolioViewData(sampleDraft);
    const html = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: viewData, showControls: true })
    );

    assert.ok(html.includes('role="toolbar"'), "Toolbar should have role='toolbar'");
    assert.ok(html.includes('aria-label="Preview display controls"'), "Toolbar should have descriptive aria-label");
    assert.ok(html.includes('aria-label="Desktop viewport"'), "Desktop button should have descriptive aria-label");
    assert.ok(html.includes('aria-label="Tablet viewport (768px)"'), "Tablet button should have descriptive aria-label");
    assert.ok(html.includes('aria-label="Mobile viewport (375px)"'), "Mobile button should have descriptive aria-label");
    assert.ok(html.includes('aria-label="Zoom in"'), "Zoom in button should have aria-label");
    assert.ok(html.includes('aria-label="Zoom out"'), "Zoom out button should have aria-label");
    assert.ok(html.includes('aria-label="Reset zoom"'), "Reset zoom button should have aria-label");
    assert.ok(html.includes('aria-label="Fit to width"'), "Fit to width button should have aria-label");
  });

  await t.test("9. Template theme switcher buttons render when onTemplateChange provided", () => {
    const viewData = mapDraftToPortfolioViewData(sampleDraft);

    const htmlWithSwitcher = renderToStaticMarkup(
      React.createElement(PreviewShell, {
        data: viewData,
        onTemplateChange: () => {},
      })
    );
    assert.ok(htmlWithSwitcher.includes("modern"), "Should include modern option");
    assert.ok(htmlWithSwitcher.includes("minimal"), "Should include minimal option");
    assert.ok(htmlWithSwitcher.includes("professional"), "Should include professional option");
  });
});
