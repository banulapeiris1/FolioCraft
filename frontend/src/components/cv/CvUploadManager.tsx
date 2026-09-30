"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadCv, ApiError } from "@/lib/api";
import { validateCvFile } from "@/lib/cvValidation";
import { CvUiState, StructuredCvData } from "@/types/cv";
import CvDropzone from "./CvDropzone";
import CvParsedPreview from "./CvParsedPreview";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface CvUploadManagerProps {
  portfolioId: string;
}

export default function CvUploadManager({ portfolioId }: CvUploadManagerProps) {
  const { token } = useAuth();

  const [uiState, setUiState] = useState<CvUiState>("IDLE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>("");

  const [parsedData, setParsedData] = useState<StructuredCvData | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState<{
    uploadId: string;
    status: string;
    fileName: string;
  } | null>(null);

  // File selection & client-side validation
  const handleFileSelect = (file: File) => {
    setServerError(null);
    const result = validateCvFile(file);

    if (!result.isValid) {
      setValidationError(result.error || "Invalid file selected.");
      setSelectedFile(null);
      setUiState("IDLE");
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    setUiState("FILE_SELECTED");
  };

  // Clear selected file
  const handleFileRemove = () => {
    setSelectedFile(null);
    setValidationError(null);
    setServerError(null);
    setUiState("IDLE");
  };

  // Perform upload
  const handleUpload = async () => {
    // Prevent duplicate upload or missing prerequisites
    if (uiState === "UPLOADING" || uiState === "PROCESSING") return;

    if (!selectedFile) {
      setValidationError("Please select a PDF file before uploading.");
      return;
    }

    // Re-verify client validation
    const validation = validateCvFile(selectedFile);
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid file.");
      return;
    }

    if (!token) {
      setServerError("Authentication required. Your session may have expired. Please log in again.");
      setUiState("ERROR");
      return;
    }

    // Begin upload state
    setUiState("UPLOADING");
    setProcessingStage("Uploading CV document to server...");
    setServerError(null);
    setValidationError(null);

    try {
      // Simulate quick progression to PROCESSING message for user clarity
      const processingTimer = setTimeout(() => {
        setUiState((current) => {
          if (current === "UPLOADING") {
            setProcessingStage("Extracting and structuring CV sections...");
            return "PROCESSING";
          }
          return current;
        });
      }, 700);

      const response = await uploadCv(selectedFile, portfolioId, token);
      clearTimeout(processingTimer);

      setParsedData(response.parsedData);
      setUploadMetadata({
        uploadId: response.uploadId,
        status: response.status,
        fileName: response.upload?.fileName || selectedFile.name,
      });
      setUiState("SUCCESS");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setServerError("Your session has expired. Please log in again.");
        } else if (err.status === 400) {
          setServerError(err.message || "Invalid CV file or format.");
        } else if (err.status === 404) {
          setServerError("Portfolio not found or you do not have permission to attach a CV to it.");
        } else {
          setServerError(err.message || "An error occurred while uploading your CV.");
        }
      } else {
        setServerError("Unable to connect to the server. Please check your internet connection.");
      }
      setUiState("ERROR");
    }
  };

  // Reset to upload another file
  const handleReset = () => {
    setSelectedFile(null);
    setValidationError(null);
    setServerError(null);
    setParsedData(null);
    setUploadMetadata(null);
    setUiState("IDLE");
  };

  const isWorking = uiState === "UPLOADING" || uiState === "PROCESSING";

  return (
    <div className="space-y-6">
      {/* Intro Guidance Header */}
      <div className="bg-white rounded-3xl border border-[#eae6f5] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0f172a] tracking-tight">
              CV Document Parser
            </h2>
            <p className="text-xs sm:text-sm text-[#64748b] mt-1 max-w-2xl leading-relaxed">
              Upload your resume or curriculum vitae in PDF format. FolioCraft will parse your
              personal info, career experience, education history, technical skills, and projects.
            </p>
          </div>
          {uiState === "SUCCESS" && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e56cf] bg-[#f3f0ff] hover:bg-[#eae4fa] border border-[#dcd3f8] transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              Upload Another CV
            </button>
          )}
        </div>

        {/* Dropzone Area (Shown when not in SUCCESS state) */}
        {uiState !== "SUCCESS" && (
          <div className="mt-6">
            <CvDropzone
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              disabled={isWorking}
              validationError={validationError}
            />

            {/* Actions Bar for FILE_SELECTED / ERROR / WORKING */}
            {selectedFile && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#f0ecf9]">
                <div className="text-xs text-[#64748b]">
                  {isWorking ? (
                    <span className="inline-flex items-center gap-2 font-semibold text-[#6e56cf]">
                      <span className="w-3.5 h-3.5 border-2 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin" />
                      {processingStage}
                    </span>
                  ) : uiState === "ERROR" ? (
                    <span className="text-rose-600 font-semibold">
                      Upload failed. You can retry with this file or select a different one.
                    </span>
                  ) : (
                    <span>Click the button to process and analyze this CV.</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {uiState === "ERROR" ? (
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={isWorking}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      <span>Try Again</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={isWorking || Boolean(validationError)}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isWorking ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing CV...</span>
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-4 h-4" />
                          <span>Upload & Parse CV</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload / Server Error Alert */}
      {serverError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 sm:p-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircleIcon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-rose-900">
              CV Upload / Processing Failed
            </h4>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              {serverError}
            </p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {uiState === "SUCCESS" && uploadMetadata && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
              CV Uploaded and Parsed Successfully!
            </h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              Extracted structured data from <span className="font-semibold">{uploadMetadata.fileName}</span>.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-emerald-700">
              <span>Status: {uploadMetadata.status}</span>
              <span>•</span>
              <span>ID: {uploadMetadata.uploadId}</span>
            </div>
          </div>
        </div>
      )}

      {/* Parsed CV Structured Data Preview */}
      {uiState === "SUCCESS" && parsedData && (
        <CvParsedPreview
          data={parsedData}
          uploadId={uploadMetadata?.uploadId}
          fileName={uploadMetadata?.fileName}
        />
      )}
    </div>
  );
}
