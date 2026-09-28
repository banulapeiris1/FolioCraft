"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Experience, ExperienceFormData } from "@/types/experience";
import {
  getExperiences,
  createExperience,
  updateExperience,
  deleteExperience,
  ApiError,
} from "@/lib/api";
import ExperienceCard from "./ExperienceCard";
import ExperienceForm from "./ExperienceForm";
import ExperienceModal from "./ExperienceModal";
import ExperienceDeleteModal from "./ExperienceDeleteModal";
import {
  BriefcaseIcon,
  PlusIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface ExperienceManagerProps {
  portfolioId: string;
}

export default function ExperienceManager({ portfolioId }: ExperienceManagerProps) {
  const { token } = useAuth();

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Success alert message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  // Delete Modal state
  const [deletingExperience, setDeletingExperience] = useState<Experience | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch experiences from backend
  const fetchExperiences = useCallback(async () => {
    if (!token || !portfolioId) return;

    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await getExperiences(portfolioId, token);
      const list = response.experience || response.experiences || [];
      setExperiences(list);
    } catch (err) {
      if (err instanceof ApiError) {
        setFetchError(err.message || "Failed to load work experiences.");
      } else {
        setFetchError("Unable to connect to the server. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, token]);

  useEffect(() => {
    void fetchExperiences();
  }, [fetchExperiences]);

  // Open Add Experience Modal
  const handleOpenAdd = () => {
    setEditingExperience(null);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Experience Modal
  const handleOpenEdit = (exp: Experience) => {
    setEditingExperience(exp);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  // Submit Add or Edit Experience
  const handleFormSubmit = async (formData: ExperienceFormData) => {
    if (!token) {
      setFormServerError("Session expired. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    setFormServerError(null);

    try {
      if (editingExperience) {
        // Edit existing experience
        const response = await updateExperience(editingExperience.id, formData, token);
        const updated = response.experience;
        setExperiences((prev) =>
          prev.map((e) => (e.id === editingExperience.id ? updated : e))
        );
        setSuccessMessage(`Experience at "${updated.company}" updated successfully.`);
      } else {
        // Create new experience
        const response = await createExperience(portfolioId, formData, token);
        const created = response.experience;
        // Prepend or refresh to maintain backend sorting (current first, start_date DESC)
        setExperiences((prev) => [created, ...prev]);
        setSuccessMessage(`Experience at "${created.company}" created successfully.`);
      }

      setIsFormModalOpen(false);
      setEditingExperience(null);

      // Trigger silent background refresh to maintain exact backend sorting
      void fetchExperiences();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormServerError(err.message || "Failed to save experience.");
      } else {
        setFormServerError("Network connection error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (exp: Experience) => {
    setDeletingExperience(exp);
    setDeleteError(null);
  };

  // Confirm Delete Experience
  const handleConfirmDelete = async () => {
    if (!token || !deletingExperience) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteExperience(deletingExperience.id, token);
      const deletedCompany = deletingExperience.company;
      setExperiences((prev) => prev.filter((e) => e.id !== deletingExperience.id));
      setDeletingExperience(null);
      setSuccessMessage(`Experience at "${deletedCompany}" was deleted.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message || "Failed to delete experience.");
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
              Work Experience
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f3f0ff] text-[#6e56cf] border border-[#dcd3f8]">
              {experiences.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748b] mt-1">
            Highlight your career journey, employment roles, and technical achievements.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Experience</span>
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

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-[#eae6f5] p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-2 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-[#64748b]">Loading experiences...</p>
        </div>
      ) : fetchError ? (
        /* Error State */
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-xs max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-3">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0f172a] mb-1">
            Unable to Load Experience
          </h3>
          <p className="text-xs text-[#64748b] mb-4">{fetchError}</p>
          <button
            type="button"
            onClick={() => void fetchExperiences()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : experiences.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-[#dcd3f8] p-8 sm:p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf] mx-auto mb-4">
            <BriefcaseIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#0f172a] mb-1.5">
            No work experience added yet.
          </h3>
          <p className="text-xs sm:text-sm text-[#64748b] max-w-md mx-auto mb-6 leading-relaxed">
            Add your professional history to give recruiters and clients insight into your technical leadership, responsibilities, and impact.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Your First Experience</span>
          </button>
        </div>
      ) : (
        /* Experience List */
        <div className="space-y-4">
          {experiences.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Experience Modal */}
      <ExperienceModal
        isOpen={isFormModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsFormModalOpen(false);
            setEditingExperience(null);
          }
        }}
        title={editingExperience ? "Edit Work Experience" : "Add Work Experience"}
        description={
          editingExperience
            ? "Update the company, title, dates, or accomplishments for this role."
            : "Fill in the details of your role to highlight it on your portfolio."
        }
      >
        <ExperienceForm
          mode={editingExperience ? "edit" : "create"}
          initialData={
            editingExperience
              ? {
                  company: editingExperience.company,
                  position: editingExperience.position,
                  description: editingExperience.description,
                  startDate: editingExperience.startDate,
                  endDate: editingExperience.endDate,
                  isCurrent: editingExperience.isCurrent,
                }
              : {}
          }
          isSubmitting={isSubmitting}
          serverError={formServerError}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormModalOpen(false);
            setEditingExperience(null);
          }}
        />
      </ExperienceModal>

      {/* Delete Confirmation Modal */}
      <ExperienceDeleteModal
        isOpen={Boolean(deletingExperience)}
        experienceTitle={
          deletingExperience
            ? `${deletingExperience.position} at ${deletingExperience.company}`
            : ""
        }
        isDeleting={isDeleting}
        error={deleteError}
        onClose={() => {
          if (!isDeleting) {
            setDeletingExperience(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
