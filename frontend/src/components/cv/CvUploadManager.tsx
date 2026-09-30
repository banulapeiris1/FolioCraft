"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  uploadCv,
  getExperiences,
  createExperience,
  getSkills,
  createSkill,
  getSkillCatalog,
  getProjects,
  createProject,
  updatePortfolio,
  ApiError,
} from "@/lib/api";
import { validateCvFile } from "@/lib/cvValidation";
import { CvUiState, StructuredCvData } from "@/types/cv";
import type { Portfolio, PortfolioFormData } from "@/types/portfolio";
import type { Experience } from "@/types/experience";
import type { Skill, CatalogSkill } from "@/types/skill";
import type { Project } from "@/types/project";
import CvDropzone from "./CvDropzone";
import CvParsedPreview from "./CvParsedPreview";
import CvImportModal, { ImportSummaryResult } from "./CvImportModal";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@/components/portfolio/PortfolioIcons";
import {
  PreparedExperience,
  PreparedSkill,
  PreparedProject,
} from "@/lib/cv/cvMapping";

export interface CvUploadManagerProps {
  portfolioId: string;
  portfolio?: Portfolio | null;
  onProfileUpdated?: (updatedPortfolio: Portfolio) => void;
  onNavigateTab?: (tab: "profile" | "projects" | "skills" | "experience" | "cv") => void;
}

