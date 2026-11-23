import { pool } from "../config/database";
import { AppError } from "../utils/errors";
import {
  validateUsername,
  SUPPORTED_TEMPLATES,
  findProtectedPublishingField,
  PROTECTED_PUBLISHING_FIELD_MESSAGE,
  isAnimationStyle,
  normalizeAnimationStyle,
  DEFAULT_ANIMATION_STYLE,
  ANIMATION_STYLE_ERROR_MESSAGE,
} from "../utils/validation";
import type {
  Portfolio,
  PortfolioListItem,
  CreatePortfolioDto,
  UpdatePortfolioDto,
  DeletePortfolioResult,
  SocialLinks,
  CheckUsernameResult,
  PublishPortfolioResult,
  UnpublishPortfolioResult,
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
  animation_style,
  published,
  published_at,
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
  /** Nullable only while the Phase 14 migration is being rolled out. */
  animation_style?: string | null;
  published: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface PortfolioListDbRow extends PortfolioDbRow {
  project_count: number | string;
  skill_count: number | string;
  experience_count: number | string;
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
    animationStyle: normalizeAnimationStyle(row.animation_style),
    published: row.published,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Defense in depth for D6 (PUB-06D): generic create/update must never carry
 * publishing state, even if a caller bypasses the HTTP controller.
 */
function assertNoPublishingFields(data: unknown): void {
  const field = findProtectedPublishingField(data);
  if (field) {
    throw new AppError(`'${field}' cannot be modified here. ${PROTECTED_PUBLISHING_FIELD_MESSAGE}`, 400);
  }
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

    assertNoPublishingFields(data);

    // Shared username rules (length, characters, reserved names) — PUB-06D / D5
    const usernameCheck = validateUsername(data.username);
    if (!usernameCheck.isValid) {
      throw new AppError(usernameCheck.error || "Invalid username", 400);
    }

    const trimmedName = data.name.trim();
    const trimmedTitle = data.title.trim();
    const normalizedUsername = usernameCheck.normalizedUsername;
    const normalizedEmail = data.email ? data.email.trim().toLowerCase() : null;
    const trimmedPhone = data.phone ? data.phone.trim() : null;
    const trimmedLocation = data.location ? data.location.trim() : null;
    const trimmedAbout = data.about ? data.about.trim() : null;
    const trimmedProfileImageUrl = data.profileImageUrl
      ? data.profileImageUrl.trim()
      : null;
    const socialLinks = data.socialLinks || {};
    const template = data.template ? data.template.trim() : "modern";
    // Phase 14: validated again here in case a caller bypasses the controller.
    if (data.animationStyle !== undefined && !isAnimationStyle(data.animationStyle)) {
      throw new AppError(ANIMATION_STYLE_ERROR_MESSAGE, 400);
    }
    const animationStyle = data.animationStyle ?? DEFAULT_ANIMATION_STYLE;
    // New portfolios always start as drafts; only POST /:id/publish publishes (D6)
    const published = false;

    try {
      const result = await pool.query<PortfolioDbRow>(
        `INSERT INTO portfolios (
           user_id, name, email, phone, location, title, about,
           profile_image_url, social_links, username, template, published,
           animation_style
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          animationStyle,
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
   * Ordered by updated_at DESC.
   */
  async getPortfoliosByUserId(userId: string): Promise<PortfolioListItem[]> {
    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    // DASH-03: read-only section counts for dashboard statistics.
    // Correlated COUNTs use the existing *_portfolio_id indexes; no migration.
    const result = await pool.query<PortfolioListDbRow>(
      `SELECT ${PORTFOLIO_COLUMNS},
              (SELECT COUNT(*) FROM projects pr WHERE pr.portfolio_id = portfolios.id)::int AS project_count,
              (SELECT COUNT(*) FROM skills sk WHERE sk.portfolio_id = portfolios.id)::int AS skill_count,
              (SELECT COUNT(*) FROM experience ex WHERE ex.portfolio_id = portfolios.id)::int AS experience_count
       FROM portfolios
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      ...mapRowToPortfolio(row),
      sectionCounts: {
        projects: Number(row.project_count) || 0,
        skills: Number(row.skill_count) || 0,
        experience: Number(row.experience_count) || 0,
      },
    }));
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

    assertNoPublishingFields(data);

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
      // Shared username rules (length, characters, reserved names) — PUB-06D / D5
      const usernameCheck = validateUsername(data.username);
      if (!usernameCheck.isValid) {
        throw new AppError(usernameCheck.error || "Invalid username", 400);
      }
      updates.push(`username = $${paramIdx++}`);
      values.push(usernameCheck.normalizedUsername);
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

    if (data.animationStyle !== undefined) {
      // Phase 14: presentation-only; validated again in case a caller bypasses the controller.
      if (!isAnimationStyle(data.animationStyle)) {
        throw new AppError(ANIMATION_STYLE_ERROR_MESSAGE, 400);
      }
      updates.push(`animation_style = $${paramIdx++}`);
      values.push(data.animationStyle);
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

  /**
   * Checks whether a username is available for registration or assignment (PUB-03).
   *
   * Rules:
   * 1. Validates format (3-50 chars, alphanumeric + hyphens/underscores).
   * 2. Rejects system-reserved names with 400 Bad Request.
   * 3. Parameterized database query (case-insensitive via LOWER(TRIM(username))).
   * 4. If portfolioId is provided and owned by userId with that username, returns available: true.
   * 5. Does not disclose account information of existing holders.
   */
  async checkUsernameAvailability(
    rawUsername: string,
    userId: string,
    portfolioId?: string
  ): Promise<CheckUsernameResult> {
    const validation = validateUsername(rawUsername);
    if (!validation.isValid) {
      throw new AppError(validation.error || "Invalid username", 400);
    }

    const normalized = validation.normalizedUsername;

    const result = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM portfolios WHERE LOWER(TRIM(username)) = $1`,
      [normalized]
    );

    const existingRow = result.rows[0];
    if (!existingRow) {
      return {
        available: true,
        username: normalized,
      };
    }

    // If portfolioId is provided and belongs to the authenticated user and matches this record,
    // it is available for this portfolio (self-retaining handle).
    if (
      portfolioId &&
      UUID_REGEX.test(portfolioId) &&
      existingRow.id === portfolioId &&
      existingRow.user_id === userId
    ) {
      return {
        available: true,
        username: normalized,
      };
    }

    // Otherwise claimed by someone else or another portfolio
    return {
      available: false,
      username: normalized,
    };
  }

  /**
   * Publishes a portfolio (PUB-03).
   *
   * Readiness & Security Checks:
   * 1. Authenticated user must own the portfolio (403 if unauthorized, 404 if missing).
   * 2. Username must be valid and non-reserved (3-50 chars).
   * 3. Username must be unique across all portfolios (409 if collision).
   * 4. Essential portfolio information must be present (name, title).
   * 5. Selected template must be supported ('modern', 'minimal', 'professional').
   * 6. Policy: First publication records published_at; republishing preserves original publication timestamp.
   * 7. Returns generated publicUrl (/u/:username).
   */
  async publishPortfolio(
    portfolioId: string,
    userId: string
  ): Promise<PublishPortfolioResult> {
    if (!portfolioId || !UUID_REGEX.test(portfolioId)) {
      throw new AppError("Portfolio not found", 404);
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const existingRes = await pool.query<{
      id: string;
      user_id: string;
      name: string;
      title: string;
      username: string;
      template: string;
      published: boolean;
      published_at: Date | null;
    }>(
      `SELECT id, user_id, name, title, username, template, published, published_at
       FROM portfolios
       WHERE id = $1`,
      [portfolioId]
    );

    const existing = existingRes.rows[0];
    if (!existing) {
      throw new AppError("Portfolio not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to modify this portfolio", 403);
    }

    // 1. Validate username format and non-reserved status
    const usernameValidation = validateUsername(existing.username);
    if (!usernameValidation.isValid) {
      throw new AppError(
        `Cannot publish portfolio: ${usernameValidation.error}`,
        400
      );
    }

    // 2. Validate username uniqueness against all other portfolios
    const collisionCheck = await pool.query<{ id: string }>(
      `SELECT id FROM portfolios WHERE LOWER(TRIM(username)) = $1 AND id != $2`,
      [usernameValidation.normalizedUsername, portfolioId]
    );
    if (collisionCheck.rows.length > 0) {
      throw new AppError(
        "Cannot publish portfolio: username is already taken",
        409
      );
    }

    // 3. Check readiness: required portfolio info
    if (!existing.name || !existing.name.trim()) {
      throw new AppError(
        "Cannot publish portfolio: portfolio name is required",
        400
      );
    }

    if (!existing.title || !existing.title.trim()) {
      throw new AppError(
        "Cannot publish portfolio: professional title is required",
        400
      );
    }

    // 4. Validate template support
    const normalizedTemplate = (existing.template || "modern")
      .trim()
      .toLowerCase();
    if (!SUPPORTED_TEMPLATES.has(normalizedTemplate)) {
      throw new AppError(
        `Cannot publish portfolio: unsupported template '${existing.template}'`,
        400
      );
    }

    // 5. Update database: set published = true, preserve or set published_at
    const updateResult = await pool.query<{
      id: string;
      username: string;
      published: boolean;
      published_at: Date;
    }>(
      `UPDATE portfolios
       SET published = true,
           published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username, published, published_at`,
      [portfolioId]
    );

    const updated = updateResult.rows[0];
    if (!updated) {
      throw new AppError("Failed to publish portfolio", 500);
    }

    return {
      id: updated.id,
      username: updated.username,
      published: updated.published,
      publishedAt: updated.published_at,
      publicUrl: `/u/${updated.username}`,
    };
  }

  /**
   * Unpublishes a portfolio (PUB-03).
   *
   * Rules:
   * 1. Authenticated user must own the portfolio (403 if unauthorized, 404 if missing).
   * 2. Sets published = false.
   * 3. Preserves username and all portfolio content.
   * 4. Safe on repeated unpublish requests (idempotent).
   * 5. Immediately disables public retrieval via /api/public/:username.
   */
  async unpublishPortfolio(
    portfolioId: string,
    userId: string
  ): Promise<UnpublishPortfolioResult> {
    if (!portfolioId || !UUID_REGEX.test(portfolioId)) {
      throw new AppError("Portfolio not found", 404);
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const existingRes = await pool.query<{
      id: string;
      user_id: string;
      username: string;
      published: boolean;
    }>(
      `SELECT id, user_id, username, published
       FROM portfolios
       WHERE id = $1`,
      [portfolioId]
    );

    const existing = existingRes.rows[0];
    if (!existing) {
      throw new AppError("Portfolio not found", 404);
    }

    if (existing.user_id !== userId) {
      throw new AppError("Unauthorized to modify this portfolio", 403);
    }

    const updateResult = await pool.query<{
      id: string;
      username: string;
      published: boolean;
    }>(
      `UPDATE portfolios
       SET published = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username, published`,
      [portfolioId]
    );

    const updated = updateResult.rows[0];
    if (!updated) {
      throw new AppError("Failed to unpublish portfolio", 500);
    }

    return {
      id: updated.id,
      username: updated.username,
      published: updated.published,
      publicUrl: null,
    };
  }
}

export const portfolioService = new PortfolioService();
