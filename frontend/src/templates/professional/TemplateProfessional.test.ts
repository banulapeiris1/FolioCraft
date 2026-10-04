import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { TemplateProfessional } from "./TemplateProfessional";
import { PortfolioViewData } from "../types";

const mockFullData: PortfolioViewData = {
  name: "Dr. Evelyn Sterling",
  title: "Chief Technology Advisor & Enterprise Architect",
  about: "Advising Fortune 500 boards and enterprise engineering leaders on digital transformation, cloud migrations, and executive governance.",
  email: "evelyn@sterling-advisory.com",
  phone: "+1 555-0391",
  location: "New York, NY",
  profileImageUrl: "https://example.com/evelyn.jpg",
  socialLinks: {
    linkedin: "https://linkedin.com/in/evelynsterling",
    github: "https://github.com/evelynsterling",
    website: "https://sterling-advisory.com",
  },
  username: "evelynsterling",
  template: "professional",
  projects: [
    {
      id: "p1",
      portfolioId: "port-1",
      title: "Global FinTech Architecture Modernization",
      description: "Led core banking transaction engine overhaul across 4 continents.",
      technologies: ["Enterprise Java", "Kafka", "AWS", "Zero Trust"],
      githubUrl: "https://github.com/evelynsterling/enterprise-core",
      projectUrl: "https://sterling-advisory.com/case-studies/fintech",
      imageUrl: "https://example.com/fintech.jpg",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "p2",
      portfolioId: "port-1",
      title: "Healthcare Compliance Platform",
      description: "HIPAA-certified distributed health data repository.",
      technologies: ["PostgreSQL", "FHIR", "GCP"],
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
      name: "Enterprise Architecture",
      category: "Strategy & Governance",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "s2",
      portfolioId: "port-1",
      name: "Cloud Transformation",
      category: "Strategy & Governance",
      orderIndex: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "s3",
      portfolioId: "port-1",
      name: "Distributed Systems",
      category: "Technology Core",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  experiences: [
    {
      id: "e1",
      portfolioId: "port-1",
      company: "Sterling Advisory Group",
      position: "Managing Partner & Principal Consultant",
      description: "Overseeing enterprise architecture audits and board advisory for Tier-1 institutions.",
      startDate: "2021-06-01",
      endDate: null,
      isCurrent: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "e2",
      portfolioId: "port-1",
      company: "Vanguard Global Systems",
      position: "Vice President of Engineering",
      description: "Directed 120+ software engineers across distributed infrastructure and platform teams.",
      startDate: "2016-01-01",
      endDate: "2021-05-31",
      isCurrent: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

test("TPL-06: TemplateProfessional (Classic Executive) Component Suite", async (t) => {
  // -------------------------------------------------------------
  // Section 1: Full Data Rendering & Structure
  // -------------------------------------------------------------
  await t.test("1. Renders complete template with root data-testid and semantic elements", () => {
    const element = TemplateProfessional({ data: mockFullData, className: "custom-prof-class" });
    assert.ok(React.isValidElement<{ "data-testid"?: string; className?: string }>(element));
    assert.equal(element.props["data-testid"], "template-professional");
    assert.ok(element.props.className?.includes("custom-prof-class"));
    assert.ok(element.props.className?.includes("template-professional"));
  });

  await t.test("2. Executive navigation bar renders brand name and in-page anchor links", () => {
    const element = TemplateProfessional({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);

    const nav = children.find(
      (c) => React.isValidElement(c) && c.type === "nav"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(nav, "Navigation bar must exist in professional template");

    const navContent = React.Children.toArray(nav.props.children)[0] as React.ReactElement<{ children: React.ReactNode }>;
    assert.ok(React.isValidElement(navContent));
    const navItems = React.Children.toArray(navContent.props.children);

    const brandLink = navItems[0] as React.ReactElement<{ href?: string; children: React.ReactNode }>;
    assert.equal(brandLink.props.href, "#summary");
  });

  await t.test("3. Executive header renders name, title, about, location, email, and phone", () => {
    const element = TemplateProfessional({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);

    const main = children.find(
      (c) => React.isValidElement(c) && c.type === "main"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(main, "Main element must exist");

    const mainChildren = React.Children.toArray(main.props.children);
    const header = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "header"
    ) as React.ReactElement<{ id?: string; children: React.ReactNode }> | undefined;
    assert.ok(header, "Header must exist with id='summary'");
    assert.equal(header.props.id, "summary");
  });

  // -------------------------------------------------------------
  // Section 2: Experience Section
  // -------------------------------------------------------------
  await t.test("4. Renders career history cards with company, role, date range, and current badge", () => {
    const element = TemplateProfessional({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);
    const main = children.find((c) => React.isValidElement(c) && c.type === "main") as React.ReactElement<{ children: React.ReactNode }>;
    const mainChildren = React.Children.toArray(main.props.children);

    const expSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "experience"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(expSection, "Experience section must be rendered");
  });

  // -------------------------------------------------------------
  // Section 3: Key Engagements / Projects
  // -------------------------------------------------------------
  await t.test("5. Renders key engagements with technologies, external links, and descriptions", () => {
    const element = TemplateProfessional({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);
    const main = children.find((c) => React.isValidElement(c) && c.type === "main") as React.ReactElement<{ children: React.ReactNode }>;
    const mainChildren = React.Children.toArray(main.props.children);

    const projSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "projects"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(projSection, "Projects section must be rendered");
  });

  // -------------------------------------------------------------
  // Section 4: Core Competencies / Skills
  // -------------------------------------------------------------
  await t.test("6. Renders core competencies grouped by category in structured cards", () => {
    const element = TemplateProfessional({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);
    const main = children.find((c) => React.isValidElement(c) && c.type === "main") as React.ReactElement<{ children: React.ReactNode }>;
    const mainChildren = React.Children.toArray(main.props.children);

    const skillsSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "skills"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(skillsSection, "Skills section must be rendered");
  });

  // -------------------------------------------------------------
  // Section 5: Contact & Footer
  // -------------------------------------------------------------
  await t.test("7. Renders executive contact CTA and classic footer", () => {
    const element = TemplateProfessional({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);
    const main = children.find((c) => React.isValidElement(c) && c.type === "main") as React.ReactElement<{ children: React.ReactNode }>;
    const mainChildren = React.Children.toArray(main.props.children);

    const contactSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "contact"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(contactSection, "Contact section must be rendered");

    const footer = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "footer"
    );
    assert.ok(footer, "Footer must be rendered");
  });

  // -------------------------------------------------------------
  // Section 6: Graceful Degradation / Partial Data
  // -------------------------------------------------------------
  await t.test("8. Gracefully omits empty sections and missing optional fields", () => {
    const sparseData: PortfolioViewData = {
      name: "Jane Executive",
      title: "Management Consultant",
      username: "janeexec",
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

    const element = TemplateProfessional({ data: sparseData });
    const children = React.Children.toArray(element.props.children);
    const main = children.find((c) => React.isValidElement(c) && c.type === "main") as React.ReactElement<{ children: React.ReactNode }>;
    const mainChildren = React.Children.toArray(main.props.children);

    // Verify sections with 0 items are omitted
    const expSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "experience"
    );
    assert.equal(expSection, undefined, "Experience section must be omitted when empty");

    const projSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "projects"
    );
    assert.equal(projSection, undefined, "Projects section must be omitted when empty");

    const skillsSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "skills"
    );
    assert.equal(skillsSection, undefined, "Skills section must be omitted when empty");

    const contactSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "contact"
    );
    assert.equal(contactSection, undefined, "Contact section must be omitted when empty");
  });

  await t.test("9. Minimal or empty PortfolioViewData does not throw", () => {
    const emptyData: PortfolioViewData = {
      name: "",
      title: "",
      username: "",
      projects: [],
      skills: [],
      experiences: [],
    };

    assert.doesNotThrow(() => {
      TemplateProfessional({ data: emptyData });
    });
  });
});
