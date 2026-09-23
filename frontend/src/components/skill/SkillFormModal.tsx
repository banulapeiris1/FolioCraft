"use client";

import React, { useState, useEffect } from "react";
import type { SkillFormData, SkillFormErrors } from "@/types/skill";
import {
  XIcon,
  AlertCircleIcon,
  CodeIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface SkillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SkillFormData) => void;
  mode: "create" | "edit";
  initialData?: Partial<SkillFormData>;
  isSubmitting?: boolean;
  serverError?: string | null;
  categories?: string[];
}

const DEFAULT_CATEGORIES = [
  "Frontend",
  "Backend",
  "Database",
  "Cloud & DevOps",
  "Tools",
  "Other",
];

export default function SkillFormModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData = {},
  isSubmitting = false,
  serverError = null,
  categories = DEFAULT_CATEGORIES,
}: SkillFormModalProps) {
  const [name, setName] = useState(initialData.name || "");
  const [category, setCategory] = useState(initialData.category || "Frontend");
  const [customCategory, setCustomCategory] = useState("");
  const [orderIndex, setOrderIndex] = useState<number | undefined>(
    initialData.orderIndex
  );

  const [errors, setErrors] = useState<SkillFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      const initName = initialData.name || "";
      const initCat = initialData.category || "Frontend";
      setName(initName);
      setOrderIndex(initialData.orderIndex);

      if (categories.includes(initCat)) {
        setCategory(initCat);
        setCustomCategory("");
      } else if (initCat) {
        setCategory("Other");
        setCustomCategory(initCat);
      } else {
        setCategory("Frontend");
        setCustomCategory("");
      }

      setErrors({});
      setTouched({});
    }
  }, [isOpen, initialData, categories]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen || isSubmitting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const validateField = (field: "name" | "category", val: string): string | undefined => {
    if (field === "name") {
      const trimmed = val.trim();
      if (!trimmed) {
        return "Skill name is required";
      }
      if (trimmed.length > 100) {
        return "Skill name cannot exceed 100 characters";
      }
      return undefined;
    }

    if (field === "category") {
      const trimmed = val.trim();
      if (!trimmed) {
        return "Category is required";
      }
      if (trimmed.length > 50) {
        return "Category cannot exceed 50 characters";
      }
      return undefined;
    }

    return undefined;
  };

  const handleBlur = (field: "name" | "category") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === "name" ? name : category === "Other" ? customCategory : category;
    const errorMsg = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedCategory = category === "Other" ? customCategory.trim() : category.trim();

    const nameError = validateField("name", name);
    const categoryError = validateField("category", resolvedCategory);

    setTouched({ name: true, category: true });
    setErrors({ name: nameError, category: categoryError });

    if (nameError || categoryError) {
      return;
    }

    const payload: SkillFormData = {
      name: name.trim(),
      category: resolvedCategory,
    };

    if (typeof orderIndex === "number" && !isNaN(orderIndex)) {
      payload.orderIndex = orderIndex;
    }

    onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-form-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0f172a]/40 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl shadow-[#6e56cf]/10 max-w-lg w-full p-6 sm:p-8 relative my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 mb-6 border-b border-[#f1edf9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf] flex-shrink-0">
              <CodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="skill-form-modal-title"
                className="text-lg sm:text-xl font-bold text-[#0f172a] tracking-tight"
              >
                {mode === "create" ? "Add Custom Skill" : "Edit Skill"}
              </h2>
              <p className="text-xs text-[#64748b] mt-0.5">
                {mode === "create"
                  ? "Define a custom skill and assign it to a category."
                  : "Update the skill name or change its category grouping."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8f7fd] border border-transparent hover:border-[#eae6f5] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5">
            <AlertCircleIcon className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-semibold text-rose-900 leading-relaxed">
              {serverError}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Skill Name Field */}
          <div>
            <label
              htmlFor="skill-name-input"
              className="block text-xs font-bold text-[#0f172a] mb-1.5"
            >
              Skill Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="skill-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="e.g. GraphQL, Tailwind CSS, Rust..."
              maxLength={100}
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#faf9fd] text-xs sm:text-sm text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:outline-none transition-all ${
                touched.name && errors.name
                  ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
                  : "border-[#eae6f5] focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/15"
              }`}
              autoFocus
            />
            {touched.name && errors.name && (
              <p className="text-xs text-rose-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <label
              htmlFor="skill-category-select"
              className="block text-xs font-bold text-[#0f172a] mb-1.5"
            >
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              id="skill-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onBlur={() => handleBlur("category")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae6f5] bg-[#faf9fd] text-xs sm:text-sm text-[#0f172a] focus:bg-white focus:border-[#6e56cf] focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/15 transition-all cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Category input if 'Other' is selected */}
          {category === "Other" && (
            <div className="animate-fadeIn">
              <label
                htmlFor="skill-custom-category-input"
                className="block text-xs font-bold text-[#0f172a] mb-1.5"
              >
                Custom Category Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="skill-custom-category-input"
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onBlur={() => handleBlur("category")}
                placeholder="e.g. Mobile, Machine Learning, Testing..."
                maxLength={50}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#faf9fd] text-xs sm:text-sm text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:outline-none transition-all ${
                  touched.category && errors.category
                    ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
                    : "border-[#eae6f5] focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/15"
                }`}
              />
              {touched.category && errors.category && (
                <p className="text-xs text-rose-600 mt-1">{errors.category}</p>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 mt-6 border-t border-[#f1edf9] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#475569] hover:text-[#0f172a] bg-[#f8f7fd] hover:bg-[#f1edf9] border border-[#eae6f5] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{mode === "create" ? "Add Skill" : "Save Changes"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
