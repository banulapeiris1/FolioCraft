import React from "react";
import Link from "next/link";
import {
  FolderGit2Icon,
  PlusIcon,
  PencilIcon,
  FileTextIcon,
  ColumnsIcon,
  SparklesIcon,
} from "@/components/portfolio/PortfolioIcons";

interface OnboardingStep {
  title: string;
  description: string;
  Icon: (props: { className?: string }) => React.JSX.Element;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    title: "Create a portfolio",
    description: "Add your name, title and a public username.",
    Icon: PencilIcon,
  },
  {
    title: "Import your CV",
    description: "Upload your CV in the portfolio editor to fill in projects, skills and experience.",
    Icon: FileTextIcon,
  },
  {
    title: "Choose a template",
    description: "Pick a design that fits you. You can change it any time.",
    Icon: ColumnsIcon,
  },
  {
    title: "Publish",
    description: "Go live at your own /u/username link when you're ready.",
    Icon: SparklesIcon,
  },
];

/**
 * Empty state for users with no portfolios (DASH-03).
 * One prominent Create action plus a short guide to the workflow.
 */
export default function DashboardEmptyState(): React.JSX.Element {
  return (
    <div
      data-testid="dashboard-empty-state"
      className="bg-white rounded-3xl border border-dashed border-[#dcd3f8] p-6 sm:p-10 shadow-xs"
    >
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf] mx-auto mb-4">
          <FolderGit2Icon className="w-7 h-7" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-[#0f172a] mb-1">
          You haven&apos;t created a portfolio yet
        </h3>
        <p className="text-sm text-[#64748b] max-w-md mx-auto leading-relaxed">
          Create your first portfolio to turn your CV into a professional online
          presence. It only takes a few minutes.
        </p>
        <Link
          href="/portfolio/create"
          data-testid="dashboard-empty-create"
          className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-md shadow-[#6e56cf]/25 hover:shadow-lg hover:shadow-[#6e56cf]/35 transition-colors active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create your first portfolio</span>
        </Link>
      </div>

      <ol
        aria-label="How it works"
        className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left"
      >
        {ONBOARDING_STEPS.map(({ title, description, Icon }, index) => (
          <li
            key={title}
            className="rounded-2xl bg-[#fbfaff] border border-[#eae6f5] p-4 flex gap-3 min-w-0"
          >
            <span className="w-8 h-8 rounded-xl bg-white border border-[#eae6f5] flex items-center justify-center text-[#6e56cf] flex-shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#0f172a]">
                <span className="text-[#64748b] mr-1">{index + 1}.</span>
                {title}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#64748b]">{description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
