"use client";

import React, { useEffect } from "react";
import { XIcon } from "@/components/portfolio/PortfolioIcons";

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function ProjectModal({
  isOpen,
  onClose,
  title,
  description,
  children,
}: ProjectModalProps) {
  // Close on Escape key press
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
      aria-labelledby="project-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0f172a]/40 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl shadow-[#6e56cf]/10 max-w-xl w-full p-6 sm:p-8 relative my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 mb-6 border-b border-[#f1edf9]">
          <div>
            <h2
              id="project-modal-title"
              className="text-lg sm:text-xl font-bold text-[#0f172a] tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs text-[#64748b] mt-1">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8f7fd] border border-transparent hover:border-[#eae6f5] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
