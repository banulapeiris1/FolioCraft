// Frontend Experience Types (EXP-06)

/**
 * Data payload managed by experience creation and editing forms.
 * Matches backend DTOs while strictly omitting server-controlled fields like id, portfolioId, createdAt, updatedAt.
 */
export interface ExperienceFormData {
  company: string;
  position: string;
  description?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD or null
  isCurrent?: boolean;
}

/**
 * Full experience entity model returned from the backend.
 */
export interface Experience {
  id: string;
  portfolioId: string;
  company: string;
  position: string;
  description: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * API response format for single experience endpoints (GET, POST, PUT).
 */
export interface ExperienceResponse {
  experience: Experience;
}

/**
 * API response format for experience collection endpoints (GET /api/portfolios/:id/experience).
 * Supports both singular and plural response keys for maximum consumer compatibility.
 */
export interface ExperiencesResponse {
  experience: Experience[];
  experiences?: Experience[];
}

/**
 * API response format for experience deletion.
 */
export interface DeleteExperienceResponse {
  message: string;
}

/**
 * Client-side validation errors mapped to experience field names.
 */
export interface ExperienceFormErrors {
  company?: string;
  position?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: string;
  general?: string;
}
