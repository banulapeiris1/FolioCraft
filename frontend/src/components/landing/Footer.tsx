import React from "react";
import { FolioCraftLogo, GithubIcon } from "./icons";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-[#eae6f5] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Brand & Copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <FolioCraftLogo className="w-6 h-6 rounded-md" />
            <span className="font-bold text-sm tracking-tight text-[#0f172a]">
              Folio<span className="text-[#6e56cf]">Craft</span>
            </span>
          </div>
          <span className="hidden sm:inline text-slate-300">|</span>
          <p className="text-xs text-[#64748b]">
            &copy; {currentYear} FolioCraft. All rights reserved.
          </p>
        </div>

        {/* Right: Navigation & Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-[#64748b]">
          <a
            href="#documentation"
            className="hover:text-[#0f172a] transition-colors"
          >
            Documentation
          </a>
          <a
            href="#templates"
            className="hover:text-[#0f172a] transition-colors"
          >
            Templates
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[#0f172a] transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
          <a
            href="#privacy"
            className="hover:text-[#0f172a] transition-colors"
          >
            Privacy
          </a>
          <a
            href="#terms"
            className="hover:text-[#0f172a] transition-colors"
          >
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
