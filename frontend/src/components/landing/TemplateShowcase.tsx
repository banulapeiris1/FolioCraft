import { SparklesIcon } from "./icons";

export default function TemplateShowcase() {
  return (
    <section
      id="templates"
      className="py-20 sm:py-28 bg-[#ffffff] border-b border-[#eae6f5]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold uppercase tracking-wider text-[#6e56cf]">
            Curated Styles
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
            One portfolio. Three different styles.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#475569]">
            Keep your content. Change the presentation with a single click.
          </p>
        </div>

        {/* 3 Templates Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* 1. Minimal Template */}
          <div className="flex flex-col rounded-2xl bg-white border border-[#eae6f5] p-5 shadow-xs hover:shadow-md hover:border-[#cfc6eb] transition-all">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#f1edf9]">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">Minimal</h3>
                <p className="text-xs text-[#64748b]">Editorial &amp; Typography</p>
              </div>
              <span className="text-[11px] font-mono text-[#64748b] bg-[#faf9fd] px-2 py-0.5 rounded border border-[#eae6f5]">
                Light
              </span>
            </div>

            {/* Miniature preview frame */}
            <div className="rounded-xl bg-[#faf9fd] border border-[#eae6f5] p-4 flex-1 flex flex-col justify-between min-h-[220px]">
              <div className="space-y-3">
                <div className="border-b border-[#e2ddf3] pb-2">
                  <h4 className="text-sm font-serif font-semibold text-[#0f172a]">
                    Alex Chen
                  </h4>
                  <p className="text-[11px] text-[#64748b]">
                    Full-Stack Developer
                  </p>
                </div>

                <p className="text-[11px] text-[#475569] leading-relaxed">
                  Building clean and reliable web experiences with thoughtful
                  code and deliberate design.
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-bold">
                    Projects
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-[#334155] border-b border-dashed border-[#e2ddf3] pb-1">
                    <span>Portfolio Website</span>
                    <span className="text-[10px] text-[#94a3b8]">2024</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#334155] border-b border-dashed border-[#e2ddf3] pb-1">
                    <span>CareFirst App</span>
                    <span className="text-[10px] text-[#94a3b8]">2023</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-[#eae6f5] text-[10px] text-[#64748b] flex justify-between">
                <span>React • TypeScript • Node</span>
                <span className="text-[#6e56cf]">Preview ↗</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#64748b] leading-relaxed">
              Focuses purely on clear hierarchy and typography. Perfect for developers who appreciate understated minimalism.
            </p>
          </div>

          {/* 2. Modern Developer Template (Highlighted) */}
          <div className="relative flex flex-col rounded-2xl bg-white border-2 border-[#6e56cf] p-5 shadow-lg shadow-[#6e56cf]/10 transition-all">
            <div className="absolute -top-3 right-6 bg-[#6e56cf] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
              <SparklesIcon className="w-3 h-3" />
              <span>Most Popular</span>
            </div>

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#f1edf9]">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">
                  Modern Developer
                </h3>
                <p className="text-xs text-[#6e56cf] font-medium">
                  Dynamic &amp; Tech Stack Forward
                </p>
              </div>
              <span className="text-[11px] font-medium text-[#6e56cf] bg-[#f3f0ff] px-2 py-0.5 rounded border border-[#dcd3f8]">
                Active
              </span>
            </div>

            {/* Miniature preview frame */}
            <div className="rounded-xl bg-[#faf9fd] border border-[#eae6f5] p-4 flex-1 flex flex-col justify-between min-h-[220px]">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#6e56cf] text-white flex items-center justify-center text-xs font-bold">
                    AC
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-[#0f172a]">
                        Alex Chen
                      </h4>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-[10px] text-[#6e56cf] font-mono">
                      Full-Stack Dev
                    </p>
                  </div>
                </div>

                {/* Tech chips */}
                <div className="flex flex-wrap gap-1">
                  {["React", "TypeScript", "Node.js", "Postgres"].map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white border border-[#eae6f5] text-[#334155]"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Project cards preview */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="p-2 rounded bg-white border border-[#eae6f5]">
                    <p className="text-[10px] font-bold text-[#0f172a]">
                      Portfolio
                    </p>
                    <p className="text-[9px] text-[#64748b] mt-0.5">
                      Next.js • Tailwind
                    </p>
                  </div>
                  <div className="p-2 rounded bg-white border border-[#eae6f5]">
                    <p className="text-[10px] font-bold text-[#0f172a]">
                      CareFirst
                    </p>
                    <p className="text-[9px] text-[#64748b] mt-0.5">
                      React • Node
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-[#eae6f5] text-[10px] text-[#64748b] flex justify-between">
                <span className="text-[#6e56cf] font-semibold">
                  Default Selection
                </span>
                <span className="text-[#6e56cf]">Preview ↗</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#64748b] leading-relaxed">
              Designed specifically for software engineers with technical badge chips, repo links, and interactive project cards.
            </p>
          </div>

          {/* 3. Professional Template */}
          <div className="flex flex-col rounded-2xl bg-white border border-[#eae6f5] p-5 shadow-xs hover:shadow-md hover:border-[#cfc6eb] transition-all">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#f1edf9]">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">
                  Professional
                </h3>
                <p className="text-xs text-[#64748b]">Structured &amp; Executive</p>
              </div>
              <span className="text-[11px] font-mono text-[#64748b] bg-[#faf9fd] px-2 py-0.5 rounded border border-[#eae6f5]">
                Formal
              </span>
            </div>

            {/* Miniature preview frame */}
            <div className="rounded-xl bg-[#faf9fd] border border-[#eae6f5] p-4 flex-1 flex flex-col justify-between min-h-[220px]">
              <div className="space-y-3">
                <div className="p-2 rounded bg-white border border-[#eae6f5] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a]">
                      Alex Chen
                    </h4>
                    <p className="text-[10px] text-[#64748b]">
                      Senior Software Engineer
                    </p>
                  </div>
                  <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                    CV Verified
                  </span>
                </div>

                <div className="space-y-1 text-[10px] text-[#475569]">
                  <div className="p-1.5 rounded bg-white border border-[#f1edf9]">
                    <strong className="text-[#0f172a]">Experience:</strong>{" "}
                    TechFlow Solutions (2022-Present)
                  </div>
                  <div className="p-1.5 rounded bg-white border border-[#f1edf9]">
                    <strong className="text-[#0f172a]">Education:</strong> B.S.
                    Computer Science, UC
                  </div>
                </div>

                <div className="flex gap-1 text-[9px]">
                  <span className="px-1.5 py-0.5 rounded bg-white border border-[#eae6f5] text-[#334155]">
                    React
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-[#eae6f5] text-[#334155]">
                    TypeScript
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-[#eae6f5] text-[#334155]">
                    Postgres
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-[#eae6f5] text-[10px] text-[#64748b] flex justify-between">
                <span>Corporate &amp; Agency Ready</span>
                <span className="text-[#6e56cf]">Preview ↗</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#64748b] leading-relaxed">
              Structured for enterprise teams, consultancies, and traditional tech recruiters who value a clear career timeline.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
