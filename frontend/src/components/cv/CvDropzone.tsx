"use client";

import React, { useRef, useState } from "react";
import { formatFileSize } from "@/lib/cvValidation";
import { FileTextIcon, AlertCircleIcon, XIcon } from "@/components/portfolio/PortfolioIcons";

interface CvDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
  validationError?: string | null;
}

export default function CvDropzone({
  selectedFile,
  onFileSelect,
  onFileRemove,
  disabled = false,
  validationError = null,
}: CvDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      onFileSelect(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const pickedFile = e.target.files[0];
      onFileSelect(pickedFile);
      // Reset input value so re-selecting the same file triggers change
      e.target.value = "";
    }
  };

  const handleClickArea = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
        id="cv-file-input"
        aria-label="Upload CV PDF file"
      />

      {!selectedFile ? (
        /* Empty / Idle State Dropzone */
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handleClickArea}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Drag and drop your CV PDF here or click to browse"
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer select-none ${
            isDragOver
              ? "border-[#6e56cf] bg-[#f5f3ff] scale-[1.01]"
              : validationError
              ? "border-rose-300 bg-rose-50/40 hover:bg-rose-50/70"
              : "border-[#d8d2ec] bg-white hover:border-[#6e56cf] hover:bg-[#faf9fd]"
          } ${disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
        >
          <div className="flex flex-col items-center justify-center max-w-md mx-auto">
            {/* Upload Icon Badge */}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform ${
                isDragOver
                  ? "bg-[#6e56cf] text-white scale-110 shadow-lg shadow-[#6e56cf]/25"
                  : "bg-[#f3f0ff] text-[#6e56cf] border border-[#dcd3f8]"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[#0f172a] mb-1.5">
              {isDragOver ? "Drop your PDF file here" : "Choose your CV or drag & drop"}
            </h3>
            <p className="text-xs sm:text-sm text-[#64748b] mb-4">
              Click to browse your documents or drop a PDF directly into this box.
            </p>

            {/* Validation Constraints Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#64748b]">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f1edf9] text-[#6e56cf] font-semibold border border-[#e4daf7]">
                PDF documents only (.pdf)
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5]">
                Maximum file size: 5MB
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf] shrink-0">
                <FileTextIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4
                    className="text-sm sm:text-base font-bold text-[#0f172a] truncate"
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Size:{" "}
                  <span className="font-semibold text-[#0f172a]">
                    {formatFileSize(selectedFile.size)}
                  </span>{" "}
                  • PDF Document
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleClickArea}
                disabled={disabled}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#eae4fa] border border-[#dcd3f8] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Change selected CV file"
              >
                Change File
              </button>
              <button
                type="button"
                onClick={onFileRemove}
                disabled={disabled}
                className="p-2 rounded-xl text-[#64748b] hover:text-rose-600 hover:bg-rose-50 border border-[#eae6f5] hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Remove selected CV file"
                title="Remove file"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client-side Validation Error Banner */}
      {validationError && (
        <div className="mt-3 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
          <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
