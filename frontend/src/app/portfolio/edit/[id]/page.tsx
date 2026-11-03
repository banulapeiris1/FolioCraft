"use client";

import React, { useEffect, useState, use, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FolioCraftLogo } from "@/components/landing/icons";
import PortfolioForm from "@/components/portfolio/PortfolioForm";
import ProjectManager from "@/components/project/ProjectManager";
import SkillManager from "@/components/skill/SkillManager";
import ExperienceManager from "@/components/experience/ExperienceManager";
import CvUploadManager from "@/components/cv/CvUploadManager";
import {
  BriefcaseIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  FolderGit2Icon,
  SparklesIcon,
  FileTextIcon,
} from "@/components/portfolio/PortfolioIcons";
import {
  getPortfolio,
  updatePortfolio,
  getProjects,
  getSkills,
  getExperiences,
  ApiError,
} from "@/lib/api";
import { Portfolio, PortfolioFormData } from "@/types/portfolio";
import { Project } from "@/types/project";
import { Skill } from "@/types/skill";
import { Experience } from "@/types/experience";
import { PortfolioViewData, mapDraftToPortfolioViewData } from "@/templates/types";
import {
  EyeIcon,
  ColumnsIcon,
  PencilIcon,
} from "@/components/portfolio/PortfolioIcons";
import { PreviewShell } from "@/components/portfolio/PreviewShell";

