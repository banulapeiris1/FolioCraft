import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "node:path";
import {
  MAX_FILE_SIZE_BYTES,
  isPdfMagicBytes,
  sanitizeFileName,
} from "../utils/fileValidation";

// Configure multer memory storage for safe transient in-memory buffering
const storage = multer.memoryStorage();

const multerInstance = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // 1. Extension check
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") {
      cb(new Error(`Invalid file extension '${ext || "none"}'. Only PDF documents (.pdf) are allowed`));
      return;
    }

    // 2. MIME type check
    if (file.mimetype.toLowerCase() !== "application/pdf") {
      cb(new Error(`Invalid MIME type '${file.mimetype || "unknown"}'. Only 'application/pdf' is allowed`));
      return;
    }

    cb(null, true);
  },
});

// Pre-configured single file upload handler accepting ONLY the 'file' field
const uploadSingleFile = multerInstance.single("file");

/**
 * Multipart upload middleware for CV documents.
 * Accepts ONLY the 'file' field name according to the FolioCraft specification.
 * Enforces:
 * - 5 MB file size limit
 * - PDF MIME type & extension
 * - %PDF magic-byte validation
 * - Safe filename sanitization
 */
export function uploadCvMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  uploadSingleFile(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({
            message: "File size exceeds maximum limit of 5MB",
          });
          return;
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          res.status(400).json({
            message: `Unexpected file field '${err.field || "unknown"}'. Only 'file' field is allowed`,
          });
          return;
        }
        res.status(400).json({ message: err.message });
        return;
      }

      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
        return;
      }

      res.status(400).json({ message: "An error occurred during file upload" });
      return;
    }

    // 1. Verify file was provided
    if (!req.file) {
      res.status(400).json({ message: "No CV file uploaded. Please provide a file." });
      return;
    }

    // 2. Verify file is not empty (0 bytes)
    if (!req.file.buffer || req.file.buffer.length === 0 || req.file.size === 0) {
      res.status(400).json({ message: "Uploaded file is empty (0 bytes)" });
      return;
    }

    // 3. Inspect PDF magic-byte signature (%PDF)
    if (!isPdfMagicBytes(req.file.buffer)) {
      res.status(400).json({
        message: "Invalid file content: File does not have a valid PDF header signature (%PDF)",
      });
      return;
    }

    // 4. Sanitize original filename to prevent path traversal
    req.file.originalname = sanitizeFileName(req.file.originalname);

    next();
  });
}


