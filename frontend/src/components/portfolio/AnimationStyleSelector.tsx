"use client";

import React from "react";
import {
  ANIMATION_STYLE_OPTIONS,
  normalizeAnimationStyle,
  resolveMotionMode,
  type AnimationStyle,
} from "@/templates/motion/motionConfig";
import { getTemplateDefinition } from "@/templates/registry";

export interface AnimationStyleSelectorProps {
  value?: AnimationStyle | string | null;
  onChange: (style: AnimationStyle) => void;
  /** Current template, used to explain template motion caps (Academic, Executive). */
  templateId?: string | null;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
}

/**
 * Static "motion trail" illustrating each style: how far and how strongly
 * content moves as it appears. Purely decorative and never animated, so it
 * is safe under reduced motion and adds no keyframes.
 */
const TRAILS: Record<AnimationStyle, Array<{ y: number; scale: number; opacity: number }>> = {
  subtle: [
    { y: 0, scale: 1, opacity: 1 },
    { y: 3, scale: 1, opacity: 0.55 },
    { y: 6, scale: 1, opacity: 0.25 },
  ],
  creative: [
    { y: 0, scale: 1, opacity: 1 },
    { y: 8, scale: 0.94, opacity: 0.5 },
    { y: 16, scale: 0.88, opacity: 0.2 },
  ],
  minimal: [
    { y: 0, scale: 1, opacity: 1 },
    { y: 0, scale: 1, opacity: 0.55 },
    { y: 0, scale: 1, opacity: 0.25 },
  ],
};

function StylePreview({ style, selected }: { style: AnimationStyle; selected: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid={`animation-style-preview-${style}`}
      className={`relative h-14 rounded-lg border overflow-hidden flex items-start justify-center gap-2 pt-2.5 ${
        selected ? "bg-[#f3f0ff] border-[#dcd3f8]" : "bg-[#f8f7fd] border-[#eae6f5]"
      }`}
    >
      {TRAILS[style].map((step, i) => (
        <span
          key={i}
          className="block w-7 h-6 rounded-md bg-[#6e56cf]"
          style={{ opacity: step.opacity, transform: `translateY(${step.y}px) scale(${step.scale})` }}
        />
      ))}
      {style === "creative" && (
        <span className="absolute right-2 top-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
      )}
    </div>
  );
}

/**
 * AnimationStyleSelector — Phase 14 animation settings (editor).
 *
 * Controlled WAI-ARIA radio group mirroring TemplateSelector: one tab stop,
 * arrow keys move and select. Offers only the three persisted styles; the
 * gallery-only "none" mode is never selectable.
 */
export function AnimationStyleSelector({
  value,
  onChange,
  templateId,
  disabled = false,
  className = "",
  id = "animation-style-selector",
  "aria-labelledby": ariaLabelledBy,
}: AnimationStyleSelectorProps): React.JSX.Element {
  const active = normalizeAnimationStyle(value);
  const effective = resolveMotionMode(active, templateId);
  const isCapped = effective !== active;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled) return;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % ANIMATION_STYLE_OPTIONS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + ANIMATION_STYLE_OPTIONS.length) % ANIMATION_STYLE_OPTIONS.length;
    if (next < 0) return;
    e.preventDefault();
    onChange(ANIMATION_STYLE_OPTIONS[next].id);
    const sibling = e.currentTarget.parentElement?.children[next] as HTMLElement | undefined;
    sibling?.focus();
  };

  return (
    <div className={className}>
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabelledBy ? undefined : "Animation style"}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {ANIMATION_STYLE_OPTIONS.map((option, index) => {
          const isSelected = option.id === active;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-describedby={`animation-style-desc-${option.id}`}
              data-testid={`animation-style-${option.id}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={disabled}
              onClick={() => {
                if (!disabled) onChange(option.id);
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`flex flex-col gap-2.5 text-left p-3.5 rounded-xl border-2 transition-colors cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2 ${
                disabled ? "opacity-60 cursor-not-allowed" : ""
              } ${
                isSelected
                  ? "border-[#6e56cf] bg-[#fcfbfe] shadow-sm ring-2 ring-[#6e56cf]/20"
                  : "border-[#eae6f5] bg-white hover:border-[#dcd3f8] hover:bg-[#faf9fd]"
              }`}
            >
              {option.recommended && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#6e56cf] text-white shadow-xs pointer-events-none">
                  Recommended
                </span>
              )}
              <StylePreview style={option.id} selected={isSelected} />
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#0f172a] leading-tight">{option.label}</span>
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      isSelected ? "border-[#6e56cf] bg-[#6e56cf]" : "border-[#cbd5e1]"
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-[#6e56cf]">{option.tagline}</p>
                <p id={`animation-style-desc-${option.id}`} className="mt-1 text-xs text-[#64748b] leading-relaxed">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {isCapped && (
        <p
          data-testid="animation-style-cap-note"
          className="mt-3 text-xs text-[#64748b] bg-[#f8f7fd] border border-[#eae6f5] rounded-lg px-3 py-2 leading-relaxed"
        >
          The {getTemplateDefinition(templateId).meta.name} template keeps motion at{" "}
          <strong className="text-[#0f172a]">
            {ANIMATION_STYLE_OPTIONS.find((o) => o.id === effective)?.label ?? "Subtle Professional"}
          </strong>{" "}
          for a formal feel. Your choice is still saved and applies if you switch templates.
        </p>
      )}
    </div>
  );
}

export default AnimationStyleSelector;
