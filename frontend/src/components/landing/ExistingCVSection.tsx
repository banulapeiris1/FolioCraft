import React from "react";
import {
  CheckIcon,
  RefreshCwIcon,
  SlidersIcon,
} from "./icons";

const checklistItems = [
  "Professional information & summary",
  "Skills & core technologies",
  "Projects & work experience",
  "Education & certifications",
  "Contact information & social profiles",
];

const detectionStatusItems = [
  {
    category: "Name & Headline",
    status: "Detected",
    detail: "Alex Chen • Full-Stack Developer",
    state: "Review & confirm",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    category: "Technical Skills",
    status: "Detected",
    detail: "18 technologies identified across 3 categories",
    state: "Editable list",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    category: "Work Experience",
    status: "Detected",
    detail: "2 positions extracted with dates & role descriptions",
    state: "Review before publishing",
    badgeColor: "bg-[#f3f0ff] text-[#6e56cf] border-[#dcd3f8]",
  },
  {
    category: "Education & Degrees",
    status: "Detected",
    detail: "B.S. Computer Science • University of California",
    state: "Review & confirm",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

export default function ExistingCVSection() {
  return (
    <section
      id="features"
      className="py-20 sm:py-28 bg-[#faf9fd] border-b border-[#eae6f5]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Copy & Checklist */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold uppercase tracking-wider text-[#6e56cf]">
              Effortless Onboarding
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a] leading-tight">
              Start with what you already have.
            </h2>

            <p className="text-base sm:text-lg text-[#475569] leading-relaxed">
              Your CV already contains much of the information needed for a
              professional portfolio. FolioCraft treats your CV as a smart starting
              point — not something you have to manually retype from scratch.
            </p>

            <div className="pt-2 space-y-3">
              {checklistItems.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-[#6e56cf] flex items-center justify-center shrink-0">
                    <CheckIcon className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium text-[#334155]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#eae6f5] shadow-xs flex items-start gap-3 mt-4">
              <SlidersIcon className="w-5 h-5 text-[#6e56cf] shrink-0 mt-0.5" />
              <p className="text-xs text-[#64748b] leading-relaxed">
                <strong className="text-[#0f172a] font-semibold">
                  Always in your control:
                </strong>{" "}
                Extracted information is a baseline suggestion. You can add, edit,
                hide, or reorder any section before your portfolio goes live.
              </p>
            </div>
          </div>

          {/* Right Column: Realistic Extraction & Review Status Card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-white border border-[#eae6f5] p-6 sm:p-7 shadow-lg shadow-[#6e56cf]/5">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#f1edf9]">
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">
                    CV Extraction &amp; Review Status
                  </h3>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Source: Alex_Chen_CV.pdf (parsed)
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6e56cf]">
                    <RefreshCwIcon className="w-3.5 h-3.5" /> Ready for Review
                  </span>
                </div>
              </div>

              {/* Status List */}
              <div className="mt-5 space-y-3">
                {detectionStatusItems.map((item) => (
                  <div
                    key={item.category}
                    className="p-3.5 rounded-xl bg-[#faf9fd] border border-[#eae6f5] flex items-center justify-between gap-4 transition-all hover:border-[#cfc6eb]"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0f172a]">
                          {item.category}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${item.badgeColor}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b]">{item.detail}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-medium text-[#6e56cf] bg-white border border-[#eae6f5] px-2.5 py-1 rounded-md shadow-2xs">
                        {item.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Notification Callout */}
              <div className="mt-5 pt-4 border-t border-[#f1edf9] flex items-center justify-between text-xs">
                <span className="text-[#64748b]">
                  Step 2 of 5: Review before publishing
                </span>
                <span className="font-semibold text-[#6e56cf] cursor-default">
                  Continue to Editor →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
