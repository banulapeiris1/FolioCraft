import { PortfolioFormData, PortfolioTemplateId, SocialLinks } from "@/types/portfolio";
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

/**
 * Collections input bundle for assembling PortfolioViewData.
 */
export interface PortfolioCollectionsInput {
  projects?: Project[] | null;
  skills?: Skill[] | null;
  experiences?: Experience[] | null;
}

/**
 * Synchronous pure mapping function converting raw editor form draft state
 * and associated collections into presentation-ready PortfolioViewData.
 *
 * Guarantees:
 * - Never returns undefined/null for collections arrays (projects, skills, experiences).
 * - Safe handling of sparse or missing profile fields.
 * - Does not include Education (omitted from current active portfolio model).
 * - Decouples presentation view data from database entities and API state.
 */
export function mapDraftToPortfolioViewData(
  draft?: Partial<PortfolioFormData> | null,
  collections?: PortfolioCollectionsInput | null
): PortfolioViewData {
  const safeDraft = draft || {};
  const safeCollections = collections || {};

  return {
    name: safeDraft.name ?? "",
    title: safeDraft.title ?? "",
    about: safeDraft.about || null,
    email: safeDraft.email || null,
    phone: safeDraft.phone || null,
    location: safeDraft.location || null,
    profileImageUrl: safeDraft.profileImageUrl || null,
    socialLinks: safeDraft.socialLinks ? { ...safeDraft.socialLinks } : {},
    username: safeDraft.username ?? "",
    projects: Array.isArray(safeCollections.projects) ? safeCollections.projects : [],
    skills: Array.isArray(safeCollections.skills) ? safeCollections.skills : [],
    experiences: Array.isArray(safeCollections.experiences) ? safeCollections.experiences : [],
    template: safeDraft.template || "modern",
  };
}

