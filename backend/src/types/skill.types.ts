// Skill TypeScript Definitions (SKILL-02)

/**
 * Clean, camelCased Skill entity representation used by application layers.
 */
export interface Skill {
  id: string;
  portfolioId: string;
  name: string;
  category: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data payload required when creating a new skill under a portfolio.
 */
export interface CreateSkillDto {
  name: string;
  category: string;
  orderIndex?: number;
}

/**
 * Data payload for updating an existing skill (all fields optional).
 */
export interface UpdateSkillDto {
  name?: string;
  category?: string;
  orderIndex?: number;
}

/**
 * Result returned upon successful deletion of a skill.
 */
export interface DeleteSkillResult {
  success: boolean;
  id: string;
}

/**
 * Clean, camelCased SkillCatalogItem entity representation (SKILL-05).
 */
export interface SkillCatalogItem {
  id: string;
  name: string;
  category: string;
  iconKey: string | null;
  createdAt: Date;
}

/**
 * Filter options for querying skill catalog items.
 */
export interface GetSkillCatalogFilter {
  search?: string;
  category?: string;
}
