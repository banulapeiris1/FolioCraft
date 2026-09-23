// Frontend Skill Types (SKILL-04)

export interface SkillFormData {
  name: string;
  category: string;
  orderIndex?: number;
}

export interface Skill {
  id: string;
  portfolioId: string;
  name: string;
  category: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillResponse {
  skill: Skill;
}

export interface SkillsResponse {
  skills: Skill[];
}

export interface DeleteSkillResponse {
  success: boolean;
  id: string;
}

export interface SkillFormErrors {
  name?: string;
  category?: string;
  orderIndex?: string;
  general?: string;
}

export interface CatalogSkill {
  id: string;
  name: string;
  category: string;
  iconKey?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogSkillsResponse {
  skills: CatalogSkill[];
}
