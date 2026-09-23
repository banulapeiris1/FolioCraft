// Education TypeScript Definitions (EDU-03)

/**
 * Clean, camelCased Education entity representation used by application layers.
 */
export interface Education {
  id: string;
  portfolioId: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data payload required when creating a new education record under a portfolio.
 */
export interface CreateEducationDto {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
}

/**
 * Data payload for updating an existing education record (all fields optional).
 */
export interface UpdateEducationDto {
  institution?: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string | null;
  description?: string | null;
}

/**
 * Result returned upon successful deletion of an education record.
 */
export interface DeleteEducationResult {
  success: boolean;
  id: string;
}
