/**
 * CV Parser and Upload Types for FolioCraft Frontend (CV-08)
 */

export type CvUploadStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type Confidence = "high" | "medium" | "low";

export type CvSectionType =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "achievements"
  | "leadership"
  | "languages"
  | "interests"
  | "other";

export type SectionStatus = "detected" | "empty" | "ambiguous" | "missing";

export interface ReviewIssue {
  field: string;
  section: string;
  message: string;
  severity: "info" | "warning" | "error";
  value?: string;
}

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
  technologies?: string[];
  confidence?: Confidence;
}

export interface StructuredCvEducation {
  institution: string;
  degree?: string;
  field?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  confidence?: Confidence;
}

export interface StructuredCvSkill {
  name: string;
  category?: string;
  confidence?: Confidence;
}

export interface StructuredCvProject {
  title: string;
  description?: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  confidence?: Confidence;
}

export interface StructuredCvAchievement {
  title: string;
  description?: string;
  date?: string;
  issuer?: string;
  confidence?: Confidence;
}

export interface StructuredCvLeadership {
  role: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  confidence?: Confidence;
}

export interface CategorizedSkills {
  languages: StructuredCvSkill[];
  frontend: StructuredCvSkill[];
  backend: StructuredCvSkill[];
  databases: StructuredCvSkill[];
  tools: StructuredCvSkill[];
  softSkills: StructuredCvSkill[];
  other: StructuredCvSkill[];
}

export interface StructuredCvData {
  personal: StructuredCvPersonal;
  experience: StructuredCvExperience[];
  education: StructuredCvEducation[];
  skills: StructuredCvSkill[];
  projects: StructuredCvProject[];
  categorizedSkills?: CategorizedSkills;
  achievements?: StructuredCvAchievement[];
  leadership?: StructuredCvLeadership[];
  reviewIssues?: ReviewIssue[];
  sectionStatuses?: Partial<Record<CvSectionType, SectionStatus>>;
  rawText?: string;
  totalPages?: number;
  pageTexts?: string[];
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
