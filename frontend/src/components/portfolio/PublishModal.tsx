"use client";

import React, { useState, useEffect, useCallback, useId, useRef } from "react";
import { useModalFocus } from "@/lib/useModalFocus";
import Link from "next/link";
import { Portfolio } from "@/types/portfolio";
import {
  checkUsernameAvailability,
  publishPortfolio,
  unpublishPortfolio,
  ApiError,
} from "@/lib/api";
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
} from "./PortfolioIcons";

export interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: Portfolio;
  token: string;
  onPortfolioUpdated: (updatedPortfolio: Portfolio) => void;
}

export type UsernameStatus =
  | "idle"
  | "validating"
  | "available"
  | "unavailable"
  | "invalid";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export function getPublicPortfolioUrl(
  portfolio: Portfolio,
  customOrigin?: string
): string {
  const origin =
    customOrigin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const publicUrl = portfolio.publicUrl?.trim();
  if (publicUrl) {
    // PUB-06: the publish API returns a relative path (/u/:username);
    // prefix the origin so Copy URL always yields a shareable absolute URL.
    return publicUrl.startsWith("/") ? `${origin}${publicUrl}` : publicUrl;
  }
  return `${origin}/u/${encodeURIComponent(portfolio.username || "")}`;
}

/**
 * Merges a publish/unpublish API result into the full client-side portfolio (PUB-06).
 * The publishing endpoints return only publishing fields (id, username, published,
 * publishedAt, publicUrl); replacing the full Portfolio with that partial object
 * dropped name/title/template from dashboard and editor state.
 */
export function mergePublishingResult(
  current: Portfolio,
  result: Partial<Portfolio>
): Portfolio {
  return { ...current, ...result };
}

/**
 * True when the modal is being pointed at a different portfolio, which is the
 * only case where its transient feedback should be cleared (post-QA fix).
 * An updated copy of the same portfolio (same id) keeps the feedback.
 */
export function isDifferentPortfolio(
  previous: Pick<Portfolio, "id">,
  next: Pick<Portfolio, "id">
): boolean {
  return previous.id !== next.id;
}

