import { pool } from "../config/database";
import { AppError } from "../utils/errors";
import type {
  PublicPortfolioDto,
  SocialLinks,
} from "../types/portfolio.types";
import type { Project } from "../types/project.types";
import type { Skill } from "../types/skill.types";
import type { Experience } from "../types/experience.types";

interface PortfolioPublicDbRow {
  id: string;
  name: string;
  title: string;
  about: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  profile_image_url: string | null;
  social_links: SocialLinks | null;
  username: string;
  template: string;
  published: boolean;
  published_at: Date | null;
}

interface ProjectDbRow {
  id: string;
  portfolio_id: string;
  title: string;
  description: string | null;
  technologies: string[];
  github_url: string | null;
  project_url: string | null;
  image_url: string | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

interface SkillDbRow {
  id: string;
  portfolio_id: string;
  name: string;
  category: string;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

interface ExperienceDbRow {
  id: string;
  portfolio_id: string;
  company: string;
  position: string;
  description: string | null;
  start_date: string | Date;
  end_date: string | Date | null;
  is_current: boolean;
  created_at: Date;
  updated_at: Date;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

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
  val: string | Date | null | undefined
): string | null {
  if (!val) return null;
  return formatDateString(val);
}

export class PublicPortfolioService {
  /**
   * Retrieves a published portfolio by username for public consumption.
   *
   * Security & Architecture Guarantees (PUB-02):
   * 1. No JWT / Authentication required.
   * 2. Case-insensitive lookup (LOWER(TRIM(username))).
   * 3. Only returns portfolios where published = true.
   * 4. Unpublished and non-existent portfolios return 404 (prevents draft enumeration).
   * 5. Sanitized response: strictly omits userId, password hashes, and internal metadata.
   * 6. Aggregates projects, skills, and experience collections in a structure
   *    100% compatible with frontend PortfolioViewData.
   */
  async getPublicPortfolioByUsername(
    rawUsername: string
  ): Promise<PublicPortfolioDto> {
    if (!rawUsername || typeof rawUsername !== "string") {
      throw new AppError("Username is required", 400);
    }

    const trimmed = rawUsername.trim();

    if (trimmed.length === 0) {
      throw new AppError("Username cannot be empty", 400);
    }

    if (trimmed.length > 50) {
      throw new AppError("Username cannot exceed 50 characters", 400);
    }

    if (!USERNAME_REGEX.test(trimmed)) {
      throw new AppError(
        "Username can only contain alphanumeric characters, hyphens, and underscores",
        400
      );
    }

    const normalizedUsername = trimmed.toLowerCase();

    // Query published portfolio using parameterized query (SQL-injection safe)
    const portfolioResult = await pool.query<PortfolioPublicDbRow>(
      `SELECT
         id,
         name,
         title,
         about,
         email,
         phone,
         location,
         profile_image_url,
         social_links,
         username,
         template,
         published,
         published_at
       FROM portfolios
       WHERE LOWER(TRIM(username)) = $1 AND published = true`,
      [normalizedUsername]
    );

    const portfolioRow = portfolioResult.rows[0];
    if (!portfolioRow) {
      // Both non-existent AND unpublished portfolios return generic 404
      throw new AppError("Portfolio not found", 404);
    }

    const portfolioId = portfolioRow.id;

    // Concurrently fetch associated portfolio collections (projects, skills, experience)
    const [projectsResult, skillsResult, experienceResult] = await Promise.all([
      pool.query<ProjectDbRow>(
        `SELECT
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
         FROM projects
         WHERE portfolio_id = $1
         ORDER BY order_index ASC, created_at ASC`,
        [portfolioId]
      ),
      pool.query<SkillDbRow>(
        `SELECT
           id,
           portfolio_id,
           name,
           category,
           order_index,
           created_at,
           updated_at
         FROM skills
         WHERE portfolio_id = $1
         ORDER BY category ASC, order_index ASC, created_at ASC`,
        [portfolioId]
      ),
      pool.query<ExperienceDbRow>(
        `SELECT
           id,
           portfolio_id,
           company,
           position,
           description,
           start_date,
           end_date,
           is_current,
           created_at,
           updated_at
         FROM experience
         WHERE portfolio_id = $1
         ORDER BY is_current DESC, start_date DESC`,
        [portfolioId]
      ),
    ]);

    // Map projects to camelCased entity
    const projects: Project[] = projectsResult.rows.map((row) => ({
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
    }));

    // Map skills to camelCased entity
    const skills: Skill[] = skillsResult.rows.map((row) => ({
      id: row.id,
      portfolioId: row.portfolio_id,
      name: row.name,
      category: row.category,
      orderIndex: row.order_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Map experience to camelCased entity
    const experiences: Experience[] = experienceResult.rows.map((row) => ({
      id: row.id,
      portfolioId: row.portfolio_id,
      company: row.company,
      position: row.position,
      description: row.description,
      startDate: formatDateString(row.start_date),
      endDate: formatNullableDateString(row.end_date),
      isCurrent: Boolean(row.is_current),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Construct sanitized PublicPortfolioDto
    // Excludes userId, password hash, cv data, internal account details
    return {
      name: portfolioRow.name,
      title: portfolioRow.title,
      about: portfolioRow.about,
      email: portfolioRow.email,
      phone: portfolioRow.phone,
      location: portfolioRow.location,
      profileImageUrl: portfolioRow.profile_image_url,
      socialLinks: portfolioRow.social_links || {},
      username: portfolioRow.username,
      template: portfolioRow.template || "modern",
      published: portfolioRow.published,
      publishedAt: portfolioRow.published_at,
      projects,
      skills,
      experiences,
    };
  }
}

export const publicPortfolioService = new PublicPortfolioService();
