"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Project, ProjectFormData } from "@/types/project";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  ApiError,
} from "@/lib/api";
import ProjectCard from "./ProjectCard";
import ProjectForm from "./ProjectForm";
import ProjectModal from "./ProjectModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import {
  FolderGit2Icon,
  PlusIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface ProjectManagerProps {
  portfolioId: string;
}

export default function ProjectManager({ portfolioId }: ProjectManagerProps) {
  const { token } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Success alert message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  // Delete Modal state
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch projects from backend
  const fetchProjects = useCallback(async () => {
    if (!token || !portfolioId) return;

    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await getProjects(portfolioId, token);
      setProjects(response.projects || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setFetchError(err.message || "Failed to load portfolio projects.");
      } else {
        setFetchError("Unable to connect to the server. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, token]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  // Open Add Project Modal
  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Project Modal
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  // Submit Add or Edit Project
  const handleFormSubmit = async (formData: ProjectFormData) => {
    if (!token) {
      setFormServerError("Session expired. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    setFormServerError(null);

    try {
      if (editingProject) {
        // Edit existing project
        const response = await updateProject(editingProject.id, formData, token);
        setProjects((prev) =>
          prev.map((p) => (p.id === editingProject.id ? response.project : p))
        );
        setSuccessMessage(`Project "${response.project.title}" updated successfully.`);
      } else {
        // Create new project
        const response = await createProject(portfolioId, formData, token);
        setProjects((prev) => [...prev, response.project]);
        setSuccessMessage(`Project "${response.project.title}" created successfully.`);
      }

      setIsFormModalOpen(false);
      setEditingProject(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormServerError(err.message || "Failed to save project.");
      } else {
        setFormServerError("Network connection error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (project: Project) => {
    setDeletingProject(project);
    setDeleteError(null);
  };

  // Confirm Delete Project
  const handleConfirmDelete = async () => {
    if (!token || !deletingProject) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteProject(deletingProject.id, token);
      const deletedTitle = deletingProject.title;
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      setDeletingProject(null);
      setSuccessMessage(`Project "${deletedTitle}" was deleted.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message || "Failed to delete project.");
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
              Portfolio Projects
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f3f0ff] text-[#6e56cf] border border-[#dcd3f8]">
              {projects.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748b] mt-1">
            Showcase your best engineering work, web apps, and open-source contributions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Project</span>
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
          <p className="text-xs font-medium text-[#64748b]">Loading projects...</p>
        </div>
      ) : fetchError ? (
        /* Error State */
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-xs max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-3">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0f172a] mb-1">
            Unable to Load Projects
          </h3>
          <p className="text-xs text-[#64748b] mb-4">{fetchError}</p>
          <button
            type="button"
            onClick={() => void fetchProjects()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-[#dcd3f8] p-8 sm:p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf] mx-auto mb-4">
            <FolderGit2Icon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#0f172a] mb-1.5">
            No projects added yet.
          </h3>
          <p className="text-xs sm:text-sm text-[#64748b] max-w-md mx-auto mb-6 leading-relaxed">
            Highlight your applications, libraries, and design systems. Projects give visitors and hiring teams tangible proof of your abilities.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Your First Project</span>
          </button>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Project Modal */}
      <ProjectModal
        isOpen={isFormModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsFormModalOpen(false);
            setEditingProject(null);
          }
        }}
        title={editingProject ? "Edit Project" : "Add Project"}
        description={
          editingProject
            ? "Update the details, technologies, or links for this project."
            : "Fill in the project information to feature it on your portfolio."
        }
      >
        <ProjectForm
          mode={editingProject ? "edit" : "create"}
          initialData={
            editingProject
              ? {
                  title: editingProject.title,
                  description: editingProject.description,
                  technologies: editingProject.technologies,
                  githubUrl: editingProject.githubUrl,
                  projectUrl: editingProject.projectUrl,
                  imageUrl: editingProject.imageUrl,
                }
              : {}
          }
          isSubmitting={isSubmitting}
          serverError={formServerError}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormModalOpen(false);
            setEditingProject(null);
          }}
        />
      </ProjectModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingProject)}
        projectTitle={deletingProject?.title || ""}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={() => {
          if (!isDeleting) {
            setDeletingProject(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
