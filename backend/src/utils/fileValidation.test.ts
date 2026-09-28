import test from "node:test";
import assert from "node:assert/strict";
import {
  isPdfMagicBytes,
  sanitizeFileName,
  validateCvFile,
  MAX_FILE_SIZE_BYTES,
  PDF_MAGIC_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
} from "./fileValidation";

test("CV-03: File Validation Utility Suite", async (t) => {
  await t.test("1. Constants validation: 5MB limit, PDF MIME, and PDF extension", () => {
    assert.equal(MAX_FILE_SIZE_BYTES, 5 * 1024 * 1024, "Max file size must be 5MB (5,242,880 bytes)");
    assert.deepEqual(ALLOWED_MIME_TYPES, ["application/pdf"]);
    assert.deepEqual(ALLOWED_EXTENSIONS, [".pdf"]);
    assert.equal(PDF_MAGIC_BYTES.toString("ascii"), "%PDF");
  });

  await t.test("2. isPdfMagicBytes: correctly detects valid PDF headers", () => {
    // Valid standard PDF headers
    const valid1 = Buffer.from("%PDF-1.4\n%âãÏÓ");
    const valid2 = Buffer.from("%PDF-1.7\r\n");
    const valid3 = Buffer.from("%PDF-2.0");
    const exact4Bytes = Buffer.from([0x25, 0x50, 0x44, 0x46]);

    assert.equal(isPdfMagicBytes(valid1), true);
    assert.equal(isPdfMagicBytes(valid2), true);
    assert.equal(isPdfMagicBytes(valid3), true);
    assert.equal(isPdfMagicBytes(exact4Bytes), true);
  });

  await t.test("3. isPdfMagicBytes: rejects non-PDF, truncated, and empty buffers", () => {
    // Non-PDF headers
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const textHeader = Buffer.from("Hello, this is a plain text file pretending to be PDF");
    const partialHeader = Buffer.from("%PD"); // Only 3 bytes
    const emptyHeader = Buffer.alloc(0);

    assert.equal(isPdfMagicBytes(pngHeader), false, "PNG header must be rejected");
    assert.equal(isPdfMagicBytes(jpegHeader), false, "JPEG header must be rejected");
    assert.equal(isPdfMagicBytes(zipHeader), false, "ZIP header must be rejected");
    assert.equal(isPdfMagicBytes(textHeader), false, "Plain text header must be rejected");
    assert.equal(isPdfMagicBytes(partialHeader), false, "Truncated buffer (< 4 bytes) must be rejected");
    assert.equal(isPdfMagicBytes(emptyHeader), false, "Empty buffer must be rejected");
    assert.equal(isPdfMagicBytes(null), false, "Null buffer must be rejected");
    assert.equal(isPdfMagicBytes(undefined), false, "Undefined buffer must be rejected");
  });

  await t.test("4. sanitizeFileName: strips directory traversal and illegal characters", () => {
    // Path traversal attempts
    assert.equal(sanitizeFileName("../../etc/passwd"), "passwd");
    assert.equal(sanitizeFileName("..\\..\\Windows\\System32\\cmd.exe"), "cmd.exe");
    assert.equal(sanitizeFileName("../../../resume.pdf"), "resume.pdf");

    // Illegal and control characters
    assert.equal(sanitizeFileName("my<special>:resume|file?.pdf"), "my_special__resume_file_.pdf");
    assert.equal(sanitizeFileName("clean-resume_2026.pdf"), "clean-resume_2026.pdf");
    assert.equal(sanitizeFileName("my\x00hidden\x1fresume.pdf"), "myhiddenresume.pdf");

    // Fallbacks on empty / invalid inputs
    assert.equal(sanitizeFileName(""), "cv_document.pdf");
    assert.equal(sanitizeFileName("   "), "cv_document.pdf");
    assert.equal(sanitizeFileName(null), "cv_document.pdf");
    assert.equal(sanitizeFileName(undefined), "cv_document.pdf");
  });

  await t.test("5. validateCvFile: validates valid PDF file input", () => {
    const validPdfBuffer = Buffer.from("%PDF-1.5 standard valid content");
    const result = validateCvFile({
      originalname: "john_doe_cv.pdf",
      mimetype: "application/pdf",
      size: 102400, // 100 KB
      buffer: validPdfBuffer,
    });

    assert.equal(result.valid, true);
    assert.equal(result.error, undefined);
  });

  await t.test("6. validateCvFile: accepts uppercase or mixed case .PDF extension", () => {
    const validPdfBuffer = Buffer.from("%PDF-1.4 content");
    const result = validateCvFile({
      originalname: "MY_RESUME.PDF",
      mimetype: "application/pdf",
      size: 50000,
      buffer: validPdfBuffer,
    });

    assert.equal(result.valid, true);
  });

  await t.test("7. validateCvFile: rejects missing file or missing originalname", () => {
    const resNull = validateCvFile(null);
    assert.equal(resNull.valid, false);
    assert.match(resNull.error!, /No CV file provided/i);

    const resNoName = validateCvFile({
      mimetype: "application/pdf",
      size: 1024,
    });
    assert.equal(resNoName.valid, false);
    assert.match(resNoName.error!, /Invalid or missing file name/i);
  });

  await t.test("8. validateCvFile: rejects non-PDF file extensions", () => {
    const invalidExtensions = [
      "resume.docx",
      "resume.doc",
      "resume.txt",
      "resume.png",
      "resume.pdf.exe",
      "resume",
    ];

    for (const name of invalidExtensions) {
      const res = validateCvFile({
        originalname: name,
        mimetype: "application/pdf",
        size: 1024,
      });
      assert.equal(res.valid, false, `Expected ${name} to be rejected`);
      assert.match(res.error!, /Invalid file extension/i);
    }
  });

  await t.test("9. validateCvFile: rejects non-PDF MIME types", () => {
    const invalidMimes = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "text/plain",
      "application/octet-stream",
    ];

    for (const mime of invalidMimes) {
      const res = validateCvFile({
        originalname: "resume.pdf",
        mimetype: mime,
        size: 1024,
      });
      assert.equal(res.valid, false, `Expected MIME ${mime} to be rejected`);
      assert.match(res.error!, /Invalid MIME type/i);
    }
  });

  await t.test("10. validateCvFile: enforces 0 bytes check and 5MB size limit", () => {
    // 0 bytes
    const zeroByteRes = validateCvFile({
      originalname: "empty.pdf",
      mimetype: "application/pdf",
      size: 0,
    });
    assert.equal(zeroByteRes.valid, false);
    assert.match(zeroByteRes.error!, /empty \(0 bytes\)/i);

    // Negative size
    const negByteRes = validateCvFile({
      originalname: "neg.pdf",
      mimetype: "application/pdf",
      size: -10,
    });
    assert.equal(negByteRes.valid, false);
    assert.match(negByteRes.error!, /empty/i);

    // Exactly 5MB: Allowed
    const exactly5MbRes = validateCvFile({
      originalname: "max.pdf",
      mimetype: "application/pdf",
      size: MAX_FILE_SIZE_BYTES,
      buffer: Buffer.from("%PDF-1.4"),
    });
    assert.equal(exactly5MbRes.valid, true);

    // 5MB + 1 byte: Rejected
    const overLimitRes = validateCvFile({
      originalname: "toolarge.pdf",
      mimetype: "application/pdf",
      size: MAX_FILE_SIZE_BYTES + 1,
    });
    assert.equal(overLimitRes.valid, false);
    assert.match(overLimitRes.error!, /exceeds maximum limit of 5MB/i);
  });

  await t.test("11. validateCvFile: rejects spoofed PDF (valid extension and MIME but non-PDF content)", () => {
    const fakeBuffer = Buffer.from("<html><body>Fake PDF content</body></html>");
    const res = validateCvFile({
      originalname: "spoofed.pdf",
      mimetype: "application/pdf",
      size: 5000,
      buffer: fakeBuffer,
    });

    assert.equal(res.valid, false);
    assert.match(res.error!, /valid PDF header signature \(%PDF\)/i);
  });
});
