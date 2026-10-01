"use client";

import React, { useState } from "react";
import type { StructuredCvData } from "@/types/cv";
import type { Portfolio, PortfolioFormData } from "@/types/portfolio";
import type { Experience } from "@/types/experience";
import type { Skill, CatalogSkill } from "@/types/skill";
import type { Project } from "@/types/project";
import {
  mergeProfileData,
  prepareExperienceImports,
  prepareSkillImports,
  prepareProjectImports,
  PreparedExperience,
  PreparedSkill,
  PreparedProject,
} from "@/lib/cv/cvMapping";
import {
  UserIcon,
  BriefcaseIcon,
  SparklesIcon,
  FolderGit2Icon,
  XIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  GithubIcon,
  ExternalLinkIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface ImportSummaryResult {
  profileUpdatedFields: string[];
  experiencesImported: number;
  experiencesSkipped: number;
  experiencesFailed: number;
  skillsImported: number;
  skillsSkipped: number;
  skillsFailed: number;
  projectsImported: number;
  projectsSkipped: number;
  projectsFailed: number;
  educationDetectedCount: number;
  errors: string[];
}

export interface CvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: StructuredCvData;
  portfolio: Portfolio | null;
  existingExperiences: Experience[];
  existingSkills: Skill[];
  existingProjects: Project[];
  catalogSkills: CatalogSkill[];
  onConfirmImport: (payload: {
    profileData?: Partial<PortfolioFormData>;
    selectedExperiences: PreparedExperience[];
    selectedSkills: PreparedSkill[];
    selectedProjects: PreparedProject[];
  }) => Promise<ImportSummaryResult>;
  onReviewPortfolio: (targetTab?: string) => void;
}

