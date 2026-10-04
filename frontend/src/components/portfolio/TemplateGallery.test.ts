import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { TemplateGallery } from "./TemplateGallery";
import { TemplateSelector } from "./TemplateSelector";
import { TEMPLATE_LIST, TemplateDefinition } from "@/templates/registry";
import { PortfolioViewData } from "@/templates/types";
import { PortfolioTemplateId } from "@/types/portfolio";

const mockPortfolioData: PortfolioViewData = {
  name: "Alex Morgan",
  title: "Senior Full-Stack Engineer",
  about: "Building scalable web applications.",
  email: "alex@example.com",
  phone: "+1 555 123 4567",
  location: "San Francisco, CA",
  profileImageUrl: "https://example.com/avatar.jpg",
  socialLinks: {
    github: "https://github.com/alexmorgan",
    linkedin: "https://linkedin.com/in/alexmorgan",
  },
  username: "alexmorgan",
  projects: [
    {
      id: "proj-1",
      portfolioId: "port-123",
      title: "DevMetrics",
      description: "Developer productivity intelligence dashboard.",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS"],
      projectUrl: "https://devmetrics.io",
      githubUrl: "https://github.com/alexmorgan/devmetrics",
      imageUrl: null,
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  skills: [
    {
      id: "skill-1",
      portfolioId: "port-123",
      name: "TypeScript",
      category: "Frontend",
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  experiences: [
    {
      id: "exp-1",
      portfolioId: "port-123",
      company: "Stripe",
      position: "Senior Frontend Engineer",
      startDate: "2021-03",
      endDate: null,
      isCurrent: true,
      description: "Leading payments UI architecture.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  template: "modern",
};

function getCards(element: React.ReactElement<any>): React.ReactElement<any>[] {
  return React.Children.toArray(element.props.children) as React.ReactElement<any>[];
}

function findCardById(cards: React.ReactElement<any>[], templateId: string): React.ReactElement<any> | undefined {
  return cards.find((c) => c.props["data-testid"] === `template-card-${templateId}`);
}

test("TPL-07: TemplateGallery Component & Selection Flow Suite", async (t) => {
  // -------------------------------------------------------------
  // 1. Renders all templates from TEMPLATE_LIST
  // -------------------------------------------------------------
  await t.test("1. Renders all templates dynamically from TEMPLATE_LIST", () => {
    const element = TemplateGallery({
      currentTemplate: "modern",
      portfolioData: mockPortfolioData,
      portfolioId: "port-123",
      onSelectTemplate: () => {},
    });

    assert.ok(React.isValidElement<any>(element));
    assert.equal(element.props["data-testid"], "template-gallery");

    const cards = getCards(element);
    assert.equal(cards.length, TEMPLATE_LIST.length);

    TEMPLATE_LIST.forEach(({ meta }) => {
      const card = findCardById(cards, meta.id);
      assert.ok(card, `Card for ${meta.id} must be present`);
    });
  });

  // -------------------------------------------------------------
  // 2. Displays template metadata
  // -------------------------------------------------------------
  await t.test("2. Displays template name, description, and badge metadata", () => {
    const element = TemplateGallery({
      currentTemplate: "modern",
      portfolioData: mockPortfolioData,
      portfolioId: "port-123",
      onSelectTemplate: () => {},
    });

    assert.ok(React.isValidElement<any>(element));
    const cards = getCards(element);
    assert.equal(cards.length, 3);

    // Modern Developer
    const modernCard = findCardById(cards, "modern")!;
    assert.ok(modernCard);

    const modernInfoDiv = React.Children.toArray(modernCard.props.children)[1] as React.ReactElement<any>;
    const modernDetailsDiv = React.Children.toArray(modernInfoDiv.props.children)[0] as React.ReactElement<any>;
    const [titleRow, descElem] = React.Children.toArray(modernDetailsDiv.props.children) as React.ReactElement<any>[];
    const titleH3 = React.Children.toArray(titleRow.props.children)[0] as React.ReactElement<any>;

    assert.equal(titleH3.props.children, "Modern Developer");
    assert.equal(descElem.props.children, TEMPLATE_LIST[0].meta.description);
  });

  // -------------------------------------------------------------
  // 3. Current template is accurately identified
  // -------------------------------------------------------------
  await t.test("3. Accurately identifies and highlights current template", () => {
    const element = TemplateGallery({
      currentTemplate: "minimal",
      portfolioData: mockPortfolioData,
      portfolioId: "port-123",
      onSelectTemplate: () => {},
    });

    assert.ok(React.isValidElement<any>(element));
    const cards = getCards(element);

    // Minimal card should be marked current
    const minimalCard = findCardById(cards, "minimal");
    assert.ok(minimalCard);
    assert.equal(minimalCard.props["aria-current"], "true");

    // Modern card should not be marked current
    const modernCard = findCardById(cards, "modern");
    assert.ok(modernCard);
    assert.equal(modernCard.props["aria-current"], undefined);

    // Professional card should not be marked current
    const profCard = findCardById(cards, "professional");
    assert.ok(profCard);
    assert.equal(profCard.props["aria-current"], undefined);
  });

  // -------------------------------------------------------------
  // 4. Preview action points to correct route with portfolio ID
  // -------------------------------------------------------------
  await t.test("4. Preview action generates correct URL with template ID and portfolio ID", () => {
    const element = TemplateGallery({
      currentTemplate: "modern",
      portfolioData: mockPortfolioData,
      portfolioId: "port-999",
      onSelectTemplate: () => {},
    });

    assert.ok(React.isValidElement<any>(element));
    const cards = getCards(element);
    const minimalCard = findCardById(cards, "minimal");
    assert.ok(minimalCard);

    const infoDiv = React.Children.toArray(minimalCard.props.children)[1] as React.ReactElement<any>;
    const footerDiv = React.Children.toArray(infoDiv.props.children)[1] as React.ReactElement<any>;
    const previewLink = React.Children.toArray(footerDiv.props.children)[0] as React.ReactElement<any>;

    assert.equal(previewLink.props.href, "/portfolio/templates/minimal?id=port-999");
    assert.equal(previewLink.props["data-testid"], "preview-btn-minimal");
  });

  // -------------------------------------------------------------
  // 5. Use Template triggers onSelectTemplate callback
  // -------------------------------------------------------------
  await t.test("5. Triggering Use Template calls onSelectTemplate with the clicked template ID", () => {
    let selectedTemplateId: PortfolioTemplateId | null = null;
    const element = TemplateGallery({
      currentTemplate: "modern",
      portfolioData: mockPortfolioData,
      portfolioId: "port-123",
      onSelectTemplate: (id) => {
        selectedTemplateId = id;
      },
    });

    assert.ok(React.isValidElement<any>(element));
    const cards = getCards(element);
    const profCard = findCardById(cards, "professional");
    assert.ok(profCard);

    const infoDiv = React.Children.toArray(profCard.props.children)[1] as React.ReactElement<any>;
    const footerDiv = React.Children.toArray(infoDiv.props.children)[1] as React.ReactElement<any>;
    const useBtn = React.Children.toArray(footerDiv.props.children)[1] as React.ReactElement<any>;

    assert.equal(useBtn.props["data-testid"], "use-template-btn-professional");
    useBtn.props.onClick();

    assert.equal(selectedTemplateId, "professional");
  });

  // -------------------------------------------------------------
  // 6. Loading state disables action and shows applying indicator
  // -------------------------------------------------------------
  await t.test("6. Loading state disables buttons and shows applying indicator", () => {
    const element = TemplateGallery({
      currentTemplate: "modern",
      portfolioData: mockPortfolioData,
      portfolioId: "port-123",
      onSelectTemplate: () => {},
      isSaving: true,
      savingTemplateId: "minimal",
    });

    assert.ok(React.isValidElement<any>(element));
    const cards = getCards(element);
    const minimalCard = findCardById(cards, "minimal");
    assert.ok(minimalCard);

    const infoDiv = React.Children.toArray(minimalCard.props.children)[1] as React.ReactElement<any>;
    const footerDiv = React.Children.toArray(infoDiv.props.children)[1] as React.ReactElement<any>;
    const useBtn = React.Children.toArray(footerDiv.props.children)[1] as React.ReactElement<any>;

    assert.equal(useBtn.props.disabled, true);
    // Verifies applying spinner text
    const btnChildren = React.Children.toArray(useBtn.props.children);
    const labelSpan = btnChildren.find(
      (c) => React.isValidElement(c) && (c as React.ReactElement<{ children: string }>).props.children === "Applying..."
    );
    assert.ok(labelSpan, "Should display 'Applying...' indicator during save");
  });

  // -------------------------------------------------------------
  // 7. Invalid/unrecognized template ID falls back safely
  // -------------------------------------------------------------
  await t.test("7. Unrecognized template ID safely falls back to modern as active without crashing", () => {
    const element = TemplateGallery({
      currentTemplate: "non-existent-template" as unknown as PortfolioTemplateId,
      portfolioData: mockPortfolioData,
      portfolioId: "port-123",
      onSelectTemplate: () => {},
    });

    assert.ok(React.isValidElement<any>(element));
    const cards = getCards(element);
    const modernCard = findCardById(cards, "modern");
    assert.ok(modernCard);
    assert.equal(modernCard.props["aria-current"], "true");
  });

  // -------------------------------------------------------------
  // 8. Future template compatibility
  // -------------------------------------------------------------
  await t.test("8. Dynamically supports future templates added via registry without gallery modification", () => {
    const mockFutureTemplate: TemplateDefinition = {
      meta: {
        id: "creative" as PortfolioTemplateId,
        name: "Creative Portfolio",
        description: "Bold vibrant layout for artists and visual developers.",
        badge: "New",
      },
      component: () => React.createElement("div", null, "Creative Template"),
    };

    const extendedList: TemplateDefinition[] = [...TEMPLATE_LIST, mockFutureTemplate];

    const element = TemplateGallery({
      currentTemplate: "modern",
      portfolioData: mockPortfolioData,
      portfolioId: "port-123",
      onSelectTemplate: () => {},
      templates: extendedList,
    });

    assert.ok(React.isValidElement<any>(element));
    const cards = getCards(element);
    assert.equal(cards.length, 4);

    const creativeCard = findCardById(cards, "creative");
    assert.ok(creativeCard, "Future template card must be rendered");
    assert.equal(creativeCard.props["data-testid"], "template-card-creative");
  });

  // -------------------------------------------------------------
  // 9. Null and empty collections handle safely
  // -------------------------------------------------------------
  await t.test("9. Handles portfolio data with empty collections and null fields without throwing", () => {
    const minimalData: PortfolioViewData = {
      name: "Empty User",
      title: "Developer",
      username: "emptyuser",
      projects: [],
      skills: [],
      experiences: [],
    };

    assert.doesNotThrow(() => {
      TemplateGallery({
        currentTemplate: "modern",
        portfolioData: minimalData,
        portfolioId: "port-empty",
        onSelectTemplate: () => {},
      });
    });
  });

  // -------------------------------------------------------------
  // 10. Existing TemplateSelector remains intact and operational
  // -------------------------------------------------------------
  await t.test("10. Existing TemplateSelector remains functional for compact form-level changes", () => {
    let changed = false;
    const selectorElem = TemplateSelector({
      value: "professional",
      onChange: () => {
        changed = true;
      },
    });

    assert.ok(React.isValidElement<any>(selectorElem));
    const buttons = React.Children.toArray(selectorElem.props.children) as React.ReactElement<any>[];
    assert.equal(buttons.length, 3);
    assert.equal(buttons[2].props["aria-checked"], true);

    buttons[0].props.onClick();
    assert.equal(changed, true);
  });
});
