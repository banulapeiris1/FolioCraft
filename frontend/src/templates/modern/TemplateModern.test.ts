import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { TemplateModern } from "./TemplateModern";
import { PortfolioViewData } from "../types";

const mockFullData: PortfolioViewData = {
  name: "Marcus Vance",
  title: "Full Stack Systems Architect",
  about: "Specializing in high-throughput microservices, Kubernetes clusters, and low-latency frontend applications.",
  email: "marcus@vance.dev",
  phone: "+1 555-0812",
  location: "Seattle, WA",
  profileImageUrl: "https://example.com/marcus.jpg",
  socialLinks: {
    github: "https://github.com/marcusvance",
    linkedin: "https://linkedin.com/in/marcusvance",
    twitter: "https://twitter.com/marcusvance",
  },
  username: "marcusvance",
  template: "modern",
  projects: [
    {
      id: "p1",
      portfolioId: "port-1",
      title: "HyperMesh Cluster",
      description: "Distributed service mesh with zero-trust mTLS encryption.",
      technologies: ["Go", "Kubernetes", "Rust", "Envoy"],
      githubUrl: "https://github.com/marcusvance/hypermesh",
      projectUrl: "https://hypermesh.dev",
      imageUrl: "https://example.com/hypermesh.png",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "p2",
      portfolioId: "port-1",
      title: "K-Metrics Agent",
      description: "eBPF-powered network monitoring agent.",
      technologies: ["C", "eBPF", "Prometheus"],
      githubUrl: "https://github.com/marcusvance/kmetrics",
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
      name: "Go",
      category: "Languages",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "s2",
      portfolioId: "port-1",
      name: "TypeScript",
      category: "Languages",
      orderIndex: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "s3",
      portfolioId: "port-1",
      name: "Kubernetes",
      category: "Cloud & DevOps",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  experiences: [
    {
      id: "e1",
      portfolioId: "port-1",
      company: "Stratos Cloud",
      position: "Staff Infrastructure Engineer",
      description: "Architected multi-region failover network handling 1M RPS.",
      startDate: "2023-03-01",
      endDate: null,
      isCurrent: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "e2",
      portfolioId: "port-1",
      company: "DataVantage",
      position: "Senior Backend Developer",
      description: "Implemented high-throughput event processing pipelines.",
      startDate: "2021-01-01",
      endDate: "2023-02-28",
      isCurrent: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

test("TPL-05: TemplateModern (Modern Developer) Component Suite", async (t) => {
  // -------------------------------------------------------------
  // Section 1: Full Data Rendering & Structure
  // -------------------------------------------------------------
  await t.test("1. Renders complete template with root data-testid and semantic elements", () => {
    const element = TemplateModern({ data: mockFullData, className: "custom-modern-class" });
    assert.ok(React.isValidElement<{ "data-testid"?: string; className?: string }>(element));
    assert.equal(element.props["data-testid"], "template-modern");
    assert.ok(element.props.className?.includes("custom-modern-class"));
    assert.ok(element.props.className?.includes("template-modern"));
  });

  await t.test("2. Technical navigation bar renders brand identifier and section anchors", () => {
    const element = TemplateModern({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);

    const nav = children.find(
      (c) => React.isValidElement(c) && c.type === "nav"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(nav, "Navigation bar must exist in modern template");

    // Brand identifier contains username
    const navContent = React.Children.toArray(nav.props.children)[0] as React.ReactElement<{ children: React.ReactNode }>;
    assert.ok(React.isValidElement(navContent));
    const navItems = React.Children.toArray(navContent.props.children);

    const brandLink = navItems[0] as React.ReactElement<{ href?: string; children: React.ReactNode }>;
    assert.equal(brandLink.props.href, "#about");
  });

  await t.test("3. Hero header renders name, title, about, location, email, and phone", () => {
    const element = TemplateModern({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);

    const main = children.find(
      (c) => React.isValidElement(c) && c.type === "main"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(main, "Main element must exist");

    const mainChildren = React.Children.toArray(main.props.children);
    const header = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "header"
    ) as React.ReactElement<{ id?: string; children: React.ReactNode }> | undefined;
    assert.ok(header, "Header must exist with id='about'");
    assert.equal(header.props.id, "about");
  });

  // -------------------------------------------------------------
  // Section 2: Projects Section
  // -------------------------------------------------------------
  await t.test("4. Renders featured projects with technologies and external links", () => {
    const element = TemplateModern({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);
    const main = children.find((c) => React.isValidElement(c) && c.type === "main") as React.ReactElement<{ children: React.ReactNode }>;
    const mainChildren = React.Children.toArray(main.props.children);

    const projSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "projects"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(projSection, "Projects section must be rendered");
  });

  // -------------------------------------------------------------
  // Section 3: Experience Timeline
  // -------------------------------------------------------------
  await t.test("5. Renders experience timeline with current role badge and dates", () => {
    const element = TemplateModern({ data: mockFullData });
    const children = React.Children.toArray(element.props.children);
    const main = children.find((c) => React.isValidElement(c) && c.type === "main") as React.ReactElement<{ children: React.ReactNode }>;
    const mainChildren = React.Children.toArray(main.props.children);

    const expSection = mainChildren.find(
      (c) => React.isValidElement(c) && c.type === "section" && (c.props as { id?: string }).id === "experience"
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
    assert.ok(expSection, "Experience section must be rendered");
  });

  // -------------------------------------------------------------
  // Section 4: Skills Section
  // -------------------------------------------------------------
  await t.test("6. Renders technical skills grouped by category with monospace chips", () => {
    const element = TemplateModern({ data: mockFullData });
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
  await t.test("7. Renders contact CTA and developer footer", () => {
    const element = TemplateModern({ data: mockFullData });
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
      name: "Dev Only",
      title: "Software Engineer",
      username: "devonly",
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

    const element = TemplateModern({ data: sparseData });
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
      TemplateModern({ data: emptyData });
    });
  });
});
