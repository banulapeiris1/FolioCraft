"use client";

import React from "react";
import { PortfolioTemplateId } from "@/types/portfolio";
import { TEMPLATE_LIST, isValidTemplateId } from "@/templates/registry";

export interface TemplateSelectorProps {
  value: PortfolioTemplateId;
  onChange: (template: PortfolioTemplateId) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
}

/**
 * Reusable controlled TemplateSelector component.
 *
 * Sourced dynamically from the TEMPLATE_REGISTRY / TEMPLATE_LIST as single source of truth.
 * Adheres to WAI-ARIA Radio Group pattern for accessible keyboard and screen-reader navigation.
 */
export function TemplateSelector({
  value,
  onChange,
  disabled = false,
  className = "",
  id = "template-selector",
  "aria-labelledby": ariaLabelledBy,
}: TemplateSelectorProps): React.JSX.Element {
  // Gracefully fallback to "modern" if value is unrecognized or invalid
  const activeValue: PortfolioTemplateId = isValidTemplateId(value) ? value : "modern";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (disabled) return;

    let nextIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % TEMPLATE_LIST.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + TEMPLATE_LIST.length) % TEMPLATE_LIST.length;
    }

    if (nextIndex >= 0) {
      const nextTemplate = TEMPLATE_LIST[nextIndex].meta.id;
      onChange(nextTemplate);
      const parent = e.currentTarget?.parentElement;
      if (parent) {
        const nextButton = parent.children[nextIndex] as HTMLElement | undefined;
        nextButton?.focus();
      }
    }
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabelledBy ? undefined : "Curated Presentation Theme"}
      className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}
    >
      {TEMPLATE_LIST.map(({ meta }, index) => {
        const isSelected = activeValue === meta.id;

        return (
          <button
            key={meta.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-describedby={`template-desc-${meta.id}`}
            tabIndex={isSelected ? 0 : -1}
            disabled={disabled}
            onClick={() => {
              if (!disabled && onChange) {
                onChange(meta.id);
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2 ${
              disabled ? "opacity-60 cursor-not-allowed" : ""
            } ${
              isSelected
                ? "border-[#6e56cf] bg-[#fcfbfe] shadow-sm ring-2 ring-[#6e56cf]/20"
                : "border-[#eae6f5] bg-white hover:border-[#dcd3f8] hover:bg-[#faf9fd]"
            }`}
          >
            {meta.badge && (
              <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#6e56cf] text-white shadow-xs pointer-events-none">
                {meta.badge}
              </span>
            )}
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-sm font-bold text-[#0f172a] break-words">{meta.name}</span>
              <span
                aria-hidden="true"
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  isSelected ? "border-[#6e56cf] bg-[#6e56cf]" : "border-[#cbd5e1]"
                }`}
              >
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p id={`template-desc-${meta.id}`} className="text-xs text-[#64748b] leading-relaxed break-words">
              {meta.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export default TemplateSelector;
