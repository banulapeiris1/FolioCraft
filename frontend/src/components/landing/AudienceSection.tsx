import React from "react";
import {
  BriefcaseIcon,
  CodeIcon,
  GlobeIcon,
  GraduationCapIcon,
} from "./icons";

interface AudienceItem {
  role: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const audiences: AudienceItem[] = [
  {
    role: "Students",
    tagline: "Build your first professional presence.",
    description:
      "Transform university coursework, hackathons, and classroom projects into an impressive portfolio without needing design experience.",
    icon: GraduationCapIcon,
    tag: "First Impressions",
  },
  {
    role: "Interns",
    tagline: "Turn your experience into something recruiters can explore.",
    description:
      "Highlight internship contributions, mentorship learnings, and collaborative features to stand out in competitive applicant pools.",
    icon: BriefcaseIcon,
    tag: "Career Starters",
  },
  {
    role: "Junior Developers",
    tagline: "Showcase your projects and technical skills.",
    description:
      "Put your GitHub repositories, code architecture decisions, and deployed full-stack applications directly in front of engineering leads.",
    icon: CodeIcon,
    tag: "Technical Depth",
  },
  {
    role: "Freelancers",
    tagline: "Give clients a professional place to discover your work.",
    description:
      "Provide clients and agencies with a trustworthy, fast-loading portfolio with clear service capabilities and contact points.",
    icon: GlobeIcon,
    tag: "Client-Ready",
  },
];

export default function AudienceSection() {
  return (
    <section
      id="audience"
      className="py-20 sm:py-28 bg-[#faf9fd] border-b border-[#eae6f5]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold uppercase tracking-wider text-[#6e56cf]">
            Target Audience
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
            Built for developers at every stage.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#475569]">
            From your very first internship application to seasoned client contracts.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.role}
                className="flex flex-col justify-between rounded-2xl bg-white border border-[#eae6f5] p-6 shadow-xs hover:shadow-md hover:border-[#6e56cf]/40 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#f8f7fd] border border-[#eae6f5] text-[#6e56cf] flex items-center justify-center group-hover:bg-[#f3f0ff] group-hover:border-[#dcd3f8] transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-[#0f172a]">
                    {item.role}
                  </h3>

                  <p className="mt-1 text-xs font-semibold text-[#6e56cf]">
                    {item.tagline}
                  </p>

                  <p className="mt-3 text-xs text-[#64748b] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#f1edf9] flex items-center justify-between text-xs font-medium text-[#475569] group-hover:text-[#6e56cf] transition-colors">
                  <span>Explore features</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
