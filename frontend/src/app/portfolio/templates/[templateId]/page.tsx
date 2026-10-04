"use client";

import React, { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FolioCraftLogo } from "@/components/landing/icons";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  SparklesIcon,
} from "@/components/portfolio/PortfolioIcons";
import {
  getPortfolio,
  getPortfolios,
  getProjects,
  getSkills,
  getExperiences,
  updatePortfolio,
  ApiError,
} from "@/lib/api";
import { Portfolio, PortfolioTemplateId } from "@/types/portfolio";
import { PortfolioViewData } from "@/templates/types";
import {
  TEMPLATE_REGISTRY,
  isValidTemplateId,
} from "@/templates/registry";
import { TemplateRenderer } from "@/templates/TemplateRenderer";

function TemplatePreviewContent({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const resolvedParams = use(params);
  const rawTemplateId = resolvedParams.templateId;
  const normalizedTemplateId = rawTemplateId.toLowerCase().trim();

  const router = useRouter();
  const searchParams = useSearchParams();
  const rawIdParam = searchParams.get("id");

  const { user, token, isLoading: isAuthLoading, isAuthenticated, logout } = useAuth();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioViewData, setPortfolioViewData] = useState<PortfolioViewData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Validate template existence
  const isTemplateValid = isValidTemplateId(normalizedTemplateId);

  // Authentication guard
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Load portfolio data for preview
  useEffect(() => {
    let isMounted = true;
    if (!token || !isAuthenticated || !isTemplateValid) {
      if (!isTemplateValid) {
        setIsLoadingData(false);
      }
      return;
    }

    const loadData = async () => {
      setIsLoadingData(true);
      setErrorMessage(null);

      try {
        let activeId = rawIdParam;

        if (!activeId) {
          const listRes = await getPortfolios(token);
          if (listRes.portfolios && listRes.portfolios.length > 0) {
            activeId = listRes.portfolios[0].id;
          } else {
            if (isMounted) {
              setIsLoadingData(false);
            }
            return;
          }
        }

        const [portfolioRes, projectsRes, skillsRes, experiencesRes] = await Promise.all([
          getPortfolio(activeId, token),
          getProjects(activeId, token).catch(() => ({ projects: [] })),
          getSkills(activeId, token).catch(() => ({ skills: [] })),
          getExperiences(activeId, token).catch(() => ({ experiences: [] })),
        ]);

        if (isMounted) {
          setPortfolio(portfolioRes.portfolio);
          const mappedViewData: PortfolioViewData = {
            name: portfolioRes.portfolio.name,
            title: portfolioRes.portfolio.title,
            about: portfolioRes.portfolio.about || null,
            email: portfolioRes.portfolio.email || null,
            phone: portfolioRes.portfolio.phone || null,
            location: portfolioRes.portfolio.location || null,
            profileImageUrl: portfolioRes.portfolio.profileImageUrl || null,
            socialLinks: portfolioRes.portfolio.socialLinks || {},
            username: portfolioRes.portfolio.username,
            projects: projectsRes.projects || [],
            skills: skillsRes.skills || [],
            experiences: experiencesRes.experiences || [],
            template: normalizedTemplateId,
          };
          setPortfolioViewData(mappedViewData);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError) {
            if (err.status === 404) {
              setErrorMessage("Portfolio not found.");
            } else if (err.status === 401) {
              setErrorMessage("Your session has expired. Please log in again.");
              router.replace("/login");
            } else {
              setErrorMessage(err.message || "Failed to load portfolio preview.");
            }
          } else {
            setErrorMessage("Unable to connect to the server. Please check your connection.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [token, isAuthenticated, rawIdParam, isTemplateValid, normalizedTemplateId, router]);

  // Handle template adoption
  const handleUseTemplate = async () => {
    if (!token || !portfolio || !isTemplateValid) return;

    setIsSaving(true);
    setSaveSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await updatePortfolio(
        portfolio.id,
        {
          name: portfolio.name,
          title: portfolio.title,
          username: portfolio.username,
          about: portfolio.about || undefined,
          email: portfolio.email || undefined,
          phone: portfolio.phone || undefined,
          location: portfolio.location || undefined,
          profileImageUrl: portfolio.profileImageUrl || undefined,
          socialLinks: portfolio.socialLinks || {},
          template: normalizedTemplateId as PortfolioTemplateId,
        },
        token
      );

      setPortfolio(res.portfolio);
      setSaveSuccessMessage(
        `"${TEMPLATE_REGISTRY[normalizedTemplateId as PortfolioTemplateId].meta.name}" has been applied to your portfolio!`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Failed to save template selection.");
      } else {
        setErrorMessage("Failed to save template due to a network connection error.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Template Not Found State
  if (!isTemplateValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9fd] px-4">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 shadow-sm text-center max-w-lg w-full">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <AlertCircleIcon className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#0f172a] mb-2">
            Template Not Found
          </h1>
          <p className="text-sm text-[#64748b] mb-6 leading-relaxed">
            The template identifier &ldquo;<code className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{rawTemplateId}</code>&rdquo; does not match any registered FolioCraft templates.
          </p>
          <Link
            href={`/portfolio/templates${rawIdParam ? `?id=${encodeURIComponent(rawIdParam)}` : ""}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm transition-all"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>Back to Template Gallery</span>
          </Link>
        </div>
      </div>
    );
  }

  const templateDef = TEMPLATE_REGISTRY[normalizedTemplateId as PortfolioTemplateId];
  const isSelected = portfolio?.template === normalizedTemplateId;

  // 2. Auth Loading State
  if (isAuthLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9fd]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <FolioCraftLogo className="w-12 h-12 rounded-xl shadow-md" />
          <div className="text-center">
            <h2 className="text-sm font-semibold text-[#0f172a] tracking-tight">
              Loading Portfolio Preview...
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">Verifying credentials</p>
          </div>
        </div>
      </div>
    );
  }

  const galleryBackUrl = `/portfolio/templates${
    portfolio?.id || rawIdParam
      ? `?id=${encodeURIComponent(portfolio?.id || rawIdParam || "")}`
      : ""
  }`;

  const editorBackUrl = portfolio?.id
    ? `/portfolio/edit/${portfolio.id}`
    : rawIdParam
    ? `/portfolio/edit/${rawIdParam}`
    : "/dashboard";

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9fd] selection:bg-[#f3f0ff] selection:text-[#6e56cf]">
      {/* Sticky Top Control Toolbar */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#eae6f5] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left Navigation and Template Info */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              href={galleryBackUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#475569] bg-[#f8f7fd] hover:bg-[#ede9f8] hover:text-[#0f172a] border border-[#eae6f5] transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] flex-shrink-0"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to Templates</span>
              <span className="sm:hidden">Templates</span>
            </Link>

            <div className="h-5 w-px bg-[#eae6f5] hidden sm:block flex-shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-tight truncate">
                  {templateDef.meta.name}
                </h1>
                {templateDef.meta.badge && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f3f0ff] text-[#6e56cf] border border-[#dcd3f8] flex-shrink-0">
                    <SparklesIcon className="w-2.5 h-2.5" />
                    <span>{templateDef.meta.badge}</span>
                  </span>
                )}
              </div>
              <p className="hidden md:block text-xs text-[#64748b] truncate">
                {templateDef.meta.description}
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link
              href={editorBackUrl}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8f7fd] transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf]"
            >
              Back to Editor
            </Link>

            {isSelected ? (
              <span
                data-testid="selected-current-template-badge"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 shadow-xs min-h-[40px]"
              >
                <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                <span>Current Template</span>
              </span>
            ) : (
              <button
                type="button"
                data-testid="preview-use-template-button"
                disabled={isSaving || !portfolio}
                onClick={handleUseTemplate}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md hover:shadow-[#6e56cf]/35 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2"
              >
                {isSaving ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <span>Use This Template</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Success Alert Banner inside Sticky Header */}
        {saveSuccessMessage && (
          <div className="bg-emerald-50 border-t border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={editorBackUrl}
                className="font-bold text-emerald-800 hover:text-emerald-950 underline"
              >
                Return to Editor &rarr;
              </Link>
              <button
                type="button"
                onClick={() => setSaveSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="bg-rose-50 border-t border-b border-rose-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-900">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircleIcon className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </header>

      {/* Main Full-Width Live Preview Container */}
      <main className="flex-1 w-full overflow-x-hidden">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-10 h-10 border-3 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin mb-4" />
            <h3 className="text-base font-bold text-[#0f172a]">
              Rendering {templateDef.meta.name}...
            </h3>
            <p className="text-xs text-[#64748b] mt-1">
              Loading your live portfolio data into this design.
            </p>
          </div>
        ) : !portfolio || !portfolioViewData ? (
          <div className="max-w-lg mx-auto my-20 p-8 bg-white rounded-3xl border border-[#eae6f5] text-center shadow-xs">
            <AlertCircleIcon className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0f172a] mb-1">
              No Portfolio to Preview
            </h3>
            <p className="text-xs text-[#64748b] mb-6">
              Create a portfolio first to preview it rendered with the {templateDef.meta.name} template.
            </p>
            <Link
              href="/portfolio/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm"
            >
              Create Portfolio
            </Link>
          </div>
        ) : (
          <div className="w-full">
            <TemplateRenderer
              templateId={normalizedTemplateId}
              data={portfolioViewData}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9fd]">
          <div className="w-10 h-10 border-3 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin mb-4" />
          <p className="text-xs font-semibold text-[#64748b]">Loading Template Preview...</p>
        </div>
      }
    >
      <TemplatePreviewContent params={params} />
    </Suspense>
  );
}
