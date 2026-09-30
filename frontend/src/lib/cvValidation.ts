/**
 * Client-side CV File Validation Utilities (CV-08)
 */

import { CvFileValidationResult } from "../types/cv";

export const CV_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const CV_ALLOWED_EXTENSION = ".pdf";
export const CV_ALLOWED_MIME_TYPES = ["application/pdf", "application/x-pdf"];

/**
 * Validates a candidate CV file on the client before network upload.
 * Returns isValid: true or an informative error message.
 */
export function validateCvFile(file: File | null | undefined): CvFileValidationResult {
  if (!file) {
    return {
      isValid: false,
      error: "Please select a CV file to upload.",
    };
  }

  const fileName = file.name || "";
  const lowerName = fileName.toLowerCase();

  // Validate file extension
  if (!lowerName.endsWith(CV_ALLOWED_EXTENSION)) {
    return {
      isValid: false,
      error: "Only PDF documents (.pdf) are supported. Please select a valid PDF file.",
    };
  }

  // Validate MIME type if browser populated it
  if (file.type && !CV_ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: "Invalid file type. Only PDF documents (application/pdf) are supported.",
    };
  }

  // Validate non-empty file
  if (file.size === 0) {
    return {
      isValid: false,
      error: "The selected file is empty (0 bytes). Please upload a valid CV document.",
    };
  }

  // Validate maximum file size (5MB)
  if (file.size > CV_MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: "File size exceeds the 5MB limit. Please upload a PDF under 5MB.",
    };
  }

  return { isValid: true };
}

/**
 * Formats byte values into human-readable size strings (KB, MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 Bytes";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
