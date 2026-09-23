"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Skill, SkillFormData, CatalogSkill } from "@/types/skill";
import {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillCatalog,
  ApiError,
} from "@/lib/api";
import SkillCategoryGroup from "./SkillCategoryGroup";
import SkillSelectModal from "./SkillSelectModal";
import SkillFormModal from "./SkillFormModal";
import SkillDeleteModal from "./SkillDeleteModal";
import {
  SparklesIcon,
  PlusIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface SkillManagerProps {
  portfolioId: string;
}

export default function SkillManager({ portfolioId }: SkillManagerProps) {
  const { token } = useAuth();

  // Portfolio Skills State
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Catalog State
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkill[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("");

  // Modal Visibility State
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // References for Edit / Delete Operations
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);

  // Operation In-Progress & Error States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 1. Fetch Portfolio Skills
  const fetchSkills = useCallback(async () => {
    if (!token || !portfolioId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getSkills(portfolioId, token);
      setSkills(response.skills || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to load portfolio skills.");
      } else {
        setError("Unable to connect to the server. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, token]);

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  // 2. Fetch Skill Catalog (supports search and category filtering)
  const fetchCatalog = useCallback(async (search?: string, category?: string) => {
    setIsCatalogLoading(true);
    try {
      const response = await getSkillCatalog(search, category);
      setCatalogSkills(response.skills || []);
    } catch (err) {
      if (err instanceof ApiError) {
        console.error("Failed to load skill catalog:", err.message);
      } else {
        console.error("Failed to load skill catalog:", err);
      }
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  // Fetch catalog on mount and debounced on search/category change
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCatalog(catalogSearch, catalogCategory);
    }, 300);

    return () => clearTimeout(timer);
  }, [catalogSearch, catalogCategory, fetchCatalog]);

  // Group portfolio skills dynamically by actual categories
  const groupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    for (const skill of skills) {
      const cat = skill.category?.trim() || "Other";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(skill);
    }
    return groups;
  }, [skills]);

  // Open Catalog Selector Modal
  const handleOpenSelect = () => {
    setError(null);
    setIsSelectModalOpen(true);
  };

  // Open Create Custom Skill Modal
  const handleOpenCreate = () => {
    setEditingSkill(null);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Skill Modal
  const handleOpenEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (skill: Skill) => {
    setDeletingSkill(skill);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Add Skill from Predefined Catalog
  const handleSelectCatalogSkill = async (catalogSkill: CatalogSkill) => {
    if (!token) {
      setError("Session expired. Please log in again.");
      return;
    }

    // Duplicate check: case-insensitive & whitespace-normalized
    const normalizedName = catalogSkill.name.trim().toLowerCase();
    const isAlreadyAdded = skills.some(
      (s) => s.name.trim().toLowerCase() === normalizedName
    );

    if (isAlreadyAdded) {
      return;
    }

    try {
      const response = await createSkill(
        portfolioId,
        {
          name: catalogSkill.name.trim(),
          category: catalogSkill.category.trim(),
        },
        token
      );

      setSkills((prev) => [...prev, response.skill]);
      setSuccessMessage(`Skill "${response.skill.name}" added successfully.`);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to add skill from catalog.");
      } else {
        setError("Network connection error. Please try again.");
      }
    }
  };

  // Submit Create or Edit Custom Skill Form
  const handleFormSubmit = async (formData: SkillFormData) => {
    if (!token) {
      setFormServerError("Session expired. Please log in again.");
      return;
    }

    // Duplicate validation: case-insensitive & whitespace-normalized
    const trimmedName = formData.name.trim().toLowerCase();
    const isDuplicate = skills.some(
      (s) =>
        (!editingSkill || s.id !== editingSkill.id) &&
        s.name.trim().toLowerCase() === trimmedName
    );

    if (isDuplicate) {
      setFormServerError(`A skill named "${formData.name.trim()}" already exists in your portfolio.`);
      return;
    }

    setIsSubmitting(true);
    setFormServerError(null);

    try {
      if (editingSkill) {
        // Edit existing skill
        const response = await updateSkill(editingSkill.id, formData, token);
        setSkills((prev) =>
          prev.map((s) => (s.id === editingSkill.id ? response.skill : s))
        );
        setSuccessMessage(`Skill "${response.skill.name}" updated successfully.`);
      } else {
        // Create new custom skill
        const response = await createSkill(portfolioId, formData, token);
        setSkills((prev) => [...prev, response.skill]);
        setSuccessMessage(`Skill "${response.skill.name}" added successfully.`);
      }

      setIsFormModalOpen(false);
      setEditingSkill(null);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormServerError(err.message || "Failed to save skill.");
      } else {
        setFormServerError("Network connection error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Skill Deletion
  const handleConfirmDelete = async () => {
    if (!token || !deletingSkill) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteSkill(deletingSkill.id, token);
      const deletedName = deletingSkill.name;
      setSkills((prev) => prev.filter((s) => s.id !== deletingSkill.id));
      setIsDeleteModalOpen(false);
      setDeletingSkill(null);
      setSuccessMessage(`Skill "${deletedName}" was removed.`);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message || "Failed to remove skill.");
      } else {
        setDeleteError("Network connection error. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
              Portfolio Skills
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f3f0ff] text-[#6e56cf] border border-[#dcd3f8]">
              {skills.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748b] mt-1">
            Highlight your technical proficiencies, frameworks, libraries, and tools.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenSelect}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Skills</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 animate-fadeIn flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-semibold text-emerald-900">
              {successMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* General Error Notification */}
      {error && !isLoading && skills.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 animate-fadeIn flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-semibold text-rose-900">
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-[#eae6f5] p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-2 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-[#64748b]">Loading skills...</p>
        </div>
      ) : error && skills.length === 0 ? (
        /* Error State on Initial Load */
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-xs max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-3">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0f172a] mb-1">
            Unable to Load Skills
          </h3>
          <p className="text-xs text-[#64748b] mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void fetchSkills()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : skills.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-[#dcd3f8] p-8 sm:p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf] mx-auto mb-4">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#0f172a] mb-1.5">
            No skills added yet.
          </h3>
          <p className="text-xs sm:text-sm text-[#64748b] max-w-md mx-auto mb-6 leading-relaxed">
            Select skills from our curated catalog or create custom skills to showcase your technical stack.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenSelect}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md transition-all cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Skills</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-[#6e56cf] hover:text-[#5d46be] bg-[#f3f0ff] hover:bg-[#ede8fc] border border-[#dcd3f8] transition-all cursor-pointer"
            >
              <span>Add Custom Skill</span>
            </button>
          </div>
        </div>
      ) : (
        /* Category Groups */
        <div className="space-y-4">
          {Object.entries(groupedSkills).map(([categoryName, categorySkills]) => (
            <SkillCategoryGroup
              key={categoryName}
              category={categoryName}
              skills={categorySkills}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          ))}
        </div>
      )}

      {/* Catalog Selector Modal */}
      <SkillSelectModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        catalogSkills={catalogSkills}
        selectedSkillNames={skills.map((s) => s.name)}
        isLoading={isCatalogLoading}
        search={catalogSearch}
        category={catalogCategory}
        onSearchChange={setCatalogSearch}
        onCategoryChange={setCatalogCategory}
        onSelectSkill={handleSelectCatalogSkill}
        onCustomSkillClick={() => {
          setIsSelectModalOpen(false);
          handleOpenCreate();
        }}
      />

      {/* Custom Add / Edit Skill Modal */}
      <SkillFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsFormModalOpen(false);
            setEditingSkill(null);
            setFormServerError(null);
          }
        }}
        onSubmit={handleFormSubmit}
        mode={editingSkill ? "edit" : "create"}
        initialData={
          editingSkill
            ? {
                name: editingSkill.name,
                category: editingSkill.category,
                orderIndex: editingSkill.orderIndex,
              }
            : {}
        }
        isSubmitting={isSubmitting}
        serverError={formServerError}
      />

      {/* Delete Confirmation Modal */}
      <SkillDeleteModal
        isOpen={isDeleteModalOpen && Boolean(deletingSkill)}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeletingSkill(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        skillName={deletingSkill?.name || ""}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </section>
  );
}
