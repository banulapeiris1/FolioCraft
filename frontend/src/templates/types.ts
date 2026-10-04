import { PortfolioTemplateId, SocialLinks } from "@/types/portfolio";
import { Project } from "@/types/project";
import { Skill } from "@/types/skill";
import { Experience } from "@/types/experience";

// Re-export PortfolioTemplateId for direct access from the templates module
export type { PortfolioTemplateId };

/**
 * Shared presentation view model for all FolioCraft templates.
 *
 * Adheres strictly to the CONTENT != PRESENTATION principle:
 * Contains only data necessary for presentation.
 * Excludes userId, database timestamps (createdAt, updatedAt), authentication data,
 * and editor/API state.
 * Does NOT contain Education (not supported in current active codebase).
 */
export interface PortfolioViewData {
  // Profile Information
  name: string;
  title: string;
  about?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  profileImageUrl?: string | null;
  socialLinks?: SocialLinks;
  username: string;

  // Portfolio Collections
  projects: Project[];
  skills: Skill[];
  experiences: Experience[];

  // Template Theme
  template?: PortfolioTemplateId | string | null;
}

/**
 * Common props contract shared by all FolioCraft template components.
 */
export interface TemplateProps {
  data: PortfolioViewData;
  className?: string;
}

/**
 * Metadata describing a template for selection, registry lookups, and display.
 */
export interface TemplateMeta {
  id: PortfolioTemplateId;
  name: string;
  description: string;
  badge?: string;
}
