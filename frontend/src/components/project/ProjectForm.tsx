"use client";

import React, { useState } from "react";
import { ProjectFormData, ProjectFormErrors } from "@/types/project";
import {
  AlertCircleIcon,
  PlusIcon,
  XIcon,
  ImageIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface ProjectFormProps {
  mode: "create" | "edit";
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  serverError?: string | null;
}

function isValidUrl(val: string): boolean {
  if (!val || !val.trim()) return true;
  try {
    const url = new URL(val.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ProjectForm({
  mode,
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  serverError = null,
}: ProjectFormProps) {
  const [title, setTitle] = useState(initialData.title || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [technologies, setTechnologies] = useState<string[]>(
    Array.isArray(initialData.technologies) ? [...initialData.technologies] : []
  );
  const [techInput, setTechInput] = useState("");
  const [githubUrl, setGithubUrl] = useState(initialData.githubUrl || "");
  const [projectUrl, setProjectUrl] = useState(initialData.projectUrl || "");
  const [imageUrl, setImageUrl] = useState(initialData.imageUrl || "");

  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [errors, setErrors] = useState<ProjectFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, val: string): string | undefined => {
    switch (field) {
      case "title":
        if (!val || !val.trim()) {
          return "Project title is required";
        }
        if (val.trim().length > 255) {
          return "Title cannot exceed 255 characters";
        }
        return undefined;

      case "githubUrl":
        if (val.trim() && !isValidUrl(val)) {
          return "Please enter a valid URL (starting with http:// or https://)";
        }
        return undefined;

      case "projectUrl":
        if (val.trim() && !isValidUrl(val)) {
          return "Please enter a valid URL (starting with http:// or https://)";
        }
        return undefined;

      case "imageUrl":
        if (val.trim() && !isValidUrl(val)) {
          return "Please enter a valid image URL (starting with http:// or https://)";
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  // Technologies Tag Management
  const handleAddTechnology = () => {
    const trimmed = techInput.trim();
    if (!trimmed) return;

    // Prevent duplicates (case-insensitive comparison)
    const exists = technologies.some(
      (t) => t.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      setTechnologies((prev) => [...prev, trimmed]);
    }
    setTechInput("");
  };

  const handleTechKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTechnology();
    }
  };

  const handleRemoveTechnology = (indexToRemove: number) => {
    setTechnologies((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const titleError = validateField("title", title);
    const githubError = validateField("githubUrl", githubUrl);
    const projectUrlError = validateField("projectUrl", projectUrl);
    const imageUrlError = validateField("imageUrl", imageUrl);

    const newErrors: ProjectFormErrors = {};
    if (titleError) newErrors.title = titleError;
    if (githubError) newErrors.githubUrl = githubError;
    if (projectUrlError) newErrors.projectUrl = projectUrlError;
    if (imageUrlError) newErrors.imageUrl = imageUrlError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({
        title: true,
        githubUrl: true,
        projectUrl: true,
        imageUrl: true,
      });
      return;
    }

    // Submit validated payload
    const payload: ProjectFormData = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      technologies: technologies.filter((t) => t.trim().length > 0),
      githubUrl: githubUrl.trim() ? githubUrl.trim() : null,
      projectUrl: projectUrl.trim() ? projectUrl.trim() : null,
      imageUrl: imageUrl.trim() ? imageUrl.trim() : null,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Server Error Alert */}
      {serverError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
          <AlertCircleIcon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-900">
              {mode === "create" ? "Unable to add project" : "Unable to save project"}
            </h4>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{serverError}</p>
          </div>
        </div>
      )}

      {/* Project Title (Required) */}
      <div className="space-y-1.5">
        <label
          htmlFor="project-title"
          className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
        >
          Project Title <span className="text-[#6e56cf]">*</span>
        </label>
        <input
          id="project-title"
          type="text"
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (touched.title) {
              const err = validateField("title", e.target.value);
              setErrors((prev) => ({ ...prev, title: err }));
            }
          }}
          onBlur={() => handleBlur("title", title)}
          placeholder="e.g. AI Portfolio Generator"
          maxLength={255}
          className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
            errors.title
              ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
              : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
          }`}
        />
        {errors.title && (
          <p className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
            <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errors.title}</span>
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label
          htmlFor="project-description"
          className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
        >
          Description
        </label>
        <textarea
          id="project-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the problem solved, architecture choices, or key highlights..."
          className="block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20 resize-y"
        />
      </div>

      {/* Technologies Input */}
      <div className="space-y-2">
        <label
          htmlFor="project-tech-input"
          className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
        >
          Technologies
        </label>

        {/* Existing Tech Badges */}
        {technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {technologies.map((tech, index) => (
              <span
                key={`${tech}-${index}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#f3f0ff] text-[#6e56cf] border border-[#dcd3f8]"
              >
                <span>{tech}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTechnology(index)}
                  className="hover:text-[#dc2626] cursor-pointer"
                  aria-label={`Remove ${tech}`}
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Tech Input and Add Button */}
        <div className="flex items-center gap-2">
          <input
            id="project-tech-input"
            type="text"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={handleTechKeyDown}
            placeholder="Type technology (e.g. React) and press Enter"
            className="flex-1 rounded-xl border border-[#eae6f5] hover:border-[#dcd3f8] text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#6e56cf] focus:ring-[#6e56cf]/20 transition-all"
          />
          <button
            type="button"
            onClick={handleAddTechnology}
            disabled={!techInput.trim()}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#ede8fc] border border-[#dcd3f8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* GitHub URL & Demo URL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* GitHub URL */}
        <div className="space-y-1.5">
          <label
            htmlFor="project-github"
            className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
          >
            GitHub URL
          </label>
          <input
            id="project-github"
            type="url"
            value={githubUrl}
            onChange={(e) => {
              setGithubUrl(e.target.value);
              if (touched.githubUrl) {
                const err = validateField("githubUrl", e.target.value);
                setErrors((prev) => ({ ...prev, githubUrl: err }));
              }
            }}
            onBlur={() => handleBlur("githubUrl", githubUrl)}
            placeholder="https://github.com/username/project"
            className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
              errors.githubUrl
                ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
            }`}
          />
          {errors.githubUrl && (
            <p className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
              <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errors.githubUrl}</span>
            </p>
          )}
        </div>

        {/* Project/Demo URL */}
        <div className="space-y-1.5">
          <label
            htmlFor="project-demo"
            className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
          >
            Project / Demo URL
          </label>
          <input
            id="project-demo"
            type="url"
            value={projectUrl}
            onChange={(e) => {
              setProjectUrl(e.target.value);
              if (touched.projectUrl) {
                const err = validateField("projectUrl", e.target.value);
                setErrors((prev) => ({ ...prev, projectUrl: err }));
              }
            }}
            onBlur={() => handleBlur("projectUrl", projectUrl)}
            placeholder="https://myproject.demo"
            className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
              errors.projectUrl
                ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
            }`}
          />
          {errors.projectUrl && (
            <p className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
              <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errors.projectUrl}</span>
            </p>
          )}
        </div>
      </div>

      {/* Image URL & Live Preview */}
      <div className="space-y-2">
        <label
          htmlFor="project-image-url"
          className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
        >
          Image URL
        </label>
        <input
          id="project-image-url"
          type="url"
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            setImagePreviewError(false);
            if (touched.imageUrl) {
              const err = validateField("imageUrl", e.target.value);
              setErrors((prev) => ({ ...prev, imageUrl: err }));
            }
          }}
          onBlur={() => handleBlur("imageUrl", imageUrl)}
          placeholder="https://images.unsplash.com/... or public image link"
          className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
            errors.imageUrl
              ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
              : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
          }`}
        />
        {errors.imageUrl && (
          <p className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
            <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errors.imageUrl}</span>
          </p>
        )}

        {/* Image Preview */}
        {imageUrl.trim() && !errors.imageUrl && (
          <div className="mt-2 p-3 rounded-xl border border-[#eae6f5] bg-[#faf9fd]">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block mb-2">
              Preview
            </span>
            {!imagePreviewError ? (
              <div className="w-full max-w-xs h-32 rounded-lg overflow-hidden border border-[#eae6f5] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl.trim()}
                  alt="Project preview"
                  onError={() => setImagePreviewError(true)}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full max-w-xs h-24 rounded-lg border border-dashed border-[#f87171] bg-rose-50/50 flex flex-col items-center justify-center text-xs text-rose-600 gap-1">
                <ImageIcon className="w-5 h-5 text-rose-400" />
                <span>Unable to load image from URL</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="pt-4 border-t border-[#eae6f5] flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#475569] bg-white hover:bg-[#f8f7fd] border border-[#eae6f5] transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <span>{mode === "create" ? "Adding Project..." : "Saving..."}</span>
          ) : (
            <span>{mode === "create" ? "Add Project" : "Save Changes"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
