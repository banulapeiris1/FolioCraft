"use client";

import React, { useState } from "react";
import { Project } from "@/types/project";
import {
  GithubIcon,
  ExternalLinkIcon,
  PencilIcon,
  Trash2Icon,
  ImageIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="bg-white rounded-2xl border border-[#eae6f5] hover:border-[#dcd3f8] p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      <div>
        {/* Project Image Preview (if available) */}
        {project.imageUrl && !imgError && (
          <div className="mb-4 rounded-xl overflow-hidden border border-[#eae6f5] bg-[#fbfaff] relative aspect-video w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.imageUrl}
              alt={project.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              loading="lazy"
            />
          </div>
        )}

        {/* Fallback image placeholder when broken */}
        {project.imageUrl && imgError && (
          <div className="mb-4 rounded-xl border border-dashed border-[#dcd3f8] bg-[#fcfbfe] py-6 flex flex-col items-center justify-center text-[#94a3b8] gap-1">
            <ImageIcon className="w-6 h-6 text-[#cbd5e1]" />
            <span className="text-xs font-medium">Image preview unavailable</span>
          </div>
        )}

        {/* Header: Title and Actions */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base sm:text-lg font-bold text-[#0f172a] tracking-tight line-clamp-1">
            {project.title}
          </h3>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onEdit(project)}
              className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6e56cf] hover:bg-[#f3f0ff] border border-transparent hover:border-[#dcd3f8] transition-colors cursor-pointer"
              title={`Edit ${project.title}`}
              aria-label={`Edit ${project.title}`}
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(project)}
              className="p-1.5 rounded-lg text-[#64748b] hover:text-[#dc2626] hover:bg-[#fef2f2] border border-transparent hover:border-[#fecaca] transition-colors cursor-pointer"
              title={`Delete ${project.title}`}
              aria-label={`Delete ${project.title}`}
            >
              <Trash2Icon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="mt-2 text-xs sm:text-sm text-[#64748b] leading-relaxed line-clamp-3">
            {project.description}
          </p>
        )}

        {/* Technologies Chips */}
        {project.technologies && project.technologies.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.technologies.map((tech, idx) => (
              <span
                key={`${tech}-${idx}`}
                className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[#f3f0ff] text-[#6e56cf] border border-[#dcd3f8]"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Links: GitHub & Live Demo */}
      {(project.githubUrl || project.projectUrl) && (
        <div className="mt-5 pt-4 border-t border-[#f1edf9] flex flex-wrap items-center gap-3">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f172a] hover:text-[#6e56cf] transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          )}

          {project.projectUrl && (
            <a
              href={project.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6e56cf] hover:text-[#5d46be] transition-colors ml-auto sm:ml-0"
            >
              <ExternalLinkIcon className="w-3.5 h-3.5" />
              <span>Live Demo</span>
            </a>
          )}
        </div>
      )}
    </article>
  );
}
