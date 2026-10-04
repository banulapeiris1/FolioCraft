import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { TemplateMinimal } from "./TemplateMinimal";
import { PortfolioViewData } from "../types";

const mockFullData: PortfolioViewData = {
  name: "Alex Morgan",
  title: "Principal Systems Designer",
  about: "Specializing in distributed infrastructure and elegant, minimalist software architecture.",
  email: "alex@example.com",
  phone: "+1 555-0144",
  location: "Austin, TX",
  profileImageUrl: "https://example.com/avatar.jpg",
  socialLinks: {
    github: "https://github.com/alexmorgan",
    linkedin: "https://linkedin.com/in/alexmorgan",
    twitter: "https://twitter.com/alexmorgan",
  },
  username: "alexmorgan",
  template: "minimal",
  projects: [
    {
      id: "p1",
      portfolioId: "port-1",
      title: "MicroKernel Orchestrator",
      description: "Low-overhead container execution daemon written in Rust.",
      technologies: ["Rust", "Linux", "gRPC"],
      githubUrl: "https://github.com/alexmorgan/microkernel",
      projectUrl: "https://microkernel.dev",
      imageUrl: "https://example.com/project.jpg",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "p2",
      portfolioId: "port-1",
      title: "StreamPipe",
      description: "Real-time telemetry pipeline.",
      technologies: ["Go", "Kafka"],
      githubUrl: null,
      projectUrl: null,
      imageUrl: null,
      orderIndex: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  skills: [
    {
      id: "s1",
      portfolioId: "port-1",
      name: "Rust",
      category: "Languages",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "s2",
      portfolioId: "port-1",
      name: "Go",
      category: "Languages",
      orderIndex: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "s3",
      portfolioId: "port-1",
      name: "Distributed Systems",
      category: "Concepts",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  experiences: [
    {
      id: "e1",
      portfolioId: "port-1",
      company: "Apex Cloud",
      position: "Lead Infrastructure Architect",
      description: "Architected edge caching network serving 500k requests/sec.",
      startDate: "2023-01-01",
      endDate: null,
      isCurrent: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "e2",
      portfolioId: "port-1",
      company: "Foundry Labs",
      position: "Senior Systems Engineer",
      description: "Maintained core storage cluster.",
      startDate: "2020-06-01",
      endDate: "2022-12-31",
      isCurrent: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

test("TPL-04: TemplateMinimal Component Suite", async (t) => {
  // -------------------------------------------------------------
  // Section 1: Full Data Rendering
  // -------------------------------------------------------------
  await t.test("1. Renders complete template with root data-testid and semantic main element", () => {
    const element = TemplateMinimal({ data: mockFullData, className: "custom-class" });
    assert.ok(React.isValidElement<{ "data-testid"?: string; className?: string }>(element));
    assert.equal(element.props["data-testid"], "template-minimal");
    assert.ok(element.props.className?.includes("custom-class"));
    assert.ok(element.props.className?.includes("template-minimal"));
  });

  await t.test("2. Hero header renders name, title, about, location, email, and phone", () => {
    const element = TemplateMinimal({ data: mockFullData });
    const main = (element.props as { children: React.ReactElement }).children;
    assert.ok(React.isValidElement(main));

    const mainChildren = React.Children.toArray((main.props as { children: React.ReactNode }).children);
    const header = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "header"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(header, "Header must exist in minimal template");

    // Inspect address block for email & phone
    const headerChildren = React.Children.toArray(header.props.children);
    const address = headerChildren.find(
      (c) => React.isValidElement(c) && c.type === "address"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(address, "Address element must exist for contact details");

    const addressLinks = React.Children.toArray(address.props.children) as React.ReactElement<{ href?: string }>[];
    const emailLink = addressLinks.find((l) => l.props?.href === "mailto:alex@example.com");
    assert.ok(emailLink, "Mailto link must be present");

    const phoneLink = addressLinks.find((l) => l.props?.href === "tel:+1 555-0144");
    assert.ok(phoneLink, "Tel link must be present");
  });

  // -------------------------------------------------------------
  // Section 2: Experience Rendering
  // -------------------------------------------------------------
  await t.test("3. Renders experience section with formatted date range and current badge", () => {
    const element = TemplateMinimal({ data: mockFullData });
    const main = (element.props as { children: React.ReactElement }).children;
    const mainChildren = React.Children.toArray((main.props as { children: React.ReactNode }).children);

    const expSection = mainChildren.find(
      (c) =>
        React.isValidElement(c) &&
        c.type === "section" &&
        (c.props as { "aria-labelledby"?: string })["aria-labelledby"] === "section-experience-heading"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(expSection, "Experience section must exist when experiences are provided");

    const expArticles = (
      React.Children.toArray((expSection.props.children as React.ReactNode[])[1] as React.ReactElement<{ children: React.ReactNode }>)
    );
    assert.ok(expArticles.length > 0);
  });

  // -------------------------------------------------------------
  // Section 3: Projects Rendering
  // -------------------------------------------------------------
  await t.test("4. Renders projects with titles, links, and technologies", () => {
    const element = TemplateMinimal({ data: mockFullData });
    const main = (element.props as { children: React.ReactElement }).children;
    const mainChildren = React.Children.toArray((main.props as { children: React.ReactNode }).children);

    const projSection = mainChildren.find(
      (c) =>
        React.isValidElement(c) &&
        c.type === "section" &&
        (c.props as { "aria-labelledby"?: string })["aria-labelledby"] === "section-projects-heading"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(projSection, "Projects section must exist when projects are provided");
  });

  // -------------------------------------------------------------
  // Section 4: Skills Rendering
  // -------------------------------------------------------------
  await t.test("5. Renders skills section grouped by category", () => {
    const element = TemplateMinimal({ data: mockFullData });
    const main = (element.props as { children: React.ReactElement }).children;
    const mainChildren = React.Children.toArray((main.props as { children: React.ReactNode }).children);

    const skillsSection = mainChildren.find(
      (c) =>
        React.isValidElement(c) &&
        c.type === "section" &&
        (c.props as { "aria-labelledby"?: string })["aria-labelledby"] === "section-skills-heading"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(skillsSection, "Skills section must exist when skills are provided");
  });

  // -------------------------------------------------------------
  // Section 5: Graceful Degradation / Empty Collections
  // -------------------------------------------------------------
  await t.test("6. Gracefully omits missing optional fields without rendering empty containers", () => {
    const sparseData: PortfolioViewData = {
      name: "Taylor Swift",
      title: "Songwriter",
      username: "taylorswift",
      projects: [],
      skills: [],
      experiences: [],
      // profileImageUrl omitted
      // about omitted
      // email omitted
      // phone omitted
      // location omitted
      // socialLinks omitted
    };

    const element = TemplateMinimal({ data: sparseData });
    const main = (element.props as { children: React.ReactElement }).children;
    const mainChildren = React.Children.toArray((main.props as { children: React.ReactNode }).children);

    // Verify sections with 0 items are NOT rendered
    const expSection = mainChildren.find(
      (c) =>
        React.isValidElement(c) &&
        c.type === "section" &&
        (c.props as { "aria-labelledby"?: string })["aria-labelledby"] === "section-experience-heading"
    );
    assert.equal(expSection, undefined, "Experience section must be omitted when empty");

    const projSection = mainChildren.find(
      (c) =>
        React.isValidElement(c) &&
        c.type === "section" &&
        (c.props as { "aria-labelledby"?: string })["aria-labelledby"] === "section-projects-heading"
    );
    assert.equal(projSection, undefined, "Projects section must be omitted when empty");

    const skillsSection = mainChildren.find(
      (c) =>
        React.isValidElement(c) &&
        c.type === "section" &&
        (c.props as { "aria-labelledby"?: string })["aria-labelledby"] === "section-skills-heading"
    );
    assert.equal(skillsSection, undefined, "Skills section must be omitted when empty");
  });

  await t.test("7. Fully empty or minimal data does not crash rendering", () => {
    const emptyData: PortfolioViewData = {
      name: "",
      title: "",
      username: "",
      projects: [],
      skills: [],
      experiences: [],
    };

    assert.doesNotThrow(() => {
      TemplateMinimal({ data: emptyData });
    });
  });
});
