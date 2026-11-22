/* eslint-disable @typescript-eslint/no-explicit-any */
/* Phase 13: template categories, filtering, selection and preview switching UI. */
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TemplateCategoryFilter,
  filterTemplatesByCategory,
  type TemplateCategoryFilterValue,
} from "./TemplateCategoryFilter";
import { TemplateGallery } from "./TemplateGallery";
import { TemplateSelector } from "./TemplateSelector";
import { PreviewShell } from "./PreviewShell";
import { TEMPLATE_CATEGORIES, TEMPLATE_LIST } from "@/templates/registry";
import { mapDraftToPortfolioViewData, type PortfolioViewData } from "@/templates/types";

const viewData: PortfolioViewData = mapDraftToPortfolioViewData(
  { name: "Jane Doe", title: "Engineer", username: "janedoe", template: "bento" },
  { projects: [], skills: [], experiences: [] }
);

const ids = (list: { meta: { id: string } }[]) => list.map((t) => t.meta.id);

test("Phase 13: template category filtering", async (t) => {
  await t.test("'all' returns every template in registry order", () => {
    assert.deepEqual(ids(filterTemplatesByCategory(TEMPLATE_LIST, "all")), ids(TEMPLATE_LIST));
  });

  await t.test("each category returns only its templates, preserving display order", () => {
    assert.deepEqual(ids(filterTemplatesByCategory(TEMPLATE_LIST, "developer")), ["modern", "bento", "showcase"]);
    assert.deepEqual(ids(filterTemplatesByCategory(TEMPLATE_LIST, "minimal")), ["minimal", "editorial"]);
    assert.deepEqual(ids(filterTemplatesByCategory(TEMPLATE_LIST, "professional")), ["professional", "executive"]);
    assert.deepEqual(ids(filterTemplatesByCategory(TEMPLATE_LIST, "creative")), ["studio"]);
    assert.deepEqual(ids(filterTemplatesByCategory(TEMPLATE_LIST, "academic")), ["academic"]);
  });

  await t.test("categories partition the collection (no template lost or duplicated)", () => {
    const total = TEMPLATE_CATEGORIES.reduce(
      (sum, c) => sum + filterTemplatesByCategory(TEMPLATE_LIST, c.id).length,
      0
    );
    assert.equal(total, TEMPLATE_LIST.length);
  });

  await t.test("filter renders a labelled toggle group with counts and reports changes", () => {
    const changes: TemplateCategoryFilterValue[] = [];
    const element = TemplateCategoryFilter({ value: "developer", onChange: (v) => changes.push(v) });
    assert.equal(element.props.role, "group");
    assert.equal(element.props["aria-label"], "Filter templates by category");

    const buttons = React.Children.toArray(element.props.children) as React.ReactElement<any>[];
    assert.deepEqual(
      buttons.map((b) => b.props["data-testid"]),
      ["category-filter-all", ...TEMPLATE_CATEGORIES.map((c) => `category-filter-${c.id}`)]
    );
    const pressed = buttons.filter((b) => b.props["aria-pressed"] === true);
    assert.equal(pressed.length, 1);
    assert.equal(pressed[0].props["data-testid"], "category-filter-developer");

    buttons.find((b) => b.props["data-testid"] === "category-filter-creative")!.props.onClick();
    assert.deepEqual(changes, ["creative"]);

    const html = renderToStaticMarkup(element);
    assert.match(html, /All templates<\/span><span[^>]*>9</);
    assert.match(html, /Developer<\/span><span[^>]*>3</);
  });

  await t.test("filter omits categories that have no templates in the supplied list", () => {
    const element = TemplateCategoryFilter({
      value: "all",
      onChange: () => {},
      templates: filterTemplatesByCategory(TEMPLATE_LIST, "academic"),
    });
    const buttons = React.Children.toArray(element.props.children) as React.ReactElement<any>[];
    assert.deepEqual(buttons.map((b) => b.props["data-testid"]), ["category-filter-all", "category-filter-academic"]);
  });
});

