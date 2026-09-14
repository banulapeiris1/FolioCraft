"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FolioCraftLogo } from "@/components/landing/icons";
import PortfolioForm from "@/components/portfolio/PortfolioForm";
import {
  BriefcaseIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "@/components/portfolio/PortfolioIcons";
import { getPortfolio, updatePortfolio, ApiError } from "@/lib/api";
import { Portfolio, PortfolioFormData } from "@/types/portfolio";

export default function EditPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const portfolioId = resolvedParams.id;

  const router = useRouter();
  const { user, token, isLoading, isAuthenticated, logout } = useAuth();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
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
        const response = await getPortfolio(portfolioId, token);
        if (isMounted) {
          setPortfolio(response.portfolio);
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

  const initialData: Partial<PortfolioFormData> = portfolio
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

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9fd] selection:bg-[#f3f0ff] selection:text-[#6e56cf]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-[#eae6f5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
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
            {/* Page Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold text-[#6e56cf] uppercase tracking-wider mb-3">
                  <BriefcaseIcon className="w-3.5 h-3.5" />
                  <span>Editing Mode</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a]">
                  Edit Portfolio Information
                </h1>
                <p className="mt-1.5 text-sm text-[#64748b] max-w-2xl">
                  Modify your personal profile, contact channels, public handle, and template theme.
                </p>
              </div>
              <div className="text-xs font-mono text-[#64748b] bg-white border border-[#eae6f5] px-3 py-1.5 rounded-xl self-start sm:self-auto">
                ID: {portfolioId}
              </div>
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

            {/* Portfolio Form in Edit Mode */}
            <PortfolioForm
              mode="edit"
              initialData={initialData}
              isSubmitting={isSubmitting}
              serverError={serverError}
              serverFieldErrors={serverFieldErrors}
              onSubmit={handleUpdate}
              onCancel={() => router.push("/dashboard")}
            />
          </>
        )}
      </main>
    </div>
  );
}
