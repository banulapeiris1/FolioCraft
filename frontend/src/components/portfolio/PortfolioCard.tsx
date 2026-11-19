"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { Portfolio } from "@/types/portfolio";
import {
  PencilIcon,
  ExternalLinkIcon,
  EyeIcon,
  SparklesIcon,
  CopyIcon,
  CheckIcon,
  Trash2Icon,
} from "@/components/portfolio/PortfolioIcons";
import PortfolioStatusBadge from "@/components/portfolio/PortfolioStatusBadge";
import {
  getPortfolioStatus,
  getPublishingInfo,
  type PortfolioStatus,
} from "@/lib/dashboard";
import { getPublicPortfolioUrl } from "./PublishModal";

export interface PortfolioCardProps {
  portfolio: Portfolio;
  onPublishClick?: (portfolio: Portfolio) => void;
  /** DASH-05: when provided, the card shows a Delete action. */
  onDeleteClick?: (portfolio: Portfolio) => void;
}

const TEMPLATE_NAMES: Record<string, string> = {
  modern: "Modern Developer",
  minimal: "Minimalist",
  professional: "Executive Professional",
};

export function getTemplateDisplayName(templateKey?: string): string {
  if (!templateKey) return "Modern Developer";
  const normalized = templateKey.toLowerCase().trim();
  return (
    TEMPLATE_NAMES[normalized] ||
    templateKey.charAt(0).toUpperCase() + templateKey.slice(1)
  );
}

