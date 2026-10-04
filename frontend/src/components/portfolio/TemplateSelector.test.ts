import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { TemplateSelector, TemplateSelectorProps } from "./TemplateSelector";
import { PortfolioTemplateId } from "@/types/portfolio";
import { TEMPLATE_LIST } from "@/templates/registry";

test("TPL-03: TemplateSelector Component & Persistence Contract Suite", async (t) => {
  // -------------------------------------------------------------
  // Section 1: Component Rendering & Metadata Source of Truth
  // -------------------------------------------------------------
  await t.test("1. Renders all 3 templates from TEMPLATE_LIST source of truth", () => {
    let selectedId: PortfolioTemplateId = "modern";
    const element = TemplateSelector({
      value: "modern",
      onChange: (t) => {
        selectedId = t;
      },
    });

    assert.ok(React.isValidElement<React.HTMLAttributes<HTMLDivElement>>(element));
    assert.equal(element.props.role, "radiogroup");

    // Children are the 3 template buttons
    const children = React.Children.toArray(element.props.children) as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>[];
    assert.equal(children.length, 3);

    // Verify template names match TEMPLATE_LIST exactly
    const expectedNames = TEMPLATE_LIST.map((t) => t.meta.name);
    const renderedNames = children.map((btn) => {
      // Find the name container
      const nameDiv = React.Children.toArray(btn.props.children).find(
        (child) => React.isValidElement(child) && child.type === "div"
      ) as React.ReactElement<{ children: React.ReactNode }> | undefined;
      assert.ok(nameDiv, "Child must contain header div");
      const nameSpan = (React.Children.toArray(nameDiv.props.children)[0] as React.ReactElement<{ children: string }>);
      return nameSpan.props.children;
    });

    assert.deepEqual(renderedNames, expectedNames);
  });

  // -------------------------------------------------------------
  // Section 2: Selection State Verification
  // -------------------------------------------------------------
  await t.test("2. Accurately reflects 'modern' as selected", () => {
    const element = TemplateSelector({
      value: "modern",
      onChange: () => {},
    });
    const children = React.Children.toArray(element.props.children) as React.ReactElement<any>[];

    assert.equal(children[0].props["aria-checked"], true);
    assert.equal(children[0].props.tabIndex, 0);
    assert.equal(children[1].props["aria-checked"], false);
    assert.equal(children[1].props.tabIndex, -1);
    assert.equal(children[2].props["aria-checked"], false);
    assert.equal(children[2].props.tabIndex, -1);
  });

  await t.test("3. Accurately reflects 'minimal' as selected", () => {
    const element = TemplateSelector({
      value: "minimal",
      onChange: () => {},
    });
    const children = React.Children.toArray(element.props.children) as React.ReactElement<any>[];

    assert.equal(children[0].props["aria-checked"], false);
    assert.equal(children[0].props.tabIndex, -1);
    assert.equal(children[1].props["aria-checked"], true);
    assert.equal(children[1].props.tabIndex, 0);
    assert.equal(children[2].props["aria-checked"], false);
    assert.equal(children[2].props.tabIndex, -1);
  });

  await t.test("4. Accurately reflects 'professional' as selected", () => {
    const element = TemplateSelector({
      value: "professional",
      onChange: () => {},
    });
    const children = React.Children.toArray(element.props.children) as React.ReactElement<any>[];

    assert.equal(children[0].props["aria-checked"], false);
    assert.equal(children[0].props.tabIndex, -1);
    assert.equal(children[1].props["aria-checked"], false);
    assert.equal(children[1].props.tabIndex, -1);
    assert.equal(children[2].props["aria-checked"], true);
    assert.equal(children[2].props.tabIndex, 0);
  });

  await t.test("5. Falls back to 'modern' selection on unrecognized or invalid template value", () => {
    const element = TemplateSelector({
      value: "invalid-id" as unknown as PortfolioTemplateId,
      onChange: () => {},
    });
    const children = React.Children.toArray(element.props.children) as React.ReactElement<any>[];

    assert.equal(children[0].props["aria-checked"], true);
    assert.equal(children[1].props["aria-checked"], false);
    assert.equal(children[2].props["aria-checked"], false);
  });

  // -------------------------------------------------------------
  // Section 3: User Interaction & Callback Tests
  // -------------------------------------------------------------
  await t.test("6. Invoking onClick triggers onChange with clicked template ID", () => {
    const calls: PortfolioTemplateId[] = [];
    const element = TemplateSelector({
      value: "modern",
      onChange: (val) => calls.push(val),
    });
    const children = React.Children.toArray(element.props.children) as React.ReactElement<any>[];

    // Click second template ("minimal")
    children[1].props.onClick();
    assert.deepEqual(calls, ["minimal"]);

    // Click third template ("professional")
    children[2].props.onClick();
    assert.deepEqual(calls, ["minimal", "professional"]);

    // Click first template ("modern")
    children[0].props.onClick();
    assert.deepEqual(calls, ["minimal", "professional", "modern"]);
  });

  await t.test("7. Disabled state disables buttons and prevents onChange execution", () => {
    const calls: PortfolioTemplateId[] = [];
    const element = TemplateSelector({
      value: "modern",
      disabled: true,
      onChange: (val) => calls.push(val),
    });
    const children = React.Children.toArray(element.props.children) as React.ReactElement<any>[];

    children.forEach((btn) => {
      assert.equal(btn.props.disabled, true);
      assert.ok(btn.props.className.includes("opacity-60"));
      // Attempt click
      btn.props.onClick();
    });

    assert.equal(calls.length, 0, "No onChange events should fire while disabled");
  });

  // -------------------------------------------------------------
  // Section 4: Keyboard Navigation (WAI-ARIA Radio Group)
  // -------------------------------------------------------------
  await t.test("8. ArrowRight and ArrowDown navigate to next template", () => {
    const calls: PortfolioTemplateId[] = [];
    const element = TemplateSelector({
      value: "modern",
      onChange: (val) => calls.push(val),
    });
    const children = React.Children.toArray(element.props.children) as React.ReactElement<any>[];

    let prevented = false;
    const mockEvent = {
      key: "ArrowRight",
      preventDefault: () => {
        prevented = true;
      },
    };

    children[0].props.onKeyDown(mockEvent);
    assert.equal(prevented, true);
    assert.deepEqual(calls, ["minimal"]);
  });

  await t.test("9. Arrow navigation wraps around boundaries", () => {
    const calls: PortfolioTemplateId[] = [];
    const element = TemplateSelector({
      value: "modern",
      onChange: (val) => calls.push(val),
    });
    const children = React.Children.toArray(element.props.children) as React.ReactElement<any>[];

    // Left from index 0 should wrap to index 2 ("professional")
    children[0].props.onKeyDown({ key: "ArrowLeft", preventDefault: () => {} });
    assert.deepEqual(calls, ["professional"]);

    // Right from index 2 should wrap to index 0 ("modern")
    children[2].props.onKeyDown({ key: "ArrowRight", preventDefault: () => {} });
    assert.deepEqual(calls, ["professional", "modern"]);
  });

  // -------------------------------------------------------------
  // Section 5: Accessibility Attributes
  // -------------------------------------------------------------
  await t.test("10. ARIA container and item attributes comply with WAI-ARIA standards", () => {
    const element = TemplateSelector({
      value: "modern",
      onChange: () => {},
      "aria-labelledby": "custom-label-id",
    });

    assert.equal(element.props.role, "radiogroup");
    assert.equal(element.props["aria-labelledby"], "custom-label-id");

    const children = React.Children.toArray(element.props.children) as React.ReactElement<any>[];
    children.forEach((btn) => {
      assert.equal(btn.props.role, "radio");
      assert.equal(typeof btn.props["aria-checked"], "boolean");
      assert.equal(typeof btn.props.tabIndex, "number");
    });
  });
});
