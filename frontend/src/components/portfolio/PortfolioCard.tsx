"use client";

import React from "react";
import Link from "next/link";
import { Portfolio } from "@/types/portfolio";
import { PencilIcon, ExternalLinkIcon } from "@/components/portfolio/PortfolioIcons";

export interface PortfolioCardProps {
  portfolio: Portfolio;
}

const TEMPLATE_NAMES: Record<string, string> = {
  modern: "Modern Developer",
  minimal: "Minimalist",
  professional: "Executive Professional",
};

export function getTemplateDisplayName(templateKey?: string): string {
  if (!templateKey) return "Modern Developer";
  const normalized = templateKey.toLowerCase().trim();
  return (
    TEMPLATE_NAMES[normalized] ||
    templateKey.charAt(0).toUpperCase() + templateKey.slice(1)
  );
}

export function formatLastUpdated(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently updated";
    return `Updated ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  } catch {
    return "Recently updated";
  }
}

export default function PortfolioCard({ portfolio }: PortfolioCardProps) {
  const templateName = getTemplateDisplayName(portfolio.template);
  const updatedDate = formatLastUpdated(portfolio.updatedAt || portfolio.createdAt);

  return (
    <article className="bg-white rounded-2xl border border-[#eae6f5] hover:border-[#dcd3f8] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Meta: Title & Status */}
        <div className="flex items-start justify-between gap-3">
          <h3
            className="text-base sm:text-lg font-bold text-[#0f172a] tracking-tight group-hover:text-[#6e56cf] transition-colors line-clamp-1"
            title={portfolio.title}
          >
            {portfolio.title}
          </h3>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
              portfolio.published
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                portfolio.published ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
              aria-hidden="true"
            />
            {portfolio.published ? "Published" : "Draft"}
          </span>
        </div>

        {/* Template Subtitle */}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs font-medium text-[#64748b]">
            {templateName}
          </span>
          <span className="text-[#cbd5e1] text-xs">•</span>
          <span className="text-xs font-mono text-[#94a3b8]">
            @{portfolio.username}
          </span>
        </div>

        {/* About snippet if present */}
        {portfolio.about && (
          <p className="mt-3 text-xs sm:text-sm text-[#64748b] leading-relaxed line-clamp-2">
            {portfolio.about}
          </p>
        )}

        {/* Last Updated Timestamp */}
        <div className="mt-4 text-[11px] text-[#94a3b8] font-medium flex items-center gap-1">
          <span>{updatedDate}</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-6 pt-4 border-t border-[#f1edf9] flex items-center justify-between gap-3">
        <Link
          href={`/portfolio/edit/${portfolio.id}`}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#eae4fc] border border-[#dcd3f8] transition-all hover:shadow-xs active:scale-[0.98]"
        >
          <PencilIcon className="w-3.5 h-3.5" />
          <span>Edit</span>
        </Link>

        <Link
          href={`/portfolio/preview?id=${portfolio.id}`}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#475569] bg-[#f8f7fd] hover:bg-[#ede9f8] hover:text-[#0f172a] border border-[#eae6f5] transition-all hover:shadow-xs active:scale-[0.98]"
        >
          <ExternalLinkIcon className="w-3.5 h-3.5" />
          <span>Preview</span>
        </Link>
      </div>
    </article>
  );
}

export function PortfolioCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#eae6f5] p-5 sm:p-6 shadow-xs flex flex-col justify-between animate-pulse">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="h-5 bg-slate-200 rounded-md w-3/4" />
          <div className="h-5 bg-slate-200 rounded-full w-16" />
        </div>
        <div className="h-3.5 bg-slate-100 rounded-md w-1/3 mb-4" />
        <div className="h-3 bg-slate-100 rounded-md w-2/3 mb-2" />
        <div className="h-3 bg-slate-100 rounded-md w-1/2 mb-4" />
        <div className="h-3 bg-slate-100 rounded-md w-28 mt-4" />
      </div>
      <div className="mt-6 pt-4 border-t border-[#f1edf9] flex items-center justify-between gap-3">
        <div className="h-8 bg-slate-200 rounded-xl w-20" />
        <div className="h-8 bg-slate-200 rounded-xl w-24" />
      </div>
    </div>
  );
}
