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
