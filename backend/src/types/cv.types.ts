// CV Upload TypeScript Definitions (CV-02)

/**
 * Lifecycle statuses for a CV document upload and extraction process.
 */
export type CvUploadStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

/**
 * Clean, camelCased CvUpload entity representation used across application layers.
 */
export interface CvUpload {
  id: string;
  userId: string;
  portfolioId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: CvUploadStatus;
  rawText: string | null;
  parsedData: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Core logical section categories recognized during CV section detection (CV-05).
 */
export type CvSectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects";

/**
 * Structured output of the deterministic CV section detection process (CV-05).
 */
export interface DetectedCvSections {
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  projects?: string;
  headerText?: string;
  unknownSections?: Record<string, string>;
  detectedOrder: CvSectionType[];
  rawText: string;
}

