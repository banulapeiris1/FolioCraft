import React from "react";
import {
  ExternalLinkIcon,
  GithubIcon,
  LockIcon,
} from "./icons";

export default function DigitalPresenceSection() {
  return (
    <section className="py-20 sm:py-28 bg-[#ffffff] border-b border-[#eae6f5] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold uppercase tracking-wider text-[#6e56cf]">
            Published Portfolio
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
            From document to digital presence.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#475569] max-w-2xl mx-auto">
            Your CV already contains your story. FolioCraft helps turn that
            information into a polished, responsive developer portfolio accessible
            from any device.
          </p>
        </div>

        {/* Large Browser Mockup */}
        <div className="max-w-5xl mx-auto rounded-2xl bg-white border border-[#eae6f5] shadow-2xl shadow-[#6e56cf]/8 overflow-hidden">
          {/* Browser Navigation Bar */}
          <div className="bg-[#f8f7fd] border-b border-[#eae6f5] px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400/80" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>

            {/* URL Display */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white border border-[#eae6f5] text-xs text-[#334155] font-mono max-w-md w-full justify-between shadow-2xs">
              <div className="flex items-center gap-2 truncate">
                <LockIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[#64748b]">https://</span>
                <span className="font-semibold text-[#0f172a]">
                  foliocraft.dev/alexchen
                </span>
              </div>
              <span className="text-[10px] text-[#6e56cf] font-sans font-medium hover:underline shrink-0">
                Copy Link
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Live
              </span>
            </div>
          </div>

          {/* Rendered Developer Portfolio Page Content */}
          <div className="p-6 sm:p-10 bg-gradient-to-b from-white to-[#faf9fd]">
            {/* Developer Banner / Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-[#eae6f5]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6e56cf] to-[#9333ea] text-white flex items-center justify-center font-bold text-xl shadow-md">
                  AC
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a]">
                      Alex Chen
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Available for hire
                    </span>
                  </div>
                  <p className="text-sm text-[#6e56cf] font-medium mt-0.5">
                    Full-Stack Developer • React / TypeScript / Node.js
                  </p>
                  <p className="text-xs text-[#64748b] mt-1">
                    San Francisco, CA • Building clean, resilient web systems
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <span className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#6e56cf] shadow-sm">
                  Get in Touch
                </span>
                <span className="px-3 py-2 rounded-lg text-xs font-semibold text-[#475569] bg-white border border-[#eae6f5] hover:bg-[#faf9fd]">
                  Resume PDF ↓
                </span>
              </div>
            </div>

            {/* Featured Work Grid */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#0f172a]">
                  Featured Projects
                </h4>
                <span className="text-xs text-[#64748b]">
                  Showing 2 of 4 projects
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project 01 */}
                <div className="rounded-xl bg-white border border-[#eae6f5] p-5 shadow-xs hover:border-[#6e56cf]/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#6e56cf] font-semibold">
                      Project 01
                    </span>
                    <div className="flex items-center gap-2 text-xs text-[#64748b]">
                      <span className="inline-flex items-center gap-1 hover:text-[#6e56cf]">
                        Demo <ExternalLinkIcon className="w-3 h-3" />
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 hover:text-[#6e56cf]">
                        Code <GithubIcon className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  <h5 className="mt-2 text-base font-bold text-[#0f172a]">
                    CareFirst — Health Analytics Portal
                  </h5>

                  <p className="mt-1.5 text-xs text-[#64748b] leading-relaxed">
                    Full-stack patient telemetry dashboard with real-time sync,
                    HIPAA compliant data storage, and automated notification alerts.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {["React", "TypeScript", "WebSocket", "PostgreSQL"].map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded bg-[#f8f7fd] border border-[#eae6f5] text-[10px] font-mono text-[#334155]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Project 02 */}
                <div className="rounded-xl bg-white border border-[#eae6f5] p-5 shadow-xs hover:border-[#6e56cf]/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#6e56cf] font-semibold">
                      Project 02
                    </span>
                    <div className="flex items-center gap-2 text-xs text-[#64748b]">
                      <span className="inline-flex items-center gap-1 hover:text-[#6e56cf]">
                        Demo <ExternalLinkIcon className="w-3 h-3" />
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 hover:text-[#6e56cf]">
                        Code <GithubIcon className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  <h5 className="mt-2 text-base font-bold text-[#0f172a]">
                    Developer Dashboard &amp; Latency Monitor
                  </h5>

                  <p className="mt-1.5 text-xs text-[#64748b] leading-relaxed">
                    High throughput metrics visualization tool for microservices
                    benchmarks, latency histograms, and uptime reports.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {["Node.js", "Docker", "GraphQL", "Prisma"].map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded bg-[#f8f7fd] border border-[#eae6f5] text-[10px] font-mono text-[#334155]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Skills Snippet */}
            <div className="mt-8 pt-6 border-t border-[#eae6f5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                  Verified Skills
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    "React",
                    "TypeScript",
                    "Node.js",
                    "PostgreSQL",
                    "Tailwind CSS",
                    "Docker",
                  ].map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-[#eae6f5] text-[#334155] shadow-2xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-[#64748b]">
                  Hosted on FolioCraft CDN
                </span>
                <p className="text-[11px] text-emerald-600 font-medium">
                  ⚡ 99.9% Lighthouse Performance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