export default function CvUploadManager({
  portfolioId,
  portfolio = null,
  onProfileUpdated,
  onNavigateTab,
}: CvUploadManagerProps) {
  const { token } = useAuth();

  const [uiState, setUiState] = useState<CvUiState>("IDLE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>("");

  const [parsedData, setParsedData] = useState<StructuredCvData | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState<{
    uploadId: string;
    status: string;
    fileName: string;
  } | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [existingExperiences, setExistingExperiences] = useState<Experience[]>([]);
  const [existingSkills, setExistingSkills] = useState<Skill[]>([]);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkill[]>([]);
  const [isPreparingImport, setIsPreparingImport] = useState(false);
  const [importPreparationError, setImportPreparationError] = useState<string | null>(null);

  // File selection & client-side validation
  const handleFileSelect = (file: File) => {
    setServerError(null);
    const result = validateCvFile(file);

    if (!result.isValid) {
      setValidationError(result.error || "Invalid file selected.");
      setSelectedFile(null);
      setUiState("IDLE");
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    setUiState("FILE_SELECTED");
  };

  // Clear selected file
  const handleFileRemove = () => {
    setSelectedFile(null);
    setValidationError(null);
    setServerError(null);
    setUiState("IDLE");
  };

  // Perform upload
  const handleUpload = async () => {
    if (uiState === "UPLOADING" || uiState === "PROCESSING") return;

    if (!selectedFile) {
      setValidationError("Please select a PDF file before uploading.");
      return;
    }

    const validation = validateCvFile(selectedFile);
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid file.");
      return;
    }

    if (!token) {
      setServerError("Authentication required. Your session may have expired. Please log in again.");
      setUiState("ERROR");
      return;
    }

    setUiState("UPLOADING");
    setProcessingStage("Uploading CV document to server...");
    setServerError(null);
    setValidationError(null);

    try {
      const processingTimer = setTimeout(() => {
        setUiState((current) => {
          if (current === "UPLOADING") {
            setProcessingStage("Extracting and structuring CV sections...");
            return "PROCESSING";
          }
          return current;
        });
      }, 700);

      const response = await uploadCv(selectedFile, portfolioId, token);
      clearTimeout(processingTimer);

      setParsedData(response.parsedData);
      setUploadMetadata({
        uploadId: response.uploadId,
        status: response.status,
        fileName: response.upload?.fileName || selectedFile.name,
      });
      setUiState("SUCCESS");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setServerError("Your session has expired. Please log in again.");
        } else if (err.status === 400) {
          setServerError(err.message || "Invalid CV file or format.");
        } else if (err.status === 404) {
          setServerError("Portfolio not found or you do not have permission to attach a CV to it.");
        } else {
          setServerError(err.message || "An error occurred while uploading your CV.");
        }
      } else {
        setServerError("Unable to connect to the server. Please check your internet connection.");
      }
      setUiState("ERROR");
    }
  };

  // Open Import Review Dialog after fetching current portfolio state for deduplication
  const handleOpenImportModal = async () => {
    if (!parsedData || !token) return;

    setIsPreparingImport(true);
    setImportPreparationError(null);

    try {
      // Parallel fetch of existing items and skill catalog using existing API methods
      const [expRes, skillsRes, projRes, catalogRes] = await Promise.all([
        getExperiences(portfolioId, token).catch(() => ({ experience: [] })),
        getSkills(portfolioId, token).catch(() => ({ skills: [] })),
        getProjects(portfolioId, token).catch(() => ({ projects: [] })),
        getSkillCatalog().catch(() => ({ skills: [] })),
      ]);

      setExistingExperiences(
        ("experiences" in expRes && expRes.experiences) ? expRes.experiences : (expRes.experience || [])
      );
      setExistingSkills(skillsRes.skills || []);
      setExistingProjects(projRes.projects || []);
      setCatalogSkills(catalogRes.skills || []);

      setIsImportModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load existing portfolio items.";
      setImportPreparationError(msg);
    } finally {
      setIsPreparingImport(false);
    }
  };

  // Execute actual import upon confirmation from CvImportModal
  const handleConfirmImport = async ({
    profileData,
    selectedExperiences,
    selectedSkills,
    selectedProjects,
  }: {
    profileData?: Partial<PortfolioFormData>;
    selectedExperiences: PreparedExperience[];
    selectedSkills: PreparedSkill[];
    selectedProjects: PreparedProject[];
  }): Promise<ImportSummaryResult> => {
    if (!token) {
      throw new Error("Authentication session expired. Please log in again.");
    }

    const summary: ImportSummaryResult = {
      profileUpdatedFields: [],
      experiencesImported: 0,
      experiencesSkipped: 0,
      experiencesFailed: 0,
      skillsImported: 0,
      skillsSkipped: 0,
      skillsFailed: 0,
      projectsImported: 0,
      projectsSkipped: 0,
      projectsFailed: 0,
      educationDetectedCount: parsedData?.education?.length || 0,
      errors: [],
    };

    // 1. Profile pre-fill update
    if (profileData && Object.keys(profileData).length > 0) {
      try {
        const updateRes = await updatePortfolio(portfolioId, profileData, token);
        if (onProfileUpdated) {
          onProfileUpdated(updateRes.portfolio);
        }
        summary.profileUpdatedFields = Object.keys(profileData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update portfolio profile fields.";
        summary.errors.push(`Profile: ${msg}`);
      }
    }

    // 2. Experience items
    for (const exp of selectedExperiences) {
      if (exp.isDuplicate) {
        summary.experiencesSkipped++;
        continue;
      }

      if (!exp.startDate) {
        summary.experiencesFailed++;
        summary.errors.push(`Experience "${exp.position} at ${exp.company}": Missing valid start date (YYYY-MM-DD required).`);
        continue;
      }

      try {
        await createExperience(
          portfolioId,
          {
            company: exp.company,
            position: exp.position,
            description: exp.description || null,
            startDate: exp.startDate,
            endDate: exp.isCurrent ? null : exp.endDate || null,
            isCurrent: exp.isCurrent,
          },
          token
        );
        summary.experiencesImported++;
      } catch (err: unknown) {
        summary.experiencesFailed++;
        const msg = err instanceof Error ? err.message : "API error";
        summary.errors.push(`Experience "${exp.position} at ${exp.company}": ${msg}`);
      }
    }

    // 3. Skills items
    for (const skill of selectedSkills) {
      if (skill.isDuplicate) {
        summary.skillsSkipped++;
        continue;
      }

      try {
        await createSkill(
          portfolioId,
          {
            name: skill.name,
            category: skill.category,
          },
          token
        );
        summary.skillsImported++;
      } catch (err: unknown) {
        summary.skillsFailed++;
        const msg = err instanceof Error ? err.message : "API error";
        summary.errors.push(`Skill "${skill.name}": ${msg}`);
      }
    }

    // 4. Projects items
    for (const proj of selectedProjects) {
      if (proj.isDuplicate) {
        summary.projectsSkipped++;
        continue;
      }

      try {
        await createProject(
          portfolioId,
          {
            title: proj.title,
            description: proj.description || null,
            technologies: proj.technologies,
          },
          token
        );
        summary.projectsImported++;
      } catch (err: unknown) {
        summary.projectsFailed++;
        const msg = err instanceof Error ? err.message : "API error";
        summary.errors.push(`Project "${proj.title}": ${msg}`);
      }
    }

    return summary;
  };

  const handleReset = () => {
    setSelectedFile(null);
    setValidationError(null);
    setServerError(null);
    setParsedData(null);
    setUploadMetadata(null);
    setUiState("IDLE");
  };

  const isWorking = uiState === "UPLOADING" || uiState === "PROCESSING";

  return (
    <div className="space-y-6">
      {/* Intro Guidance Header */}
      <div className="bg-white rounded-3xl border border-[#eae6f5] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0f172a] tracking-tight">
              CV Document Parser
            </h2>
            <p className="text-xs sm:text-sm text-[#64748b] mt-1 max-w-2xl leading-relaxed">
              Upload your resume or curriculum vitae in PDF format. FolioCraft will parse your
              personal info, career experience, education history, technical skills, and projects,
              allowing you to review and import them into your portfolio.
            </p>
          </div>
          {uiState === "SUCCESS" && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#eae4fa] border border-[#dcd3f8] transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              Upload Another CV
            </button>
          )}
        </div>

        {/* Dropzone Area (Shown when not in SUCCESS state) */}
        {uiState !== "SUCCESS" && (
          <div className="mt-6">
            <CvDropzone
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              disabled={isWorking}
              validationError={validationError}
            />

            {/* Actions Bar for FILE_SELECTED / ERROR / WORKING */}
            {selectedFile && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#f0ecf9]">
                <div className="text-xs text-[#64748b]">
                  {isWorking ? (
                    <span className="inline-flex items-center gap-2 font-semibold text-[#6e56cf]">
                      <span className="w-3.5 h-3.5 border-2 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin" />
                      {processingStage}
                    </span>
                  ) : uiState === "ERROR" ? (
                    <span className="text-rose-600 font-semibold">
                      Upload failed. You can retry with this file or select a different one.
                    </span>
                  ) : (
                    <span>Click the button to process and analyze this CV.</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {uiState === "ERROR" ? (
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={isWorking}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      <span>Try Again</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={isWorking || Boolean(validationError)}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isWorking ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing CV...</span>
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-4 h-4" />
                          <span>Upload &amp; Parse CV</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload / Server Error Alert */}
      {serverError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 sm:p-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircleIcon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-rose-900">
              CV Upload / Processing Failed
            </h4>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              {serverError}
            </p>
          </div>
        </div>
      )}

      {/* Preparation Error Alert */}
      {importPreparationError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-2.5 text-xs font-semibold text-rose-800">
          <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{importPreparationError}</span>
        </div>
      )}

      {/* Success Banner */}
      {uiState === "SUCCESS" && uploadMetadata && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
              CV Uploaded and Parsed Successfully!
            </h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              Extracted structured data from <span className="font-semibold">{uploadMetadata.fileName}</span>.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-emerald-700">
              <span>Status: {uploadMetadata.status}</span>
              <span>•</span>
              <span>ID: {uploadMetadata.uploadId}</span>
            </div>
          </div>
        </div>
      )}

      {/* Parsed CV Structured Data Preview with Import to Portfolio Button */}
      {uiState === "SUCCESS" && parsedData && (
        <CvParsedPreview
          data={parsedData}
          uploadId={uploadMetadata?.uploadId}
          fileName={uploadMetadata?.fileName}
          onOpenImport={handleOpenImportModal}
          isPreparingImport={isPreparingImport}
        />
      )}

      {/* CV Import Review Modal */}
      {parsedData && isImportModalOpen && (
        <CvImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          cvData={parsedData}
          portfolio={portfolio}
          existingExperiences={existingExperiences}
          existingSkills={existingSkills}
          existingProjects={existingProjects}
          catalogSkills={catalogSkills}
          onConfirmImport={handleConfirmImport}
          onReviewPortfolio={(tab = "profile") => {
            if (onNavigateTab) {
              onNavigateTab(tab as "profile" | "projects" | "skills" | "experience");
            }
          }}
        />
      )}
    </div>
  );
}
