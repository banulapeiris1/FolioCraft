import { pool } from "../config/database";
import { AppError } from "../utils/errors";
import { extractTextFromPdf } from "./pdfExtraction.service";
import { detectCvSections } from "./sectionDetection.service";
import { extractStructuredCv } from "./structuredExtraction.service";
import type { CvUpload, CvUploadStatus } from "../types/cv.types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProcessCvUploadInput {
  userId: string;
  portfolioId?: string | null;
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
}

export interface CvUploadDbRow {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  status: string;
  raw_text: string | null;
  parsed_data: unknown;
  error_message: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export function mapCvUploadRowToEntity(row: CvUploadDbRow): CvUpload {
  let parsed: Record<string, unknown>;
  if (typeof row.parsed_data === "string") {
    try {
      parsed = JSON.parse(row.parsed_data);
    } catch {
      parsed = {};
    }
  } else if (row.parsed_data && typeof row.parsed_data === "object") {
    parsed = row.parsed_data as Record<string, unknown>;
  } else {
    parsed = {};
  }

  return {
    id: row.id,
    userId: row.user_id,
    portfolioId: row.portfolio_id,
    fileName: row.file_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    status: row.status as CvUploadStatus,
    rawText: row.raw_text,
    parsedData: parsed,
    errorMessage: row.error_message,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at
        : new Date(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at
        : new Date(row.updated_at),
  };
}

export class CvUploadService {
  /**
   * Processes a validated CV upload through the extraction pipeline:
   * 1. Verifies user identity & optional portfolio ownership
   * 2. Inserts initial cv_uploads record with 'PROCESSING' status
   * 3. Extracts raw text via CV-04 extractTextFromPdf()
   * 4. Detects CV sections via CV-05 detectCvSections()
   * 5. Performs structured extraction via CV-06 extractStructuredCv()
   * 6. Updates database record to 'COMPLETED' (or 'FAILED' on error)
   */
  async processCvUpload(input: ProcessCvUploadInput): Promise<CvUpload> {
    const { userId, file } = input;

    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    let verifiedPortfolioId: string | null = null;

    // Validate optional portfolio association and enforce strict user ownership
    if (input.portfolioId) {
      const pId = input.portfolioId.trim();
      if (!UUID_REGEX.test(pId)) {
        throw new AppError("Portfolio not found", 404);
      }

      const pRes = await pool.query<{ id: string; user_id: string }>(
        `SELECT id, user_id FROM portfolios WHERE id = $1`,
        [pId]
      );

      const portfolio = pRes.rows[0];
      if (!portfolio) {
        throw new AppError("Portfolio not found", 404);
      }

      if (portfolio.user_id !== userId) {
        throw new AppError("Unauthorized to attach CV to this portfolio", 403);
      }

      verifiedPortfolioId = portfolio.id;
    }

    // 1. Insert initial cv_uploads record in PROCESSING state
    const insertRes = await pool.query<CvUploadDbRow>(
      `INSERT INTO cv_uploads (
        user_id,
        portfolio_id,
        file_name,
        file_size,
        mime_type,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'PROCESSING')
      RETURNING id, user_id, portfolio_id, file_name, file_size, mime_type, status, raw_text, parsed_data, error_message, created_at, updated_at`,
      [
        userId,
        verifiedPortfolioId,
        file.originalname,
        file.size,
        file.mimetype,
      ]
    );

    const initialRecord = insertRes.rows[0]!;
    const recordId = initialRecord.id;

    // 2. Execute extraction pipeline
    try {
      // Step A: CV-04 PDF text extraction (in-memory Buffer)
      const extraction = await extractTextFromPdf(file.buffer);

      // Step B: CV-05 Section detection (plain text input)
      const sections = detectCvSections(extraction.text);

      // Step C: CV-06 Structured entity extraction
      const structuredData = extractStructuredCv(sections);
      structuredData.totalPages = extraction.totalPages;
      structuredData.pageTexts = extraction.pages;

      // Step D: Update database record to COMPLETED with raw text and structured JSON
      const updateRes = await pool.query<CvUploadDbRow>(
        `UPDATE cv_uploads
         SET status = 'COMPLETED',
             raw_text = $1,
             parsed_data = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, user_id, portfolio_id, file_name, file_size, mime_type, status, raw_text, parsed_data, error_message, created_at, updated_at`,
        [extraction.text, JSON.stringify(structuredData), recordId]
      );

      return mapCvUploadRowToEntity(updateRes.rows[0]!);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to process CV document";

      // Persist FAILED status with error message in database
      await pool.query(
        `UPDATE cv_uploads
         SET status = 'FAILED',
             error_message = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [errorMessage, recordId]
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(errorMessage, 400);
    }
  }

  /**
   * Retrieves a CV upload record by ID with ownership verification.
   */
  async getUploadById(uploadId: string, userId: string): Promise<CvUpload> {
    if (!uploadId || !UUID_REGEX.test(uploadId)) {
      throw new AppError("CV upload not found", 404);
    }
    if (!userId || !UUID_REGEX.test(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const res = await pool.query<CvUploadDbRow>(
      `SELECT id, user_id, portfolio_id, file_name, file_size, mime_type, status, raw_text, parsed_data, error_message, created_at, updated_at
       FROM cv_uploads
       WHERE id = $1`,
      [uploadId]
    );

    const record = res.rows[0];
    if (!record) {
      throw new AppError("CV upload not found", 404);
    }

    if (record.user_id !== userId) {
      throw new AppError("Unauthorized to access this CV upload", 403);
    }

    return mapCvUploadRowToEntity(record);
  }
}

export const cvUploadService = new CvUploadService();
