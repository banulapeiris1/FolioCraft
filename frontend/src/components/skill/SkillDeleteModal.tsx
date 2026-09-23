"use client";

import React, { useEffect } from "react";
import {
  Trash2Icon,
  AlertCircleIcon,
  XIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface SkillDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  skillName: string;
  isDeleting?: boolean;
  error?: string | null;
}

export default function SkillDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  skillName,
  isDeleting = false,
  error = null,
}: SkillDeleteModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-delete-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0f172a]/40 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl shadow-rose-900/10 max-w-md w-full p-6 sm:p-7 relative">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0">
            <Trash2Icon className="w-5 h-5" />
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8f7fd] border border-transparent hover:border-[#eae6f5] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">
          <h3
            id="skill-delete-confirm-title"
            className="text-lg font-bold text-[#0f172a] tracking-tight"
          >
            Remove Skill
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-[#64748b] leading-relaxed">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-[#0f172a] break-words">
              &quot;{skillName}&quot;
            </span>{" "}
            from your portfolio? This action cannot be undone.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5">
            <AlertCircleIcon className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-semibold text-rose-900 leading-relaxed">
              {error}
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#475569] hover:text-[#0f172a] bg-[#f8f7fd] hover:bg-[#f1edf9] border border-[#eae6f5] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/25 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <span>Remove Skill</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