export function formatLastUpdated(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently updated";
    return `Updated ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  } catch {
    return "Recently updated";
  }
}

type CopyState = "idle" | "copied" | "failed";

const STATUS_INFO_COLOR: Record<PortfolioStatus, string> = {
  live: "text-emerald-700",
  unpublished: "text-slate-500",
  draft: "text-[#64748b]",
};

export default function PortfolioCard({
  portfolio,
  onPublishClick,
  onDeleteClick,
}: PortfolioCardProps) {
  const templateName = getTemplateDisplayName(portfolio.template);
  const updatedDate = formatLastUpdated(portfolio.updatedAt || portfolio.createdAt);
  const status = getPortfolioStatus(portfolio);
  const publishingInfo = getPublishingInfo(portfolio);
  const isLive = status === "live";
  const about = portfolio.about?.trim();
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const handleCopyUrl = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const url = getPublicPortfolioUrl(portfolio);
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setCopyState("copied");
      } catch {
        // DASH-04: surface the failure instead of failing silently
        setCopyState("failed");
      }
      setTimeout(() => setCopyState("idle"), 2000);
    },
    [portfolio]
  );

  return (
    <article
      data-testid={`portfolio-card-${portfolio.id}`}
      data-status={status}
      className="h-full min-w-0 bg-white rounded-2xl border border-[#eae6f5] hover:border-[#dcd3f8] p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col group"
    >
      <div className="flex-1 min-w-0">
        {/* Title, owner & status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-base sm:text-lg font-bold text-[#0f172a] tracking-tight leading-snug group-hover:text-[#6e56cf] transition-colors line-clamp-2 break-words"
              title={portfolio.title}
            >
              {portfolio.title}
            </h3>
            <p
              className="mt-0.5 text-xs text-[#64748b] truncate"
              title={`${portfolio.name} · @${portfolio.username}`}
            >
              <span className="font-medium">{portfolio.name}</span>
              <span className="text-[#cbd5e1] mx-1.5" aria-hidden="true">•</span>
              <span className="font-mono text-[#64748b]">@{portfolio.username}</span>
            </p>
          </div>
          <PortfolioStatusBadge status={status} className="flex-shrink-0 mt-0.5" />
        </div>

        {/* Summary (a placeholder keeps cards consistent when it is missing) */}
        {about ? (
          <p
            data-testid="card-about"
            className="mt-3 text-sm text-[#64748b] leading-relaxed line-clamp-2 break-words"
            title={about}
          >
            {about}
          </p>
        ) : (
          <p data-testid="card-about-empty" className="mt-3 text-sm italic text-[#64748b]">
            No summary yet. Add one in the editor.
          </p>
        )}

        {/* Meta: template & last update */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[#64748b]">
          <Link
            href={`/portfolio/templates?id=${encodeURIComponent(portfolio.id)}`}
            className="inline-flex items-center min-h-6 text-[#64748b] hover:text-[#6e56cf] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf]"
            title="Change presentation template in Template Gallery"
          >
            {templateName}
            {/* DASH-06: unique accessible name per card; visible label stays first */}
            <span className="sr-only">, change template for {portfolio.title}</span>
            <span aria-hidden="true">&nbsp;&rarr;</span>
          </Link>
          <span className="text-[#cbd5e1]" aria-hidden="true">•</span>
          <span>{updatedDate}</span>
        </div>

        {/* Publishing history (only from the recorded publish date) */}
        {publishingInfo && (
          <p
            data-testid="card-publishing-info"
            className={`mt-1 text-[11px] font-medium ${STATUS_INFO_COLOR[status]}`}
          >
            {publishingInfo}
          </p>
        )}

        {/* Live public URL (when Published) */}
        {isLive && (
          <div
            data-testid="card-public-url-banner"
            className="mt-3.5 py-1 px-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between gap-2 text-xs"
          >
            <Link
              href={`/u/${portfolio.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-emerald-800 hover:text-emerald-950 hover:underline truncate flex items-center gap-1.5 flex-1 min-w-0 min-h-7 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Open public portfolio in a new tab"
            >
              <span className="truncate">/u/{portfolio.username}</span>
              <ExternalLinkIcon className="w-3 h-3 flex-shrink-0 text-emerald-600" />
            </Link>

            <button
              type="button"
              onClick={handleCopyUrl}
              data-testid={`card-copy-url-${portfolio.id}`}
              className="inline-flex items-center justify-center min-w-7 min-h-7 text-emerald-700 hover:text-emerald-950 p-1.5 rounded-md transition-colors cursor-pointer flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Copy public URL"
              aria-label={`Copy public URL for ${portfolio.title}`}
            >
              {copyState === "copied" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </span>
              ) : copyState === "failed" ? (
                <span role="status" className="text-[11px] font-bold text-rose-700">
                  Copy failed
                </span>
              ) : (
                <CopyIcon className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Card Actions: identical layout on every card */}
      <div data-testid="card-actions" className="mt-5 pt-4 border-t border-[#f1edf9] space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/portfolio/edit/${portfolio.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#eae4fc] border border-[#dcd3f8] transition-colors min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf]"
          >
            <PencilIcon className="w-3.5 h-3.5" />
            <span>Edit</span>
            <span className="sr-only"> {portfolio.title}</span>
          </Link>

          <Link
            href={`/portfolio/preview?id=${portfolio.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#475569] bg-[#f8f7fd] hover:bg-[#ede9f8] hover:text-[#0f172a] border border-[#eae6f5] transition-colors min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf]"
          >
            <EyeIcon className="w-3.5 h-3.5" />
            <span>Preview</span>
            <span className="sr-only"> {portfolio.title}</span>
          </Link>
        </div>

        <div className="flex gap-2">
          {/* Publish / Manage Live: opens the unchanged PublishModal */}
          <button
            type="button"
            onClick={() => onPublishClick?.(portfolio)}
            data-testid={`card-publish-btn-${portfolio.id}`}
            className={`w-full min-w-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[38px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              isLive
                ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 focus-visible:ring-emerald-500"
                : "text-white bg-[#6e56cf] hover:bg-[#5d46be] border border-[#6e56cf] shadow-xs shadow-[#6e56cf]/25 focus-visible:ring-[#6e56cf]"
            }`}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>{isLive ? "Manage Live" : status === "unpublished" ? "Republish" : "Publish"}</span>
            <span className="sr-only"> {portfolio.title}</span>
          </button>

          {/* DASH-05: destructive action, visually secondary and icon-only */}
          {onDeleteClick && (
            <button
              type="button"
              onClick={() => onDeleteClick(portfolio)}
              data-testid={`card-delete-btn-${portfolio.id}`}
              aria-label={`Delete portfolio ${portfolio.title}`}
              title="Delete portfolio"
              className="flex-shrink-0 inline-flex items-center justify-center w-[38px] min-h-[38px] rounded-xl text-[#64748b] bg-white border border-[#eae6f5] hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Trash2Icon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function PortfolioCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="portfolio-card-skeleton"
      className="h-full bg-white rounded-2xl border border-[#eae6f5] p-5 sm:p-6 shadow-xs flex flex-col justify-between animate-pulse motion-reduce:animate-none"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="h-5 bg-slate-200 rounded-md w-3/4" />
          <div className="h-5 bg-slate-200 rounded-full w-16" />
        </div>
        <div className="h-3.5 bg-slate-100 rounded-md w-1/3 mb-4" />
        <div className="h-3 bg-slate-100 rounded-md w-2/3 mb-2" />
        <div className="h-3 bg-slate-100 rounded-md w-1/2 mb-4" />
        <div className="h-3 bg-slate-100 rounded-md w-28 mt-4" />
      </div>
      {/* Mirrors the real card footer: Edit + Preview row, full-width Publish */}
      <div className="mt-5 pt-4 border-t border-[#f1edf9] space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div data-skeleton-action className="h-[38px] bg-slate-200 rounded-xl" />
          <div data-skeleton-action className="h-[38px] bg-slate-200 rounded-xl" />
        </div>
        <div data-skeleton-action className="h-[38px] bg-slate-200 rounded-xl w-full" />
      </div>
    </div>
  );
}
