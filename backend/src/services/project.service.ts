import { pool } from "../config/database";
import { AppError } from "../utils/errors";
import type {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  DeleteProjectResult,
} from "../types/project.types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROJECT_COLUMNS = `
  id,
  portfolio_id,
  title,
  description,
  technologies,
  github_url,
  project_url,
  image_url,
  order_index,
  created_at,
  updated_at
`;

interface ProjectDbRow {
  id: string;
  portfolio_id: string;
  title: string;
  description: string | null;
  technologies: string[] | null;
  github_url: string | null;
  project_url: string | null;
  image_url: string | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

interface ProjectWithPortfolioRow extends ProjectDbRow {
  user_id: string;
}

function mapRowToProject(row: ProjectDbRow): Project {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    title: row.title,
    description: row.description,
    technologies: Array.isArray(row.technologies) ? row.technologies : [],
    githubUrl: row.github_url,
    projectUrl: row.project_url,
    imageUrl: row.image_url,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProjectService {
  /**
   * Creates a new project under the specified portfolio.
   * Enforces portfolio ownership for the authenticated user and validates fields.
   */
  async createProject(
    portfolioId: string,
    userId: string,
    data: CreateProjectDto
  ): Promise<Project> {
    if (!portfolioId || !UUID_REGEX.test(portfolioId)) {
      throw new AppError("Portfolio not found", 404);
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    // Verify parent portfolio existence and ownership
    const portfolioRes = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM portfolios WHERE id = $1`,
      [portfolioId]
    );

    const portfolio = portfolioRes.rows[0];
    if (!portfolio) {
      throw new AppError("Portfolio not found", 404);
    }

    if (portfolio.user_id !== userId) {
      throw new AppError("Unauthorized to modify this portfolio", 403);
    }

    if (!data.title || !data.title.trim()) {
      throw new AppError("Title is required", 400);
    }

    if (
      data.orderIndex !== undefined &&
      (data.orderIndex < 0 || !Number.isInteger(data.orderIndex))
    ) {
      throw new AppError("Order index must be a non-negative integer", 400);
    }

    const trimmedTitle = data.title.trim();
    const trimmedDescription = data.description ? data.description.trim() : null;
    const technologies = Array.isArray(data.technologies)
      ? data.technologies.map((t) => t.trim()).filter(Boolean)
      : [];
    const trimmedGithubUrl = data.githubUrl ? data.githubUrl.trim() : null;
    const trimmedProjectUrl = data.projectUrl ? data.projectUrl.trim() : null;
    const trimmedImageUrl = data.imageUrl ? data.imageUrl.trim() : null;
    const orderIndex = data.orderIndex ?? 0;

    try {
      const result = await pool.query<ProjectDbRow>(
        `INSERT INTO projects (
           portfolio_id, title, description, technologies,
           github_url, project_url, image_url, order_index
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${PROJECT_COLUMNS}`,
        [
          portfolioId,
          trimmedTitle,
          trimmedDescription,
          JSON.stringify(technologies),
          trimmedGithubUrl,
          trimmedProjectUrl,
          trimmedImageUrl,
          orderIndex,
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new AppError("Failed to create project", 500);
      }

      return mapRowToProject(row);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to create project", 500);
    }
  }

  /**
   * Retrieves all projects belonging to a portfolio.
   * If userId is provided, validates that the portfolio belongs to the user.
   * Orders results by order_index ASC, created_at DESC.
   */
  async getProjectsByPortfolio(
    portfolioId: string,
    userId?: string
  ): Promise<Project[]> {
    if (!portfolioId || !UUID_REGEX.test(portfolioId)) {
      throw new AppError("Portfolio not found", 404);
    }

    const portfolioRes = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM portfolios WHERE id = $1`,
      [portfolioId]
    );

    const portfolio = portfolioRes.rows[0];
    if (!portfolio) {
      throw new AppError("Portfolio not found", 404);
    }

    if (userId && portfolio.user_id !== userId) {
      throw new AppError("Unauthorized access to portfolio", 403);
    }

    const result = await pool.query<ProjectDbRow>(
      `SELECT ${PROJECT_COLUMNS}
       FROM projects
       WHERE portfolio_id = $1
       ORDER BY order_index ASC, created_at DESC`,
      [portfolioId]
    );

    return result.rows.map(mapRowToProject);
  }

  /**
   * Retrieves a single project by ID.
   * If userId is provided, validates ownership through the parent portfolio.
   */
  async getProjectById(projectId: string, userId?: string): Promise<Project> {
    if (!projectId || !UUID_REGEX.test(projectId)) {
      throw new AppError("Project not found", 404);
    }

    const result = await pool.query<ProjectWithPortfolioRow>(
      `SELECT p.id, p.portfolio_id, p.title, p.description, p.technologies,
              p.github_url, p.project_url, p.image_url, p.order_index,
              p.created_at, p.updated_at, pf.user_id
       FROM projects p
       JOIN portfolios pf ON p.portfolio_id = pf.id
       WHERE p.id = $1`,
      [projectId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new AppError("Project not found", 404);
    }

    if (userId && row.user_id !== userId) {
      throw new AppError("Unauthorized access to project", 403);
    }

    return mapRowToProject(row);
  }

  /**
   * Updates an existing project.
   * Verifies ownership via the parent portfolio, updates only supplied fields,
   * preserves unspecified fields, and sets updated_at = CURRENT_TIMESTAMP.
   */
  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectDto
  ): Promise<Project> {
    if (!projectId || !UUID_REGEX.test(projectId)) {
      throw new AppError("Project not found", 404);
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    // Verify existing project and ownership via parent portfolio
    const existingRes = await pool.query<ProjectWithPortfolioRow>(
      `SELECT p.id, p.portfolio_id, p.title, p.description, p.technologies,
              p.github_url, p.project_url, p.image_url, p.order_index,
              p.created_at, p.updated_at, pf.user_id
       FROM projects p
       JOIN portfolios pf ON p.portfolio_id = pf.id
       WHERE p.id = $1`,
      [projectId]
    );

    const existing = existingRes.rows[0];
    if (!existing) {
      throw new AppError("Project not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to modify this project", 403);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new AppError("Title cannot be empty", 400);
      }
      updates.push(`title = $${paramIdx++}`);
      values.push(data.title.trim());
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      values.push(data.description ? data.description.trim() : null);
    }

    if (data.technologies !== undefined) {
      const technologies = Array.isArray(data.technologies)
        ? data.technologies.map((t) => t.trim()).filter(Boolean)
        : [];
      updates.push(`technologies = $${paramIdx++}`);
      values.push(JSON.stringify(technologies));
    }

    if (data.githubUrl !== undefined) {
      updates.push(`github_url = $${paramIdx++}`);
      values.push(data.githubUrl ? data.githubUrl.trim() : null);
    }

    if (data.projectUrl !== undefined) {
      updates.push(`project_url = $${paramIdx++}`);
      values.push(data.projectUrl ? data.projectUrl.trim() : null);
    }

    if (data.imageUrl !== undefined) {
      updates.push(`image_url = $${paramIdx++}`);
      values.push(data.imageUrl ? data.imageUrl.trim() : null);
    }

    if (data.orderIndex !== undefined) {
      if (data.orderIndex < 0 || !Number.isInteger(data.orderIndex)) {
        throw new AppError("Order index must be a non-negative integer", 400);
      }
      updates.push(`order_index = $${paramIdx++}`);
      values.push(data.orderIndex);
    }

    if (updates.length === 0) {
      return mapRowToProject(existing);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(projectId);
    const idParamIdx = paramIdx;

    const query = `
      UPDATE projects
      SET ${updates.join(", ")}
      WHERE id = $${idParamIdx}
      RETURNING ${PROJECT_COLUMNS}
    `;

    try {
      const updateResult = await pool.query<ProjectDbRow>(query, values);
      const updatedRow = updateResult.rows[0];
      if (!updatedRow) {
        throw new AppError("Project not found", 404);
      }
      return mapRowToProject(updatedRow);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to update project", 500);
    }
  }

  /**
   * Deletes an existing project.
   * Verifies ownership through the parent portfolio before deleting.
   */
  async deleteProject(
    projectId: string,
    userId: string
  ): Promise<DeleteProjectResult> {
    if (!projectId || !UUID_REGEX.test(projectId)) {
      throw new AppError("Project not found", 404);
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const existingRes = await pool.query<ProjectWithPortfolioRow>(
      `SELECT p.id, pf.user_id
       FROM projects p
       JOIN portfolios pf ON p.portfolio_id = pf.id
       WHERE p.id = $1`,
      [projectId]
    );

    const existing = existingRes.rows[0];
    if (!existing) {
      throw new AppError("Project not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to delete this project", 403);
    }

    await pool.query(`DELETE FROM projects WHERE id = $1`, [projectId]);

    return {
      success: true,
      id: projectId,
    };
  }
}

export const projectService = new ProjectService();
