// Project TypeScript Definitions (PROJECT-01)

/**
 * Clean, camelCased Project entity representation used by application layers.
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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data payload required/optional when creating a new project under a portfolio.
 */
export interface CreateProjectDto {
  title: string;
  description?: string | null;
  technologies?: string[];
  githubUrl?: string | null;
  projectUrl?: string | null;
  imageUrl?: string | null;
  orderIndex?: number;
}

/**
 * Data payload for updating an existing project (all fields optional).
 */
export interface UpdateProjectDto {
  title?: string;
  description?: string | null;
  technologies?: string[];
  githubUrl?: string | null;
  projectUrl?: string | null;
  imageUrl?: string | null;
  orderIndex?: number;
}

/**
 * Result returned upon successful deletion of a project.
 */
export interface DeleteProjectResult {
  success: boolean;
  id: string;
}
