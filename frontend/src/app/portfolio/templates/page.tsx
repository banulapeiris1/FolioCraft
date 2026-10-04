"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FolioCraftLogo } from "@/components/landing/icons";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  SparklesIcon,
  BriefcaseIcon,
  PlusIcon,
} from "@/components/portfolio/PortfolioIcons";
import { TemplateGallery } from "@/components/portfolio/TemplateGallery";
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
import { getTemplateDefinition, isValidTemplateId } from "@/templates/registry";

function TemplatesGalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawIdParam = searchParams.get("id");

  const { user, token, isLoading: isAuthLoading, isAuthenticated, logout } = useAuth();

  const [portfoliosList, setPortfoliosList] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(rawIdParam);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioViewData, setPortfolioViewData] = useState<PortfolioViewData | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savingTemplateId, setSavingTemplateId] = useState<PortfolioTemplateId | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Protect route
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Sync state if URL query param changes
  useEffect(() => {
    if (rawIdParam && rawIdParam !== selectedPortfolioId) {
      setSelectedPortfolioId(rawIdParam);
    }
  }, [rawIdParam, selectedPortfolioId]);

  // Load portfolio data
  useEffect(() => {
    let isMounted = true;
    if (!token || !isAuthenticated) return;

    const loadData = async () => {
      setIsLoadingData(true);
      setErrorMessage(null);

      try {
        let activeId = selectedPortfolioId;

        // If no ID in query params, fetch user's portfolios and pick the first one
        if (!activeId) {
          const listRes = await getPortfolios(token);
          if (isMounted) {
            setPortfoliosList(listRes.portfolios || []);
          }

          if (listRes.portfolios && listRes.portfolios.length > 0) {
            activeId = listRes.portfolios[0].id;
            if (isMounted) {
              setSelectedPortfolioId(activeId);
            }
          } else {
            // No portfolios exist for user
            if (isMounted) {
              setIsLoadingData(false);
            }
            return;
          }
        } else {
          // Fetch portfolios list in background to populate switcher if needed
          void getPortfolios(token).then((res) => {
            if (isMounted) {
              setPortfoliosList(res.portfolios || []);
            }
          }).catch(() => {});
        }

        // Fetch portfolio and related collections concurrently
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
            template: portfolioRes.portfolio.template || "modern",
          };
          setPortfolioViewData(mappedViewData);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError) {
            if (err.status === 404) {
              setErrorMessage("Portfolio not found. It may have been deleted or moved.");
            } else if (err.status === 401) {
              setErrorMessage("Your session has expired. Please log in again.");
              router.replace("/login");
            } else {
              setErrorMessage(err.message || "Failed to load portfolio details.");
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
  }, [token, isAuthenticated, selectedPortfolioId, router]);

  // Handle template selection & persistence
  const handleSelectTemplate = async (templateId: PortfolioTemplateId) => {
    if (!token || !portfolio || !selectedPortfolioId) return;

    setIsSaving(true);
    setSavingTemplateId(templateId);
    setSaveSuccessMessage(null);
    setErrorMessage(null);

    try {
      const templateDef = getTemplateDefinition(templateId);
      const res = await updatePortfolio(
        selectedPortfolioId,
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
          template: templateId,
        },
        token
      );

      setPortfolio(res.portfolio);
      setPortfolioViewData((prev) =>
        prev
          ? {
              ...prev,
              template: res.portfolio.template || templateId,
            }
          : null
      );
      setSaveSuccessMessage(
        `Template updated to "${templateDef.meta.name}"! Your portfolio will now render with this theme.`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Failed to update portfolio template.");
      } else {
        setErrorMessage("Failed to update template due to a network connection error.");
      }
    } finally {
      setIsSaving(false);
      setSavingTemplateId(null);
    }
  };

  // Switch active portfolio
  const handleSwitchPortfolio = (newId: string) => {
    startTransition(() => {
      setSelectedPortfolioId(newId);
      router.push(`/portfolio/templates?id=${encodeURIComponent(newId)}`);
    });
  };

  // Auth loading state
  if (isAuthLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9fd]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <FolioCraftLogo className="w-12 h-12 rounded-xl shadow-md" />
          <div className="text-center">
            <h2 className="text-sm font-semibold text-[#0f172a] tracking-tight">
              Loading Template Gallery...
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">Verifying credentials</p>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9fd] selection:bg-[#f3f0ff] selection:text-[#6e56cf]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-[#eae6f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
            {selectedPortfolioId && (
              <>
                <span className="text-[#cbd5e1] font-light">/</span>
                <Link
                  href={`/portfolio/edit/${selectedPortfolioId}`}
                  className="text-xs font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors"
                >
                  Edit Portfolio
                </Link>
              </>
            )}
            <span className="text-[#cbd5e1] font-light">/</span>
            <span className="text-xs font-semibold text-[#6e56cf]">
              Templates
            </span>
          </div>

          <div className="flex items-center gap-3">
            {selectedPortfolioId && (
              <Link
                href={`/portfolio/edit/${selectedPortfolioId}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#475569] bg-[#f8f7fd] hover:bg-[#ede9f8] hover:text-[#0f172a] border border-[#eae6f5] transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf]"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                <span>Back to Editor</span>
              </Link>
            )}
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

      {/* Main Gallery Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {isLoadingData ? (
          /* Loading State */
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-[#eae6f5] shadow-xs">
            <div className="w-10 h-10 border-3 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin mb-4" />
            <h3 className="text-base font-bold text-[#0f172a]">
              Loading Template Gallery...
            </h3>
            <p className="text-xs text-[#64748b] mt-1">
              Preparing real portfolio data and template previews.
            </p>
          </div>
        ) : errorMessage ? (
          /* Error State */
          <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 shadow-sm text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
              <AlertCircleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a] mb-2">
              Unable to Load Templates
            </h3>
            <p className="text-sm text-[#64748b] mb-6 leading-relaxed">
              {errorMessage}
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
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#475569] bg-[#f8f7fd] hover:bg-[#f1edf9] border border-[#eae6f5] transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : !portfolio || !portfolioViewData ? (
          /* No Portfolios Created Yet */
          <div className="bg-white rounded-3xl border border-[#eae6f5] p-10 sm:p-14 shadow-xs text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf] mx-auto mb-4">
              <BriefcaseIcon className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[#0f172a] mb-2">
              No Portfolios Found
            </h2>
            <p className="text-sm text-[#64748b] mb-6 leading-relaxed">
              Create a portfolio first to preview templates using your real career profile, projects, and skills.
            </p>
            <Link
              href="/portfolio/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-md shadow-[#6e56cf]/25 transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Your First Portfolio</span>
            </Link>
          </div>
        ) : (
          /* Main Loaded Gallery */
          <>
            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold text-[#6e56cf] uppercase tracking-wider mb-3">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>Design Collection</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0f172a]">
                  Choose a Portfolio Template
                </h1>
                <p className="mt-2 text-sm sm:text-base text-[#64748b] max-w-2xl leading-relaxed">
                  Browse FolioCraft&apos;s curated portfolio themes. Every card renders a live preview of your actual career content in real time.
                </p>
              </div>

              {/* Portfolio Switcher (if user owns multiple portfolios) */}
              {portfoliosList.length > 1 && (
                <div className="bg-white p-3 rounded-2xl border border-[#eae6f5] shadow-xs flex flex-col gap-1 min-w-[240px]">
                  <label htmlFor="portfolio-switcher" className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Previewing Portfolio:
                  </label>
                  <select
                    id="portfolio-switcher"
                    value={portfolio.id}
                    onChange={(e) => handleSwitchPortfolio(e.target.value)}
                    className="text-xs font-semibold text-[#0f172a] bg-[#faf9fd] border border-[#eae6f5] rounded-xl px-3 py-2 min-h-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf]"
                  >
                    {portfoliosList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (@{p.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Success Feedback Alert Banner */}
            {saveSuccessMessage && (
              <div
                role="status"
                className="mb-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5 flex items-center justify-between gap-4 animate-fadeIn"
              >
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">Template Changed</h4>
                    <p className="text-xs text-emerald-800 mt-0.5">{saveSuccessMessage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/portfolio/edit/${portfolio.id}`}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 transition-colors min-h-[36px] inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    Back to Editor
                  </Link>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => setSaveSuccessMessage(null)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1.5 min-h-[36px] cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Reusable Template Gallery Component */}
            <TemplateGallery
              currentTemplate={(portfolio.template as PortfolioTemplateId) || "modern"}
              portfolioData={portfolioViewData}
              portfolioId={portfolio.id}
              onSelectTemplate={handleSelectTemplate}
              isSaving={isSaving}
              savingTemplateId={savingTemplateId}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default function TemplatesGalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9fd]">
          <div className="w-10 h-10 border-3 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin mb-4" />
          <p className="text-xs font-semibold text-[#64748b]">Loading Template Gallery...</p>
        </div>
      }
    >
      <TemplatesGalleryContent />
    </Suspense>
  );
}
