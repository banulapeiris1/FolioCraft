"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FolioCraftLogo } from "@/components/landing/icons";
import { SparklesIcon, ShieldCheckIcon } from "@/components/auth/AuthIcons";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [showPortfolioNotice, setShowPortfolioNotice] = useState(false);

  // Protect route: Redirect unauthenticated users to /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Welcome Banner */}
        <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-xl shadow-[#6e56cf]/5 p-6 sm:p-10 relative overflow-hidden">
          {/* Ambient Glow */}
          <div
            className="absolute -top-20 -right-20 w-80 h-80 bg-[#6e56cf]/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold text-[#6e56cf] uppercase tracking-wider mb-4">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Authentication Verified</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0f172a]">
              Welcome, {user.name} 👋
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#475569]">
              <span className="font-mono bg-[#f8f7fd] border border-[#eae6f5] px-2.5 py-1 rounded-lg text-xs text-[#0f172a]">
                {user.email}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-[#10b981] font-semibold bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                Session Active
              </span>
            </div>

            <p className="mt-5 text-base text-[#475569] max-w-xl leading-relaxed">
              Your developer account is ready. Turn your CV into an interactive
              online portfolio with curated themes and automatic skill extraction.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5">
              <button
                type="button"
                onClick={() => setShowPortfolioNotice(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-md shadow-[#6e56cf]/25 hover:shadow-lg hover:shadow-[#6e56cf]/35 transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>+ Create Portfolio</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-[#475569] bg-[#f8f7fd] hover:bg-[#f1edf9] border border-[#eae6f5] transition-colors cursor-pointer"
              >
                <span>Sign Out</span>
              </button>
            </div>

            {/* Phase Notice Modal / Toast */}
            {showPortfolioNotice && (
              <div className="mt-6 p-4 rounded-2xl bg-[#f3f0ff] border border-[#dcd3f8] text-xs text-[#475569] flex items-start justify-between gap-4 animate-fadeIn">
                <div>
                  <h4 className="font-bold text-[#0f172a] mb-1">
                    🚀 Next Phase: CV-to-Portfolio Builder
                  </h4>
                  <p>
                    Authentication is active. The CV parsing engine, template
                    customizer, and public portfolio publishing pipeline are part
                    of the upcoming portfolio builder milestones.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPortfolioNotice(false)}
                  className="font-bold text-[#6e56cf] hover:text-[#5d46be] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

        {/* System Info Card */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#eae6f5] p-5 shadow-xs">
            <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
              Account ID
            </span>
            <p className="mt-1 font-mono text-xs text-[#0f172a] truncate" title={user.id}>
              {user.id}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#eae6f5] p-5 shadow-xs">
            <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
              Authentication Method
            </span>
            <p className="mt-1 text-xs font-medium text-[#0f172a]">
              JWT Bearer Session
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#eae6f5] p-5 shadow-xs">
            <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
              Database Sync
            </span>
            <p className="mt-1 text-xs font-medium text-[#10b981] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              PostgreSQL Verified
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
