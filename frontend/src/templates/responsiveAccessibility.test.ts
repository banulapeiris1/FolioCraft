import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { TemplateMinimal } from "./minimal/TemplateMinimal";
import { TemplateModern } from "./modern/TemplateModern";
import { TemplateProfessional } from "./professional/TemplateProfessional";
import { TemplateSelector } from "@/components/portfolio/TemplateSelector";
import { TemplateGallery } from "@/components/portfolio/TemplateGallery";
import { PortfolioViewData } from "./types";

const extremeLongData: PortfolioViewData = {
  name: "Dr. Alexander Wolfeschlegelsteinhausenbergerdorff the Third",
  title: "Distinguished Principal Lead Fellow of Enterprise Cloud Native Distributed Artificial Intelligence Systems Architecture",
  about: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(25),
  email: "alexander.wolfeschlegelsteinhausenbergerdorff.third@very-long-corporate-subdomain.enterprise-technologies.ac.uk",
  phone: "+1 (555) 987-6543 ext. 8912489",
  location: "Svalbard Global Seed Vault Facilities, Spitsbergen, Longyearbyen, Svalbard and Jan Mayen",
  profileImageUrl: "https://example.com/very-long-nested-path/storage/avatars/2026/04/high-resolution-portrait-image.png?version=4.5.1&token=abcdef1234567890",
  socialLinks: {
    github: "https://github.com/alexander-wolfeschlegelsteinhausenbergerdorff-the-third-distinguished-architect",
    linkedin: "https://linkedin.com/in/alexander-wolfeschlegelsteinhausenbergerdorff-the-third",
    website: "https://www.alexander-wolfeschlegelsteinhausenbergerdorff-systems-architecture.engineering.io",
  },
  username: "alexander-wolfeschlegelsteinhausenbergerdorff",
  template: "modern",
  projects: [
    {
      id: "p-extreme",
      portfolioId: "port-extreme",
      title: "Ultra-High-Throughput Heterogeneous Multithreaded Distributed Event Processor Daemon",
      description: "Comprehensive end-to-end resilient transactional message streaming bus capable of zero-copy buffer serialization across geo-distributed hybrid cloud enclaves.".repeat(3),
      technologies: [
        "Rust", "TypeScript", "Next.js", "Tailwind CSS", "PostgreSQL",
        "Redis", "Kafka", "Kubernetes", "Terraform", "WebAssembly",
        "gRPC", "Protobuf", "Docker", "GraphQL", "Python",
      ],
      githubUrl: "https://github.com/alexander/ultra-high-throughput-heterogeneous-daemon",
      projectUrl: "https://ultra-high-throughput-heterogeneous-daemon.production.internal",
      imageUrl: "https://example.com/screenshot.jpg",
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  skills: [
    {
      id: "s-extreme-1",
      portfolioId: "port-extreme",
      name: "High-Performance Asynchronous Non-Blocking I/O Architecture",
      category: "Architectural Disciplines & Engineering Methodologies",
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  experiences: [
    {
      id: "e-extreme-1",
      portfolioId: "port-extreme",
      company: "International Global Multidisciplinary Telecommunications & Distributed Infrastructure Corporation",
      position: "Senior Executive Principal Chief Architect and Vice President of Global Systems Reliability",
      startDate: "2018-01",
      endDate: null,
      isCurrent: true,
      description: "Directing strategic infrastructure modernization and planetary-scale operational excellence across thirty-five regional data centers.".repeat(4),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const extremeEmptyData: PortfolioViewData = {
  name: "",
  title: "",
  username: "empty",
  projects: [],
  skills: [],
  experiences: [],
  about: null,
  email: null,
  phone: null,
  location: null,
  profileImageUrl: null,
  socialLinks: {},
};

test("TPL-08: Final Responsive & Accessibility Audit Suite", async (t) => {
  // -------------------------------------------------------------
  // Section 1: Extreme Long Content Robustness
  // -------------------------------------------------------------
  await t.test("1. TemplateMinimal safely renders extreme long content with break-words wrapping", () => {
    assert.doesNotThrow(() => {
      const element = TemplateMinimal({ data: extremeLongData });
      assert.ok(React.isValidElement(element));
    });
  });

  await t.test("2. TemplateModern safely renders extreme long content with break-words wrapping", () => {
    assert.doesNotThrow(() => {
      const element = TemplateModern({ data: extremeLongData });
      assert.ok(React.isValidElement(element));
    });
  });

  await t.test("3. TemplateProfessional safely renders extreme long content with break-words wrapping", () => {
    assert.doesNotThrow(() => {
      const element = TemplateProfessional({ data: extremeLongData });
      assert.ok(React.isValidElement(element));
    });
  });

  // -------------------------------------------------------------
  // Section 2: Extreme Empty Data Robustness
  // -------------------------------------------------------------
  await t.test("4. TemplateMinimal renders empty data cleanly without crashing or displaying empty sections", () => {
    const element = TemplateMinimal({ data: extremeEmptyData });
    assert.ok(React.isValidElement(element));
    const main = (element.props as { children: React.ReactElement }).children;
    const mainChildren = React.Children.toArray((main.props as { children: React.ReactNode }).children);

    const sections = mainChildren.filter((c) => React.isValidElement(c) && c.type === "section");
    assert.equal(sections.length, 0, "No sections should render when all collections are empty");
  });

  await t.test("5. TemplateModern renders empty data cleanly without crashing or displaying empty sections", () => {
    const element = TemplateModern({ data: extremeEmptyData });
    assert.ok(React.isValidElement(element));
    const main = (element.props as { children: React.ReactNode[] }).children[1] as React.ReactElement;
    const mainChildren = React.Children.toArray((main.props as { children: React.ReactNode }).children);

    const sections = mainChildren.filter((c) => React.isValidElement(c) && c.type === "section");
    assert.equal(sections.length, 0, "No sections should render when all collections are empty");
  });

  await t.test("6. TemplateProfessional renders empty data cleanly without crashing or displaying empty sections", () => {
    const element = TemplateProfessional({ data: extremeEmptyData });
    assert.ok(React.isValidElement(element));
    const main = (element.props as { children: React.ReactNode[] }).children[1] as React.ReactElement;
    const mainChildren = React.Children.toArray((main.props as { children: React.ReactNode }).children);

    const sections = mainChildren.filter((c) => React.isValidElement(c) && c.type === "section");
    assert.equal(sections.length, 0, "No sections should render when all collections are empty");
  });

  // -------------------------------------------------------------
  // Section 3: Semantic Structure and ARIA Attributes
  // -------------------------------------------------------------
  await t.test("7. TemplateSelector includes WAI-ARIA role radiogroup, aria-checked, and aria-describedby", () => {
    const element = TemplateSelector({
      value: "modern",
      onChange: () => {},
    });

    assert.ok(React.isValidElement<any>(element));
    assert.equal(element.props.role, "radiogroup");

    const buttons = React.Children.toArray(element.props.children) as React.ReactElement<any>[];
    assert.equal(buttons.length, 3);

    buttons.forEach((btn) => {
      assert.equal(btn.props.role, "radio");
      assert.ok(typeof btn.props["aria-checked"] === "boolean");
      assert.ok(btn.props["aria-describedby"], "Each radio option must reference its description");
    });
  });

  await t.test("8. TemplateGallery cards include aria-current and isolated preview frames", () => {
    const element = TemplateGallery({
      currentTemplate: "modern",
      portfolioData: extremeLongData,
      portfolioId: "port-123",
      onSelectTemplate: () => {},
    });

    assert.ok(React.isValidElement<any>(element));
    const cards = React.Children.toArray(element.props.children) as React.ReactElement<any>[];

    const currentCard = cards.find((c) => c.props["aria-current"] === "true");
    assert.ok(currentCard, "Active template card must possess aria-current='true'");

    // Check preview container
    const previewContainer = React.Children.toArray(currentCard.props.children)[0] as React.ReactElement<any>;
    const scaledFrame = React.Children.toArray(previewContainer.props.children)[0] as React.ReactElement<any>;
    assert.equal(scaledFrame.props["aria-hidden"], "true", "Miniature preview frame must be aria-hidden");
    assert.equal(scaledFrame.props.tabIndex, -1, "Miniature preview frame must not steal keyboard focus");
  });
});
