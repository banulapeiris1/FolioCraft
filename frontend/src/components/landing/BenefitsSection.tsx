import React from "react";
import {
  EyeIcon,
  GlobeIcon,
  SlidersIcon,
  UploadCloudIcon,
} from "./icons";

interface BenefitItem {
  number: string;
  title: string;
  description: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}

const benefits: BenefitItem[] = [
  {
    number: "01",
    title: "No duplicate data entry",
    description: "Use the information already inside your CV.",
    detail:
      "Skip tedious forms asking you to re-type your past jobs, university courses, and technical skills one by one.",
    icon: UploadCloudIcon,
  },
  {
    number: "02",
    title: "Always editable",
    description: "Review and correct extracted information before publishing.",
    detail:
      "You have complete control to add, update, remove, or customize any field extracted by our parser before anyone sees it.",
    icon: SlidersIcon,
  },
  {
    number: "03",
    title: "Live preview",
    description: "See how your portfolio looks before making it public.",
    detail:
      "Interactive side-by-side editing lets you verify typography, mobile responsiveness, and project links in real time.",
    icon: EyeIcon,
  },
  {
    number: "04",
    title: "Simple publishing",
    description: "Get a clean public portfolio URL.",
    detail:
      "Publish with a single click. Share your custom portfolio link directly with recruiters, hiring managers, and on your resume.",
    icon: GlobeIcon,
  },
];

export default function BenefitsSection() {
  return (
    <section className="py-20 sm:py-28 bg-[#faf9fd] border-b border-[#eae6f5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold uppercase tracking-wider text-[#6e56cf]">
            Why FolioCraft
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a] leading-tight">
            Designed for developers who hate tedious forms.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#475569]">
            A developer&apos;s time should be spent building software, not filling out redundant portfolio builders.
          </p>
        </div>

        {/* 4 Benefit Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.number}
                className="flex flex-col justify-between rounded-2xl bg-white border border-[#eae6f5] p-6 shadow-xs hover:shadow-md hover:border-[#6e56cf]/40 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#f8f7fd] border border-[#eae6f5] text-[#6e56cf] flex items-center justify-center group-hover:bg-[#f3f0ff] group-hover:border-[#dcd3f8] transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#cbd5e1] group-hover:text-[#6e56cf] transition-colors">
                      {benefit.number}
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-bold text-[#0f172a]">
                    {benefit.title}
                  </h3>

                  <p className="mt-1 text-xs font-medium text-[#6e56cf]">
                    &ldquo;{benefit.description}&rdquo;
                  </p>

                  <p className="mt-3 text-xs text-[#64748b] leading-relaxed">
                    {benefit.detail}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#f1edf9] flex items-center gap-1.5 text-[11px] font-medium text-[#64748b]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Developer Advantage</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
