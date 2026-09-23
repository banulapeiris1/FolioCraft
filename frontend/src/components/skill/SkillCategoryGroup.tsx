"use client";

import React from "react";
import type { Skill } from "@/types/skill";
import SkillBadge from "./SkillBadge";

export interface SkillCategoryGroupProps {
  category: string;
  skills: Skill[];
  onEdit?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
}

export default function SkillCategoryGroup({
  category,
  skills,
  onEdit,
  onDelete,
}: SkillCategoryGroupProps) {
  if (skills.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-[#eae6f5] p-4 sm:p-5 shadow-xs transition-all">
      {/* Category Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#f8f7fd]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold tracking-tight text-[#0f172a]">
            {category}
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3f0ff] text-[#6e56cf] border border-[#dcd3f8]">
            {skills.length}
          </span>
        </div>
      </div>

      {/* Skills Badges Grid/Flex */}
      <div className="flex flex-wrap gap-2 mt-3.5">
        {skills.map((skill) => (
          <SkillBadge
            key={skill.id}
            skill={skill}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
