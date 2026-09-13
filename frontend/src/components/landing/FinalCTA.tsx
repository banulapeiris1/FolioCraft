import React from "react";
import { ArrowRightIcon, CheckIcon, SparklesIcon } from "./icons";

export default function FinalCTA() {
  return (
    <section id="cta" className="py-20 sm:py-28 bg-[#faf9fd] relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-[#6e56cf]/8 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="rounded-3xl bg-white border border-[#eae6f5] p-8 sm:p-16 text-center shadow-xl shadow-[#6e56cf]/5 relative overflow-hidden">
          {/* Subtle top decoration badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold uppercase tracking-wider text-[#6e56cf] mb-6">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Launch Your Presence Today</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0f172a] max-w-2xl mx-auto leading-tight">
            Your CV is the beginning. Make it worth exploring.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#475569] max-w-xl mx-auto leading-relaxed">
            Turn the information you already have into a professional online
            portfolio that tech recruiters and clients love to read.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#workflow"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-md shadow-[#6e56cf]/25 hover:shadow-lg hover:shadow-[#6e56cf]/35 transition-all active:scale-[0.98]"
            >
              <span>Create my portfolio</span>
              <ArrowRightIcon className="w-4 h-4" />
            </a>

            <a
              href="#editor-preview"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-[#334155] bg-white hover:bg-[#f8f7fd] border border-[#e2ddf3] shadow-xs transition-all hover:border-[#cfc6eb]"
            >
              <span>Explore how it works</span>
            </a>
          </div>

          {/* Micro badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#64748b]">
            <div className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
              <span>No credit card required</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
              <span>Full control before publishing</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
              <span>Free forever tier</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
