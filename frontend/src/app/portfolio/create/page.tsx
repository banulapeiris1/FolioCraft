"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FolioCraftLogo } from "@/components/landing/icons";
import PortfolioForm from "@/components/portfolio/PortfolioForm";
import { SparklesIcon } from "@/components/portfolio/PortfolioIcons";

export default function CreatePortfolioPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9fd]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <FolioCraftLogo className="w-12 h-12 rounded-xl shadow-md" />
          <div className="text-center">
            <h2 className="text-sm font-semibold text-[#0f172a] tracking-tight">
              Loading Portfolio Studio...
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
              New Portfolio
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
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold text-[#6e56cf] uppercase tracking-wider mb-3">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Portfolio Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a]">
            Create Your Portfolio
          </h1>
          <p className="mt-1.5 text-sm text-[#64748b] max-w-2xl">
            Configure your basic professional information, contact channels, public URL handle, and visual theme.
          </p>
        </div>

        {/* Portfolio Form in Create Mode */}
        <PortfolioForm
          mode="create"
          initialData={{
            name: user.name || "",
            email: user.email || "",
            template: "modern",
          }}
          onCancel={() => router.push("/dashboard")}
        />
      </main>
    </div>
  );
}
