import React from "react";
import Link from "next/link";
import { FolioCraftLogo } from "@/components/landing/icons";

export default function AuthBrandPanel() {
  return (
    <div className="relative flex flex-col justify-between h-full p-8 lg:p-12 xl:p-16 overflow-hidden bg-gradient-to-br from-[#faf8ff] via-[#f5f2fd] to-[#ede8fa] border-r border-[#eae6f5]">
      {/* Subtle background blur decoration */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 bg-[#6e56cf]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#9e7aff]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Header / Branding */}
      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/40 rounded-lg py-1 px-1.5 -ml-1.5 transition-colors"
          aria-label="FolioCraft Home"
        >
          <FolioCraftLogo className="w-8 h-8 rounded-lg shadow-sm transition-transform group-hover:scale-105" />
          <span className="text-xl font-bold tracking-tight text-[#0f172a] font-sans">
            Folio<span className="text-[#6e56cf]">Craft</span>
          </span>
          <span className="ml-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e56cf] bg-[#f3f0ff] border border-[#dcd3f8] px-2 py-0.5 rounded-full">
            v1.0
          </span>
        </Link>

        {/* Hero Copy */}
        <div className="mt-10 lg:mt-14 max-w-lg">
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#0f172a] tracking-tight leading-[1.15]">
            Your professional presence{" "}
            <span className="text-[#6e56cf] bg-gradient-to-r from-[#6e56cf] to-[#9e7aff] bg-clip-text text-transparent">
              starts here.
            </span>
          </h1>
          <p className="mt-4 text-[15px] sm:text-base text-[#475569] leading-relaxed">
            Turn your PDF resume into an interactive, hosted developer portfolio
            that captures recruiter attention and showcases your real-world
            engineering impact.
          </p>
        </div>

        {/* Interactive Live Portfolio Simulation Card */}
        <div className="mt-8 lg:mt-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-[#eae6f5] shadow-lg shadow-[#6e56cf]/5 p-5 transition-all hover:shadow-xl hover:shadow-[#6e56cf]/10">
          {/* Card Top Header */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#f1edf9]">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f87171]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#34d399]/70" />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8]/60 text-[11px] font-semibold text-[#6e56cf]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
              </span>
              <span>Live Preview</span>
            </div>
          </div>

          {/* Profile Row */}
          <div className="flex items-start gap-3.5">
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#6e56cf] to-[#9e7aff] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              AC
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#10b981] border-2 border-white flex items-center justify-center"
                title="Active"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-[#0f172a] truncate">
                  Alex Chen
                </h3>
                <span
                  className="inline-flex items-center text-[#6e56cf]"
                  title="Verified Profile"
                >
                  <svg
                    className="w-4 h-4 fill-current"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[#6e56cf]">
                Full-Stack Developer{" "}
                <span className="text-[#94a3b8] font-normal normal-case">
                  • San Francisco, CA
                </span>
              </p>
            </div>
          </div>

          <p className="mt-3 text-[13px] text-[#475569] leading-relaxed line-clamp-2">
            Crafting resilient cloud architectures and fluid web apps with
            TypeScript, Next.js, and distributed backend systems.
          </p>

          {/* Skill Tag Chips */}
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {["React", "TypeScript", "Node.js", "PostgreSQL"].map((skill) => (
              <span
                key={skill}
                className="text-[11px] font-medium text-[#475569] bg-[#f8f7fc] border border-[#eae6f5] px-2.5 py-0.5 rounded-md"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Impact Metric Banner */}
          <div className="mt-4 pt-3 border-t border-[#f1edf9] flex items-center justify-between text-[12px]">
            <span className="text-[#64748b] font-medium">Recruiter Impact</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-full">
              ⚡ +94% response rate
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Trust Indicators */}
      <div className="relative z-10 mt-10 pt-6 border-t border-[#eae6f5]/70 flex items-center gap-3.5">
        <div className="flex -space-x-2 overflow-hidden" aria-hidden="true">
          <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-[#6e56cf] text-[11px] font-bold text-white flex items-center justify-center">
            JD
          </div>
          <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-[#3b82f6] text-[11px] font-bold text-white flex items-center justify-center">
            SK
          </div>
          <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-[#10b981] text-[11px] font-bold text-white flex items-center justify-center">
            MR
          </div>
        </div>
        <p className="text-[13px] text-[#475569] font-medium">
          Trusted by{" "}
          <span className="font-semibold text-[#0f172a]">2,400+ developers</span>{" "}
          from top engineering teams.
        </p>
      </div>
    </div>
  );
}