test("Phase 13: gallery, selector and preview switcher", async (t) => {
  await t.test("gallery renders only the filtered templates and labels each card's category", () => {
    const element = TemplateGallery({
      currentTemplate: "bento",
      portfolioData: viewData,
      onSelectTemplate: () => {},
      templates: filterTemplatesByCategory(TEMPLATE_LIST, "developer"),
    });
    const cards = React.Children.toArray(element.props.children) as React.ReactElement<any>[];
    assert.deepEqual(
      cards.map((c) => c.props["data-testid"]),
      ["template-card-modern", "template-card-bento", "template-card-showcase"]
    );
    const html = renderToStaticMarkup(element);
    assert.equal((html.match(/data-testid="template-category-[a-z]+"[^>]*>Developer</g) || []).length, 3);
    assert.match(html, /data-testid="current-badge-bento"/);
    assert.match(html, /href="\/portfolio\/templates\/showcase"/);
    assert.match(html, /content-visibility:auto/);
  });

  await t.test("gallery renders a live mini-preview of every template with the user's data", () => {
    const html = renderToStaticMarkup(
      TemplateGallery({ currentTemplate: "modern", portfolioData: viewData, onSelectTemplate: () => {} })
    );
    for (const { meta } of TEMPLATE_LIST) {
      assert.match(html, new RegExp(`data-testid="template-${meta.id}"`), `${meta.id} mini preview`);
    }
  });

  await t.test("selector offers every template as a radio with its category", () => {
    let picked = "";
    const element = TemplateSelector({ value: "executive", onChange: (v) => (picked = v) });
    const buttons = React.Children.toArray(element.props.children) as React.ReactElement<any>[];
    assert.equal(buttons.length, TEMPLATE_LIST.length);
    const checked = buttons.filter((b) => b.props["aria-checked"] === true);
    assert.equal(checked.length, 1);
    assert.equal(checked[0].key, ".$executive");
    buttons[TEMPLATE_LIST.findIndex((x) => x.meta.id === "studio")].props.onClick();
    assert.equal(picked, "studio");

    const html = renderToStaticMarkup(element);
    for (const { meta } of TEMPLATE_LIST) {
      assert.match(html, new RegExp(`data-testid="template-category-${meta.id}"`));
    }
  });

  await t.test("selector falls back to modern for an unknown stored template", () => {
    const element = TemplateSelector({ value: "retired_theme" as any, onChange: () => {} });
    const buttons = React.Children.toArray(element.props.children) as React.ReactElement<any>[];
    assert.equal(buttons.find((b) => b.props["aria-checked"] === true)!.key, ".$modern");
  });

  await t.test("preview switcher lists all templates, marks the active one and names it", () => {
    const html = renderToStaticMarkup(
      React.createElement(PreviewShell, { data: viewData, templateId: "academic", onTemplateChange: () => {} })
    );
    assert.match(html, /data-testid="preview-template-switcher"/);
    for (const { meta } of TEMPLATE_LIST) {
      const pressed = meta.id === "academic" ? "true" : "false";
      assert.match(html, new RegExp(`aria-label="Use ${meta.id} template" aria-pressed="${pressed}"`), meta.id);
    }
    assert.match(html, /aria-label="Change preview template \(current: Academic CV\)"/);
    assert.match(html, /data-testid="template-academic"/, "preview renders the selected template");
  });

  await t.test("preview switcher is hidden without onTemplateChange (read-only previews)", () => {
    const html = renderToStaticMarkup(React.createElement(PreviewShell, { data: viewData }));
    assert.doesNotMatch(html, /preview-template-switcher/);
    assert.match(html, /data-testid="template-bento"/, "falls back to data.template");
  });
});

test("Phase 13: landing page template showcase", async (t) => {
  const { default: LandingTemplateShowcase } = await import("@/components/landing/TemplateShowcase");
  const html = renderToStaticMarkup(React.createElement(LandingTemplateShowcase));

  await t.test("advertises the full collection size from the registry", () => {
    assert.match(html, new RegExp(`One portfolio\\. (<!-- -->)?${TEMPLATE_LIST.length}(<!-- -->)? distinct designs\\.`));
  });

  await t.test("shows one card per registered template with its registry name, category and description", () => {
    for (const { meta } of TEMPLATE_LIST) {
      const card = html.match(new RegExp(`data-testid="landing-template-${meta.id}"[\\s\\S]*?</li>`))?.[0] || "";
      assert.ok(card, `${meta.id} card`);
      assert.ok(card.includes(`>${meta.name}<`), `${meta.id} name`);
      assert.ok(card.includes(meta.description.replace(/&/g, "&amp;")), `${meta.id} description`);
    }
    assert.equal((html.match(/data-testid="landing-template-/g) || []).length, TEMPLATE_LIST.length);
  });

  await t.test("lists every category in the legend and keeps the #templates anchor", () => {
    assert.match(html, /<section id="templates"/);
    for (const category of TEMPLATE_CATEGORIES) assert.ok(html.includes(`>${category.label}<`), category.label);
  });
});
