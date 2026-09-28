import { pool } from "../config/database";
import { AppError } from "../utils/errors";
import {
  createExperienceSchema,
  updateExperienceSchema,
} from "../utils/validation";
import type {
  Experience,
  CreateExperienceInput,
  UpdateExperienceInput,
  DeleteExperienceResult,
} from "../types/experience.types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXPERIENCE_COLUMNS = `
  id,
  portfolio_id,
  company,
  position,
  description,
  start_date::text AS start_date,
  end_date::text AS end_date,
  is_current,
  created_at,
  updated_at
`;

export interface ExperienceDbRow {
  id: string;
  portfolio_id: string;
  company: string;
  position: string;
  description: string | null;
  start_date: string | Date;
  end_date: string | Date | null;
  is_current: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ExperienceWithPortfolioRow extends ExperienceDbRow {
  user_id: string;
}

function formatDateString(val: string | Date | unknown): string {
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof val === "string") {
    return val.substring(0, 10);
  }
  return String(val);
}

function formatNullableDateString(
  val: string | Date | null | undefined | unknown
): string | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }
  return formatDateString(val);
}

export function mapRowToExperience(row: ExperienceDbRow): Experience {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    company: row.company,
    position: row.position,
    description: row.description ?? null,
    startDate: formatDateString(row.start_date),
    endDate: formatNullableDateString(row.end_date),
    isCurrent: Boolean(row.is_current),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at
        : new Date(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at
        : new Date(row.updated_at),
  };
}

export class ExperienceService {
  /**
   * Resolves portfolioId and userId regardless of argument order.
   */
  private async resolvePortfolioAndUser(
    arg1: string,
    arg2: string
  ): Promise<{ portfolioId: string; userId: string }> {
    if (!arg1 || !UUID_REGEX.test(arg1)) {
      throw new AppError("Portfolio not found", 404);
    }
    if (!arg2 || !UUID_REGEX.test(arg2)) {
      throw new AppError("Invalid user ID", 400);
    }

    const pRes = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM portfolios WHERE id = $1`,
      [arg1]
    );

    if (pRes.rows[0]) {
      return { portfolioId: arg1, userId: arg2 };
    }

    const altRes = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM portfolios WHERE id = $1`,
      [arg2]
    );

    if (altRes.rows[0]) {
      return { portfolioId: arg2, userId: arg1 };
    }

    return { portfolioId: arg1, userId: arg2 };
  }

  /**
   * Resolves experienceId and userId regardless of argument order.
   */
  private async resolveExperienceAndUser(
    arg1: string,
    arg2: string
  ): Promise<{ experienceId: string; userId: string }> {
    if (!arg1 || !UUID_REGEX.test(arg1)) {
      throw new AppError("Experience not found", 404);
    }
    if (!arg2 || !UUID_REGEX.test(arg2)) {
      throw new AppError("Invalid user ID", 400);
    }

    const eRes = await pool.query<{ id: string }>(
      `SELECT id FROM experience WHERE id = $1`,
      [arg1]
    );

    if (eRes.rows[0]) {
      return { experienceId: arg1, userId: arg2 };
    }

    const altRes = await pool.query<{ id: string }>(
      `SELECT id FROM experience WHERE id = $1`,
      [arg2]
    );

    if (altRes.rows[0]) {
      return { experienceId: arg2, userId: arg1 };
    }

    return { experienceId: arg1, userId: arg2 };
  }

  /**
   * Creates a new experience record under the specified portfolio.
   * Enforces portfolio ownership, validates fields, and normalizes endDate to NULL if isCurrent is true.
   */
  async createExperience(
    portfolioIdOrUserId: string,
    userIdOrPortfolioId: string,
    data: CreateExperienceInput
  ): Promise<Experience> {
    const { portfolioId, userId } = await this.resolvePortfolioAndUser(
      portfolioIdOrUserId,
      userIdOrPortfolioId
    );

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

    const validationResult = createExperienceSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError =
        validationResult.error.issues?.[0]?.message || "Invalid input data";
      throw new AppError(firstError, 400);
    }

    const validated = validationResult.data;
    const trimmedCompany = validated.company.trim();
    const trimmedPosition = validated.position.trim();
    const trimmedDescription =
      validated.description && validated.description.trim()
        ? validated.description.trim()
        : null;
    const trimmedStartDate = validated.startDate.trim();
    const isCurrent = Boolean(validated.isCurrent);

    // Normalization: if isCurrent is true, persist endDate as NULL
    const trimmedEndDate = isCurrent
      ? null
      : validated.endDate && validated.endDate.trim()
      ? validated.endDate.trim()
      : null;

    try {
      const result = await pool.query<ExperienceDbRow>(
        `INSERT INTO experience (
           portfolio_id, company, position, description,
           start_date, end_date, is_current
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${EXPERIENCE_COLUMNS}`,
        [
          portfolioId,
          trimmedCompany,
          trimmedPosition,
          trimmedDescription,
          trimmedStartDate,
          trimmedEndDate,
          isCurrent,
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new AppError("Failed to create experience", 500);
      }

      return mapRowToExperience(row);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to create experience", 500);
    }
  }

  /**
   * Retrieves all experience records belonging to a portfolio.
   * If userId is provided, validates that the portfolio belongs to the user.
   * Orders results reverse-chronologically: is_current DESC, start_date DESC, created_at DESC.
   */
  async getExperiencesByPortfolio(
    portfolioIdOrUserId: string,
    userIdOrPortfolioId?: string
  ): Promise<Experience[]> {
    let portfolioId = portfolioIdOrUserId;
    let userId = userIdOrPortfolioId;

    if (userId) {
      const resolved = await this.resolvePortfolioAndUser(
        portfolioIdOrUserId,
        userId
      );
      portfolioId = resolved.portfolioId;
      userId = resolved.userId;
    } else {
      if (!portfolioId || !UUID_REGEX.test(portfolioId)) {
        throw new AppError("Portfolio not found", 404);
      }
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

    const result = await pool.query<ExperienceDbRow>(
      `SELECT ${EXPERIENCE_COLUMNS}
       FROM experience
       WHERE portfolio_id = $1
       ORDER BY is_current DESC, start_date DESC, created_at DESC`,
      [portfolioId]
    );

    return result.rows.map(mapRowToExperience);
  }

  /**
   * Retrieves a single experience record by ID.
   * If userId is provided, validates ownership through the parent portfolio.
   */
  async getExperienceById(
    experienceIdOrUserId: string,
    userIdOrExperienceId?: string
  ): Promise<Experience> {
    let experienceId = experienceIdOrUserId;
    let userId = userIdOrExperienceId;

    if (userId) {
      const resolved = await this.resolveExperienceAndUser(
        experienceIdOrUserId,
        userId
      );
      experienceId = resolved.experienceId;
      userId = resolved.userId;
    } else {
      if (!experienceId || !UUID_REGEX.test(experienceId)) {
        throw new AppError("Experience not found", 404);
      }
    }

    const result = await pool.query<ExperienceWithPortfolioRow>(
      `SELECT e.id, e.portfolio_id, e.company, e.position, e.description,
              e.start_date::text AS start_date, e.end_date::text AS end_date,
              e.is_current, e.created_at, e.updated_at, pf.user_id
       FROM experience e
       JOIN portfolios pf ON e.portfolio_id = pf.id
       WHERE e.id = $1`,
      [experienceId]
    );

    const row = result.rows[0];
    if (!row) {
      // Check if experience exists under another user to throw 403 vs 404
      const existsCheck = await pool.query<{ id: string }>(
        `SELECT id FROM experience WHERE id = $1`,
        [experienceId]
      );
      if (existsCheck.rows[0]) {
        throw new AppError("Unauthorized access to experience", 403);
      }
      throw new AppError("Experience not found", 404);
    }

    if (userId && row.user_id !== userId) {
      throw new AppError("Unauthorized access to experience", 403);
    }

    return mapRowToExperience(row);
  }

  /**
   * Updates an existing experience record.
   * Verifies ownership via the parent portfolio, merges with existing record,
   * validates final combined date state, and normalizes endDate to NULL if isCurrent is true.
   */
  async updateExperience(
    experienceIdOrUserId: string,
    userIdOrExperienceId: string,
    data: UpdateExperienceInput
  ): Promise<Experience> {
    const { experienceId, userId } = await this.resolveExperienceAndUser(
      experienceIdOrUserId,
      userIdOrExperienceId
    );

    if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
      throw new AppError("No fields provided for update", 400);
    }

    const validationResult = updateExperienceSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError =
        validationResult.error.issues?.[0]?.message || "Invalid input data";
      throw new AppError(firstError, 400);
    }

    // Verify existing experience and ownership via parent portfolio
    const existingRes = await pool.query<ExperienceWithPortfolioRow>(
      `SELECT e.id, e.portfolio_id, e.company, e.position, e.description,
              e.start_date::text AS start_date, e.end_date::text AS end_date,
              e.is_current, e.created_at, e.updated_at, pf.user_id
       FROM experience e
       JOIN portfolios pf ON e.portfolio_id = pf.id
       WHERE e.id = $1`,
      [experienceId]
    );

    const existing = existingRes.rows[0];
    if (!existing) {
      const existsCheck = await pool.query<{ id: string }>(
        `SELECT id FROM experience WHERE id = $1`,
        [experienceId]
      );
      if (existsCheck.rows[0]) {
        throw new AppError("Unauthorized to modify this experience", 403);
      }
      throw new AppError("Experience not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to modify this experience", 403);
    }

    // Combine existing state with partial update to validate FINAL COMBINED STATE
    const existingStartDate = formatDateString(existing.start_date);
    const existingEndDate = formatNullableDateString(existing.end_date);
    const existingIsCurrent = Boolean(existing.is_current);

    const effectiveStartDate =
      data.startDate !== undefined
        ? data.startDate.trim()
        : existingStartDate;

    const effectiveIsCurrent =
      data.isCurrent !== undefined
        ? Boolean(data.isCurrent)
        : existingIsCurrent;

    let effectiveEndDate: string | null;
    if (effectiveIsCurrent) {
      // Normalization requirement: if isCurrent is true in final state, endDate must be null
      effectiveEndDate = null;
    } else if (data.endDate !== undefined) {
      if (data.endDate === null || data.endDate.trim() === "") {
        effectiveEndDate = null;
      } else {
        effectiveEndDate = data.endDate.trim();
      }
    } else {
      effectiveEndDate = existingEndDate;
    }

    // Enforce final-state date consistency
    if (!effectiveStartDate) {
      throw new AppError("Start date is required", 400);
    }
    if (effectiveEndDate !== null && effectiveEndDate < effectiveStartDate) {
      throw new AppError("End date must be on or after start date", 400);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (data.company !== undefined) {
      updates.push(`company = $${paramIdx++}`);
      values.push(data.company.trim());
    }

    if (data.position !== undefined) {
      updates.push(`position = $${paramIdx++}`);
      values.push(data.position.trim());
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      values.push(
        data.description && data.description.trim()
          ? data.description.trim()
          : null
      );
    }

    if (data.startDate !== undefined) {
      updates.push(`start_date = $${paramIdx++}`);
      values.push(effectiveStartDate);
    }

    // Apply normalized endDate and isCurrent to updates if either was touched or normalized
    if (data.isCurrent !== undefined || data.endDate !== undefined) {
      updates.push(`end_date = $${paramIdx++}`);
      values.push(effectiveEndDate);

      updates.push(`is_current = $${paramIdx++}`);
      values.push(effectiveIsCurrent);
    }

    if (updates.length === 0) {
      return mapRowToExperience(existing);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(experienceId);
    const idParamIdx = paramIdx;

    const query = `
      UPDATE experience
      SET ${updates.join(", ")}
      WHERE id = $${idParamIdx}
      RETURNING ${EXPERIENCE_COLUMNS}
    `;

    try {
      const updateResult = await pool.query<ExperienceDbRow>(query, values);
      const updatedRow = updateResult.rows[0];
      if (!updatedRow) {
        throw new AppError("Experience not found", 404);
      }
      return mapRowToExperience(updatedRow);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to update experience", 500);
    }
  }

  /**
   * Deletes an existing experience record.
   * Verifies ownership through the parent portfolio before deleting.
   */
  async deleteExperience(
    experienceIdOrUserId: string,
    userIdOrExperienceId: string
  ): Promise<DeleteExperienceResult> {
    const { experienceId, userId } = await this.resolveExperienceAndUser(
      experienceIdOrUserId,
      userIdOrExperienceId
    );

    const existingRes = await pool.query<ExperienceWithPortfolioRow>(
      `SELECT e.id, pf.user_id
       FROM experience e
       JOIN portfolios pf ON e.portfolio_id = pf.id
       WHERE e.id = $1`,
      [experienceId]
    );

    const existing = existingRes.rows[0];
    if (!existing) {
      const existsCheck = await pool.query<{ id: string }>(
        `SELECT id FROM experience WHERE id = $1`,
        [experienceId]
      );
      if (existsCheck.rows[0]) {
        throw new AppError("Unauthorized to delete this experience", 403);
      }
      throw new AppError("Experience not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to delete this experience", 403);
    }

    await pool.query(`DELETE FROM experience WHERE id = $1`, [experienceId]);

    return {
      success: true,
      id: experienceId,
    };
  }
}

export const experienceService = new ExperienceService();
