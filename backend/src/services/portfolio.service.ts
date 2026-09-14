import { pool } from "../config/database";
import { AppError } from "../utils/errors";
import type {
  Portfolio,
  CreatePortfolioDto,
  UpdatePortfolioDto,
  DeletePortfolioResult,
  SocialLinks,
} from "../types/portfolio.types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PORTFOLIO_COLUMNS = `
  id,
  user_id,
  name,
  email,
  phone,
  location,
  title,
  about,
  profile_image_url,
  social_links,
  username,
  template,
  published,
  created_at,
  updated_at
`;

interface PortfolioDbRow {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  title: string;
  about: string | null;
  profile_image_url: string | null;
  social_links: SocialLinks | null;
  username: string;
  template: string;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRowToPortfolio(row: PortfolioDbRow): Portfolio {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    title: row.title,
    about: row.about,
    profileImageUrl: row.profile_image_url,
    socialLinks: row.social_links || {},
    username: row.username,
    template: row.template,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PortfolioService {
  /**
   * Creates a new portfolio owned by the specified user.
   * Enforces required business fields and handles PostgreSQL unique constraint errors.
   */
  async createPortfolio(
    userId: string,
    data: CreatePortfolioDto
  ): Promise<Portfolio> {
    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    if (!data.name || !data.name.trim()) {
      throw new AppError("Name is required", 400);
    }

    if (!data.title || !data.title.trim()) {
      throw new AppError("Title is required", 400);
    }

    if (!data.username || !data.username.trim()) {
      throw new AppError("Username is required", 400);
    }

    const trimmedName = data.name.trim();
    const trimmedTitle = data.title.trim();
    const normalizedUsername = data.username.trim().toLowerCase();
    const normalizedEmail = data.email ? data.email.trim().toLowerCase() : null;
    const trimmedPhone = data.phone ? data.phone.trim() : null;
    const trimmedLocation = data.location ? data.location.trim() : null;
    const trimmedAbout = data.about ? data.about.trim() : null;
    const trimmedProfileImageUrl = data.profileImageUrl
      ? data.profileImageUrl.trim()
      : null;
    const socialLinks = data.socialLinks || {};
    const template = data.template ? data.template.trim() : "modern";
    const published = data.published ?? false;

    try {
      const result = await pool.query<PortfolioDbRow>(
        `INSERT INTO portfolios (
           user_id, name, email, phone, location, title, about,
           profile_image_url, social_links, username, template, published
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING ${PORTFOLIO_COLUMNS}`,
        [
          userId,
          trimmedName,
          normalizedEmail,
          trimmedPhone,
          trimmedLocation,
          trimmedTitle,
          trimmedAbout,
          trimmedProfileImageUrl,
          JSON.stringify(socialLinks),
          normalizedUsername,
          template,
          published,
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new AppError("Failed to create portfolio", 500);
      }

      return mapRowToPortfolio(row);
    } catch (error: unknown) {
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        throw new AppError("Username is already taken", 409);
      }
      if (dbError.code === "23503") {
        throw new AppError("User not found", 404);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to create portfolio", 500);
    }
  }

  /**
   * Retrieves all portfolios owned by a specific user.
   * Ordered by created_at DESC.
   */
  async getPortfoliosByUserId(userId: string): Promise<Portfolio[]> {
    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const result = await pool.query<PortfolioDbRow>(
      `SELECT ${PORTFOLIO_COLUMNS}
       FROM portfolios
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(mapRowToPortfolio);
  }

  /**
   * Retrieves a single portfolio by ID.
   * If userId is provided, validates ownership and throws 403 if user is not the owner.
   */
  async getPortfolioById(
    portfolioId: string,
    userId?: string
  ): Promise<Portfolio> {
    if (!portfolioId || !UUID_REGEX.test(portfolioId)) {
      throw new AppError("Portfolio not found", 404);
    }

    const result = await pool.query<PortfolioDbRow>(
      `SELECT ${PORTFOLIO_COLUMNS}
       FROM portfolios
       WHERE id = $1`,
      [portfolioId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new AppError("Portfolio not found", 404);
    }

    if (userId && row.user_id !== userId) {
      throw new AppError("Unauthorized access to portfolio", 403);
    }

    return mapRowToPortfolio(row);
  }

  /**
   * Updates an existing portfolio.
   * Verifies ownership, updates only supplied fields, preserves unspecified fields,
   * updates updated_at, and handles duplicate username constraint violations.
   */
  async updatePortfolio(
    portfolioId: string,
    userId: string,
    data: UpdatePortfolioDto
  ): Promise<Portfolio> {
    if (!portfolioId || !UUID_REGEX.test(portfolioId)) {
      throw new AppError("Portfolio not found", 404);
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const existingResult = await pool.query<PortfolioDbRow>(
      `SELECT ${PORTFOLIO_COLUMNS}
       FROM portfolios
       WHERE id = $1`,
      [portfolioId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      throw new AppError("Portfolio not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to modify this portfolio", 403);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new AppError("Name cannot be empty", 400);
      }
      updates.push(`name = $${paramIdx++}`);
      values.push(data.name.trim());
    }

    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new AppError("Title cannot be empty", 400);
      }
      updates.push(`title = $${paramIdx++}`);
      values.push(data.title.trim());
    }

    if (data.username !== undefined) {
      if (!data.username.trim()) {
        throw new AppError("Username cannot be empty", 400);
      }
      updates.push(`username = $${paramIdx++}`);
      values.push(data.username.trim().toLowerCase());
    }

    if (data.email !== undefined) {
      updates.push(`email = $${paramIdx++}`);
      values.push(data.email ? data.email.trim().toLowerCase() : null);
    }

    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIdx++}`);
      values.push(data.phone ? data.phone.trim() : null);
    }

    if (data.location !== undefined) {
      updates.push(`location = $${paramIdx++}`);
      values.push(data.location ? data.location.trim() : null);
    }

    if (data.about !== undefined) {
      updates.push(`about = $${paramIdx++}`);
      values.push(data.about ? data.about.trim() : null);
    }

    if (data.profileImageUrl !== undefined) {
      updates.push(`profile_image_url = $${paramIdx++}`);
      values.push(data.profileImageUrl ? data.profileImageUrl.trim() : null);
    }

    if (data.socialLinks !== undefined) {
      updates.push(`social_links = $${paramIdx++}`);
      values.push(JSON.stringify(data.socialLinks || {}));
    }

    if (data.template !== undefined) {
      updates.push(`template = $${paramIdx++}`);
      values.push(data.template.trim());
    }

    if (data.published !== undefined) {
      updates.push(`published = $${paramIdx++}`);
      values.push(Boolean(data.published));
    }

    if (updates.length === 0) {
      return mapRowToPortfolio(existing);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(portfolioId);
    const idParamIdx = paramIdx;

    const query = `
      UPDATE portfolios
      SET ${updates.join(", ")}
      WHERE id = $${idParamIdx}
      RETURNING ${PORTFOLIO_COLUMNS}
    `;

    try {
      const updateResult = await pool.query<PortfolioDbRow>(query, values);
      const updatedRow = updateResult.rows[0];
      if (!updatedRow) {
        throw new AppError("Portfolio not found", 404);
      }
      return mapRowToPortfolio(updatedRow);
    } catch (error: unknown) {
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        throw new AppError("Username is already taken", 409);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to update portfolio", 500);
    }
  }

  /**
   * Deletes a portfolio owned by the specified user.
   * Prevents unauthorized deletion of another user's portfolio.
   */
  async deletePortfolio(
    portfolioId: string,
    userId: string
  ): Promise<DeletePortfolioResult> {
    if (!portfolioId || !UUID_REGEX.test(portfolioId)) {
      throw new AppError("Portfolio not found", 404);
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const existingResult = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM portfolios WHERE id = $1`,
      [portfolioId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      throw new AppError("Portfolio not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to delete this portfolio", 403);
    }

    await pool.query(
      `DELETE FROM portfolios WHERE id = $1 AND user_id = $2`,
      [portfolioId, userId]
    );

    return {
      success: true,
      id: portfolioId,
    };
  }
}

export const portfolioService = new PortfolioService();
