import path from "node:path";

// CV File Upload Validation Constants (CV-03)
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB limit
export const ALLOWED_MIME_TYPES = ["application/pdf"] as const;
export const ALLOWED_EXTENSIONS = [".pdf"] as const;

// PDF magic byte signature: %PDF (0x25, 0x50, 0x44, 0x46)
export const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationInput {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
}

/**
 * Inspects a byte buffer to check for the PDF magic-byte header (%PDF).
 * Valid PDF files must begin with %PDF (0x25, 0x50, 0x44, 0x46).
 */
export function isPdfMagicBytes(buffer: Buffer | Uint8Array | undefined | null): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }
  return (
    buffer[0] === 0x25 && // '%'
    buffer[1] === 0x50 && // 'P'
    buffer[2] === 0x44 && // 'D'
    buffer[3] === 0x46    // 'F'
  );
}

/**
 * Sanitizes an uploaded filename to prevent directory traversal (e.g. ../../)
 * and strip control/illegal filesystem characters.
 */
export function sanitizeFileName(rawFileName: string | undefined | null): string {
  if (!rawFileName || typeof rawFileName !== "string") {
    return "cv_document.pdf";
  }

  // Extract base name to strip directory paths and traversal sequences
  const baseName = path.basename(rawFileName.trim());

  // Remove null bytes, control characters, and illegal filesystem characters
  const sanitized = baseName
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/[\/\\]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim();

  return sanitized || "cv_document.pdf";
}

/**
 * Comprehensive validation for a CV file upload:
 * - Checks file presence
 * - Validates .pdf extension (case-insensitive)
 * - Validates application/pdf MIME type
 * - Enforces 5 MB file size limit
 * - Enforces %PDF magic byte signature on buffer
 */
export function validateCvFile(file: FileValidationInput | undefined | null): FileValidationResult {
  if (!file) {
    return { valid: false, error: "No CV file provided for upload" };
  }

  // 1. File name and extension check
  if (!file.originalname || typeof file.originalname !== "string") {
    return { valid: false, error: "Invalid or missing file name" };
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== ".pdf") {
    return {
      valid: false,
      error: `Invalid file extension '${ext || "none"}'. Only PDF documents (.pdf) are allowed`,
    };
  }

  // 2. MIME type check
  if (!file.mimetype || file.mimetype.toLowerCase() !== "application/pdf") {
    return {
      valid: false,
      error: `Invalid MIME type '${file.mimetype || "unknown"}'. Only 'application/pdf' is allowed`,
    };
  }

  // 3. File size check
  if (typeof file.size === "number") {
    if (file.size <= 0) {
      return { valid: false, error: "Uploaded file is empty (0 bytes)" };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of 5MB (${(file.size / (1024 * 1024)).toFixed(2)}MB provided)`,
      };
    }
  }

  // 4. PDF magic-byte header inspection
  if (file.buffer) {
    if (!isPdfMagicBytes(file.buffer)) {
      return {
        valid: false,
        error: "Invalid file content: File does not have a valid PDF header signature (%PDF)",
      };
    }
  }

  return { valid: true };
}