export default function PublishModal({
  isOpen,
  onClose,
  portfolio,
  token,
  onPortfolioUpdated,
}: PublishModalProps): React.JSX.Element | null {
  const modalTitleId = useId();
  const usernameHelpId = useId();
  // DASH-06: focus management only (initial focus, Tab containment, scroll
  // lock, focus restore). Publishing behaviour is unchanged.
  const modalRef = useRef<HTMLDivElement>(null);
  useModalFocus(modalRef, isOpen);

  // Internal portfolio state to reflect updates dynamically
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio>(portfolio);

  // Username availability state
  const [candidateUsername, setCandidateUsername] = useState<string>(
    portfolio.username || ""
  );
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("available");
  const [usernameMessage, setUsernameMessage] = useState<string>("");

  // Action states
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isUnpublishing, setIsUnpublishing] = useState<boolean>(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Synchronize incoming portfolio prop changes.
  // Post-QA fix (Phase 11): parents echo the portfolio this modal just
  // published/unpublished back as a new object via onPortfolioUpdated. Data is
  // always synced, but transient feedback (success/error messages, unpublish
  // confirmation, username status) is reset only when switching to a
  // different portfolio; otherwise the success message was wiped immediately.
  const [prevPortfolio, setPrevPortfolio] = useState(portfolio);
  if (portfolio !== prevPortfolio) {
    const switchedPortfolio = isDifferentPortfolio(prevPortfolio, portfolio);
    setPrevPortfolio(portfolio);
    setCurrentPortfolio(portfolio);
    setCandidateUsername(portfolio.username || "");
    if (switchedPortfolio) {
      setUsernameStatus("available");
      setUsernameMessage("");
      setActionError(null);
      setActionSuccess(null);
      setShowUnpublishConfirm(false);
    }
  }

  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced username availability checker
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const trimmed = candidateUsername.trim();

      if (!trimmed) {
        setUsernameStatus("invalid");
        setUsernameMessage("Username is required");
        return;
      }

      if (trimmed.length < 3) {
        setUsernameStatus("invalid");
        setUsernameMessage("Username must be at least 3 characters");
        return;
      }

      if (trimmed.length > 50) {
        setUsernameStatus("invalid");
        setUsernameMessage("Username cannot exceed 50 characters");
        return;
      }

      if (!USERNAME_REGEX.test(trimmed)) {
        setUsernameStatus("invalid");
        setUsernameMessage(
          "Username can only contain letters, numbers, hyphens, and underscores"
        );
        return;
      }

      // If identical to current saved username for this portfolio, it is valid
      if (trimmed.toLowerCase() === currentPortfolio.username.toLowerCase()) {
        setUsernameStatus("available");
        setUsernameMessage("Current portfolio username");
        return;
      }

      setUsernameStatus("validating");
      setUsernameMessage("Checking availability...");

      try {
        const result = await checkUsernameAvailability(
          trimmed,
          token,
          currentPortfolio.id
        );

        if (result.available) {
          setUsernameStatus("available");
          setUsernameMessage("Username is available!");
        } else {
          setUsernameStatus("unavailable");
          setUsernameMessage(result.message || "Username is already taken");
        }
      } catch (err) {
        setUsernameStatus("unavailable");
        if (err instanceof ApiError) {
          setUsernameMessage(err.message);
        } else {
          setUsernameMessage("Unable to verify username availability");
        }
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [candidateUsername, currentPortfolio.id, currentPortfolio.username, token]);

  // Copy to clipboard handler
  const handleCopyUrl = useCallback(async () => {
    const url = getPublicPortfolioUrl(currentPortfolio);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure / test environments
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setActionError("Unable to copy URL to clipboard automatically.");
    }
  }, [currentPortfolio]);

  // Publish action handler
  const handlePublish = async () => {
    if (isPublishing) return;

    setIsPublishing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await publishPortfolio(currentPortfolio.id, token);
      const merged = mergePublishingResult(currentPortfolio, response.portfolio);
      setCurrentPortfolio(merged);
      onPortfolioUpdated(merged);
      setActionSuccess("Portfolio published successfully! Your site is live.");
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("Something went wrong while publishing your portfolio.");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // Unpublish action handler
  const handleUnpublish = async () => {
    if (isUnpublishing) return;

    setIsUnpublishing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await unpublishPortfolio(currentPortfolio.id, token);
      const merged = mergePublishingResult(currentPortfolio, response.portfolio);
      setCurrentPortfolio(merged);
      onPortfolioUpdated(merged);
      setShowUnpublishConfirm(false);
      setActionSuccess("Portfolio has been unpublished. It is now private.");
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("Something went wrong while unpublishing your portfolio.");
      }
    } finally {
      setIsUnpublishing(false);
    }
  };

  if (!isOpen) return null;

  const publicUrl = getPublicPortfolioUrl(currentPortfolio);
  const isPublished = Boolean(currentPortfolio.published);
  const hasBasicInfo =
    Boolean(currentPortfolio.name?.trim()) &&
    Boolean(currentPortfolio.title?.trim());

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      data-testid="publish-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-[#eae6f5] shadow-2xl overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[#f1edf9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf]">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h2
                id={modalTitleId}
                className="text-lg font-bold text-[#0f172a] tracking-tight"
              >
                {isPublished ? "Manage Public Portfolio" : "Publish Your Portfolio"}
              </h2>
              <p className="text-xs text-[#64748b]">
                Control public visibility and your unique URL handle.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8f7fd] rounded-xl transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 sm:px-8 py-6 space-y-6">
          {/* Action Success Alert */}
          {actionSuccess && (
            <div
              data-testid="publish-success-alert"
              className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3 animate-fadeIn"
            >
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{actionSuccess}</div>
            </div>
          )}

          {/* Action Error Alert */}
          {actionError && (
            <div
              data-testid="publish-error-alert"
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 animate-fadeIn"
            >
              <AlertCircleIcon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{actionError}</div>
            </div>
          )}

          {/* 1. Status Indicator Banner */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8f7fd] border border-[#eae6f5]">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  isPublished
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-400"
                }`}
                aria-hidden="true"
              />
              <div>
                <div className="text-xs font-semibold text-[#0f172a]">
                  Status:{" "}
                  <span
                    data-testid="publishing-status-text"
                    className={`font-bold ${
                      isPublished ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {isPublished ? "Published (Live)" : "Draft (Unpublished)"}
                  </span>
                </div>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  {isPublished
                    ? "Your portfolio is live and accessible to anyone with your link."
                    : "Your portfolio is private. Only you can view and edit it."}
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPublished
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {isPublished ? "Live" : "Draft"}
            </span>
          </div>

          {/* 2. Public URL Display & Actions (when Published) */}
          {isPublished && (
            <div data-testid="public-url-section" className="space-y-3">
              <label className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider">
                Public Portfolio URL
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 flex items-center px-3.5 py-2.5 rounded-xl border border-[#eae6f5] bg-[#fbfaff] font-mono text-xs text-[#0f172a] truncate">
                  <span className="text-[#64748b] select-none truncate">
                    {publicUrl}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    data-testid="copy-public-url-button"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#eae4fc] border border-[#dcd3f8] transition-all cursor-pointer min-h-[40px]"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-4 h-4" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="open-public-portfolio-link"
                    className="inline-flex items-center justify-center p-2.5 rounded-xl text-xs font-semibold text-[#475569] bg-[#f8f7fd] hover:bg-[#ede9f8] hover:text-[#0f172a] border border-[#eae6f5] transition-all min-h-[40px]"
                    title="Open live portfolio in a new tab"
                  >
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 3. Username Availability Verification */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="publish-modal-username"
                className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
              >
                Public Username Handle
              </label>
              <span className="text-[11px] font-mono text-[#64748b]">
                /u/{candidateUsername || "..."}
              </span>
            </div>

            <div
              className={`flex items-center rounded-xl border bg-[#fbfaff] transition-all overflow-hidden ${
                usernameStatus === "invalid" || usernameStatus === "unavailable"
                  ? "border-rose-300 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-200"
                  : usernameStatus === "available"
                  ? "border-emerald-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200"
                  : "border-[#eae6f5] focus-within:border-[#6e56cf] focus-within:ring-2 focus-within:ring-[#6e56cf]/20"
              }`}
            >
              <span className="px-3.5 py-2.5 text-xs font-mono text-[#475569] bg-[#f4f2fa] border-r border-[#eae6f5] select-none">
                /u/
              </span>
              {/* DASH-05: read-only. Publishing always uses the saved username;
                  it is changed in the portfolio editor, never here. */}
              <input
                id="publish-modal-username"
                type="text"
                readOnly
                aria-readonly="true"
                aria-describedby={usernameHelpId}
                data-testid="publish-modal-username"
                value={candidateUsername}
                placeholder="yourhandle"
                className="flex-1 min-w-0 px-3.5 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] bg-transparent focus:outline-none font-mono cursor-default"
              />
            </div>

            <p
              id={usernameHelpId}
              data-testid="username-managed-in-editor"
              className="text-[11px] text-[#64748b] leading-relaxed"
            >
              Your username is managed in the portfolio editor.{" "}
              <Link
                href={`/portfolio/edit/${encodeURIComponent(currentPortfolio.id)}`}
                onClick={onClose}
                data-testid="edit-username-link"
                className="font-semibold text-[#6e56cf] hover:text-[#5d46be] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf]"
              >
                Change username in editor
              </Link>
            </p>

            {/* Username feedback message */}
            {usernameMessage && (
              <p
                data-testid="username-availability-message"
                className={`flex items-center gap-1.5 text-xs font-medium mt-1 ${
                  usernameStatus === "available"
                    ? "text-emerald-700"
                    : usernameStatus === "validating"
                    ? "text-[#6e56cf]"
                    : "text-rose-600"
                }`}
              >
                {usernameStatus === "available" ? (
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : usernameStatus === "validating" ? (
                  <span className="w-3 h-3 border-2 border-[#6e56cf]/30 border-t-[#6e56cf] rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <AlertCircleIcon className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                )}
                <span>{usernameMessage}</span>
              </p>
            )}
          </div>

          {/* 4. Pre-Publishing Checklist (when Draft) */}
          {!isPublished && (
            <div className="p-4 rounded-2xl bg-[#faf9fd] border border-[#eae6f5] space-y-2 text-xs">
              <h4 className="font-semibold text-[#0f172a]">
                Publishing Readiness Checklist
              </h4>
              <ul className="space-y-1.5 text-[#64748b]">
                <li className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      hasBasicInfo
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {hasBasicInfo ? "✓" : "!"}
                  </span>
                  <span>
                    Full Name &amp; Professional Title configured (
                    {hasBasicInfo ? "Ready" : "Missing"})
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      usernameStatus === "available"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {usernameStatus === "available" ? "✓" : "!"}
                  </span>
                  <span>
                    Valid &amp; available username handle (
                    {usernameStatus === "available" ? "Ready" : "Requires valid handle"})
                  </span>
                </li>
              </ul>
            </div>
          )}

          {/* 5. Unpublish Confirmation Box */}
          {showUnpublishConfirm && (
            <div
              data-testid="unpublish-confirm-dialog"
              className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-fadeIn"
            >
              <div className="flex items-start gap-3">
                <AlertCircleIcon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-900">
                    Are you sure you want to unpublish?
                  </h4>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    Visitors visiting{" "}
                    <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-rose-900 font-bold">
                      /u/{currentPortfolio.username}
                    </code>{" "}
                    will immediately receive a 404 page. Your portfolio data,
                    projects, skills, and claimed handle will remain completely safe.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isUnpublishing}
                  onClick={() => setShowUnpublishConfirm(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#475569] bg-white border border-rose-200 hover:bg-rose-50/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isUnpublishing}
                  onClick={handleUnpublish}
                  data-testid="confirm-unpublish-button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUnpublishing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Unpublishing...</span>
                    </>
                  ) : (
                    <span>Confirm Unpublish</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 bg-[#fbfaff] border-t border-[#f1edf9]">
          <div>
            {isPublished && !showUnpublishConfirm && (
              <button
                type="button"
                disabled={isPublishing || isUnpublishing}
                onClick={() => setShowUnpublishConfirm(true)}
                data-testid="unpublish-trigger-button"
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
              >
                Unpublish Portfolio
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing || isUnpublishing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#475569] bg-white border border-[#eae6f5] hover:bg-[#faf9fd] transition-colors cursor-pointer disabled:opacity-50"
            >
              Close
            </button>

            {!isPublished ? (
              <button
                type="button"
                onClick={handlePublish}
                disabled={
                  isPublishing ||
                  !hasBasicInfo ||
                  usernameStatus !== "available"
                }
                data-testid="publish-submit-button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5b45b2] shadow-md shadow-[#6e56cf]/25 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Publish to Live Site</span>
                  </>
                )}
              </button>
            ) : (
              <Link
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all active:scale-[0.98]"
              >
                <ExternalLinkIcon className="w-4 h-4" />
                <span>Visit Live Portfolio</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
