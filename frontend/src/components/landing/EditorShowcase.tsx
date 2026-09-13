import React from "react";
import {
  BriefcaseIcon,
  CheckIcon,
  CodeIcon,
  EyeIcon,
  FileTextIcon,
  GraduationCapIcon,
  LockIcon,
  SparklesIcon,
} from "./icons";

export default function EditorShowcase() {
  return (
    <section
      id="editor-preview"
      className="py-20 sm:py-28 bg-[#ffffff] border-b border-[#eae6f5] relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold uppercase tracking-wider text-[#6e56cf]">
            Product Preview
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
            Your portfolio, your way.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#475569] max-w-2xl mx-auto">
            Review and customize your portfolio before publishing. Complete
            control over every section, project, and skill extracted from your CV.
          </p>
        </div>

        {/* Large Editor Mockup Frame */}
        <div className="max-w-6xl mx-auto rounded-2xl bg-white border border-[#eae6f5] shadow-2xl shadow-[#6e56cf]/8 overflow-hidden">
          {/* Top Browser Bar */}
          <div className="bg-[#f8f7fd] border-b border-[#eae6f5] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400/80" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>

            {/* Address Bar */}
            <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-[#eae6f5] text-xs text-[#64748b] font-mono max-w-md w-full justify-center shadow-2xs">
              <LockIcon className="w-3 h-3 text-[#6e56cf]" />
              <span>https://foliocraft.dev/editor/alex-chen</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckIcon className="w-3 h-3" /> Auto-saved
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-white bg-[#6e56cf] px-3 py-1 rounded-md shadow-xs pointer-events-none"
              >
                Publish
              </button>
            </div>
          </div>

          {/* Editor Workspace Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
            {/* LEFT: Editor Sidebar & Form Panel (7 cols) */}
            <div className="lg:col-span-6 xl:col-span-5 border-r border-[#eae6f5] bg-[#faf9fd] p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#eae6f5]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
                    Portfolio Sections
                  </h3>
                  <span className="text-[11px] text-[#6e56cf] font-medium">
                    5 of 5 Ready
                  </span>
                </div>

                {/* Section Navigation Tabs */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {[
                    { name: "Basic Info", active: true, icon: FileTextIcon },
                    { name: "Projects", active: false, icon: CodeIcon },
                    { name: "Skills", active: false, icon: SparklesIcon },
                    { name: "Experience", active: false, icon: BriefcaseIcon },
                    { name: "Education", active: false, icon: GraduationCapIcon },
                  ].map((tab) => (
                    <button
                      key={tab.name}
                      type="button"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        tab.active
                          ? "bg-[#6e56cf] text-white shadow-xs"
                          : "bg-white text-[#475569] border border-[#eae6f5] hover:border-[#6e56cf]/40"
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.name}
                    </button>
                  ))}
                </div>

                {/* Form Fields Simulation */}
                <div className="space-y-3.5 bg-white p-4 rounded-xl border border-[#eae6f5] shadow-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="Alex Chen"
                      className="mt-1 w-full px-3 py-1.5 text-xs font-medium text-[#0f172a] bg-[#faf9fd] border border-[#eae6f5] rounded-lg focus:outline-none cursor-default"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider">
                      Headline / Title
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="Full-Stack Developer"
                      className="mt-1 w-full px-3 py-1.5 text-xs font-medium text-[#0f172a] bg-[#faf9fd] border border-[#eae6f5] rounded-lg focus:outline-none cursor-default"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider">
                      Bio Summary
                    </label>
                    <textarea
                      readOnly
                      rows={2}
                      value="Building clean, accessible and reliable web experiences with React, TypeScript, and modern distributed architectures."
                      className="mt-1 w-full px-3 py-1.5 text-xs text-[#334155] bg-[#faf9fd] border border-[#eae6f5] rounded-lg focus:outline-none resize-none cursor-default"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider">
                      Extracted Skills
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {["React", "TypeScript", "Node.js", "PostgreSQL", "Next.js"].map(
                        (skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f3f0ff] text-[#6e56cf] border border-[#e3dcf7] text-[11px] font-medium"
                          >
                            {skill}
                            <span className="text-[#6e56cf]/60">×</span>
                          </span>
                        )
                      )}
                      <span className="px-2 py-0.5 rounded border border-dashed border-[#cbd5e1] text-[11px] text-[#64748b]">
                        + Add Skill
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#f1edf9]">
                    <span className="text-xs font-medium text-[#334155]">
                      Display &quot;Available for hire&quot; status
                    </span>
                    <span className="relative inline-flex h-5 w-9 shrink-0 cursor-default rounded-full bg-[#6e56cf] p-0.5">
                      <span className="translate-x-4 inline-block h-4 w-4 rounded-full bg-white shadow-sm" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#eae6f5] flex items-center justify-between text-xs text-[#64748b]">
                <span>CV Source: Alex_Chen_CV.pdf</span>
                <span className="text-[#6e56cf] font-medium">Re-sync from CV</span>
              </div>
            </div>

            {/* RIGHT: Live Portfolio Preview (6-7 cols) */}
            <div className="lg:col-span-6 xl:col-span-7 bg-[#fdfcff] p-5 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#eae6f5]">
                  <div className="flex items-center gap-2">
                    <EyeIcon className="w-4 h-4 text-[#6e56cf]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
                      Interactive Live Preview
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#64748b]">
                    Template: Modern Developer
                  </span>
                </div>

                {/* Rendered Developer Portfolio Preview Card */}
                <div className="rounded-xl bg-white border border-[#eae6f5] p-6 shadow-sm space-y-6">
                  {/* Bio Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6e56cf] via-[#8b5cf6] to-[#c084fc] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        AC
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-[#0f172a]">
                            Alex Chen
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available for hire
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#6e56cf]">
                          Full-Stack Developer
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#faf9fd] border border-[#eae6f5] text-[#475569]">
                        github.com/alexchen
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#475569] leading-relaxed">
                    Building clean and reliable web experiences. Specialized in
                    responsive user interfaces, accessible design systems, and
                    scalable backend architectures.
                  </p>

                  {/* Skills Grid */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                      Core Technologies
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["React", "TypeScript", "Node.js", "PostgreSQL"].map((tech) => (
                        <span
                          key={tech}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#f8f7fd] border border-[#eae6f5] text-[#334155]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Projects Showcase */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        Featured Projects
                      </span>
                      <span className="text-[11px] text-[#6e56cf] font-medium">
                        3 Projects
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-lg bg-[#faf9fd] border border-[#eae6f5]">
                        <p className="text-xs font-bold text-[#0f172a]">
                          Portfolio Website
                        </p>
                        <p className="text-[10px] text-[#64748b] mt-1 line-clamp-2">
                          High performance portfolio platform built with Next.js.
                        </p>
                        <span className="inline-block mt-2 text-[9px] font-mono text-[#6e56cf]">
                          Next.js • Tailwind
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#faf9fd] border border-[#eae6f5]">
                        <p className="text-xs font-bold text-[#0f172a]">
                          CareFirst
                        </p>
                        <p className="text-[10px] text-[#64748b] mt-1 line-clamp-2">
                          Patient dashboard with real-time vitals sync.
                        </p>
                        <span className="inline-block mt-2 text-[9px] font-mono text-[#6e56cf]">
                          React • Node.js
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#faf9fd] border border-[#eae6f5]">
                        <p className="text-xs font-bold text-[#0f172a]">
                          Developer Dashboard
                        </p>
                        <p className="text-[10px] text-[#64748b] mt-1 line-clamp-2">
                          Metrics & latency monitoring for services.
                        </p>
                        <span className="inline-block mt-2 text-[9px] font-mono text-[#6e56cf]">
                          TypeScript • Postgres
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#eae6f5] flex items-center justify-between text-xs text-[#64748b]">
                <span>Desktop & Mobile Responsive</span>
                <span className="text-[#6e56cf] font-medium">Switch Device View</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
