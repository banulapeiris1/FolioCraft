"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FolioCraftLogo } from "@/components/landing/icons";
import {
  AlertCircleIcon,
  PencilIcon,
  ArrowLeftIcon,
  SparklesIcon,
} from "@/components/portfolio/PortfolioIcons";
import {
  getPortfolio,
  getProjects,
  getSkills,
  getExperiences,
  ApiError,
} from "@/lib/api";
import { PortfolioTemplateId } from "@/types/portfolio";
import { PortfolioViewData, mapDraftToPortfolioViewData } from "@/templates/types";
import { PreviewShell } from "@/components/portfolio/PreviewShell";

function StandalonePreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portfolioId = searchParams.get("id");

  const { user, token, isLoading: isAuthLoading, isAuthenticated, logout } = useAuth();

  const [viewData, setViewData] = useState<PortfolioViewData | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(portfolioId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<PortfolioTemplateId>("modern");

  // Derive missing ID error without cascading effect render
  const missingIdError = !portfolioId && !isAuthLoading ? "No portfolio ID provided in the URL." : null;
  const effectiveError = errorMessage || missingIdError;

  // Authentication guard
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Load portfolio data
  useEffect(() => {
    let isMounted = true;
    if (!token || !portfolioId) {
      return;
    }

    const loadData = async () => {
      try {
        const [portfolioRes, projectsRes, skillsRes, experiencesRes] = await Promise.all([
          getPortfolio(portfolioId, token),
          getProjects(portfolioId, token).catch(() => ({ projects: [] })),
          getSkills(portfolioId, token).catch(() => ({ skills: [] })),
          getExperiences(portfolioId, token).catch(() => ({ experience: [], experiences: [] })),
        ]);

        if (isMounted) {
          const loadedPort = portfolioRes.portfolio;
          const exps =
            "experiences" in experiencesRes && Array.isArray(experiencesRes.experiences)
              ? experiencesRes.experiences
              : "experience" in experiencesRes && Array.isArray(experiencesRes.experience)
              ? experiencesRes.experience
              : [];

          const tpl = (loadedPort.template || "modern") as PortfolioTemplateId;
          setActiveTemplate(tpl);

          const mapped = mapDraftToPortfolioViewData(
            {
              name: loadedPort.name,
              title: loadedPort.title,
              about: loadedPort.about || "",
              email: loadedPort.email || "",
              phone: loadedPort.phone || "",
              location: loadedPort.location || "",
              profileImageUrl: loadedPort.profileImageUrl || "",
              socialLinks: loadedPort.socialLinks || {},
              username: loadedPort.username,
              template: tpl,
            },
            {
              projects: projectsRes.projects || [],
              skills: skillsRes.skills || [],
              experiences: exps,
            }
          );
          setViewData(mapped);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError) {
            if (err.status === 404) {
              setErrorMessage("Portfolio not found. It may have been deleted or you do not have permission to view it.");
            } else if (err.status === 401) {
              router.replace("/login");
            } else {
              setErrorMessage(err.message || "Failed to load portfolio.");
            }
          } else {
            setErrorMessage("Unable to connect to the server. Please check your internet connection.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [portfolioId, token, isAuthLoading, router]);

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

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9fd] selection:bg-[#f3f0ff] selection:text-[#6e56cf]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-[#eae6f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 p-1.5 rounded-xl text-[#475569] hover:text-[#0f172a] hover:bg-[#f8f7fd] border border-transparent hover:border-[#eae6f5] transition-all"
              aria-label="Back to Dashboard"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-[#eae6f5]" />
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <FolioCraftLogo className="w-8 h-8 rounded-lg shadow-xs group-hover:scale-105 transition-transform" />
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-[#0f172a] leading-none">
                  FolioCraft
                </span>
                <span className="text-[10px] font-bold text-[#6e56cf] uppercase tracking-wider mt-0.5">
                  Portfolio Preview
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            {portfolioId && (
              <Link
                href={`/portfolio/edit/${encodeURIComponent(portfolioId)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm transition-all"
              >
                <PencilIcon className="w-3.5 h-3.5" />
                <span>Edit Portfolio</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="text-xs font-semibold text-[#64748b] hover:text-[#dc2626] px-3.5 py-1.5 rounded-xl border border-[#eae6f5] hover:border-[#fecaca] hover:bg-[#fef2f2] transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-[#eae6f5] shadow-xs">
            <div className="w-10 h-10 border-3 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin mb-4" />
            <h3 className="text-base font-bold text-[#0f172a]">Loading Portfolio Preview...</h3>
            <p className="text-xs text-[#64748b] mt-1">Preparing responsive viewport frames.</p>
          </div>
        ) : effectiveError ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 shadow-sm text-center max-w-lg mx-auto mt-8">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
              <AlertCircleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a] mb-2">Unable to Preview Portfolio</h3>
            <p className="text-sm text-[#64748b] mb-6 leading-relaxed">{effectiveError}</p>
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
        ) : viewData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">
                  {viewData.name || "Untitled Portfolio"}
                </h1>
                <p className="text-xs text-[#64748b]">
                  {viewData.title || "Full Stack Developer"} &bull; {viewData.username ? `@${viewData.username}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/portfolio/templates?id=${encodeURIComponent(portfolioId || "")}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#eae4fc] border border-[#dcd3f8] transition-all"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>Switch Theme</span>
                </Link>
              </div>
            </div>

            <PreviewShell
              data={viewData}
              templateId={activeTemplate}
              portfolioId={portfolioId || undefined}
              onTemplateChange={(tpl) => {
                setActiveTemplate(tpl);
                setViewData((prev) => (prev ? { ...prev, template: tpl } : null));
              }}
              className="min-h-[750px]"
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function PortfolioPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#faf9fd]">
          <div className="w-8 h-8 border-3 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin" />
        </div>
      }
    >
      <StandalonePreviewContent />
    </Suspense>
  );
}
