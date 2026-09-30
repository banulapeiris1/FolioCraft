/**
 * CV Parser and Upload Types for FolioCraft Frontend (CV-08)
 */

export type CvUploadStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface StructuredCvPersonal {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
}

export interface StructuredCvExperience {
  company: string;
  position: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
}

export interface StructuredCvEducation {
  institution: string;
  degree?: string;
  field?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface StructuredCvSkill {
  name: string;
}

export interface StructuredCvProject {
  title: string;
  description?: string;
  technologies: string[];
}

export interface StructuredCvData {
  personal: StructuredCvPersonal;
  experience: StructuredCvExperience[];
  education: StructuredCvEducation[];
  skills: StructuredCvSkill[];
  projects: StructuredCvProject[];
}

export interface CvUploadEntity {
  id: string;
  userId: string;
  portfolioId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: CvUploadStatus;
  parsedData: StructuredCvData;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CvUploadResponse {
  message: string;
  uploadId: string;
  status: CvUploadStatus;
  upload: CvUploadEntity;
  parsedData: StructuredCvData;
}

export type CvUiState =
  | "IDLE"
  | "FILE_SELECTED"
  | "UPLOADING"
  | "PROCESSING"
  | "SUCCESS"
  | "ERROR";

export interface CvFileValidationResult {
  isValid: boolean;
  error?: string;
}
