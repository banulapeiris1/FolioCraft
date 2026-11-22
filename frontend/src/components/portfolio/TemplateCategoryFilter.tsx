import React from "react";
import type { TemplateCategory } from "@/templates/types";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_LIST,
  type TemplateDefinition,
} from "@/templates/registry";

export type TemplateCategoryFilterValue = TemplateCategory | "all";

/**
 * Returns the templates in a category ("all" returns every template).
 * Order follows the input list, so registry display order is preserved.
 */
export function filterTemplatesByCategory<T extends TemplateDefinition>(
  templates: T[],
  category: TemplateCategoryFilterValue
): T[] {
  if (category === "all") return templates;
  return templates.filter((t) => t.meta.category === category);
}

export interface TemplateCategoryFilterProps {
  value: TemplateCategoryFilterValue;
  onChange: (value: TemplateCategoryFilterValue) => void;
  templates?: TemplateDefinition[];
  className?: string;
}

/**
 * Category filter for the template gallery (Phase 13).
 *
 * Stateless and controlled: the parent page owns the selected category and
 * passes the filtered list to <TemplateGallery templates={...} />. Rendered as
 * a labelled group of toggle buttons (aria-pressed) with per-category counts;
 * categories without templates are omitted.
 */
export function TemplateCategoryFilter({
  value,
  onChange,
  templates = TEMPLATE_LIST,
  className = "",
}: TemplateCategoryFilterProps): React.JSX.Element {
  const options: Array<{ id: TemplateCategoryFilterValue; label: string; count: number }> = [
    { id: "all", label: "All templates", count: templates.length },
    ...TEMPLATE_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      count: filterTemplatesByCategory(templates, c.id).length,
    })).filter((option) => option.count > 0),
  ];

  return (
    <div
      role="group"
      aria-label="Filter templates by category"
      data-testid="template-category-filter"
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            data-testid={`category-filter-${option.id}`}
            onClick={() => onChange(option.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2 ${
              active
                ? "bg-[#6e56cf] border-[#6e56cf] text-white shadow-sm shadow-[#6e56cf]/25"
                : "bg-white border-[#eae6f5] text-[#475569] hover:border-[#dcd3f8] hover:text-[#0f172a]"
            }`}
          >
            <span>{option.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                active ? "bg-white/20 text-white" : "bg-[#f3f0ff] text-[#6e56cf]"
              }`}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default TemplateCategoryFilter;
