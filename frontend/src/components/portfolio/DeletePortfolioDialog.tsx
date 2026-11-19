"use client";

import React, { useId, useRef, useState } from "react";
import type { Portfolio } from "@/types/portfolio";
import { AlertCircleIcon, Trash2Icon } from "@/components/portfolio/PortfolioIcons";
import {
  describeDeletedContent,
  getPortfolioStatus,
  matchesDeleteConfirmation,
} from "@/lib/dashboard";
import { useModalFocus } from "@/lib/useModalFocus";

export interface DeletePortfolioDialogProps {
  portfolio: Portfolio;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * Element id to focus when the dialog closes and the original trigger no
   * longer exists (e.g. the deleted card). Should be focusable (tabIndex -1).
   */
  fallbackFocusId?: string;
}

/**
 * Confirmation dialog for permanently deleting a portfolio (DASH-05).
 *
 * Uses the native <dialog> with showModal(), so the rest of the page is inert
 * (no background clicks or keyboard focus) and Escape is handled by the
 * browser. Live portfolios require typing the username to confirm.
 */
export default function DeletePortfolioDialog({
  portfolio,
  isDeleting,
  error,
  onConfirm,
  onCancel,
  fallbackFocusId,
}: DeletePortfolioDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const confirmInputId = useId();
  const [confirmText, setConfirmText] = useState("");

  const isLive = getPortfolioStatus(portfolio) === "live";
  const contentSummary = describeDeletedContent(portfolio.sectionCounts);
  const canConfirm = !isDeleting && (!isLive || matchesDeleteConfirmation(confirmText, portfolio.username));

  // Native modal (background inert, top layer), opened by the hook after it
  // records the trigger. DASH-06: initial focus on Cancel, Tab wraps inside the
  // dialog (native <dialog> would otherwise let Tab leave to the browser
  // chrome), scroll lock, and focus restoration to the trigger or fallback.
  useModalFocus(dialogRef, true, { initialFocusRef: cancelRef, fallbackFocusId, nativeDialog: true });

  const requestCancel = () => {
    if (!isDeleting) onCancel();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (canConfirm) onConfirm();
  };

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={isDeleting}
      data-testid="delete-portfolio-dialog"
      onCancel={(e) => {
        // Escape: the parent controls visibility, and deletion can't be interrupted
        e.preventDefault();
        requestCancel();
      }}
      onClick={(e) => {
        // Click on the backdrop area (the dialog element itself)
        if (e.target === e.currentTarget) requestCancel();
      }}
      className="fixed inset-0 m-0 p-4 sm:p-6 w-full h-full max-w-none max-h-none bg-transparent backdrop:bg-slate-900/60 open:flex items-center justify-center overflow-y-auto"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-3xl border border-[#eae6f5] shadow-2xl overflow-hidden"
      >
        <div className="px-6 sm:px-7 pt-6 pb-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0">
              <Trash2Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold text-[#0f172a] tracking-tight break-words">
                Delete &ldquo;{portfolio.title}&rdquo;?
              </h2>
              <p className="text-xs font-mono text-[#64748b] truncate">@{portfolio.username}</p>
            </div>
          </div>

          <p id={descriptionId} className="text-sm text-[#475569] leading-relaxed">
            This permanently deletes this portfolio and all of its content, including{" "}
            {contentSummary ? (
              <strong className="font-semibold text-[#0f172a]">{contentSummary}</strong>
            ) : (
              "its projects, skills and experience entries"
            )}
            . <strong className="font-semibold text-[#0f172a]">This can&apos;t be undone.</strong>
          </p>

          {isLive && (
            <div
              data-testid="delete-live-warning"
              className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3"
            >
              <p className="leading-relaxed">
                <strong className="font-semibold">This portfolio is live.</strong> Its public page at{" "}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded break-all">
                  /u/{portfolio.username}
                </code>{" "}
                will stop working immediately, and the username will become available to other users.
              </p>
              <div>
                <label htmlFor={confirmInputId} className="block font-semibold mb-1.5 break-words">
                  {/* DASH-06: break-all so long (up to 50 char) usernames wrap on mobile */}
                  Type <span className="font-mono break-all">{portfolio.username}</span> to confirm
                </label>
                <input
                  id={confirmInputId}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={confirmText}
                  disabled={isDeleting}
                  onChange={(e) => setConfirmText(e.target.value)}
                  data-testid="delete-confirm-input"
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
                />
              </div>
            </div>
          )}

          <p className="text-[11px] text-[#64748b]">
            CV files you uploaded are kept in your account.
          </p>

          {error && (
            <div
              role="alert"
              data-testid="delete-error"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2"
            >
              <AlertCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 sm:px-7 py-4 bg-[#fbfaff] border-t border-[#f1edf9]">
          <button
            ref={cancelRef}
            type="button"
            onClick={requestCancel}
            disabled={isDeleting}
            data-testid="delete-cancel-button"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-[#475569] bg-white border border-[#eae6f5] hover:bg-[#faf9fd] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canConfirm}
            data-testid="delete-confirm-button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            {isDeleting ? (
              <>
                <span
                  className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete portfolio</span>
            )}
          </button>
        </div>
      </form>
    </dialog>
  );
}
