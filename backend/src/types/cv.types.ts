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
 * Status of an identified section during CV processing.
 */
export type SectionStatus = "detected" | "not_detected" | "needs_review";

/**
 * Reliability rating for extracted fields or detected sections.
 */
export type Confidence = "high" | "medium" | "low";

/**
 * Logical section categories recognized during CV section detection.
 */
export type CvSectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "achievements"
  | "leadership"
  | "extracurricular";

/**
 * Detailed section metadata including status, confidence, and text content.
 */
export interface SectionDetail {
  status: SectionStatus;
  confidence: Confidence;
  text: string;
  heading?: string;
}

/**
 * Detail for an unknown/custom section detected in the document.
 */
export interface UnknownSectionDetail {
  name: string;
  text: string;
  status: SectionStatus;
  confidence: Confidence;
}

/**
 * Structured output of the deterministic CV section detection process.
 */
export interface DetectedCvSections {
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  projects?: string;
  achievements?: string;
  leadership?: string;
  certifications?: string;
  extracurricular?: string;
  headerText?: string;
  unknownSections?: Record<string, string>;
  unknownDetails?: UnknownSectionDetail[];
  details: Record<CvSectionType, SectionDetail>;
  sections: Record<CvSectionType, SectionDetail>;
  detectedOrder: CvSectionType[];
  rawText: string;
}

/**
 * Structured candidate personal and contact information.
 */
export interface StructuredCvPersonal {
  fullName?: string;
  professionalTitle?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
}

/**
 * Structured employment/work experience entry.
 */
export interface StructuredCvExperience {
  company: string;
  position: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  confidence?: Confidence;
}

/**
 * Structured academic/education entry.
 */
export interface StructuredCvEducation {
  institution: string;
  degree?: string;
  field?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  confidence?: Confidence;
}

/**
 * Structured skill entry.
 */
export interface StructuredCvSkill {
  name: string;
  category?: string;
  confidence?: Confidence;
}

/**
 * Categorized skills grouping proficiencies by domain.
 */
export interface CategorizedSkills {
  languages: StructuredCvSkill[];
  frontend: StructuredCvSkill[];
  backend: StructuredCvSkill[];
  databases: StructuredCvSkill[];
  tools: StructuredCvSkill[];
  softSkills: StructuredCvSkill[];
  other: StructuredCvSkill[];
}

/**
 * Structured project entry.
 */
export interface EntitySource {
  page?: number;
  section?: string;
  text?: string;
  classifier?: "deterministic" | "visual" | "gemini" | "reconciled";
  confidence?: Confidence;
}

export interface StructuredCvProject {
  title: string;
  description?: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  confidence?: Confidence;
  source?: EntitySource;
}

/**
 * Structured achievement/award entry.
 */
export interface StructuredCvAchievement {
  title: string;
  description?: string;
  date?: string;
  confidence?: Confidence;
  source?: EntitySource;
}

/**
 * Structured leadership entry.
 */
export interface StructuredCvLeadership {
  role: string;
  organization?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  confidence?: Confidence;
  source?: EntitySource;
}

/**
 * Structured extracurricular activity entry.
 */
export interface StructuredCvExtracurricular {
  activity: string;
  role?: string;
  organization?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  confidence?: Confidence;
  source?: EntitySource;
}

/**
 * Actionable issue or warning flagged during extraction validation.
 */
export interface ReviewIssue {
  field: string;
  section: string;
  message: string;
  severity: "warning" | "error" | "info";
  value?: unknown;
}

/**
 * Evidence and confidence tracking for an extracted field.
 */
export interface FieldEvidence {
  field: string;
  value: unknown;
  confidence: Confidence;
  status: "confirmed" | "needs_review" | "inferred";
  source?: string;
}

/**
 * Complete structured output of the CV extraction pipeline.
 */
export interface StructuredCvData {
  personal: StructuredCvPersonal;
  experience: StructuredCvExperience[];
  education: StructuredCvEducation[];
  skills: StructuredCvSkill[];
  projects: StructuredCvProject[];
  categorizedSkills?: CategorizedSkills;
  achievements?: StructuredCvAchievement[];
  leadership?: StructuredCvLeadership[];
  extracurricular?: StructuredCvExtracurricular[];
  extracurricularActivities?: StructuredCvExtracurricular[];
  reviewIssues?: ReviewIssue[];
  sectionStatuses?: Partial<Record<CvSectionType, SectionStatus>>;
  fieldEvidences?: Record<string, FieldEvidence>;
  rawText?: string;
  totalPages?: number;
  pageTexts?: string[];
  parsingMetadata?: {
    parserVersion?: string;
    layoutType?: string;
    hasSidebar?: boolean;
    visualHeadingsDetected?: string[];
    usedGemini?: boolean;
    geminiUsed?: boolean;
    geminiReason?: string;
    layoutAnalysis?: unknown;
    reconciliationApplied?: boolean;
    conflictCount?: number;
    conflictsCount?: number;
    reconciliationNotes?: string[];
  };
}

export interface VisualHeading {
  text: string;
  x?: number;
  y: number;
  fontSize: number;
  page: number;
  isBold?: boolean;
}

export interface CvLayoutAnalysis {
  layoutType: "single-column" | "two-column" | "multi-column" | "sidebar";
  columnCount: number;
  columns?: Array<{
    columnIndex: number;
    left: number;
    right: number;
    width: number;
    blockCount: number;
  }>;
  sidebar: {
    detected: boolean;
    position?: "left" | "right";
    widthRatio?: number;
  };
  visualHeadings: VisualHeading[];
  medianFontSize: number;
  totalPages?: number;
}


