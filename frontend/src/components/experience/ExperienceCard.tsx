"use client";

import React from "react";
import { Experience } from "@/types/experience";
import {
  PencilIcon,
  Trash2Icon,
  BriefcaseIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface ExperienceCardProps {
  experience: Experience;
  onEdit: (experience: Experience) => void;
  onDelete: (experience: Experience) => void;
}

/**
 * Converts a YYYY-MM-DD string into a localized short month and year (e.g., "Jun 2021").
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month) return dateStr;
    const date = new Date(Date.UTC(year, month - 1, day || 1));
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

export default function ExperienceCard({
  experience,
  onEdit,
  onDelete,
}: ExperienceCardProps) {
  const formattedStart = formatDate(experience.startDate);
  const formattedEnd = experience.isCurrent
    ? "Present"
    : experience.endDate
    ? formatDate(experience.endDate)
    : "Present";

  return (
    <article className="bg-white rounded-2xl border border-[#eae6f5] hover:border-[#dcd3f8] p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      <div>
        {/* Top Header: Company, Position, Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[#0f172a] tracking-tight">
                {experience.position}
              </h3>
              {experience.isCurrent && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Current</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#6e56cf]">
              <BriefcaseIcon className="w-4 h-4 text-[#6e56cf] flex-shrink-0" />
              <span>{experience.company}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onEdit(experience)}
              className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6e56cf] hover:bg-[#f3f0ff] border border-transparent hover:border-[#dcd3f8] transition-colors cursor-pointer"
              title={`Edit ${experience.position} at ${experience.company}`}
              aria-label={`Edit ${experience.position} at ${experience.company}`}
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(experience)}
              className="p-1.5 rounded-lg text-[#64748b] hover:text-[#dc2626] hover:bg-[#fef2f2] border border-transparent hover:border-[#fecaca] transition-colors cursor-pointer"
              title={`Delete ${experience.position} at ${experience.company}`}
              aria-label={`Delete ${experience.position} at ${experience.company}`}
            >
              <Trash2Icon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Range Subtitle */}
        <div className="mt-2 text-xs font-medium text-[#64748b] flex items-center gap-1.5">
          <span>
            {formattedStart} — {formattedEnd}
          </span>
        </div>

        {/* Description */}
        {experience.description && (
          <p className="mt-3 text-xs sm:text-sm text-[#475569] leading-relaxed whitespace-pre-line line-clamp-4">
            {experience.description}
          </p>
        )}
      </div>
    </article>
  );
}