export default function CvImportModal({
  isOpen,
  onClose,
  cvData,
  portfolio,
  existingExperiences,
  existingSkills,
  existingProjects,
  catalogSkills,
  onConfirmImport,
  onReviewPortfolio,
}: CvImportModalProps) {
  // Prepared items initial state
  const [preparedExp, setPreparedExp] = useState<PreparedExperience[]>(() =>
    prepareExperienceImports(cvData.experience || [], existingExperiences).items
  );
  const [preparedSkills, setPreparedSkills] = useState<PreparedSkill[]>(() =>
    prepareSkillImports(
      cvData.skills || [],
      existingSkills,
      catalogSkills,
      cvData.categorizedSkills
    ).items
  );
  const [preparedProj, setPreparedProj] = useState<PreparedProject[]>(() =>
    prepareProjectImports(cvData.projects || [], existingProjects).items
  );

  // Section toggle state
  const [includeProfile, setIncludeProfile] = useState(() =>
    Boolean(
      cvData.personal?.fullName ||
      cvData.personal?.professionalTitle ||
      cvData.personal?.title ||
      cvData.personal?.email ||
      cvData.personal?.phone ||
      cvData.personal?.location ||
      cvData.personal?.summary ||
      cvData.personal?.website ||
      cvData.personal?.linkedin ||
      cvData.personal?.github
    )
  );
  const [overwriteProfile, setOverwriteProfile] = useState(false);
  const [includeExperience, setIncludeExperience] = useState(() =>
    prepareExperienceImports(cvData.experience || [], existingExperiences).items.some((i) => i.selected)
  );
  const [includeSkills, setIncludeSkills] = useState(() =>
    prepareSkillImports(
      cvData.skills || [],
      existingSkills,
      catalogSkills,
      cvData.categorizedSkills
    ).items.some((i) => i.selected)
  );
  const [includeProjects, setIncludeProjects] = useState(() =>
    prepareProjectImports(cvData.projects || [], existingProjects).items.some((i) => i.selected)
  );

  // Execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepText, setCurrentStepText] = useState("");
  const [summaryResult, setSummaryResult] = useState<ImportSummaryResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Profile comparison
  const currentProfileData: Partial<PortfolioFormData> = portfolio
    ? {
        name: portfolio.name,
        title: portfolio.title,
        username: portfolio.username,
        email: portfolio.email || "",
        phone: portfolio.phone || "",
        location: portfolio.location || "",
        about: portfolio.about || "",
        socialLinks: portfolio.socialLinks || {},
      }
    : {};

  const profileMergePreview = mergeProfileData(
    currentProfileData,
    cvData.personal || {},
    { overwriteExisting: overwriteProfile }
  );

  // Experience selection helpers
  const toggleExpItem = (id: string) => {
    setPreparedExp((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleSkillItem = (id: string) => {
    setPreparedSkills((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleProjItem = (id: string) => {
    setPreparedProj((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Submit action
  const handleConfirm = async () => {
    setIsSubmitting(true);
    setGeneralError(null);
    setCurrentStepText("Preparing portfolio import...");

    const selectedExperiences = includeExperience
      ? preparedExp.filter((e) => e.selected)
      : [];

    const selectedSkills = includeSkills
      ? preparedSkills.filter((s) => s.selected)
      : [];

    const selectedProjects = includeProjects
      ? preparedProj.filter((p) => p.selected)
      : [];

    const profileData = includeProfile
      ? profileMergePreview.merged
      : undefined;

    try {
      const result = await onConfirmImport({
        profileData,
        selectedExperiences,
        selectedSkills,
        selectedProjects,
      });

      setSummaryResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import CV data.";
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedExpCount = includeExperience
    ? preparedExp.filter((e) => e.selected).length
    : 0;

  const selectedSkillCount = includeSkills
    ? preparedSkills.filter((s) => s.selected).length
    : 0;

  const selectedProjCount = includeProjects
    ? preparedProj.filter((p) => p.selected).length
    : 0;

  const newExpCount = preparedExp.filter((e) => !e.isDuplicate).length;
  const skippedExpCount = preparedExp.filter((e) => e.isDuplicate).length;

  const newProjCount = preparedProj.filter((p) => !p.isDuplicate).length;
  const skippedProjCount = preparedProj.filter((p) => p.isDuplicate).length;

  const newSkillCount = preparedSkills.filter((s) => !s.isDuplicate).length;
  const skippedSkillCount = preparedSkills.filter((s) => s.isDuplicate).length;

  const totalSelectedCount =
    (includeProfile ? profileMergePreview.changedFields.length : 0) +
    selectedExpCount +
    selectedSkillCount +
    selectedProjCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#eae6f5] flex items-center justify-between shrink-0 bg-[#faf9fd]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6e56cf] text-white flex items-center justify-center shadow-md shadow-[#6e56cf]/20">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="import-modal-title"
                className="text-lg font-bold text-[#0f172a] tracking-tight"
              >
                Import CV Data to Portfolio
              </h2>
              <p className="text-xs text-[#64748b]">
                Select the structured CV sections and records you want to apply to your portfolio.
              </p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1edf9] border border-transparent hover:border-[#eae6f5] transition-colors cursor-pointer"
              aria-label="Close import dialog"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {summaryResult ? (
            /* ========================================================= */
            /* SUCCESS / RESULT SUMMARY VIEW                            */
            /* ========================================================= */
            <div className="space-y-6 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-emerald-950">
                    CV Import Complete
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Selected sections have been processed and applied. Review your updated portfolio
                    records below.
                  </p>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Profile Result */}
                <div className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                  <div className="flex items-center gap-2 mb-2 text-[#0f172a] font-bold text-sm">
                    <UserIcon className="w-4 h-4 text-[#6e56cf]" />
                    <span>Portfolio Profile</span>
                  </div>
                  {summaryResult.profileUpdatedFields.length > 0 ? (
                    <p className="text-xs text-emerald-700 font-semibold">
                      ✓ Pre-filled {summaryResult.profileUpdatedFields.length} field(s) in editor
                    </p>
                  ) : (
                    <p className="text-xs text-[#64748b]">No profile fields changed</p>
                  )}
                </div>

                {/* Experience Result */}
                <div className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                  <div className="flex items-center gap-2 mb-2 text-[#0f172a] font-bold text-sm">
                    <BriefcaseIcon className="w-4 h-4 text-[#6e56cf]" />
                    <span>Work Experience</span>
                  </div>
                  <p className="text-xs text-emerald-700 font-semibold">
                    ✓ {summaryResult.experiencesImported} imported
                  </p>
                  {summaryResult.experiencesSkipped > 0 && (
                    <p className="text-xs text-[#64748b] mt-0.5">
                      • {summaryResult.experiencesSkipped} skipped as existing duplicate
                    </p>
                  )}
                  {summaryResult.experiencesFailed > 0 && (
                    <p className="text-xs text-rose-600 font-semibold mt-0.5">
                      ✕ {summaryResult.experiencesFailed} failed to import
                    </p>
                  )}
                </div>

                {/* Skills Result */}
                <div className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                  <div className="flex items-center gap-2 mb-2 text-[#0f172a] font-bold text-sm">
                    <SparklesIcon className="w-4 h-4 text-[#6e56cf]" />
                    <span>Skills</span>
                  </div>
                  <p className="text-xs text-emerald-700 font-semibold">
                    ✓ {summaryResult.skillsImported} imported
                  </p>
                  {summaryResult.skillsSkipped > 0 && (
                    <p className="text-xs text-[#64748b] mt-0.5">
                      • {summaryResult.skillsSkipped} already existed in portfolio
                    </p>
                  )}
                  {summaryResult.skillsFailed > 0 && (
                    <p className="text-xs text-rose-600 font-semibold mt-0.5">
                      ✕ {summaryResult.skillsFailed} failed to import
                    </p>
                  )}
                </div>

                {/* Projects Result */}
                <div className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                  <div className="flex items-center gap-2 mb-2 text-[#0f172a] font-bold text-sm">
                    <FolderGit2Icon className="w-4 h-4 text-[#6e56cf]" />
                    <span>Projects</span>
                  </div>
                  <p className="text-xs text-emerald-700 font-semibold">
                    ✓ {summaryResult.projectsImported} imported
                  </p>
                  {summaryResult.projectsSkipped > 0 && (
                    <p className="text-xs text-[#64748b] mt-0.5">
                      • {summaryResult.projectsSkipped} already existed in portfolio
                    </p>
                  )}
                  {summaryResult.projectsFailed > 0 && (
                    <p className="text-xs text-rose-600 font-semibold mt-0.5">
                      ✕ {summaryResult.projectsFailed} failed to import
                    </p>
                  )}
                </div>
              </div>

              {/* Education Note */}
              <div className="p-4 rounded-2xl bg-[#f8f7fd] border border-[#eae6f5] flex items-start gap-2.5 text-xs text-[#64748b]">
                <span className="text-[#6e56cf] font-bold">ℹ</span>
                <span>
                  {summaryResult.educationDetectedCount > 0
                    ? `${summaryResult.educationDetectedCount} education records detected in CV. Education import is not supported in the active portfolio database version and was preserved in preview.`
                    : "No education entries to import."}
                </span>
              </div>

              {/* Partial Errors Banner */}
              {summaryResult.errors.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                  <h4 className="text-xs font-bold text-rose-900">
                    Import Warnings / Errors:
                  </h4>
                  {summaryResult.errors.map((e, idx) => (
                    <p key={idx} className="text-[11px] text-rose-700">
                      • {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* SECTION REVIEW & SELECTION VIEW                          */
            /* ========================================================= */
            <>
              {generalError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-2.5 text-xs font-semibold text-rose-800">
                  <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* Top Import Preview Summary Bar (Step 7) */}
              <div className="p-4 rounded-2xl bg-[#faf9fd] border border-[#dcd3f8] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#0f172a]">
                  <span>Import Preview Summary</span>
                  <span className="text-[#6e56cf] font-semibold">{totalSelectedCount} items selected</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-[#eae6f5]">
                    <span className="text-[10px] text-[#64748b] block font-semibold">Profile</span>
                    <span className="font-bold text-[#0f172a]">
                      {profileMergePreview.changedFields.length > 0
                        ? `✓ ${profileMergePreview.changedFields.length} update(s)`
                        : "No changes"}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#eae6f5]">
                    <span className="text-[10px] text-[#64748b] block font-semibold">Experience</span>
                    <span className="font-bold text-[#0f172a]">
                      +{newExpCount} new{skippedExpCount > 0 ? `, ↻ ${skippedExpCount} existing` : ""}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#eae6f5]">
                    <span className="text-[10px] text-[#64748b] block font-semibold">Projects</span>
                    <span className="font-bold text-[#0f172a]">
                      +{newProjCount} new{skippedProjCount > 0 ? `, ↻ ${skippedProjCount} existing` : ""}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#eae6f5]">
                    <span className="text-[10px] text-[#64748b] block font-semibold">Skills</span>
                    <span className="font-bold text-[#0f172a]">
                      +{newSkillCount} new{skippedSkillCount > 0 ? `, ✓ ${skippedSkillCount} existing` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Profile Section */}
              <div className="rounded-2xl border border-[#eae6f5] p-5 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeProfile}
                      onChange={(e) => setIncludeProfile(e.target.checked)}
                      disabled={isSubmitting}
                      className="w-4 h-4 rounded text-[#6e56cf] focus:ring-[#6e56cf]"
                    />
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
                      <UserIcon className="w-4 h-4 text-[#6e56cf]" />
                      <span>Portfolio Profile &amp; Contact Info</span>
                    </div>
                  </label>
                  <span className="text-xs text-[#64748b]">
                    {profileMergePreview.changedFields.length} field(s) available to pre-fill
                  </span>
                </div>

                {includeProfile && (
                  <div className="mt-3 pt-3 border-t border-[#f0ecf9] space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#faf9fd] p-3 rounded-xl border border-[#f0ecf9]">
                      <span className="text-[#64748b] text-xs">
                        Non-destructive rule: Existing non-empty fields are preserved by default.
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#6e56cf] shrink-0">
                        <input
                          type="checkbox"
                          checked={overwriteProfile}
                          onChange={(e) => setOverwriteProfile(e.target.checked)}
                          disabled={isSubmitting}
                          className="w-3.5 h-3.5 rounded text-[#6e56cf]"
                        />
                        <span>Replace existing values</span>
                      </label>
                    </div>

                    {/* Side-by-side field diff comparison (Step 2) */}
                    <div className="overflow-x-auto rounded-xl border border-[#eae6f5]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#f8f7fd] border-b border-[#eae6f5] text-[10px] font-bold uppercase text-[#64748b]">
                            <th className="p-2.5">Field</th>
                            <th className="p-2.5">Current Portfolio Value</th>
                            <th className="p-2.5">CV Value</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0ecf9] bg-white">
                          {profileMergePreview.fieldDiffs.filter((d) => d.status !== "empty").map((diff) => (
                            <tr key={diff.field} className="hover:bg-[#faf9fd]">
                              <td className="p-2.5 font-bold text-[#0f172a] whitespace-nowrap">{diff.label}</td>
                              <td className="p-2.5 text-[#64748b] max-w-[160px] truncate">
                                {diff.currentValue || <span className="text-[#94a3b8] italic">Empty</span>}
                              </td>
                              <td className="p-2.5 text-[#0f172a] font-medium max-w-[160px] truncate">
                                {diff.cvValue}
                              </td>
                              <td className="p-2.5 text-right whitespace-nowrap">
                                {diff.willUpdate ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    ✓ Will Apply
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                    Preserved
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Experience Section */}
              <div className="rounded-2xl border border-[#eae6f5] p-5 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeExperience}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIncludeExperience(val);
                        setPreparedExp((prev) =>
                          prev.map((i) => ({ ...i, selected: val && !i.isDuplicate }))
                        );
                      }}
                      disabled={isSubmitting || preparedExp.length === 0}
                      className="w-4 h-4 rounded text-[#6e56cf] focus:ring-[#6e56cf]"
                    />
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
                      <BriefcaseIcon className="w-4 h-4 text-[#6e56cf]" />
                      <span>Work Experience</span>
                    </div>
                  </label>
                  <span className="text-xs text-[#64748b]">
                    {selectedExpCount} of {preparedExp.length} selected
                  </span>
                </div>

                {includeExperience && preparedExp.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#f0ecf9] space-y-2">
                    {preparedExp.map((exp) => (
                      <div
                        key={exp.id}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                          exp.isDuplicate
                            ? "bg-[#f8f7fd] border-[#eae6f5] opacity-60"
                            : exp.selected
                            ? "bg-white border-[#dcd3f8]"
                            : "bg-[#faf9fd] border-[#f0ecf9]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={exp.selected}
                          onChange={() => toggleExpItem(exp.id)}
                          disabled={isSubmitting || exp.isDuplicate}
                          className="mt-0.5 w-4 h-4 rounded text-[#6e56cf]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#0f172a] truncate">
                              {exp.position} • {exp.company}
                            </span>
                            {exp.isDuplicate ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Duplicate skipped
                              </span>
                            ) : exp.needsDateReview ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Date review needed
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-[#64748b]">
                                {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate}
                              </span>
                            )}
                          </div>
                          {exp.description && (
                            <p className="text-[11px] text-[#64748b] truncate mt-1">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Skills Section */}
              <div className="rounded-2xl border border-[#eae6f5] p-5 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSkills}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIncludeSkills(val);
                        setPreparedSkills((prev) =>
                          prev.map((i) => ({ ...i, selected: val && !i.isDuplicate }))
                        );
                      }}
                      disabled={isSubmitting || preparedSkills.length === 0}
                      className="w-4 h-4 rounded text-[#6e56cf] focus:ring-[#6e56cf]"
                    />
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
                      <SparklesIcon className="w-4 h-4 text-[#6e56cf]" />
                      <span>Skills</span>
                    </div>
                  </label>
                  <span className="text-xs text-[#64748b]">
                    {selectedSkillCount} of {preparedSkills.length} selected
                  </span>
                </div>

                {includeSkills && preparedSkills.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#f0ecf9] flex flex-wrap gap-2">
                    {preparedSkills.map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => !skill.isDuplicate && toggleSkillItem(skill.id)}
                        disabled={isSubmitting || skill.isDuplicate}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                          skill.isDuplicate
                            ? "bg-[#f8f7fd] border-[#eae6f5] opacity-50 cursor-not-allowed text-[#94a3b8]"
                            : skill.selected
                            ? "bg-[#f3f0ff] border-[#6e56cf] text-[#6e56cf] font-semibold"
                            : "bg-white border-[#eae6f5] text-[#64748b]"
                        }`}
                      >
                        <span>{skill.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/70 border border-[#eae6f5]">
                          {skill.category}
                        </span>
                        {skill.isDuplicate && (
                          <span className="text-[10px] text-amber-700 ml-1">(Exists)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Projects Section */}
              <div className="rounded-2xl border border-[#eae6f5] p-5 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeProjects}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIncludeProjects(val);
                        setPreparedProj((prev) =>
                          prev.map((i) => ({ ...i, selected: val && !i.isDuplicate }))
                        );
                      }}
                      disabled={isSubmitting || preparedProj.length === 0}
                      className="w-4 h-4 rounded text-[#6e56cf] focus:ring-[#6e56cf]"
                    />
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
                      <FolderGit2Icon className="w-4 h-4 text-[#6e56cf]" />
                      <span>Projects</span>
                    </div>
                  </label>
                  <span className="text-xs text-[#64748b]">
                    {selectedProjCount} of {preparedProj.length} selected
                  </span>
                </div>

                {includeProjects && preparedProj.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#f0ecf9] space-y-2">
                    {preparedProj.map((proj) => (
                      <div
                        key={proj.id}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                          proj.isDuplicate
                            ? "bg-[#f8f7fd] border-[#eae6f5] opacity-60"
                            : proj.selected
                            ? "bg-white border-[#dcd3f8]"
                            : "bg-[#faf9fd] border-[#f0ecf9]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={proj.selected}
                          onChange={() => toggleProjItem(proj.id)}
                          disabled={isSubmitting || proj.isDuplicate}
                          className="mt-0.5 w-4 h-4 rounded text-[#6e56cf]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#0f172a] truncate">
                              {proj.title}
                            </span>
                            {proj.isDuplicate && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Exists
                              </span>
                            )}
                          </div>
                          {(proj.githubUrl || proj.liveUrl) && (
                            <div className="flex items-center gap-3 text-[11px] mt-1 text-[#64748b]">
                              {proj.githubUrl && (
                                <span className="flex items-center gap-1 font-medium text-[#0f172a]">
                                  <GithubIcon className="w-3 h-3" />
                                  <span className="truncate max-w-[180px]">{proj.githubUrl}</span>
                                </span>
                              )}
                              {proj.liveUrl && (
                                <span className="flex items-center gap-1 font-medium text-[#6e56cf]">
                                  <ExternalLinkIcon className="w-3 h-3" />
                                  <span className="truncate max-w-[180px]">{proj.liveUrl}</span>
                                </span>
                              )}
                            </div>
                          )}
                          {proj.description && (
                            <p className="text-[11px] text-[#64748b] truncate mt-1">
                              {proj.description}
                            </p>
                          )}
                          {proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {proj.technologies.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#f1edf9] text-[#6e56cf] font-medium"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Education (Disabled / Unsupported) */}
              <div className="rounded-2xl border border-dashed border-[#dcd3f8] p-4 bg-[#faf9fd] opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={false}
                      disabled
                      className="w-4 h-4 rounded text-slate-300 cursor-not-allowed"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[#64748b]">
                        Education
                      </span>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5">
                        {cvData.education && cvData.education.length > 0
                          ? `Education detected (${cvData.education.length} record(s)) — education import is not currently supported in this portfolio version.`
                          : "No education entries detected in CV."}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f1edf9] text-[#6e56cf] border border-[#e4daf7]">
                    Preview Only
                  </span>
                </div>
              </div>

              {/* 6. Achievements & Leadership (Preview Only) */}
              {((cvData.achievements && cvData.achievements.length > 0) ||
                (cvData.leadership && cvData.leadership.length > 0)) && (
                <div className="rounded-2xl border border-dashed border-[#dcd3f8] p-4 bg-[#faf9fd] opacity-75">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-[#64748b]">
                        Achievements &amp; Leadership
                      </span>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5">
                        {cvData.achievements?.length || 0} achievement(s) and {cvData.leadership?.length || 0} leadership entry/entries detected. Preserved in your reviewed CV data — not imported into portfolio records in this database version.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f1edf9] text-[#6e56cf] border border-[#e4daf7] shrink-0 ml-2">
                      Preview Only
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#eae6f5] bg-[#faf9fd] flex items-center justify-between shrink-0">
          {summaryResult ? (
            <div className="w-full flex items-center justify-between gap-3">
              <span className="text-xs text-[#64748b]">
                Import completed successfully.
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReviewPortfolio();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 transition-all cursor-pointer"
              >
                Review Portfolio
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-white border border-transparent hover:border-[#eae6f5] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting || totalSelectedCount === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{currentStepText || "Importing..."}</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Import Selected Data</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
