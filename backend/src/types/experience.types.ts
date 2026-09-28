// Experience TypeScript Definitions (EXP-03)

/**
 * Clean, camelCased Experience entity representation used by application layers.
 */
export interface Experience {
  id: string;
  portfolioId: string;
  company: string;
  position: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data payload required when creating a new experience record under a portfolio.
 */
export interface CreateExperienceInput {
  company: string;
  position: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
}

export type CreateExperienceDto = CreateExperienceInput;

/**
 * Data payload for updating an existing experience record (all fields optional).
 */
export interface UpdateExperienceInput {
  company?: string;
  position?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
}

export type UpdateExperienceDto = UpdateExperienceInput;

/**
 * Result returned upon successful deletion of an experience record.
 */
export interface DeleteExperienceResult {
  success: boolean;
  id: string;
}
