import { pool } from "../config/database";
import { AppError } from "../utils/errors";
import type {
  Skill,
  CreateSkillDto,
  UpdateSkillDto,
  DeleteSkillResult,
} from "../types/skill.types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SKILL_COLUMNS = `
  id,
  portfolio_id,
  name,
  category,
  order_index,
  created_at,
  updated_at
`;

interface SkillDbRow {
  id: string;
  portfolio_id: string;
  name: string;
  category: string;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

interface SkillWithPortfolioRow extends SkillDbRow {
  user_id: string;
}

function mapRowToSkill(row: SkillDbRow): Skill {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    name: row.name,
    category: row.category,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SkillService {
  /**
   * Creates a new skill under the specified portfolio.
   * Enforces portfolio ownership for the authenticated user and validates fields.
   */
  async createSkill(
    userId: string,
    portfolioId: string,
    data: CreateSkillDto
  ): Promise<Skill> {
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

    if (!data.name || !data.name.trim()) {
      throw new AppError("Name is required", 400);
    }

    if (data.name.trim().length > 100) {
      throw new AppError("Name cannot exceed 100 characters", 400);
    }

    if (!data.category || !data.category.trim()) {
      throw new AppError("Category is required", 400);
    }

    if (data.category.trim().length > 50) {
      throw new AppError("Category cannot exceed 50 characters", 400);
    }

    if (
      data.orderIndex !== undefined &&
      (data.orderIndex < 0 || !Number.isInteger(data.orderIndex))
    ) {
      throw new AppError("Order index must be a non-negative integer", 400);
    }

    const trimmedName = data.name.trim();
    const trimmedCategory = data.category.trim();
    const orderIndex = data.orderIndex ?? 0;

    try {
      const result = await pool.query<SkillDbRow>(
        `INSERT INTO skills (
           portfolio_id, name, category, order_index
         )
         VALUES ($1, $2, $3, $4)
         RETURNING ${SKILL_COLUMNS}`,
        [portfolioId, trimmedName, trimmedCategory, orderIndex]
      );

      const row = result.rows[0];
      if (!row) {
        throw new AppError("Failed to create skill", 500);
      }

      return mapRowToSkill(row);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to create skill", 500);
    }
  }

  /**
   * Retrieves all skills belonging to a portfolio.
   * Enforces portfolio ownership for the user.
   * Orders results by order_index ASC, created_at DESC.
   */
  async getSkills(userId: string, portfolioId: string): Promise<Skill[]> {
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

    const result = await pool.query<SkillDbRow>(
      `SELECT ${SKILL_COLUMNS}
       FROM skills
       WHERE portfolio_id = $1
       ORDER BY order_index ASC, created_at DESC`,
      [portfolioId]
    );

    return result.rows.map(mapRowToSkill);
  }

  /**
   * Retrieves a single skill by ID.
   * Verifies ownership through the parent portfolio.
   */
  async getSkillById(userId: string, skillId: string): Promise<Skill> {
    if (!skillId || !UUID_REGEX.test(skillId)) {
      throw new AppError("Skill not found", 404);
    }

    const result = await pool.query<SkillWithPortfolioRow>(
      `SELECT s.id, s.portfolio_id, s.name, s.category, s.order_index,
              s.created_at, s.updated_at, pf.user_id
       FROM skills s
       JOIN portfolios pf ON s.portfolio_id = pf.id
       WHERE s.id = $1`,
      [skillId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new AppError("Skill not found", 404);
    }

    if (userId && row.user_id !== userId) {
      throw new AppError("Unauthorized access to skill", 403);
    }

    return mapRowToSkill(row);
  }

  /**
   * Updates an existing skill.
   * Verifies ownership via the parent portfolio, updates only supplied fields,
   * preserves unspecified fields, and sets updated_at = CURRENT_TIMESTAMP.
   */
  async updateSkill(
    userId: string,
    skillId: string,
    data: UpdateSkillDto
  ): Promise<Skill> {
    if (!skillId || !UUID_REGEX.test(skillId)) {
      throw new AppError("Skill not found", 404);
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    // Verify existing skill and ownership via parent portfolio
    const existingRes = await pool.query<SkillWithPortfolioRow>(
      `SELECT s.id, s.portfolio_id, s.name, s.category, s.order_index,
              s.created_at, s.updated_at, pf.user_id
       FROM skills s
       JOIN portfolios pf ON s.portfolio_id = pf.id
       WHERE s.id = $1`,
      [skillId]
    );

    const existing = existingRes.rows[0];
    if (!existing) {
      throw new AppError("Skill not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to modify this skill", 403);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new AppError("Name cannot be empty", 400);
      }
      if (data.name.trim().length > 100) {
        throw new AppError("Name cannot exceed 100 characters", 400);
      }
      updates.push(`name = $${paramIdx++}`);
      values.push(data.name.trim());
    }

    if (data.category !== undefined) {
      if (!data.category.trim()) {
        throw new AppError("Category cannot be empty", 400);
      }
      if (data.category.trim().length > 50) {
        throw new AppError("Category cannot exceed 50 characters", 400);
      }
      updates.push(`category = $${paramIdx++}`);
      values.push(data.category.trim());
    }

    if (data.orderIndex !== undefined) {
      if (data.orderIndex < 0 || !Number.isInteger(data.orderIndex)) {
        throw new AppError("Order index must be a non-negative integer", 400);
      }
      updates.push(`order_index = $${paramIdx++}`);
      values.push(data.orderIndex);
    }

    if (updates.length === 0) {
      return mapRowToSkill(existing);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(skillId);
    const idParamIdx = paramIdx;

    const query = `
      UPDATE skills
      SET ${updates.join(", ")}
      WHERE id = $${idParamIdx}
      RETURNING ${SKILL_COLUMNS}
    `;

    try {
      const updateResult = await pool.query<SkillDbRow>(query, values);
      const updatedRow = updateResult.rows[0];
      if (!updatedRow) {
        throw new AppError("Skill not found", 404);
      }
      return mapRowToSkill(updatedRow);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to update skill", 500);
    }
  }

  /**
   * Deletes an existing skill.
   * Verifies ownership through the parent portfolio before deleting.
   */
  async deleteSkill(
    userId: string,
    skillId: string
  ): Promise<DeleteSkillResult> {
    if (!skillId || !UUID_REGEX.test(skillId)) {
      throw new AppError("Skill not found", 404);
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const existingRes = await pool.query<SkillWithPortfolioRow>(
      `SELECT s.id, pf.user_id
       FROM skills s
       JOIN portfolios pf ON s.portfolio_id = pf.id
       WHERE s.id = $1`,
      [skillId]
    );

    const existing = existingRes.rows[0];
    if (!existing) {
      throw new AppError("Skill not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to delete this skill", 403);
    }

    await pool.query(`DELETE FROM skills WHERE id = $1`, [skillId]);

    return {
      success: true,
      id: skillId,
    };
  }
}

export const skillService = new SkillService();
