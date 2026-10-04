import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  extractTextFromPdf,
  normalizePdfText,
  PdfExtractionError,
} from "./pdfExtraction.service";
import { AppError } from "../utils/errors";

const FIXTURES_DIR = path.resolve(__dirname, "../../test/fixtures");

test("CV-04: PDF Text Extraction Service Unit Tests", async (t) => {
  // 1. Text normalization helper tests
  await t.test("normalizePdfText() cleans whitespace, trailing spaces, and redundant blank lines", () => {
    const raw = "  John   Doe  \r\n\r\n\r\nSoftware   Engineer \t \r\n\n\nSkills:\u00A0TypeScript   \n\n";
    const normalized = normalizePdfText(raw);

    assert.equal(
      normalized,
      "John Doe\n\nSoftware Engineer\n\nSkills: TypeScript"
    );
  });

  await t.test("normalizePdfText() handles empty or falsy strings gracefully", () => {
    assert.equal(normalizePdfText(""), "");
    assert.equal(normalizePdfText("   \n\n\t  "), "");
  });

  // 2. Valid single-page PDF extraction
  await t.test("extractTextFromPdf() extracts text correctly from a valid single-page PDF fixture", async () => {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.pdf"));
    const result = await extractTextFromPdf(pdfBuffer);

    assert.equal(result.totalPages, 1);
    assert.equal(result.pages.length, 1);
    assert.equal(result.hasText, true);
    assert.match(result.text, /John Doe - Senior Software Engineer/);
    assert.equal(result.pages[0], result.text);
  });

  // 3. Multi-page PDF extraction
  await t.test("extractTextFromPdf() extracts text from each page in a multi-page PDF", async () => {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "multi-page.pdf"));
    const result = await extractTextFromPdf(pdfBuffer);

    assert.equal(result.totalPages, 3);
    assert.equal(result.pages.length, 3);
    assert.equal(result.hasText, true);
    assert.match(result.pages[0] || "", /Page 1: Overview and Summary/);
    assert.match(result.pages[1] || "", /Page 2: Work Experience and Projects/);
    assert.match(result.pages[2] || "", /Page 3: Education and Skills/);
    assert.match(result.text, /Page 1: Overview and Summary[\s\S]*Page 2: Work Experience and Projects[\s\S]*Page 3: Education and Skills/);
  });

  // 4. PDF with no extractable text (handled safely without throwing)
  await t.test("extractTextFromPdf() handles a PDF with no extractable text safely without throwing", async () => {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "empty-text.pdf"));
    const result = await extractTextFromPdf(pdfBuffer);

    assert.equal(result.totalPages, 1);
    assert.equal(result.hasText, false);
    assert.equal(result.text, "");
    assert.deepEqual(result.pages, [""]);
  });

  // 5. Options: normalizeWhitespace = false preserves raw spacing
  await t.test("extractTextFromPdf() respects normalizeWhitespace: false", async () => {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.pdf"));
    const result = await extractTextFromPdf(pdfBuffer, { normalizeWhitespace: false });

    assert.equal(result.totalPages, 1);
    assert.equal(result.hasText, true);
    assert.match(result.text, /John Doe - Senior Software Engineer/);
  });

  // 6. Malformed/corrupt PDF buffer
  await t.test("extractTextFromPdf() rejects corrupt PDF buffer with PdfExtractionError", async () => {
    const corruptBuffer = Buffer.from("%PDF-1.4\ncorrupt header with invalid content and EOF missing");

    await assert.rejects(
      async () => {
        await extractTextFromPdf(corruptBuffer);
      },
      (err: unknown) => {
        assert.ok(err instanceof PdfExtractionError);
        assert.ok(err instanceof AppError);
        assert.equal((err as PdfExtractionError).statusCode, 400);
        assert.equal((err as PdfExtractionError).message, "Failed to extract text from PDF document");
        return true;
      }
    );
  });

  // 7. Non-PDF buffer (missing %PDF header)
  await t.test("extractTextFromPdf() rejects buffer missing PDF magic bytes", async () => {
    const nonPdfBuffer = Buffer.from("<html><body>Not a PDF</body></html>");

    await assert.rejects(
      async () => {
        await extractTextFromPdf(nonPdfBuffer);
      },
      (err: unknown) => {
        assert.ok(err instanceof PdfExtractionError);
        assert.equal((err as PdfExtractionError).statusCode, 400);
        assert.match((err as PdfExtractionError).message, /missing PDF header/i);
        return true;
      }
    );
  });

  // 8. Empty buffer (0 bytes)
  await t.test("extractTextFromPdf() rejects empty buffer (0 bytes)", async () => {
    const emptyBuffer = Buffer.alloc(0);

    await assert.rejects(
      async () => {
        await extractTextFromPdf(emptyBuffer);
      },
      (err: unknown) => {
        assert.ok(err instanceof PdfExtractionError);
        assert.equal((err as PdfExtractionError).statusCode, 400);
        assert.match((err as PdfExtractionError).message, /empty or invalid pdf buffer/i);
        return true;
      }
    );
  });

  // 9. Null, undefined, or invalid buffer types
  await t.test("extractTextFromPdf() rejects null or undefined input", async () => {
    await assert.rejects(
      async () => {
        await extractTextFromPdf(null as unknown as Buffer);
      },
      (err: unknown) => {
        assert.ok(err instanceof PdfExtractionError);
        assert.equal((err as PdfExtractionError).statusCode, 400);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await extractTextFromPdf(undefined as unknown as Buffer);
      },
      (err: unknown) => {
        assert.ok(err instanceof PdfExtractionError);
        assert.equal((err as PdfExtractionError).statusCode, 400);
        return true;
      }
    );
  });
});
