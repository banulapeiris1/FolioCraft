import React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  CodeIcon,
  FileTextIcon,
  FolioCraftLogo,
  GlobeIcon,
  PaletteIcon,
  SparklesIcon,
  UploadCloudIcon,
} from "./icons";

export default function Hero() {
  return (
    <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden bg-grid-pattern">
      {/* Background ambient gradient blurs */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#6e56cf]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 left-1/3 -translate-x-1/2 w-[300px] h-[200px] bg-[#9e7aff]/10 rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Copy Content */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold text-[#6e56cf] shadow-xs">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>CV to Portfolio in Minutes</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-6xl font-bold tracking-tight text-[#0f172a] leading-[1.12]">
            Turn your CV into a portfolio.
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-[#475569] leading-relaxed max-w-2xl mx-auto">
            Upload your CV, review the extracted information, choose a
            professional style, and publish your portfolio in minutes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-md shadow-[#6e56cf]/25 hover:shadow-lg hover:shadow-[#6e56cf]/30 transition-all active:scale-[0.98]"
            >
              <span>Create my portfolio</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>

            <a
              href="#editor-preview"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-[#334155] bg-white hover:bg-[#f8f7fd] border border-[#e2ddf3] shadow-xs transition-all hover:border-[#cfc6eb]"
            >
              <span>See how it works</span>
            </a>
          </div>

          {/* Micro-copy */}
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#64748b] pt-1">
            <CheckIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
            <span>No design skills required</span>
            <span className="text-slate-300">•</span>
            <span>Free to start</span>
          </div>
        </div>

        {/* Product Transformation Visual Mockup */}
        <div className="mt-14 max-w-5xl mx-auto">
          <div className="relative rounded-2xl bg-white/90 border border-[#eae6f5] p-5 sm:p-7 shadow-xl shadow-[#6e56cf]/5 backdrop-blur-xs">
            {/* Header toolbar simulation */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#f1edf9]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-xs font-mono text-[#64748b]">
                  foliocraft.dev / transformation-preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f3f0ff] text-[#6e56cf] border border-[#e3dcf7]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6e56cf] animate-pulse" />
                  Live Preview Mode
                </span>
              </div>
            </div>

            {/* Split Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
              {/* LEFT CARD: CV / Resume */}
              <div className="lg:col-span-5 rounded-xl bg-[#fbfaff] border border-[#eae6f5] p-4 sm:p-5 shadow-xs transition-all hover:border-[#d9d2f2]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#f1edf9]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f0ecfc] flex items-center justify-center text-[#6e56cf]">
                      <FileTextIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0f172a]">
                        CV / Resume Source
                      </p>
                      <p className="text-[11px] font-mono text-[#64748b]">
                        Alex_Chen_CV.pdf
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Detected
                  </span>
                </div>

                {/* Simulated Parsed CV Content */}
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">
                      Candidate Info
                    </span>
                    <p className="font-semibold text-[#0f172a] text-sm mt-0.5">
                      Alex Chen
                    </p>
                    <p className="text-[#64748b]">
                      Full-Stack Developer • San Francisco, CA
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#f1edf9]">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">
                      Detected Skills (18)
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {["React", "TypeScript", "Node.js", "PostgreSQL", "Next.js", "Docker"].map(
                        (skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded bg-white text-[#334155] border border-[#e2ddf3] text-[11px] font-mono"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#f1edf9]">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">
                      Extracted Experience
                    </span>
                    <div className="mt-1 space-y-1">
                      <div className="flex justify-between text-[#334155] font-medium">
                        <span>Senior Frontend Engineer</span>
                        <span className="text-[11px] text-[#94a3b8]">
                          2022 — Present
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748b] line-clamp-1">
                        TechFlow Solutions • Lead web applications & component library.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#f1edf9]">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">
                      Education
                    </span>
                    <p className="text-[#334155] font-medium mt-0.5">
                      B.S. in Computer Science
                    </p>
                    <p className="text-[11px] text-[#64748b]">
                      University of California • 2018 — 2022
                    </p>
                  </div>
                </div>
              </div>

              {/* CENTER: Transformation Indicator */}
              <div className="lg:col-span-1 flex flex-col items-center justify-center my-2 lg:my-0">
                <div className="w-11 h-11 rounded-full bg-[#6e56cf] text-white flex items-center justify-center shadow-md shadow-[#6e56cf]/30 ring-4 ring-[#f3f0ff]">
                  <FolioCraftLogo className="w-6 h-6" />
                </div>
                <div className="hidden lg:flex flex-col items-center mt-2">
                  <span className="text-[10px] font-bold text-[#6e56cf] uppercase tracking-wider">
                    Transform
                  </span>
                  <div className="w-px h-6 bg-gradient-to-b from-[#6e56cf] to-transparent mt-1" />
                </div>
              </div>

              {/* RIGHT CARD: Professional Portfolio Preview */}
              <div className="lg:col-span-5 rounded-xl bg-white border border-[#eae6f5] p-4 sm:p-5 shadow-md shadow-[#6e56cf]/5 hover:border-[#6e56cf]/40 transition-all">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#f1edf9]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                    <span className="text-xs font-bold text-[#0f172a]">
                      Generated Portfolio Preview
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-[#6e56cf] bg-[#f3f0ff] border border-[#e3dcf7] px-2 py-0.5 rounded">
                    Modern Style
                  </span>
                </div>

                {/* Portfolio Visual Profile Header */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#6e56cf] to-[#a78bfa] text-white flex items-center justify-center font-bold text-sm shadow-inner">
                    AC
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#0f172a] text-sm">
                        Alex Chen
                      </h4>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Available
                      </span>
                    </div>
                    <p className="text-xs text-[#6e56cf] font-medium">
                      Full-Stack Developer
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#475569] mt-2.5 italic">
                  &ldquo;Building clean, accessible and reliable web experiences.&rdquo;
                </p>

                {/* Featured Projects preview cards */}
                <div className="mt-3.5 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">
                    Featured Projects
                  </span>

                  <div className="p-2.5 rounded-lg bg-[#faf9fd] border border-[#e9e5f5] hover:bg-white transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#0f172a]">
                        CareFirst — Health Portal
                      </p>
                      <span className="text-[10px] font-mono text-[#6e56cf]">
                        Live Demo ↗
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748b] mt-0.5">
                      Full-stack patient telemetry dashboard with real-time sync.
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-[#475569] border border-[#eae6f5]">
                        Next.js
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-[#475569] border border-[#eae6f5]">
                        TypeScript
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-[#475569] border border-[#eae6f5]">
                        PostgreSQL
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#faf9fd] border border-[#e9e5f5] hover:bg-white transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#0f172a]">
                        Developer Dashboard
                      </p>
                      <span className="text-[10px] font-mono text-[#6e56cf]">
                        GitHub ↗
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748b] mt-0.5">
                      Lightweight metrics monitoring tool for distributed microservices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof / Feature Highlights Strip */}
        <div className="mt-10 pt-8 border-t border-[#eae6f5] max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#475569]">
              <UploadCloudIcon className="w-4 h-4 text-[#6e56cf]" />
              <span>Fast CV Parsing</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#475569]">
              <CheckCircleIcon className="w-4 h-4 text-[#6e56cf]" />
              <span>Instant Live Preview</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#475569]">
              <PaletteIcon className="w-4 h-4 text-[#6e56cf]" />
              <span>Developer Templates</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#475569]">
              <GlobeIcon className="w-4 h-4 text-[#6e56cf]" />
              <span>Clean Public URL</span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 text-xs font-semibold text-[#475569]">
              <CodeIcon className="w-4 h-4 text-[#6e56cf]" />
              <span>No Tedious Setup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
