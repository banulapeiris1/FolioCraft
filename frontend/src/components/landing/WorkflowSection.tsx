import React from "react";
import {
  CheckCircleIcon,
  PaletteIcon,
  RocketIcon,
  SlidersIcon,
  UploadCloudIcon,
} from "./icons";

interface StepItem {
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: StepItem[] = [
  {
    number: "01",
    title: "Upload your CV",
    description:
      "Upload your PDF or Word resume. FolioCraft scans and extracts key sections, dates, and experiences.",
    icon: UploadCloudIcon,
  },
  {
    number: "02",
    title: "Review extracted information",
    description:
      "Inspect detected skills, job positions, and project details. Confirm or adjust any field with ease.",
    icon: CheckCircleIcon,
  },
  {
    number: "03",
    title: "Edit your portfolio",
    description:
      "Add GitHub repository links, fine-tune project descriptions, and highlight achievements that matter.",
    icon: SlidersIcon,
  },
  {
    number: "04",
    title: "Choose your style",
    description:
      "Select from curated developer templates. Change the presentation while keeping all your content intact.",
    icon: PaletteIcon,
  },
  {
    number: "05",
    title: "Publish",
    description:
      "Get a lightning-fast public link ready to share on your resume, LinkedIn, GitHub, or email signature.",
    icon: RocketIcon,
  },
];

export default function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="py-20 sm:py-28 bg-[#faf9fd] border-b border-[#eae6f5]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold uppercase tracking-wider text-[#6e56cf]">
            How It Works
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a] leading-tight">
            From CV to portfolio, without starting over.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#475569] leading-relaxed">
            FolioCraft transforms the information you already have into structured
            portfolio content, so you can focus on presenting your work instead of
            entering the same information twice.
          </p>
        </div>

        {/* 5 Steps Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative flex flex-col justify-between rounded-2xl bg-white border border-[#eae6f5] p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#6e56cf]/40 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold font-mono text-[#cbd5e1] group-hover:text-[#6e56cf] transition-colors">
                      {step.number}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-[#f8f7fd] border border-[#eae6f5] text-[#6e56cf] flex items-center justify-center group-hover:bg-[#f3f0ff] group-hover:border-[#dcd3f8] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="mt-5 text-base font-bold text-[#0f172a]">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#f1edf9] flex items-center text-[11px] font-semibold text-[#6e56cf]">
                  <span>Step {step.number}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