export default function EditPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const portfolioId = resolvedParams.id;

  const router = useRouter();
  const { user, token, isLoading, isAuthenticated, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"profile" | "projects" | "skills" | "experience" | "cv">("profile");
  const [layoutMode, setLayoutMode] = useState<"split" | "editor" | "preview">("split");
  const [mobileActiveView, setMobileActiveView] = useState<"editor" | "preview">("editor");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [currentDraft, setCurrentDraft] = useState<PortfolioFormData | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Authentication guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Read URL tab query parameter if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam === "projects" || tabParam === "skills" || tabParam === "profile" || tabParam === "experience" || tabParam === "cv" || tabParam === "cv-import") {
        queueMicrotask(() => {
          setActiveTab(tabParam === "cv-import" ? "cv" : (tabParam as "profile" | "projects" | "skills" | "experience" | "cv"));
        });
      }
    }
  }, []);

  // Fetch existing portfolio data on load
  useEffect(() => {
    let isMounted = true;
    if (!token || !portfolioId) {
      return;
    }

    const loadPortfolio = async () => {
      setIsLoadingPortfolio(true);
      setFetchError(null);

      try {
        const [portfolioRes, projectsRes, skillsRes, experiencesRes] = await Promise.all([
          getPortfolio(portfolioId, token),
          getProjects(portfolioId, token).catch(() => ({ projects: [] })),
          getSkills(portfolioId, token).catch(() => ({ skills: [] })),
          getExperiences(portfolioId, token).catch(() => ({ experience: [], experiences: [] })),
        ]);
        if (isMounted) {
          const loadedPort = portfolioRes.portfolio;
          setPortfolio(loadedPort);
          setProjects(projectsRes.projects || []);
          setSkills(skillsRes.skills || []);
          const exps = ("experiences" in experiencesRes && Array.isArray(experiencesRes.experiences))
            ? experiencesRes.experiences
            : ("experience" in experiencesRes && Array.isArray(experiencesRes.experience))
            ? experiencesRes.experience
            : [];
          setExperiences(exps);
          setCurrentDraft({
            name: loadedPort.name,
            title: loadedPort.title,
            about: loadedPort.about || "",
            email: loadedPort.email || "",
            phone: loadedPort.phone || "",
            location: loadedPort.location || "",
            profileImageUrl: loadedPort.profileImageUrl || "",
            socialLinks: loadedPort.socialLinks || {},
            username: loadedPort.username,
            template: loadedPort.template || "modern",
          });
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError) {
            if (err.status === 404) {
              setFetchError("Portfolio not found. It may have been deleted or you do not have permission to view it.");
            } else if (err.status === 401) {
              setFetchError("Your session has expired. Please log in again.");
              router.replace("/login");
            } else {
              setFetchError(err.message || "Failed to load portfolio details.");
            }
          } else {
            setFetchError("Unable to connect to the server. Please check your internet connection.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingPortfolio(false);
        }
      }
    };

    void loadPortfolio();

    return () => {
      isMounted = false;
    };
  }, [portfolioId, token, router]);

  const initialData: Partial<PortfolioFormData> = useMemo(() => {
    return portfolio
      ? {
          name: portfolio.name,
          title: portfolio.title,
          about: portfolio.about || "",
          email: portfolio.email || "",
          phone: portfolio.phone || "",
          location: portfolio.location || "",
          profileImageUrl: portfolio.profileImageUrl || "",
          socialLinks: portfolio.socialLinks || {},
          username: portfolio.username,
          template: portfolio.template || "modern",
        }
      : {};
  }, [portfolio]);

  const handleDraftChange = useCallback((draft: PortfolioFormData) => {
    setCurrentDraft(draft);
  }, []);

  // Reload collections after a CV import created items on the server.
  // On failure, keep the current lists rather than clearing them.
  const refreshCollections = useCallback(async () => {
    if (!token) return;
    const [projectsRes, skillsRes, experiencesRes] = await Promise.all([
      getProjects(portfolioId, token).catch(() => null),
      getSkills(portfolioId, token).catch(() => null),
      getExperiences(portfolioId, token).catch(() => null),
    ]);
    if (projectsRes) setProjects(projectsRes.projects || []);
    if (skillsRes) setSkills(skillsRes.skills || []);
    if (experiencesRes) {
      setExperiences(experiencesRes.experiences || experiencesRes.experience || []);
    }
  }, [portfolioId, token]);

  const liveViewData: PortfolioViewData = useMemo(() => {
    return mapDraftToPortfolioViewData(currentDraft || initialData, {
      projects,
      skills,
      experiences,
    });
  }, [currentDraft, initialData, projects, skills, experiences]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9fd]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <FolioCraftLogo className="w-12 h-12 rounded-xl shadow-md" />
          <div className="text-center">
            <h2 className="text-sm font-semibold text-[#0f172a] tracking-tight">
              Loading Portfolio Editor...
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Verifying credentials
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleUpdate = async (formData: PortfolioFormData) => {
    if (!token) {
      setServerError("Your session has expired. Please log in again.");
      router.replace("/login");
      return;
    }

    setIsSubmitting(true);
    setServerError(null);
    setServerFieldErrors({});
    setSuccessFeedback(null);

    try {
      const response = await updatePortfolio(portfolioId, formData, token);
      setPortfolio(response.portfolio);
      setCurrentDraft({
        name: response.portfolio.name,
        title: response.portfolio.title,
        about: response.portfolio.about || "",
        email: response.portfolio.email || "",
        phone: response.portfolio.phone || "",
        location: response.portfolio.location || "",
        profileImageUrl: response.portfolio.profileImageUrl || "",
        socialLinks: response.portfolio.socialLinks || {},
        username: response.portfolio.username,
        template: response.portfolio.template || "modern",
      });
      setSuccessFeedback("Changes saved successfully!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setServerError("Your session has expired. Please log in again.");
          router.replace("/login");
          return;
        }
        if (err.status === 409) {
          setServerFieldErrors({ username: "Username is already taken" });
          setServerError("Username is already taken. Please choose a different portfolio handle.");
          return;
        }
        if (err.status === 404) {
          setServerError("Portfolio not found. It may have been deleted.");
          return;
        }
        if (err.status === 400) {
          setServerError(err.message || "Invalid update data provided.");
          return;
        }
        setServerError(err.message || "An unexpected server error occurred. Please try again.");
      } else {
        setServerError("Unable to connect to the server. Please check your internet connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEditorContent = () => (
    <>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold text-[#6e56cf] uppercase tracking-wider mb-3">
            {activeTab === "profile" ? (
              <>
                <BriefcaseIcon className="w-3.5 h-3.5" />
                <span>Portfolio Settings</span>
              </>
            ) : activeTab === "projects" ? (
              <>
                <FolderGit2Icon className="w-3.5 h-3.5" />
                <span>Project Management</span>
              </>
            ) : activeTab === "skills" ? (
              <>
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Skills Management</span>
              </>
            ) : activeTab === "experience" ? (
              <>
                <BriefcaseIcon className="w-3.5 h-3.5" />
                <span>Experience Management</span>
              </>
            ) : (
              <>
                <FileTextIcon className="w-3.5 h-3.5" />
                <span>CV Import &amp; Parsing</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a]">
            {activeTab === "profile"
              ? "Edit Portfolio Information"
              : activeTab === "projects"
              ? "Manage Projects"
              : activeTab === "skills"
              ? "Manage Skills"
              : activeTab === "experience"
              ? "Manage Work Experience"
              : "Import from CV"}
          </h1>
          <p className="mt-1.5 text-sm text-[#64748b] max-w-2xl">
            {activeTab === "profile"
              ? "Modify your personal profile, contact channels, public handle, and template theme."
              : activeTab === "projects"
              ? "Showcase your best engineering work, web apps, and open-source contributions."
              : activeTab === "skills"
              ? "Highlight your technical proficiencies, frameworks, libraries, and tools."
              : activeTab === "experience"
              ? "Detail your employment history, career roles, and professional achievements."
              : "Upload your CV in PDF format to parse and extract your profile info, experience, education, skills, and projects."}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/portfolio/templates?id=${encodeURIComponent(portfolioId)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#eae4fc] border border-[#dcd3f8] transition-all hover:shadow-xs"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Browse Templates</span>
          </Link>
          <div className="text-xs font-mono text-[#64748b] bg-white border border-[#eae6f5] px-3 py-1.5 rounded-xl">
            ID: {portfolioId}
          </div>
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#eae6f5] pb-3 mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "profile"
              ? "bg-[#6e56cf] text-white shadow-sm shadow-[#6e56cf]/25"
              : "bg-white text-[#64748b] hover:text-[#0f172a] border border-[#eae6f5] hover:bg-[#faf9fd]"
          }`}
        >
          <BriefcaseIcon className="w-3.5 h-3.5" />
          <span>Portfolio Profile</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("projects")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "projects"
              ? "bg-[#6e56cf] text-white shadow-sm shadow-[#6e56cf]/25"
              : "bg-white text-[#64748b] hover:text-[#0f172a] border border-[#eae6f5] hover:bg-[#faf9fd]"
          }`}
        >
          <FolderGit2Icon className="w-3.5 h-3.5" />
          <span>Projects</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("skills")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "skills"
              ? "bg-[#6e56cf] text-white shadow-sm shadow-[#6e56cf]/25"
              : "bg-white text-[#64748b] hover:text-[#0f172a] border border-[#eae6f5] hover:bg-[#faf9fd]"
          }`}
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>Skills</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("experience")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "experience"
              ? "bg-[#6e56cf] text-white shadow-sm shadow-[#6e56cf]/25"
              : "bg-white text-[#64748b] hover:text-[#0f172a] border border-[#eae6f5] hover:bg-[#faf9fd]"
          }`}
        >
          <BriefcaseIcon className="w-3.5 h-3.5" />
          <span>Experience</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cv")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "cv"
              ? "bg-[#6e56cf] text-white shadow-sm shadow-[#6e56cf]/25"
              : "bg-white text-[#64748b] hover:text-[#0f172a] border border-[#eae6f5] hover:bg-[#faf9fd]"
          }`}
        >
          <FileTextIcon className="w-3.5 h-3.5" />
          <span>CV Import</span>
        </button>
      </div>

      {/* Success Feedback Alert */}
      {successFeedback && (
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 animate-fadeIn flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-900">
              {successFeedback}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessFeedback(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Section Content */}
      {activeTab === "profile" ? (
        <PortfolioForm
          mode="edit"
          portfolioId={portfolioId}
          initialData={currentDraft ?? initialData}
          isSubmitting={isSubmitting}
          serverError={serverError}
          serverFieldErrors={serverFieldErrors}
          onChange={handleDraftChange}
          onSubmit={handleUpdate}
          onCancel={() => router.push("/dashboard")}
        />
      ) : activeTab === "projects" ? (
        <ProjectManager
          portfolioId={portfolioId}
          initialProjects={projects}
          onProjectsChange={setProjects}
        />
      ) : activeTab === "skills" ? (
        <SkillManager
          portfolioId={portfolioId}
          initialSkills={skills}
          onSkillsChange={setSkills}
        />
      ) : activeTab === "experience" ? (
        <ExperienceManager
          portfolioId={portfolioId}
          initialExperiences={experiences}
          onExperiencesChange={setExperiences}
        />
      ) : (
        <CvUploadManager
          portfolioId={portfolioId}
          portfolio={portfolio}
          onProfileUpdated={(updated) => {
            setPortfolio(updated);
            setCurrentDraft({
              name: updated.name,
              title: updated.title,
              about: updated.about || "",
              email: updated.email || "",
              phone: updated.phone || "",
              location: updated.location || "",
              profileImageUrl: updated.profileImageUrl || "",
              socialLinks: updated.socialLinks || {},
              username: updated.username,
              template: updated.template || "modern",
            });
            setSuccessFeedback("CV profile data has been imported into your portfolio form. Review and save your changes.");
          }}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onCollectionsImported={() => void refreshCollections()}
        />
      )}
    </>
  );

  const renderPreviewContent = (className?: string, shellClassName?: string) => (
    <section
      data-testid="live-preview-section"
      className={`flex flex-col ${className || ""}`}
      aria-label="Live Portfolio Preview"
    >
      <div data-testid="live-preview-container" className="flex-1">
        <PreviewShell
          data={liveViewData}
          templateId={liveViewData.template}
          portfolioId={portfolioId}
          className={shellClassName}
          onTemplateChange={(selectedTpl) => {
            handleDraftChange({
              ...(currentDraft || initialData),
              name: (currentDraft || initialData).name || "",
              title: (currentDraft || initialData).title || "",
              username: (currentDraft || initialData).username || "",
              template: selectedTpl,
            });
          }}
        />
      </div>
    </section>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9fd] selection:bg-[#f3f0ff] selection:text-[#6e56cf]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-[#eae6f5]">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group"
              aria-label="FolioCraft Dashboard"
            >
              <FolioCraftLogo className="w-8 h-8 rounded-lg shadow-sm transition-transform group-hover:scale-105" />
              <span className="text-xl font-bold tracking-tight text-[#0f172a] font-sans">
                Folio<span className="text-[#6e56cf]">Craft</span>
              </span>
            </Link>
            <span className="text-[#cbd5e1] font-light">/</span>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-[#cbd5e1] font-light">/</span>
            <span className="text-xs font-semibold text-[#6e56cf]">
              Edit Portfolio
            </span>
          </div>

          {/* Layout View Mode Controls (Desktop / Tablet) */}
          <div
            role="group"
            aria-label="Editor and preview layout"
            className="hidden md:flex items-center bg-[#f8f7fd] p-1 rounded-xl border border-[#eae6f5]"
          >
            <button
              type="button"
              aria-label="Split view layout"
              aria-pressed={layoutMode === "split"}
              onClick={() => setLayoutMode("split")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                layoutMode === "split"
                  ? "bg-white text-[#6e56cf] shadow-xs"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <ColumnsIcon className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              aria-label="Editor only layout"
              aria-pressed={layoutMode === "editor"}
              onClick={() => setLayoutMode("editor")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                layoutMode === "editor"
                  ? "bg-white text-[#6e56cf] shadow-xs"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <PencilIcon className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              aria-label="Preview only layout"
              aria-pressed={layoutMode === "preview"}
              onClick={() => setLayoutMode("preview")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                layoutMode === "preview"
                  ? "bg-white text-[#6e56cf] shadow-xs"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <EyeIcon className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f8f7fd] border border-[#eae6f5] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="font-semibold text-[#0f172a]">{user.name}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold text-[#64748b] hover:text-[#dc2626] px-3.5 py-2 rounded-xl border border-[#eae6f5] hover:border-[#fecaca] hover:bg-[#fef2f2] transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${
          layoutMode === "split"
            ? "max-w-[1720px]"
            : layoutMode === "preview"
            ? "max-w-6xl"
            : "max-w-4xl"
        }`}
      >
        {/* Loading State */}
        {isLoadingPortfolio ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-[#eae6f5] shadow-xs">
            <div className="w-10 h-10 border-3 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin mb-4" />
            <h3 className="text-base font-bold text-[#0f172a]">
              Loading Portfolio Details...
            </h3>
            <p className="text-xs text-[#64748b] mt-1">
              Retrieving your saved portfolio information from FolioCraft.
            </p>
          </div>
        ) : fetchError ? (
          /* Error State */
          <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 shadow-sm text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
              <AlertCircleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a] mb-2">
              Unable to Load Portfolio
            </h3>
            <p className="text-sm text-[#64748b] mb-6 leading-relaxed">
              {fetchError}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm transition-all"
              >
                Back to Dashboard
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#475569] bg-[#f8f7fd] hover:bg-[#f1edf9] border border-[#eae6f5] transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          /* Loaded Form Content */
          <>
            {/* Mobile View Switcher (Visible on < lg screens) */}
            <div className="flex lg:hidden items-center justify-center p-1 bg-[#f3f0ff] rounded-xl border border-[#dcd3f8] mb-6">
              <button
                type="button"
                onClick={() => { setLayoutMode("split"); setMobileActiveView("editor"); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                  mobileActiveView === "editor"
                    ? "bg-white text-[#6e56cf] shadow-xs"
                    : "text-[#64748b]"
                }`}
              >
                Editor Form
              </button>
              <button
                type="button"
                onClick={() => { setLayoutMode("split"); setMobileActiveView("preview"); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                  mobileActiveView === "preview"
                    ? "bg-white text-[#6e56cf] shadow-xs"
                    : "text-[#64748b]"
                }`}
              >
                Live Preview
              </button>
            </div>

            {layoutMode === "split" ? (
              <div className="flex flex-col lg:flex-row items-start gap-8">
                {/* Left Panel: Editor */}
                <div
                  className={`w-full lg:w-[48%] xl:w-[45%] shrink-0 ${
                    mobileActiveView === "preview" ? "hidden lg:block" : "block"
                  }`}
                >
                  {renderEditorContent()}
                </div>

                {/* Right Panel: Live Preview Shell */}
                <div
                  className={`w-full lg:w-[52%] xl:w-[55%] lg:sticky lg:top-20 ${
                    mobileActiveView === "editor" ? "hidden lg:block" : "block"
                  }`}
                >
                  {/* Cap height on desktop so the preview scrolls inside its sticky panel */}
                  {renderPreviewContent(undefined, "lg:h-[calc(100vh-7rem)]")}
                </div>
              </div>
            ) : layoutMode === "editor" ? (
              <div className="w-full">
                {renderEditorContent()}
              </div>
            ) : (
              <div className="w-full">
                {renderPreviewContent("min-h-[750px]")}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

