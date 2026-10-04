import { extractText } from "unpdf";
import { AppError } from "../utils/errors";
import { isPdfMagicBytes } from "../utils/fileValidation";

/**
 * Custom error thrown when PDF text extraction fails.
 * Extends AppError with a 400 Bad Request status code.
 */
export class PdfExtractionError extends AppError {
  constructor(message: string = "Failed to extract text from PDF document", statusCode: number = 400) {
    super(message, statusCode);
    this.name = "PdfExtractionError";
  }
}

export interface PdfExtractionOptions {
  /**
   * Whether to normalize whitespace (collapse redundant spaces and empty lines, strip trailing spaces, trim).
   * Defaults to true.
   */
  normalizeWhitespace?: boolean;
}

export interface PdfExtractionResult {
  /**
   * The combined extracted text from the PDF document.
   */
  text: string;
  /**
   * Total number of pages detected in the document.
   */
  totalPages: number;
  /**
   * Array of extracted text strings, indexed per page.
   */
  pages: string[];
  /**
   * Indicates whether any non-whitespace text was extractable from the document.
   */
  hasText: boolean;
}

/**
 * Normalizes raw extracted PDF text:
 * - Standardizes line breaks (\r\n and \r to \n)
 * - Replaces non-breaking spaces (\u00A0) and non-standard spaces with standard space
 * - Trims trailing whitespace on each line
 * - Collapses multiple horizontal spaces or tabs into a single space
 * - Collapses 3 or more consecutive newlines down to 2 newlines (preserving paragraph breaks)
 * - Trims leading and trailing whitespace from the document
 */
export function normalizePdfText(rawText: string): string {
  if (!rawText) {
    return "";
  }

  return rawText
    .replace(/\r\n|\r/g, "\n")
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Reusable backend service for extracting raw text from an uploaded PDF Buffer.
 *
 * Requirements (CV-04):
 * - Accepts uploaded PDF as a Buffer in-memory.
 * - Zero disk persistence (processes in-memory with Uint8Array).
 * - Distinguishes between valid empty/no-text PDFs and corrupt/invalid PDF failures.
 * - Safely wraps low-level parser errors to avoid exposing internals.
 * - Completely independent of section parsing, entity extraction, or database logic.
 */
export async function extractTextFromPdf(
  buffer: Buffer,
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult> {
  // Validate that input is a valid non-empty Buffer
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new PdfExtractionError("Empty or invalid PDF buffer provided", 400);
  }

  // Validate PDF magic bytes header (%PDF)
  if (!isPdfMagicBytes(buffer)) {
    throw new PdfExtractionError("Invalid or corrupt PDF document: missing PDF header", 400);
  }

  const shouldNormalize = options.normalizeWhitespace !== false;

  try {
    // Convert Node Buffer to an independent Uint8Array copy for unpdf/pdfjs
    // to prevent worker thread transfers from detaching the caller's ArrayBuffer
    const uint8Array = new Uint8Array(buffer.length);
    uint8Array.set(buffer);

    const result = await extractText(uint8Array, { mergePages: false });

    const rawPages = Array.isArray(result.text) ? result.text : [result.text];
    const processedPages = shouldNormalize
      ? rawPages.map((pageText) => normalizePdfText(pageText))
      : rawPages;

    const totalPages = result.totalPages || processedPages.length;
    const combinedText = shouldNormalize
      ? processedPages.filter((page) => page.length > 0).join("\n\n").trim()
      : processedPages.join("\n\n").trim();

    return {
      text: combinedText,
      totalPages,
      pages: processedPages,
      hasText: combinedText.length > 0,
    };
  } catch (err: unknown) {
    if (err instanceof PdfExtractionError) {
      throw err;
    }
    // Safely wrap low-level parser errors to avoid exposing internal details
    throw new PdfExtractionError("Failed to extract text from PDF document", 400);
  }
}
