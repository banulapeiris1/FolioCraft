import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
  PortfolioViewData,
  PortfolioTemplateId,
  TemplateProps,
} from "./types";
import {
  TEMPLATE_REGISTRY,
  TEMPLATE_LIST,
  DEFAULT_TEMPLATE_ID,
  isValidTemplateId,
  getTemplateDefinition,
} from "./registry";
import { TemplateModern } from "./modern/TemplateModern";
import { TemplateMinimal } from "./minimal/TemplateMinimal";
import { TemplateProfessional } from "./professional/TemplateProfessional";
import { TemplateRenderer } from "./TemplateRenderer";

const mockPortfolioViewData: PortfolioViewData = {
  name: "Jane Developer",
  title: "Senior Full Stack Engineer",
  about: "Building scalable web applications and developer tools.",
  email: "jane@example.com",
  phone: "+1 555-0199",
  location: "San Francisco, CA",
  profileImageUrl: "https://example.com/avatar.jpg",
  socialLinks: {
    github: "https://github.com/janedev",
    linkedin: "https://linkedin.com/in/janedev",
  },
  username: "janedev",
  template: "modern",
  projects: [
    {
      id: "proj-1",
      portfolioId: "port-1",
      title: "Cloud Orchestrator",
      description: "Distributed task engine",
      technologies: ["TypeScript", "Node.js", "Docker"],
      githubUrl: "https://github.com/janedev/orchestrator",
      projectUrl: "https://orchestrator.io",
      imageUrl: null,
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  skills: [
    {
      id: "skill-1",
      portfolioId: "port-1",
      name: "React",
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
  ],
  experiences: [
    {
      id: "exp-1",
      portfolioId: "port-1",
      company: "Tech Corp",
      position: "Lead Architect",
      description: "Led core infrastructure team",
      startDate: "2022-03-01",
      endDate: null,
      isCurrent: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

test("TPL-02: Template Foundation & Registry Unit Test Suite", async (t) => {
  // -------------------------------------------------------------
  // Section 1: Template Registry Verification
  // -------------------------------------------------------------
  await t.test("1. Registry contains exactly 3 approved templates: modern, minimal, professional", () => {
    const keys = Object.keys(TEMPLATE_REGISTRY);
    assert.equal(keys.length, 3);
    assert.deepEqual(keys.sort(), ["minimal", "modern", "professional"]);
    assert.equal(DEFAULT_TEMPLATE_ID, "modern");
  });

  await t.test("2. TEMPLATE_LIST contains definitions in expected display order with complete metadata", () => {
    assert.equal(TEMPLATE_LIST.length, 3);
    const ids = TEMPLATE_LIST.map((item) => item.meta.id);
    assert.deepEqual(ids, ["modern", "minimal", "professional"]);

    TEMPLATE_LIST.forEach((item) => {
      assert.ok(item.meta.id, "Metadata must have id");
      assert.ok(item.meta.name, "Metadata must have name");
      assert.ok(item.meta.description, "Metadata must have description");
      assert.equal(typeof item.component, "function", "Template component must be a valid component function");
    });
  });

  await t.test("3. Template components match their respective registry mappings", () => {
    assert.equal(TEMPLATE_REGISTRY.modern.component, TemplateModern);
    assert.equal(TEMPLATE_REGISTRY.minimal.component, TemplateMinimal);
    assert.equal(TEMPLATE_REGISTRY.professional.component, TemplateProfessional);
  });

  // -------------------------------------------------------------
  // Section 2: isValidTemplateId Type Guard Tests
  // -------------------------------------------------------------
  await t.test("4. isValidTemplateId correctly identifies valid template IDs", () => {
    assert.equal(isValidTemplateId("modern"), true);
    assert.equal(isValidTemplateId("minimal"), true);
    assert.equal(isValidTemplateId("professional"), true);
  });

  await t.test("5. isValidTemplateId rejects invalid, undefined, null, or unknown IDs", () => {
    assert.equal(isValidTemplateId("creative"), false);
    assert.equal(isValidTemplateId("classic"), false);
    assert.equal(isValidTemplateId("developer"), false);
    assert.equal(isValidTemplateId(""), false);
    assert.equal(isValidTemplateId(null), false);
    assert.equal(isValidTemplateId(undefined), false);
    assert.equal(isValidTemplateId("MODERN"), false); // strictly lowercase check
  });

  // -------------------------------------------------------------
  // Section 3: getTemplateDefinition Resolution & Fallback Tests
  // -------------------------------------------------------------
  await t.test("6. getTemplateDefinition resolves exact matching template definitions", () => {
    const modern = getTemplateDefinition("modern");
    assert.equal(modern.meta.id, "modern");
    assert.equal(modern.component, TemplateModern);

    const minimal = getTemplateDefinition("minimal");
    assert.equal(minimal.meta.id, "minimal");
    assert.equal(minimal.component, TemplateMinimal);

    const professional = getTemplateDefinition("professional");
    assert.equal(professional.meta.id, "professional");
    assert.equal(professional.component, TemplateProfessional);
  });

  await t.test("7. getTemplateDefinition normalizes whitespace and casing safely", () => {
    const modernPadded = getTemplateDefinition("  modern  ");
    assert.equal(modernPadded.meta.id, "modern");

    const minimalUpper = getTemplateDefinition("MINIMAL");
    assert.equal(minimalUpper.meta.id, "minimal");

    const profMixed = getTemplateDefinition(" Professional ");
    assert.equal(profMixed.meta.id, "professional");
  });

  await t.test("8. getTemplateDefinition gracefully falls back to modern when missing, empty, or invalid", () => {
    const undefinedFallback = getTemplateDefinition(undefined);
    assert.equal(undefinedFallback.meta.id, "modern");
    assert.equal(undefinedFallback.component, TemplateModern);

    const nullFallback = getTemplateDefinition(null);
    assert.equal(nullFallback.meta.id, "modern");

    const emptyFallback = getTemplateDefinition("");
    assert.equal(emptyFallback.meta.id, "modern");

    const invalidFallback = getTemplateDefinition("non-existent-template");
    assert.equal(invalidFallback.meta.id, "modern");
  });

  // -------------------------------------------------------------
  // Section 4: Component Rendering & TemplateRenderer Tests
  // -------------------------------------------------------------
  await t.test("9. Individual template components execute and return valid React elements", () => {
    const modernElement = TemplateModern({ data: mockPortfolioViewData });
    assert.ok(React.isValidElement<{ "data-testid"?: string }>(modernElement));
    assert.equal(modernElement.props["data-testid"], "template-modern");

    const minimalElement = TemplateMinimal({ data: mockPortfolioViewData });
    assert.ok(React.isValidElement<{ "data-testid"?: string }>(minimalElement));
    assert.equal(minimalElement.props["data-testid"], "template-minimal");

    const profElement = TemplateProfessional({ data: mockPortfolioViewData });
    assert.ok(React.isValidElement<{ "data-testid"?: string }>(profElement));
    assert.equal(profElement.props["data-testid"], "template-professional");
  });

  await t.test("10. TemplateRenderer resolves and renders selected template", () => {
    const renderedModern = TemplateRenderer({
      templateId: "modern",
      data: mockPortfolioViewData,
      className: "custom-modern",
    });
    assert.ok(React.isValidElement<TemplateProps>(renderedModern));
    assert.equal(renderedModern.type, TemplateModern);
    assert.equal(renderedModern.props.className, "custom-modern");
    assert.equal(renderedModern.props.data.username, "janedev");

    const renderedMinimal = TemplateRenderer({
      templateId: "minimal",
      data: mockPortfolioViewData,
    });
    assert.ok(React.isValidElement<TemplateProps>(renderedMinimal));
    assert.equal(renderedMinimal.type, TemplateMinimal);

    const renderedProf = TemplateRenderer({
      templateId: "professional",
      data: mockPortfolioViewData,
    });
    assert.ok(React.isValidElement<TemplateProps>(renderedProf));
    assert.equal(renderedProf.type, TemplateProfessional);
  });

  await t.test("11. TemplateRenderer safely falls back to TemplateModern on invalid or undefined templateId", () => {
    const invalidRender = TemplateRenderer({
      templateId: "unknown-template",
      data: mockPortfolioViewData,
    });
    assert.ok(React.isValidElement(invalidRender));
    assert.equal(invalidRender.type, TemplateModern);

    const undefinedRender = TemplateRenderer({
      templateId: undefined,
      data: mockPortfolioViewData,
    });
    assert.ok(React.isValidElement(undefinedRender));
    assert.equal(undefinedRender.type, TemplateModern);

    const nullRender = TemplateRenderer({
      templateId: null,
      data: mockPortfolioViewData,
    });
    assert.ok(React.isValidElement(nullRender));
    assert.equal(nullRender.type, TemplateModern);
  });

  // -------------------------------------------------------------
  // Section 5: Data Contract Safety & Resilience Tests
  // -------------------------------------------------------------
  await t.test("12. Templates safely handle empty or minimal PortfolioViewData without throwing", () => {
    const sparseData: PortfolioViewData = {
      name: "",
      title: "",
      username: "",
      projects: [],
      skills: [],
      experiences: [],
    };

    assert.doesNotThrow(() => {
      TemplateModern({ data: sparseData });
      TemplateMinimal({ data: sparseData });
      TemplateProfessional({ data: sparseData });
      TemplateRenderer({ templateId: "modern", data: sparseData });
    });
  });
});
