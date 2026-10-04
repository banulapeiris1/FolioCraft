"use client";

import React from "react";
import Link from "next/link";
import { PortfolioTemplateId } from "@/types/portfolio";
import { PortfolioViewData } from "@/templates/types";
import {
  TEMPLATE_LIST,
  TemplateDefinition,
  isValidTemplateId,
} from "@/templates/registry";
import { TemplateRenderer } from "@/templates/TemplateRenderer";
import {
  CheckCircleIcon,
  EyeIcon,
  SparklesIcon,
} from "./PortfolioIcons";

export interface TemplateGalleryProps {
  currentTemplate?: PortfolioTemplateId | string | null;
  portfolioData: PortfolioViewData;
  portfolioId?: string;
  onSelectTemplate: (templateId: PortfolioTemplateId) => Promise<void> | void;
  isSaving?: boolean;
  savingTemplateId?: PortfolioTemplateId | null;
  templates?: TemplateDefinition[];
  className?: string;
}

/**
 * TemplateGallery — Discover, visually preview, and select portfolio presentation themes.
 *
 * Single Source of Truth:
 * Consumes TEMPLATE_LIST from the template registry by default. When new templates
 * are added to the registry, they automatically appear in this gallery without code changes.
 *
 * Real Data Previews:
 * Renders miniature live previews of the user's actual portfolio content using TemplateRenderer.
 */
export function TemplateGallery({
  currentTemplate,
  portfolioData,
  portfolioId,
  onSelectTemplate,
  isSaving = false,
  savingTemplateId = null,
  templates = TEMPLATE_LIST,
  className = "",
}: TemplateGalleryProps): React.JSX.Element {
  // Normalize current template ID with fallback
  const activeTemplateId: PortfolioTemplateId = isValidTemplateId(currentTemplate)
    ? currentTemplate
    : "modern";

  return (
    <div
      data-testid="template-gallery"
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 ${className}`}
    >
      {templates.map(({ meta }) => {
        const isCurrent = activeTemplateId === meta.id;
        const isCurrentlySaving = isSaving && savingTemplateId === meta.id;
        const previewUrl = `/portfolio/templates/${meta.id}${
          portfolioId ? `?id=${encodeURIComponent(portfolioId)}` : ""
        }`;

        return (
          <article
            key={meta.id}
            data-testid={`template-card-${meta.id}`}
            aria-current={isCurrent ? "true" : undefined}
            className={`flex flex-col bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
              isCurrent
                ? "border-[#6e56cf] ring-2 ring-[#6e56cf]/20 shadow-[#6e56cf]/10"
                : "border-[#eae6f5] hover:border-[#dcd3f8]"
            }`}
          >
            {/* Visual Live Preview Container */}
            <div className="relative w-full h-56 sm:h-64 bg-slate-50 border-b border-slate-100 overflow-hidden select-none group">
              {/* Scaled Rendered Template Preview */}
              <div
                className="absolute top-0 left-0 w-[1200px] h-[900px] pointer-events-none transform origin-top-left scale-[0.27] sm:scale-[0.26] md:scale-[0.28] lg:scale-[0.31]"
                tabIndex={-1}
                aria-hidden="true"
              >
                <TemplateRenderer templateId={meta.id} data={portfolioData} />
              </div>

              {/* Bottom Subtle Gradient Fade */}
              <div
                className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/95 via-white/50 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              {/* Badges Overlay */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                {isCurrent ? (
                  <span
                    data-testid={`current-badge-${meta.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide bg-[#6e56cf] text-white shadow-xs"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Current Template</span>
                  </span>
                ) : (
                  <span />
                )}

                {meta.badge && !isCurrent && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs shadow-xs">
                    <SparklesIcon className="w-3 h-3 text-amber-300" />
                    <span>{meta.badge}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Template Information */}
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[#0f172a] tracking-tight break-words">
                    {meta.name}
                  </h3>
                  <span className="text-xs font-mono text-[#94a3b8] flex-shrink-0">
                    {meta.id}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748b] leading-relaxed line-clamp-2 break-words">
                  {meta.description}
                </p>
              </div>

              {/* Card Actions Footer */}
              <div className="mt-5 pt-4 border-t border-[#f1edf9] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <Link
                  href={previewUrl}
                  data-testid={`preview-btn-${meta.id}`}
                  aria-label={`Preview ${meta.name} template with full viewport`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#475569] bg-[#f8f7fd] hover:bg-[#ede9f8] hover:text-[#0f172a] border border-[#eae6f5] hover:border-[#dcd3f8] transition-all cursor-pointer active:scale-[0.98] min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2"
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </Link>

                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    aria-label={`${meta.name} is currently selected`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-default min-h-[42px]"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Selected</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    data-testid={`use-template-btn-${meta.id}`}
                    aria-label={`Use ${meta.name} template`}
                    onClick={() => onSelectTemplate(meta.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md hover:shadow-[#6e56cf]/35 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2"
                  >
                    {isCurrentlySaving && (
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    <span>{isCurrentlySaving ? "Applying..." : "Use Template"}</span>
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default TemplateGallery;
