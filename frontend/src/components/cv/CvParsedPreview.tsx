"use client";

import React, { useState, useEffect, useMemo } from "react";
import type {
  Confidence,
  CategorizedSkills,
  ReviewIssue,
  StructuredCvAchievement,
  StructuredCvData,
  StructuredCvEducation,
  StructuredCvExperience,
  StructuredCvLeadership,
  StructuredCvPersonal,
  StructuredCvProject,
  StructuredCvSkill,
} from "@/types/cv";
import {
  UserIcon,
  BriefcaseIcon,
  SparklesIcon,
  FolderGit2Icon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeIcon,
  GithubIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  XIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  FileTextIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface CvParsedPreviewProps {
  data: StructuredCvData;
  file?: File | null;
  onDataChange?: (updated: StructuredCvData) => void;
  uploadId?: string;
  fileName?: string;
  onOpenImport?: () => void;
  isPreparingImport?: boolean;
}

// ============================================================================
// CONFIDENCE BADGE COMPONENT
// ============================================================================
function ConfidenceBadge({ confidence }: { confidence?: Confidence }) {
  if (!confidence) return null;

  if (confidence === "high") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        High confidence
      </span>
    );
  }

  if (confidence === "medium") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Medium confidence
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Needs review
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CvParsedPreview({
  data,
  file = null,
  onDataChange,
  uploadId,
  fileName,
  onOpenImport,
  isPreparingImport = false,
}: CvParsedPreviewProps) {
  // Local editable structured CV state
  const [cvData, setCvData] = useState<StructuredCvData>(data);

  // Sync internal state if prop changes externally
  useEffect(() => {
    setCvData(data);
  }, [data]);

  // Propagate changes to parent
  const updateData = (updated: StructuredCvData) => {
    setCvData(updated);
    if (onDataChange) {
      onDataChange(updated);
    }
  };

  // Left Panel Tab State
  const [leftTab, setLeftTab] = useState<"pdf" | "raw">("pdf");

  // PDF Object URL with safe cleanup
  const pdfObjectUrl = useMemo(() => {
    if (!file) return null;
    try {
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  }, [file]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
      }
    };
  }, [pdfObjectUrl]);

  // Modal edit states
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<StructuredCvPersonal>(
    cvData.personal || {}
  );

  const [experienceModalOpen, setExperienceModalOpen] = useState(false);
  const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null);
  const [experienceForm, setExperienceForm] = useState<StructuredCvExperience>({
    company: "",
    position: "",
    description: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState<{
    title: string;
    description: string;
    technologiesStr: string;
    githubUrl: string;
    liveUrl: string;
  }>({
    title: "",
    description: "",
    technologiesStr: "",
    githubUrl: "",
    liveUrl: "",
  });

  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null);
  const [educationForm, setEducationForm] = useState<StructuredCvEducation>({
    institution: "",
    degree: "",
    field: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const [achievementModalOpen, setAchievementModalOpen] = useState(false);
  const [editingAchievementIndex, setEditingAchievementIndex] = useState<number | null>(null);
  const [achievementForm, setAchievementForm] = useState<StructuredCvAchievement>({
    title: "",
    description: "",
    date: "",
    issuer: "",
  });

  const [leadershipModalOpen, setLeadershipModalOpen] = useState(false);
  const [editingLeadershipIndex, setEditingLeadershipIndex] = useState<number | null>(null);
  const [leadershipForm, setLeadershipForm] = useState<StructuredCvLeadership>({
    role: "",
    organization: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  // Skills Category Quick Add state
  const [activeSkillCategory, setActiveSkillCategory] = useState<string>("languages");
  const [newSkillName, setNewSkillName] = useState("");

  // Ensure categorized skills exist in state
  const categorized: CategorizedSkills = useMemo(() => {
    if (cvData.categorizedSkills) {
      return cvData.categorizedSkills;
    }
    const grouped: CategorizedSkills = {
      languages: [],
      frontend: [],
      backend: [],
      databases: [],
      tools: [],
      softSkills: [],
      other: [],
    };
    for (const s of cvData.skills || []) {
      const cat = (s.category || "other") as keyof CategorizedSkills;
      if (grouped[cat]) {
        grouped[cat].push(s);
      } else {
        grouped.other.push(s);
      }
    }
    return grouped;
  }, [cvData.categorizedSkills, cvData.skills]);

  // Section smooth scrolling helper
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ==========================================================================
  // PROFILE HANDLERS
  // ==========================================================================
  const handleOpenProfileEdit = () => {
    setProfileForm({ ...(cvData.personal || {}) });
    setEditingProfile(true);
  };

  const handleSaveProfile = () => {
    const updated = {
      ...cvData,
      personal: { ...profileForm },
    };
    updateData(updated);
    setEditingProfile(false);
  };

  // ==========================================================================
  // EXPERIENCE HANDLERS
  // ==========================================================================
  const handleOpenAddExperience = () => {
    setExperienceForm({
      company: "",
      position: "",
      description: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    });
    setEditingExperienceIndex(null);
    setExperienceModalOpen(true);
  };

  const handleOpenEditExperience = (idx: number) => {
    const item = cvData.experience[idx];
    if (!item) return;
    setExperienceForm({ ...item });
    setEditingExperienceIndex(idx);
    setExperienceModalOpen(true);
  };

  const handleSaveExperience = () => {
    if (!experienceForm.company.trim() || !experienceForm.position.trim()) return;

    const list = [...(cvData.experience || [])];
    const itemToSave: StructuredCvExperience = {
      ...experienceForm,
      company: experienceForm.company.trim(),
      position: experienceForm.position.trim(),
      description: experienceForm.description?.trim() || undefined,
      startDate: experienceForm.startDate?.trim() || undefined,
      endDate: experienceForm.isCurrent ? undefined : experienceForm.endDate?.trim() || undefined,
      confidence: "high", // manual user edits promote to high confidence
    };

    if (editingExperienceIndex !== null) {
      list[editingExperienceIndex] = itemToSave;
    } else {
      list.push(itemToSave);
    }

    updateData({ ...cvData, experience: list });
    setExperienceModalOpen(false);
  };

  const handleDeleteExperience = (idx: number) => {
    const list = cvData.experience.filter((_, i) => i !== idx);
    updateData({ ...cvData, experience: list });
  };

  // ==========================================================================
  // PROJECT HANDLERS
  // ==========================================================================
  const handleOpenAddProject = () => {
    setProjectForm({
      title: "",
      description: "",
      technologiesStr: "",
      githubUrl: "",
      liveUrl: "",
    });
    setEditingProjectIndex(null);
    setProjectModalOpen(true);
  };

  const handleOpenEditProject = (idx: number) => {
    const item = cvData.projects[idx];
    if (!item) return;
    setProjectForm({
      title: item.title,
      description: item.description || "",
      technologiesStr: (item.technologies || []).join(", "),
      githubUrl: item.githubUrl || "",
      liveUrl: item.liveUrl || "",
    });
    setEditingProjectIndex(idx);
    setProjectModalOpen(true);
  };

  const handleSaveProject = () => {
    if (!projectForm.title.trim()) return;

    const list = [...(cvData.projects || [])];
    const techArray = projectForm.technologiesStr
      .split(/[,|]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const itemToSave: StructuredCvProject = {
      title: projectForm.title.trim(),
      description: projectForm.description.trim() || undefined,
      technologies: techArray,
      githubUrl: projectForm.githubUrl.trim() || undefined,
      liveUrl: projectForm.liveUrl.trim() || undefined,
      confidence: "high",
    };

    if (editingProjectIndex !== null) {
      list[editingProjectIndex] = itemToSave;
    } else {
      list.push(itemToSave);
    }

    updateData({ ...cvData, projects: list });
    setProjectModalOpen(false);
  };

  const handleDeleteProject = (idx: number) => {
    const list = cvData.projects.filter((_, i) => i !== idx);
    updateData({ ...cvData, projects: list });
  };

  // ==========================================================================
  // SKILLS HANDLERS
  // ==========================================================================
  const handleAddSkillToCategory = (categoryKey: keyof CategorizedSkills) => {
    const name = newSkillName.trim();
    if (!name) return;

    const newSkill: StructuredCvSkill = {
      name,
      category: categoryKey,
      confidence: "high",
    };

    const updatedCategorized = { ...categorized };
    updatedCategorized[categoryKey] = [...updatedCategorized[categoryKey], newSkill];

    // Keep flat skills in sync
    const updatedFlat = [...(cvData.skills || []), newSkill];

    updateData({
      ...cvData,
      skills: updatedFlat,
      categorizedSkills: updatedCategorized,
    });

    setNewSkillName("");
  };

  const handleRemoveSkill = (categoryKey: keyof CategorizedSkills, skillName: string) => {
    const lower = skillName.toLowerCase();

    const updatedCategorized = { ...categorized };
    updatedCategorized[categoryKey] = updatedCategorized[categoryKey].filter(
      (s) => s.name.toLowerCase() !== lower
    );

    const updatedFlat = (cvData.skills || []).filter(
      (s) => s.name.toLowerCase() !== lower
    );

    updateData({
      ...cvData,
      skills: updatedFlat,
      categorizedSkills: updatedCategorized,
    });
  };

  // ==========================================================================
  // ACHIEVEMENTS HANDLERS
  // ==========================================================================
  const handleOpenAddAchievement = () => {
    setAchievementForm({
      title: "",
      description: "",
      date: "",
      issuer: "",
    });
    setEditingAchievementIndex(null);
    setAchievementModalOpen(true);
  };

  const handleOpenEditAchievement = (idx: number) => {
    const item = (cvData.achievements || [])[idx];
    if (!item) return;
    setAchievementForm({ ...item });
    setEditingAchievementIndex(idx);
    setAchievementModalOpen(true);
  };

  const handleSaveAchievement = () => {
    if (!achievementForm.title.trim()) return;

    const list = [...(cvData.achievements || [])];
    const itemToSave: StructuredCvAchievement = {
      ...achievementForm,
      title: achievementForm.title.trim(),
      description: achievementForm.description?.trim() || undefined,
      date: achievementForm.date?.trim() || undefined,
      issuer: achievementForm.issuer?.trim() || undefined,
      confidence: "high",
    };

    if (editingAchievementIndex !== null) {
      list[editingAchievementIndex] = itemToSave;
    } else {
      list.push(itemToSave);
    }

    updateData({ ...cvData, achievements: list });
    setAchievementModalOpen(false);
  };

  const handleDeleteAchievement = (idx: number) => {
    const list = (cvData.achievements || []).filter((_, i) => i !== idx);
    updateData({ ...cvData, achievements: list });
  };

  // ==========================================================================
  // LEADERSHIP HANDLERS
  // ==========================================================================
  const handleOpenAddLeadership = () => {
    setLeadershipForm({
      role: "",
      organization: "",
      startDate: "",
      endDate: "",
      description: "",
    });
    setEditingLeadershipIndex(null);
    setLeadershipModalOpen(true);
  };

  const handleOpenEditLeadership = (idx: number) => {
    const item = (cvData.leadership || [])[idx];
    if (!item) return;
    setLeadershipForm({ ...item });
    setEditingLeadershipIndex(idx);
    setLeadershipModalOpen(true);
  };

  const handleSaveLeadership = () => {
    if (!leadershipForm.role.trim()) return;

    const list = [...(cvData.leadership || [])];
    const itemToSave: StructuredCvLeadership = {
      ...leadershipForm,
      role: leadershipForm.role.trim(),
      organization: leadershipForm.organization?.trim() || undefined,
      startDate: leadershipForm.startDate?.trim() || undefined,
      endDate: leadershipForm.endDate?.trim() || undefined,
      description: leadershipForm.description?.trim() || undefined,
      confidence: "high",
    };

    if (editingLeadershipIndex !== null) {
      list[editingLeadershipIndex] = itemToSave;
    } else {
      list.push(itemToSave);
    }

    updateData({ ...cvData, leadership: list });
    setLeadershipModalOpen(false);
  };

  const handleDeleteLeadership = (idx: number) => {
    const list = (cvData.leadership || []).filter((_, i) => i !== idx);
    updateData({ ...cvData, leadership: list });
  };

  // ==========================================================================
  // EDUCATION HANDLERS
  // ==========================================================================
  const handleOpenAddEducation = () => {
    setEducationForm({
      institution: "",
      degree: "",
      field: "",
      description: "",
      startDate: "",
      endDate: "",
    });
    setEditingEducationIndex(null);
    setEducationModalOpen(true);
  };

  const handleOpenEditEducation = (idx: number) => {
    const item = cvData.education[idx];
    if (!item) return;
    setEducationForm({ ...item });
    setEditingEducationIndex(idx);
    setEducationModalOpen(true);
  };

  const handleSaveEducation = () => {
    if (!educationForm.institution.trim()) return;

    const list = [...(cvData.education || [])];
    const itemToSave: StructuredCvEducation = {
      ...educationForm,
      institution: educationForm.institution.trim(),
      degree: educationForm.degree?.trim() || undefined,
      field: educationForm.field?.trim() || undefined,
      description: educationForm.description?.trim() || undefined,
      startDate: educationForm.startDate?.trim() || undefined,
      endDate: educationForm.endDate?.trim() || undefined,
      confidence: "high",
    };

    if (editingEducationIndex !== null) {
      list[editingEducationIndex] = itemToSave;
    } else {
      list.push(itemToSave);
    }

    updateData({ ...cvData, education: list });
    setEducationModalOpen(false);
  };

  const handleDeleteEducation = (idx: number) => {
    const list = cvData.education.filter((_, i) => i !== idx);
    updateData({ ...cvData, education: list });
  };

  // Category display metadata
  const skillCategoryMeta: { key: keyof CategorizedSkills; label: string }[] = [
    { key: "languages", label: "Languages" },
    { key: "frontend", label: "Frontend" },
    { key: "backend", label: "Backend" },
    { key: "databases", label: "Databases" },
    { key: "tools", label: "Tools & DevOps" },
    { key: "softSkills", label: "Soft Skills" },
    { key: "other", label: "Other Technologies" },
  ];

  const totalSkillCount = (cvData.skills || []).length;
  const reviewIssues = cvData.reviewIssues || [];

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. TOP REVIEW SUMMARY HEADER (Step 12 & 13)                         */}
      {/* ==================================================================== */}
      <div className="rounded-3xl bg-white border border-[#eae6f5] p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#f0ecf9]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f0ff] text-[#6e56cf] border border-[#dcd3f8]">
                CV Review &amp; Correction
              </span>
              {uploadId && (
                <span className="text-[11px] font-mono text-[#94a3b8]">
                  Ref: {uploadId.slice(0, 8)}...
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Review What We Extracted From Your CV
            </h2>
            <p className="text-xs sm:text-sm text-[#64748b] mt-1 max-w-2xl leading-relaxed">
              Review and correct any extracted details on the right while comparing with your original document on the left.
              When satisfied, click <strong>Import to Portfolio</strong>.
            </p>
          </div>

          {onOpenImport && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenImport}
                disabled={isPreparingImport}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-bold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-md shadow-[#6e56cf]/25 transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPreparingImport ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Loading Portfolio Items...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Import to Portfolio</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Metric counts bar */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <button
            type="button"
            onClick={() => scrollToSection("section-profile")}
            className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#6e56cf]/40 transition-colors text-left cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block mb-0.5">
              Profile
            </span>
            <span className="text-xs font-bold text-[#0f172a] flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
              {cvData.personal?.fullName ? "Detected" : "Empty"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("section-experience")}
            className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#6e56cf]/40 transition-colors text-left cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block mb-0.5">
              Experience
            </span>
            <span className="text-sm font-bold text-[#0f172a] flex items-center gap-1.5">
              <BriefcaseIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
              {cvData.experience?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("section-projects")}
            className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#6e56cf]/40 transition-colors text-left cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block mb-0.5">
              Projects
            </span>
            <span className="text-sm font-bold text-[#0f172a] flex items-center gap-1.5">
              <FolderGit2Icon className="w-3.5 h-3.5 text-[#6e56cf]" />
              {cvData.projects?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("section-skills")}
            className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#6e56cf]/40 transition-colors text-left cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block mb-0.5">
              Skills
            </span>
            <span className="text-sm font-bold text-[#0f172a] flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
              {totalSkillCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("section-education")}
            className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#6e56cf]/40 transition-colors text-left cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block mb-0.5">
              Education
            </span>
            <span className="text-sm font-bold text-[#0f172a] flex items-center gap-1.5">
              <FileTextIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
              {cvData.education?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("section-achievements")}
            className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#6e56cf]/40 transition-colors text-left cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block mb-0.5">
              Achievements
            </span>
            <span className="text-sm font-bold text-[#0f172a]">
              {cvData.achievements?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("section-leadership")}
            className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#6e56cf]/40 transition-colors text-left cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block mb-0.5">
              Leadership
            </span>
            <span className="text-sm font-bold text-[#0f172a]">
              {cvData.leadership?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. REVIEW WARNINGS BANNER (Step 10)                                 */}
      {/* ==================================================================== */}
      {reviewIssues.length > 0 && (
        <div className="rounded-3xl bg-amber-50/70 border border-amber-200 p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircleIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                {reviewIssues.length} item{reviewIssues.length === 1 ? "" : "s"} need your review
              </h3>
              <p className="text-xs text-amber-800">
                The parser flagged these points for potential ambiguity. Click an item to jump to that section.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
            {reviewIssues.map((issue, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToSection(`section-${issue.section}`)}
                className="p-3 rounded-xl bg-white border border-amber-200/80 hover:border-amber-400 transition-colors text-left text-xs flex items-start gap-2.5 cursor-pointer shadow-2xs"
              >
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    issue.severity === "warning"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {issue.section}
                </span>
                <span className="text-slate-700 leading-snug flex-1">
                  {issue.message}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. DESKTOP SPLIT / MOBILE STACK WORKSPACE (Step 3 & 4)              */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================== */}
        {/* LEFT COLUMN: ORIGINAL CV PREVIEW & RAW EXTRACTED TEXT (Step 4 & 11)*/}
        {/* ================================================================== */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-xs overflow-hidden flex flex-col h-[650px] lg:h-[calc(100vh-8rem)] min-h-[500px]">
            {/* Left Header & Tabs */}
            <div className="p-4 border-b border-[#eae6f5] bg-[#faf9fd] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#0f172a]">
                  Document View:
                </span>
                <div className="inline-flex p-1 rounded-xl bg-[#f0ecf9] border border-[#e4daf7]">
                  <button
                    type="button"
                    onClick={() => setLeftTab("pdf")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      leftTab === "pdf"
                        ? "bg-white text-[#6e56cf] shadow-2xs"
                        : "text-[#64748b] hover:text-[#0f172a]"
                    }`}
                  >
                    Original PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftTab("raw")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      leftTab === "raw"
                        ? "bg-white text-[#6e56cf] shadow-2xs"
                        : "text-[#64748b] hover:text-[#0f172a]"
                    }`}
                  >
                    Extracted Text
                  </button>
                </div>
              </div>

              {pdfObjectUrl && leftTab === "pdf" && (
                <a
                  href={pdfObjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6e56cf] hover:underline"
                >
                  <span>Open Popout</span>
                  <ExternalLinkIcon className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#f8f7fd] p-2 relative overflow-hidden">
              {leftTab === "pdf" ? (
                pdfObjectUrl ? (
                  <iframe
                    src={`${pdfObjectUrl}#toolbar=0&navpanes=0`}
                    title="Original Uploaded CV Document"
                    className="w-full h-full rounded-2xl border border-[#eae6f5] bg-white"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-xs text-[#64748b]">
                    <div className="w-12 h-12 rounded-2xl bg-[#f0ecf9] text-[#6e56cf] flex items-center justify-center mb-3">
                      <FileTextIcon className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-[#0f172a] block mb-1">
                      Original PDF Preview
                    </span>
                    <p className="max-w-xs leading-relaxed text-[#64748b]">
                      Original PDF was uploaded during this session ({fileName || "uploaded document"}).
                      Switch to the <strong>Extracted Text</strong> tab to view raw text sections.
                    </p>
                  </div>
                )
              ) : (
                /* Raw Extracted Text View (Step 11) */
                <div className="w-full h-full overflow-y-auto p-4 bg-white rounded-2xl border border-[#eae6f5] font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap select-text">
                  {cvData.pageTexts && cvData.pageTexts.length > 0 ? (
                    cvData.pageTexts.map((pageText, pIdx) => (
                      <div key={pIdx} className="mb-6 last:mb-0">
                        <div className="text-[10px] uppercase font-bold text-[#6e56cf] bg-[#f3f0ff] px-2 py-1 rounded inline-block mb-2">
                          Page {pIdx + 1} of {cvData.totalPages || cvData.pageTexts?.length}
                        </div>
                        <p>{pageText}</p>
                      </div>
                    ))
                  ) : cvData.rawText ? (
                    <p>{cvData.rawText}</p>
                  ) : (
                    <p className="text-[#94a3b8] italic">No raw text payload available.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* RIGHT COLUMN: EDITABLE EXTRACTED SECTIONS (Step 5, 6, 7, 8)       */}
        {/* ================================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* ---------------------------------------------------------------- */}
          {/* SECTION 1: PROFILE & CONTACT INFO                                */}
          {/* ---------------------------------------------------------------- */}
          <div
            id="section-profile"
            className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs scroll-mt-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Personal Information &amp; Summary
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Contact details and professional introduction.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenProfileEdit}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#eae4fa] border border-[#dcd3f8] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PencilIcon className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] block mb-0.5">
                  Full Name
                </span>
                <span className="text-sm font-bold text-[#0f172a]">
                  {cvData.personal?.fullName || (
                    <span className="text-[#94a3b8] italic">Not detected</span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <MailIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
                  <span>Email</span>
                </span>
                <span className="text-sm font-semibold text-[#0f172a] break-all">
                  {cvData.personal?.email || (
                    <span className="text-[#94a3b8] italic">Not detected</span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <PhoneIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
                  <span>Phone</span>
                </span>
                <span className="text-sm font-semibold text-[#0f172a]">
                  {cvData.personal?.phone || (
                    <span className="text-[#94a3b8] italic">Not detected</span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <MapPinIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
                  <span>Location</span>
                </span>
                <span className="text-sm font-semibold text-[#0f172a]">
                  {cvData.personal?.location || (
                    <span className="text-[#94a3b8] italic">Not detected</span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <GlobeIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
                  <span>Website</span>
                </span>
                <span className="text-xs font-semibold text-[#6e56cf] break-all">
                  {cvData.personal?.website || (
                    <span className="text-[#94a3b8] italic font-normal">None</span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <GlobeIcon className="w-3.5 h-3.5 text-[#0077b5]" />
                  <span>LinkedIn</span>
                </span>
                <span className="text-xs font-semibold text-[#0f172a] break-all">
                  {cvData.personal?.linkedin || (
                    <span className="text-[#94a3b8] italic font-normal">None</span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] sm:col-span-2">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <GithubIcon className="w-3.5 h-3.5 text-[#0f172a]" />
                  <span>GitHub</span>
                </span>
                <span className="text-xs font-semibold text-[#0f172a] break-all">
                  {cvData.personal?.github || (
                    <span className="text-[#94a3b8] italic font-normal">None</span>
                  )}
                </span>
              </div>
            </div>

            {cvData.personal?.summary && (
              <div className="p-4 rounded-2xl bg-[#fbfaff] border border-[#eae6f5]">
                <span className="text-xs font-bold text-[#6e56cf] uppercase tracking-wider block mb-1.5">
                  Professional Summary
                </span>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed whitespace-pre-line">
                  {cvData.personal.summary}
                </p>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* SECTION 2: WORK EXPERIENCE (Step 5)                              */}
          {/* ---------------------------------------------------------------- */}
          <div
            id="section-experience"
            className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs scroll-mt-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
                  <BriefcaseIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Work Experience
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Employment history and professional career roles.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
                  {cvData.experience?.length || 0}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddExperience}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Role</span>
                </button>
              </div>
            </div>

            {cvData.experience && cvData.experience.length > 0 ? (
              <div className="space-y-3">
                {cvData.experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#e2dcfa] transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#0f172a]">
                            {exp.position}
                          </h4>
                          <span className="text-[#6e56cf] font-bold text-sm">
                            • {exp.company}
                          </span>
                          <ConfidenceBadge confidence={exp.confidence} />
                        </div>
                        <span className="text-xs font-medium text-[#64748b] mt-0.5 block">
                          {exp.startDate || "Date unknown"} –{" "}
                          {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditExperience(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6e56cf] hover:bg-[#f3f0ff] transition-colors cursor-pointer"
                          title="Edit this role"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExperience(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete this role"
                        >
                          <Trash2Icon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {exp.description && (
                      <p className="text-xs text-[#475569] leading-relaxed mt-2 whitespace-pre-line border-t border-[#f0ecf9] pt-2">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-[#dcd3f8] text-center text-xs text-[#94a3b8]">
                No experience entries recorded. Click &quot;Add Role&quot; above to create one.
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* SECTION 3: PROJECTS (Step 5)                                     */}
          {/* ---------------------------------------------------------------- */}
          <div
            id="section-projects"
            className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs scroll-mt-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
                  <FolderGit2Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Projects
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Portfolio applications, systems, and open-source projects.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
                  {cvData.projects?.length || 0}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddProject}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Project</span>
                </button>
              </div>
            </div>

            {cvData.projects && cvData.projects.length > 0 ? (
              <div className="space-y-3">
                {cvData.projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#e2dcfa] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#0f172a]">
                            {proj.title}
                          </h4>
                          <ConfidenceBadge confidence={proj.confidence} />
                        </div>

                        {/* URLs */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          {proj.githubUrl && (
                            <a
                              href={proj.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#0f172a] hover:text-[#6e56cf] font-medium"
                            >
                              <GithubIcon className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[200px]">{proj.githubUrl}</span>
                            </a>
                          )}
                          {proj.liveUrl && (
                            <a
                              href={proj.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#6e56cf] hover:underline font-medium"
                            >
                              <ExternalLinkIcon className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[200px]">{proj.liveUrl}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProject(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6e56cf] hover:bg-[#f3f0ff] transition-colors cursor-pointer"
                          title="Edit project"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2Icon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-[#475569] leading-relaxed mb-3 whitespace-pre-line border-t border-[#f0ecf9] pt-2">
                        {proj.description}
                      </p>
                    )}

                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {proj.technologies.map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-[#eae6f5] text-[11px] font-medium text-[#64748b]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-[#dcd3f8] text-center text-xs text-[#94a3b8]">
                No projects recorded. Click &quot;Add Project&quot; to add one.
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* SECTION 4: CATEGORIZED SKILLS (Step 6)                           */}
          {/* ---------------------------------------------------------------- */}
          <div
            id="section-skills"
            className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs scroll-mt-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Categorized Skills
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Organized technical abilities, frameworks, tools, and domain proficiencies.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
                {totalSkillCount} Skills
              </span>
            </div>

            {/* Quick add bar */}
            <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] mb-5 flex flex-col sm:flex-row items-center gap-2">
              <select
                value={activeSkillCategory}
                onChange={(e) => setActiveSkillCategory(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs font-semibold text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
              >
                {skillCategoryMeta.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Add new skill (e.g. Docker, TypeScript)..."
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkillToCategory(activeSkillCategory as keyof CategorizedSkills);
                  }
                }}
                className="flex-1 w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
              />
              <button
                type="button"
                onClick={() =>
                  handleAddSkillToCategory(activeSkillCategory as keyof CategorizedSkills)
                }
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#6e56cf] hover:bg-[#5d46be] transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Categorized skill groups */}
            <div className="space-y-4">
              {skillCategoryMeta.map(({ key, label }) => {
                const groupSkills = categorized[key] || [];
                return (
                  <div key={key} className="p-3.5 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#0f172a] flex items-center gap-2">
                        <span>{label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#eae6f5] font-semibold text-[#6e56cf]">
                          {groupSkills.length}
                        </span>
                      </span>
                    </div>

                    {groupSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {groupSkills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-[#0f172a] border border-[#e4daf7] text-xs font-semibold shadow-2xs group hover:border-[#6e56cf] transition-colors"
                          >
                            <span>{skill.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(key, skill.name)}
                              className="text-[#94a3b8] hover:text-rose-600 transition-colors cursor-pointer"
                              title={`Remove ${skill.name}`}
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#94a3b8] italic">No skills in this category.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* SECTION 5: ACHIEVEMENTS (Step 7)                                 */}
          {/* ---------------------------------------------------------------- */}
          <div
            id="section-achievements"
            className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs scroll-mt-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Achievements &amp; Honors
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Hackathons, competition rankings, awards, and distinctions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
                  {cvData.achievements?.length || 0}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddAchievement}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Achievement</span>
                </button>
              </div>
            </div>

            {cvData.achievements && cvData.achievements.length > 0 ? (
              <div className="space-y-3">
                {cvData.achievements.map((ach, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#e2dcfa] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#0f172a]">
                            {ach.title}
                          </h4>
                          {ach.issuer && (
                            <span className="text-[#6e56cf] text-xs font-semibold">
                              • {ach.issuer}
                            </span>
                          )}
                          <ConfidenceBadge confidence={ach.confidence} />
                        </div>
                        {ach.date && (
                          <span className="text-xs font-medium text-[#64748b] block mt-0.5">
                            {ach.date}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAchievement(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6e56cf] hover:bg-[#f3f0ff] transition-colors cursor-pointer"
                          title="Edit achievement"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAchievement(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete achievement"
                        >
                          <Trash2Icon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {ach.description && (
                      <p className="text-xs text-[#475569] leading-relaxed mt-2 whitespace-pre-line border-t border-[#f0ecf9] pt-2">
                        {ach.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-[#dcd3f8] text-center text-xs text-[#94a3b8]">
                No achievements recorded. Click &quot;Add Achievement&quot; to include honors or awards.
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* SECTION 6: LEADERSHIP (Step 8)                                   */}
          {/* ---------------------------------------------------------------- */}
          <div
            id="section-leadership"
            className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs scroll-mt-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Leadership &amp; Community
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Student governance, club directorships, mentoring, and community service.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
                  {cvData.leadership?.length || 0}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddLeadership}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Leadership</span>
                </button>
              </div>
            </div>

            {cvData.leadership && cvData.leadership.length > 0 ? (
              <div className="space-y-3">
                {cvData.leadership.map((ldr, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#e2dcfa] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#0f172a]">
                            {ldr.role}
                          </h4>
                          {ldr.organization && (
                            <span className="text-[#6e56cf] text-xs font-semibold">
                              • {ldr.organization}
                            </span>
                          )}
                          <ConfidenceBadge confidence={ldr.confidence} />
                        </div>
                        {(ldr.startDate || ldr.endDate) && (
                          <span className="text-xs font-medium text-[#64748b] block mt-0.5">
                            {ldr.startDate || ""} – {ldr.endDate || "Present"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditLeadership(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6e56cf] hover:bg-[#f3f0ff] transition-colors cursor-pointer"
                          title="Edit leadership entry"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLeadership(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete leadership entry"
                        >
                          <Trash2Icon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {ldr.description && (
                      <p className="text-xs text-[#475569] leading-relaxed mt-2 whitespace-pre-line border-t border-[#f0ecf9] pt-2">
                        {ldr.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-[#dcd3f8] text-center text-xs text-[#94a3b8]">
                No leadership roles recorded. Click &quot;Add Leadership&quot; to include mentoring or club service.
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* SECTION 7: EDUCATION                                             */}
          {/* ---------------------------------------------------------------- */}
          <div
            id="section-education"
            className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs scroll-mt-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
                  <FileTextIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Education
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Degrees, universities, colleges, and academic programs.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
                  {cvData.education?.length || 0}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddEducation}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Education</span>
                </button>
              </div>
            </div>

            {cvData.education && cvData.education.length > 0 ? (
              <div className="space-y-3">
                {cvData.education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#e2dcfa] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#0f172a]">
                            {edu.degree || edu.field || "Degree"}
                          </h4>
                          {edu.institution && (
                            <span className="text-[#6e56cf] font-bold text-sm">
                              • {edu.institution}
                            </span>
                          )}
                          <ConfidenceBadge confidence={edu.confidence} />
                        </div>
                        {(edu.startDate || edu.endDate) && (
                          <span className="text-xs font-medium text-[#64748b] block mt-0.5">
                            {edu.startDate ? `${edu.startDate} – ` : ""}
                            {edu.endDate || ""}
                          </span>
                        )}
                        {edu.field && edu.degree && (
                          <span className="text-xs text-[#64748b] block mt-0.5">
                            Field: {edu.field}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEducation(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6e56cf] hover:bg-[#f3f0ff] transition-colors cursor-pointer"
                          title="Edit education"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEducation(idx)}
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete education"
                        >
                          <Trash2Icon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {edu.description && (
                      <p className="text-xs text-[#475569] leading-relaxed mt-2 whitespace-pre-line border-t border-[#f0ecf9] pt-2">
                        {edu.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-[#dcd3f8] text-center text-xs text-[#94a3b8]">
                No education records. Click &quot;Add Education&quot; to include academic credentials.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. MODALS & EDITORS                                                 */}
      {/* ==================================================================== */}

      {/* A. Profile Edit Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#eae6f5] flex items-center justify-between bg-[#faf9fd]">
              <h3 className="text-base font-bold text-[#0f172a]">
                Edit Profile Information
              </h3>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1edf9]"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.fullName || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.email || ""}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone || ""}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={profileForm.location || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, location: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Website / Portfolio
                </label>
                <input
                  type="text"
                  value={profileForm.website || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, website: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    LinkedIn
                  </label>
                  <input
                    type="text"
                    value={profileForm.linkedin || ""}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, linkedin: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    GitHub
                  </label>
                  <input
                    type="text"
                    value={profileForm.github || ""}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, github: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Professional Summary
                </label>
                <textarea
                  rows={4}
                  value={profileForm.summary || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, summary: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#eae6f5] bg-[#faf9fd] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Experience Edit / Add Modal */}
      {experienceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#eae6f5] flex items-center justify-between bg-[#faf9fd]">
              <h3 className="text-base font-bold text-[#0f172a]">
                {editingExperienceIndex !== null ? "Edit Work Experience" : "Add Work Experience"}
              </h3>
              <button
                type="button"
                onClick={() => setExperienceModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1edf9]"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Job Title / Position *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer"
                  value={experienceForm.position}
                  onChange={(e) =>
                    setExperienceForm({ ...experienceForm, position: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Company / Organization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={experienceForm.company}
                  onChange={(e) =>
                    setExperienceForm({ ...experienceForm, company: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Start Date
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD or Month YYYY"
                    value={experienceForm.startDate || ""}
                    onChange={(e) =>
                      setExperienceForm({ ...experienceForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    End Date
                  </label>
                  <input
                    type="text"
                    disabled={experienceForm.isCurrent}
                    placeholder={experienceForm.isCurrent ? "Present" : "YYYY-MM-DD"}
                    value={experienceForm.endDate || ""}
                    onChange={(e) =>
                      setExperienceForm({ ...experienceForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf] disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-[#0f172a]">
                <input
                  type="checkbox"
                  checked={experienceForm.isCurrent}
                  onChange={(e) =>
                    setExperienceForm({
                      ...experienceForm,
                      isCurrent: e.target.checked,
                      endDate: e.target.checked ? "" : experienceForm.endDate,
                    })
                  }
                  className="w-4 h-4 rounded text-[#6e56cf] focus:ring-[#6e56cf]"
                />
                <span>Currently working in this role</span>
              </label>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Role Description &amp; Responsibilities
                </label>
                <textarea
                  rows={4}
                  placeholder="Key accomplishments and duties..."
                  value={experienceForm.description || ""}
                  onChange={(e) =>
                    setExperienceForm({ ...experienceForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#eae6f5] bg-[#faf9fd] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setExperienceModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExperience}
                disabled={!experienceForm.company.trim() || !experienceForm.position.trim()}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 disabled:opacity-50"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. Project Edit / Add Modal */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#eae6f5] flex items-center justify-between bg-[#faf9fd]">
              <h3 className="text-base font-bold text-[#0f172a]">
                {editingProjectIndex !== null ? "Edit Project" : "Add Project"}
              </h3>
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1edf9]"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FolioCraft"
                  value={projectForm.title}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Technologies (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, Next.js, Node.js, PostgreSQL"
                  value={projectForm.technologiesStr}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, technologiesStr: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={projectForm.githubUrl}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, githubUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Live Demo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={projectForm.liveUrl}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, liveUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Project Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Key features, problems solved, architectural decisions..."
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#eae6f5] bg-[#faf9fd] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={!projectForm.title.trim()}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 disabled:opacity-50"
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. Education Edit / Add Modal */}
      {educationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#eae6f5] flex items-center justify-between bg-[#faf9fd]">
              <h3 className="text-base font-bold text-[#0f172a]">
                {editingEducationIndex !== null ? "Edit Education" : "Add Education"}
              </h3>
              <button
                type="button"
                onClick={() => setEducationModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1edf9]"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Institution / University *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stanford University"
                  value={educationForm.institution}
                  onChange={(e) =>
                    setEducationForm({ ...educationForm, institution: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Degree
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B.Sc. in Computer Science"
                    value={educationForm.degree || ""}
                    onChange={(e) =>
                      setEducationForm({ ...educationForm, degree: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Field of Study
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineering"
                    value={educationForm.field || ""}
                    onChange={(e) =>
                      setEducationForm({ ...educationForm, field: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Start Date / Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2020"
                    value={educationForm.startDate || ""}
                    onChange={(e) =>
                      setEducationForm({ ...educationForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    End Date / Graduation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2024"
                    value={educationForm.endDate || ""}
                    onChange={(e) =>
                      setEducationForm({ ...educationForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Description / Honors
                </label>
                <textarea
                  rows={3}
                  placeholder="Academic achievements, GPA, thesis topics..."
                  value={educationForm.description || ""}
                  onChange={(e) =>
                    setEducationForm({ ...educationForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#eae6f5] bg-[#faf9fd] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEducationModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEducation}
                disabled={!educationForm.institution.trim()}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 disabled:opacity-50"
              >
                Save Education
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. Achievement Edit / Add Modal */}
      {achievementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#eae6f5] flex items-center justify-between bg-[#faf9fd]">
              <h3 className="text-base font-bold text-[#0f172a]">
                {editingAchievementIndex !== null ? "Edit Achievement" : "Add Achievement"}
              </h3>
              <button
                type="button"
                onClick={() => setAchievementModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1edf9]"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Achievement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1st Place - HackX 2024"
                  value={achievementForm.title}
                  onChange={(e) =>
                    setAchievementForm({ ...achievementForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Issuer / Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IEEE Student Branch"
                    value={achievementForm.issuer || ""}
                    onChange={(e) =>
                      setAchievementForm({ ...achievementForm, issuer: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Date / Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. October 2024"
                    value={achievementForm.date || ""}
                    onChange={(e) =>
                      setAchievementForm({ ...achievementForm, date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Details of the achievement, ranking, or project..."
                  value={achievementForm.description || ""}
                  onChange={(e) =>
                    setAchievementForm({ ...achievementForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#eae6f5] bg-[#faf9fd] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAchievementModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAchievement}
                disabled={!achievementForm.title.trim()}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 disabled:opacity-50"
              >
                Save Achievement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F. Leadership Edit / Add Modal */}
      {leadershipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#eae6f5] flex items-center justify-between bg-[#faf9fd]">
              <h3 className="text-base font-bold text-[#0f172a]">
                {editingLeadershipIndex !== null ? "Edit Leadership Entry" : "Add Leadership Entry"}
              </h3>
              <button
                type="button"
                onClick={() => setLeadershipModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1edf9]"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Leadership Role *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vice President, Peer Mentor"
                  value={leadershipForm.role}
                  onChange={(e) =>
                    setLeadershipForm({ ...leadershipForm, role: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Organization / Society
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computing Society"
                  value={leadershipForm.organization || ""}
                  onChange={(e) =>
                    setLeadershipForm({ ...leadershipForm, organization: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    Start Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2023"
                    value={leadershipForm.startDate || ""}
                    onChange={(e) =>
                      setLeadershipForm({ ...leadershipForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    End Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2024 or Present"
                    value={leadershipForm.endDate || ""}
                    onChange={(e) =>
                      setLeadershipForm({ ...leadershipForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Activities organized, teams directed, workshops conducted..."
                  value={leadershipForm.description || ""}
                  onChange={(e) =>
                    setLeadershipForm({ ...leadershipForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#eae6f5] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#6e56cf]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#eae6f5] bg-[#faf9fd] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setLeadershipModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLeadership}
                disabled={!leadershipForm.role.trim()}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 disabled:opacity-50"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
