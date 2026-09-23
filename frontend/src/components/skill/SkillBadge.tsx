"use client";

import React from "react";
import type { Skill } from "@/types/skill";
import {
  PencilIcon,
  Trash2Icon,
} from "@/components/portfolio/PortfolioIcons";

export interface SkillBadgeProps {
  skill: Skill;
  onEdit?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
  showCategory?: boolean;
}

export default function SkillBadge({
  skill,
  onEdit,
  onDelete,
  showCategory = false,
}: SkillBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#eae6f5] hover:border-[#dcd3f8] shadow-2xs hover:shadow-xs transition-all text-xs group">
      {/* Skill Name */}
      <span className="font-semibold text-[#0f172a] select-none">
        {skill.name}
      </span>

      {/* Optional Category Label */}
      {showCategory && skill.category && (
        <span className="text-[10px] font-medium text-[#6e56cf] bg-[#f3f0ff] px-1.5 py-0.5 rounded-md border border-[#dcd3f8] select-none">
          {skill.category}
        </span>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 ml-1 border-l border-[#f1edf9] pl-1.5">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(skill)}
            className="p-1 rounded-md text-[#94a3b8] hover:text-[#6e56cf] hover:bg-[#f3f0ff] transition-colors cursor-pointer"
            aria-label={`Edit ${skill.name}`}
            title={`Edit ${skill.name}`}
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(skill)}
            className="p-1 rounded-md text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors cursor-pointer"
            aria-label={`Delete ${skill.name}`}
            title={`Delete ${skill.name}`}
          >
            <Trash2Icon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
