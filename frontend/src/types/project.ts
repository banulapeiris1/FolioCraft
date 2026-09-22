// Frontend Project Types (PROJECT-04)

/**
 * Data payload managed by project creation and editing forms.
 * Matches backend DTOs while strictly omitting server-controlled fields like id, portfolioId, createdAt, updatedAt.
 */
export interface ProjectFormData {
  title: string;
  description?: string | null;
  technologies?: string[];
  githubUrl?: string | null;
  projectUrl?: string | null;
  imageUrl?: string | null;
  orderIndex?: number;
}

/**
 * Full project entity model returned from the backend.
 */
export interface Project {
  id: string;
  portfolioId: string;
  title: string;
  description: string | null;
  technologies: string[];
  githubUrl: string | null;
  projectUrl: string | null;
  imageUrl: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * API response format for single project endpoints (GET, POST, PUT).
 */
export interface ProjectResponse {
  project: Project;
}

/**
 * API response format for project collection endpoints (GET /api/portfolios/:id/projects).
 */
export interface ProjectsResponse {
  projects: Project[];
}

/**
 * API response format for project deletion.
 */
export interface DeleteProjectResponse {
  success: boolean;
  id: string;
}

/**
 * Client-side validation errors mapped to project field names.
 */
export interface ProjectFormErrors {
  title?: string;
  description?: string;
  technologies?: string;
  githubUrl?: string;
  projectUrl?: string;
  imageUrl?: string;
  orderIndex?: string;
  general?: string;
}
