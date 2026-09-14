import React from "react";
import Link from "next/link";
import AuthBrandPanel from "./AuthBrandPanel";
import { FolioCraftLogo } from "@/components/landing/icons";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf9fd] selection:bg-[#f3f0ff] selection:text-[#6e56cf]">
      {/* Mobile-only Top Bar */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#eae6f5] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <Link
          href="/"
          className="flex items-center gap-2 group"
          aria-label="FolioCraft Home"
        >
          <FolioCraftLogo className="w-7 h-7 rounded-lg shadow-xs" />
          <span className="text-lg font-bold tracking-tight text-[#0f172a]">
            Folio<span className="text-[#6e56cf]">Craft</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6e56cf] bg-[#f3f0ff] border border-[#dcd3f8] px-1.5 py-0.2 rounded-full">
            v1.0
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-[#6e56cf] hover:text-[#5d46be] transition-colors"
        >
          Back to home
        </Link>
      </div>

      {/* Main Split Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Left Branding Panel (Desktop lg: 5 cols, xl: 5 cols) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-5 relative">
          <AuthBrandPanel />
        </div>

        {/* Right Form Area (Desktop lg: 7 cols, xl: 7 cols) */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto">
          {/* Top Desktop Back Link */}
          <div className="hidden lg:flex justify-end mb-4">
            <Link
              href="/"
              className="text-xs font-semibold text-[#64748b] hover:text-[#6e56cf] transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#f3f0ff]"
            >
              <span>← Back to home</span>
            </Link>
          </div>

          {/* Centered Form */}
          <div className="my-auto flex items-center justify-center py-6">
            {children}
          </div>

          {/* Footer Copyright and Legal links */}
          <footer className="mt-8 pt-6 border-t border-[#eae6f5]/80 text-center text-xs text-[#94a3b8] flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span>© {new Date().getFullYear()} FolioCraft. All rights reserved.</span>
            <span className="hidden sm:inline" aria-hidden="true">•</span>
            <span className="hover:text-[#6e56cf] transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hidden sm:inline" aria-hidden="true">•</span>
            <span className="hover:text-[#6e56cf] transition-colors cursor-pointer">
              Terms of Service
            </span>
            <span className="hidden sm:inline" aria-hidden="true">•</span>
            <span className="hover:text-[#6e56cf] transition-colors cursor-pointer">
              Help & Support
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
