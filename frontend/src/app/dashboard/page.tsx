"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FolioCraftLogo } from "@/components/landing/icons";
import PortfolioCard from "@/components/portfolio/PortfolioCard";
import PublishModal from "@/components/portfolio/PublishModal";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import PortfolioGridSkeleton from "@/components/dashboard/PortfolioGridSkeleton";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats, { DashboardStatsSkeleton } from "@/components/dashboard/DashboardStats";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardNotice from "@/components/dashboard/DashboardNotice";
import DeletePortfolioDialog from "@/components/portfolio/DeletePortfolioDialog";
import { deletePortfolio, getPortfolios } from "@/lib/api";
import {
  classifyApiError,
  performPortfolioDelete,
  computeDashboardStats,
  getFirstName,
  type ClassifiedApiError,
} from "@/lib/dashboard";
import { LOGIN_SESSION_EXPIRED_PATH } from "@/lib/authSession";
import { Portfolio, PortfoliosResponse } from "@/types/portfolio";

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    token,
    isLoading,
    isAuthenticated,
    isServiceUnavailable,
    logout,
    retrySession,
  } = useAuth();
  // DASH-02: set when the API rejects the token mid-session (401)
  const [sessionExpired, setSessionExpired] = useState(false);

  // Portfolio state
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoadingPortfolios, setIsLoadingPortfolios] = useState(true);
  const [portfoliosError, setPortfoliosError] = useState<ClassifiedApiError | null>(null);
  const [selectedPortfolioForPublish, setSelectedPortfolioForPublish] =
    useState<Portfolio | null>(null);

  // DASH-05: deletion state
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const deleteInFlightRef = useRef(false);

  // DASH-03: summary statistics derived from the single portfolio list
  // response; publish/unpublish updates flow through handlePortfolioUpdated.
  const stats = useMemo(() => computeDashboardStats(portfolios), [portfolios]);
  const isEmptyWorkspace =
    !isLoadingPortfolios && !portfoliosError && portfolios.length === 0;

  const handlePortfolioUpdated = (updatedPortfolio: Portfolio) => {
    setPortfolios((prev) =>
      prev.map((p) => (p.id === updatedPortfolio.id ? updatedPortfolio : p))
    );
    if (selectedPortfolioForPublish?.id === updatedPortfolio.id) {
      setSelectedPortfolioForPublish(updatedPortfolio);
    }
  };

  // Protect route: Redirect unauthenticated users to /login.
  // DASH-02: an unreachable API is not a logout, so stay and show the
  // service-unavailable state; an expired session carries a reason.
  useEffect(() => {
    if (isLoading || isAuthenticated || isServiceUnavailable) return;
    router.replace(sessionExpired ? LOGIN_SESSION_EXPIRED_PATH : "/login");
  }, [isLoading, isAuthenticated, isServiceUnavailable, sessionExpired, router]);

  /**
   * Shared result handlers for the initial fetch and Retry (DASH-02).
   */
  const handlePortfoliosLoaded = useCallback((data: PortfoliosResponse) => {
    setPortfolios(data.portfolios || []);
    setPortfoliosError(null);
    setIsLoadingPortfolios(false);
  }, []);

  const handlePortfoliosFailed = useCallback(
    (err: unknown) => {
      const classified = classifyApiError(err);
      if (classified.kind === "auth") {
        // Token rejected: end the session; the route guard redirects
        // to /login with the session-expired notice.
        setSessionExpired(true);
        logout();
        return;
      }
      setPortfoliosError(classified);
      setIsLoadingPortfolios(false);
    },
    [logout]
  );

  // Fetch portfolios on authentication
  useEffect(() => {
    if (!token) return;
    let active = true;
    getPortfolios(token).then(
      (data) => {
        if (active) handlePortfoliosLoaded(data);
      },
      (err: unknown) => {
        if (active) handlePortfoliosFailed(err);
      }
    );
    return () => {
      active = false;
    };
  }, [token, handlePortfoliosLoaded, handlePortfoliosFailed]);

  const handleRetry = () => {
    if (!token) return;
    setIsLoadingPortfolios(true);
    setPortfoliosError(null);
    getPortfolios(token).then(handlePortfoliosLoaded, handlePortfoliosFailed);
  };

  // DASH-05: auto-dismiss action feedback after a few seconds
  useEffect(() => {
    if (!notice) return;
    const timeoutId = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timeoutId);
  }, [notice]);

  /** Removes a portfolio locally; stats update via the derived useMemo. */
  const removePortfolioLocally = (id: string) => {
    setPortfolios((prev) => prev.filter((p) => p.id !== id));
    setSelectedPortfolioForPublish((prev) => (prev?.id === id ? null : prev));
  };

  const openDeleteDialog = (portfolio: Portfolio) => {
    setDeleteError(null);
    setDeleteTarget(portfolio);
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    // No repeated submissions: the ref blocks double clicks within one render,
    // isDeleting disables the dialog's buttons for subsequent renders.
    if (!deleteTarget || !token || deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;
    const target = deleteTarget;
    setIsDeleting(true);
    setDeleteError(null);
    const outcome = await performPortfolioDelete(target.id, token, deletePortfolio);
    deleteInFlightRef.current = false;
    setIsDeleting(false);

    switch (outcome.kind) {
      case "deleted":
        removePortfolioLocally(target.id);
        closeDeleteDialog();
        setNotice(`"${target.title}" was permanently deleted.`);
        break;
      case "already-deleted":
        removePortfolioLocally(target.id);
        closeDeleteDialog();
        setNotice(`"${target.title}" had already been deleted.`);
        break;
      case "session-expired":
        // Same path as DASH-02: end the session; the guard redirects with a notice
        closeDeleteDialog();
        setSessionExpired(true);
        logout();
        break;
      case "error":
        setDeleteError(outcome.message);
        break;
    }
  };

  // DASH-02: stored session exists but the API could not be reached
  if (!isLoading && !isAuthenticated && isServiceUnavailable) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-[#faf9fd] px-4">
        <FolioCraftLogo className="w-12 h-12 rounded-xl shadow-md" />
        <div className="w-full max-w-lg">
          <DashboardErrorState
            kind="network"
            context="session"
            onRetry={() => void retrySession()}
          />
        </div>
      </div>
    );
  }

  // Loading state during auth restoration to prevent unauthenticated flash
  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9fd]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <FolioCraftLogo className="w-12 h-12 rounded-xl shadow-md" />
          <div className="text-center">
            <h2 className="text-sm font-semibold text-[#0f172a] tracking-tight">
              Loading your workspace...
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5">
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

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9fd] selection:bg-[#f3f0ff] selection:text-[#6e56cf]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-[#eae6f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label="FolioCraft Home"
          >
            <FolioCraftLogo className="w-8 h-8 rounded-lg shadow-sm transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold tracking-tight text-[#0f172a] font-sans">
              Folio<span className="text-[#6e56cf]">Craft</span>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6e56cf] bg-[#f3f0ff] border border-[#dcd3f8] px-2 py-0.5 rounded-full">
              Workspace
            </span>
          </Link>

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

      {/* Main Authenticated Workspace Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Workspace Header & Summary Stats (DASH-03) */}
        <DashboardHeader
          firstName={getFirstName(user.name)}
          showCreateAction={!isEmptyWorkspace}
        >
          {isLoadingPortfolios ? (
            <DashboardStatsSkeleton />
          ) : !portfoliosError && portfolios.length > 0 ? (
            <DashboardStats stats={stats} />
          ) : null}
        </DashboardHeader>

        {/* Your Portfolios Section */}
        <section aria-labelledby="portfolios-heading" className="mt-8 sm:mt-10">
          <div className="mb-5">
            <h2
              id="portfolios-heading"
              tabIndex={-1}
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] focus:outline-none"
            >
              Your Portfolios
            </h2>
            <p className="text-xs sm:text-sm text-[#64748b] mt-0.5">
              Manage, edit, and preview your existing developer portfolios.
            </p>
          </div>

          {/* DASH-05: action feedback (polite live region) */}
          <DashboardNotice message={notice} onDismiss={() => setNotice(null)} />

          {/* Loading Skeleton State */}
          {isLoadingPortfolios ? (
            <PortfolioGridSkeleton />
          ) : portfoliosError ? (
            /* Error State (DASH-02: classified network / server / generic) */
            <DashboardErrorState
              kind={portfoliosError.kind}
              detail={portfoliosError.detail}
              onRetry={handleRetry}
            />
          ) : portfolios.length === 0 ? (
            /* Empty State (DASH-03) */
            <DashboardEmptyState />
          ) : (
            /* Responsive Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {portfolios.map((portfolio) => (
                <PortfolioCard
                  key={portfolio.id}
                  portfolio={portfolio}
                  onPublishClick={(p) => setSelectedPortfolioForPublish(p)}
                  onDeleteClick={openDeleteDialog}
                />
              ))}
            </div>
          )}
        </section>

        {/* DASH-05: Delete confirmation */}
        {deleteTarget && token && (
          <DeletePortfolioDialog
            portfolio={deleteTarget}
            isDeleting={isDeleting}
            error={deleteError}
            onConfirm={() => void handleConfirmDelete()}
            onCancel={closeDeleteDialog}
            fallbackFocusId="portfolios-heading"
          />
        )}

        {/* Publish & Public URL Management Modal */}
        {selectedPortfolioForPublish && token && (
          <PublishModal
            isOpen={Boolean(selectedPortfolioForPublish)}
            onClose={() => setSelectedPortfolioForPublish(null)}
            portfolio={selectedPortfolioForPublish}
            token={token}
            onPortfolioUpdated={handlePortfolioUpdated}
          />
        )}
      </main>
    </div>
  );
}
