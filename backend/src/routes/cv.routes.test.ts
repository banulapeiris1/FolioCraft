import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";
import type { CvUpload } from "../types/cv.types";

const FIXTURES_DIR = path.resolve(__dirname, "../../test/fixtures");

test("CV-07: CV Upload API & Processing Pipeline Integration Suite", async (t) => {
  let server: Server;
  let baseUrl: string;

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let testUserId = "";
  let otherUserId = "";
  let testUserJwt = "";
  let otherUserJwt = "";
  let testPortfolioId = "";
  let otherPortfolioId = "";

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    // Create User A
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["CV Route Tester", `cv_tester_${uniqueSuffix}@foliocraft.test`, "hashed_pw"]
    );
    testUserId = u1.rows[0]!.id;
    testUserJwt = signToken({ userId: testUserId });

    // Create User B (for cross-user security checks)
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Other CV User", `other_cv_${uniqueSuffix}@foliocraft.test`, "hashed_pw"]
    );
    otherUserId = u2.rows[0]!.id;
    otherUserJwt = signToken({ userId: otherUserId });

    // Create portfolio for User A
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Tester Portfolio", "Software Engineer", `cv_p1_${uniqueSuffix}`]
    );
    testPortfolioId = p1.rows[0]!.id;

    // Create portfolio for User B
    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [otherUserId, "Other Portfolio", "Designer", `cv_p2_${uniqueSuffix}`]
    );
    otherPortfolioId = p2.rows[0]!.id;
  });

  t.after(async () => {
    server.close();
    try {
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
      if (otherUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [otherUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in cv.routes.test.ts:", e);
    }
  });

  // Helper to build multipart/form-data bodies with optional text fields
  function createMultipartPayload(options: {
    fieldName?: string;
    fileName?: string;
    contentType?: string;
    fileBuffer?: Buffer;
    extraFields?: Record<string, string>;
  }): { body: Buffer; contentTypeHeader: string } {
    const boundary = `----FolioCraftCVTestBoundary${Date.now()}`;
    const chunks: Buffer[] = [];

    if (options.extraFields) {
      for (const [key, value] of Object.entries(options.extraFields)) {
        chunks.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
          )
        );
      }
    }

    if (options.fileBuffer !== undefined) {
      const field = options.fieldName ?? "file";
      const name = options.fileName ?? "resume.pdf";
      const type = options.contentType ?? "application/pdf";
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${name}"\r\nContent-Type: ${type}\r\n\r\n`
        ),
        options.fileBuffer,
        Buffer.from("\r\n")
      );
    }

    chunks.push(Buffer.from(`--${boundary}--\r\n`));

    return {
      body: Buffer.concat(chunks),
      contentTypeHeader: `multipart/form-data; boundary=${boundary}`,
    };
  }

  // 1. Authenticated valid PDF upload succeeds and returns 201
  await t.test("1. Authenticated valid PDF upload succeeds with 201 and structured data", async () => {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.pdf"));
    const { body, contentTypeHeader } = createMultipartPayload({
      fileBuffer: pdfBuffer,
      fileName: "My_Valid_Resume.pdf",
    });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as {
      message: string;
      upload: CvUpload;
      uploadId: string;
      status: string;
      parsedData: Record<string, unknown>;
    };

    assert.equal(json.message, "CV uploaded and processed successfully");
    assert.ok(json.uploadId);
    assert.equal(json.status, "COMPLETED");
    assert.equal(json.upload.status, "COMPLETED");
    assert.equal(json.upload.fileName, "My_Valid_Resume.pdf");
    assert.equal(json.upload.fileSize, pdfBuffer.length);
    assert.equal(json.upload.mimeType, "application/pdf");
    assert.ok(json.upload.parsedData);
    assert.equal(json.upload.userId, testUserId);
  });

  // 2. Unauthenticated request rejected with 401
  await t.test("2. Unauthenticated request rejected with 401 Unauthorized", async () => {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.pdf"));
    const { body, contentTypeHeader } = createMultipartPayload({ fileBuffer: pdfBuffer });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: { "Content-Type": contentTypeHeader },
      body,
    });

    assert.equal(res.status, 401);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /authentication required/i);
  });

  // 3. Missing file rejected with 400
  await t.test("3. Missing file in multipart payload rejected with 400 Bad Request", async () => {
    const { body, contentTypeHeader } = createMultipartPayload({});

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /no cv file uploaded/i);
  });

  // 4. Wrong field name (e.g. 'cv') rejected with 400
  await t.test("4. Wrong field name 'cv' rejected with 400 Bad Request", async () => {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.pdf"));
    const { body, contentTypeHeader } = createMultipartPayload({
      fieldName: "cv",
      fileBuffer: pdfBuffer,
    });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /only 'file' field is allowed/i);
  });

  // 5. Non-PDF rejected with 400
  await t.test("5. Non-PDF file (.txt extension) rejected with 400 Bad Request", async () => {
    const textBuffer = Buffer.from("Just a plain text resume");
    const { body, contentTypeHeader } = createMultipartPayload({
      fileName: "resume.txt",
      contentType: "text/plain",
      fileBuffer: textBuffer,
    });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /only pdf documents/i);
  });

  // 6. File over 5MB rejected with 400
  await t.test("6. File exceeding 5MB rejected with 400 Bad Request", async () => {
    const largeBuffer = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.alloc(5 * 1024 * 1024 + 1024),
    ]);
    const { body, contentTypeHeader } = createMultipartPayload({ fileBuffer: largeBuffer });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /exceeds maximum limit of 5mb/i);
  });

  // 7. Invalid PDF magic bytes rejected with 400
  await t.test("7. Spoofed PDF (.pdf extension with non-PDF bytes) rejected with 400", async () => {
    const spoofedBuffer = Buffer.from("<html><body>Not a PDF</body></html>");
    const { body, contentTypeHeader } = createMultipartPayload({
      fileName: "spoofed.pdf",
      contentType: "application/pdf",
      fileBuffer: spoofedBuffer,
    });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /valid pdf header signature/i);
  });

  // 8. Corrupt PDF produces appropriate failure and FAILED status in DB
  await t.test("8. Corrupt PDF produces 400 Bad Request and persists FAILED status in database", async () => {
    // Valid magic bytes (%PDF) to pass multer, but corrupt internal stream
    const corruptBuffer = Buffer.from("%PDF-1.4\ncorrupt content without xref or valid objects");
    const { body, contentTypeHeader } = createMultipartPayload({
      fileName: "corrupt.pdf",
      fileBuffer: corruptBuffer,
    });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /failed to extract text/i);

    // Verify record in database exists and has FAILED status
    const dbRecord = await pool.query<{ status: string; error_message: string }>(
      `SELECT status, error_message FROM cv_uploads
       WHERE user_id = $1 AND file_name = $2
       ORDER BY created_at DESC LIMIT 1`,
      [testUserId, "corrupt.pdf"]
    );

    assert.ok(dbRecord.rows[0]);
    assert.equal(dbRecord.rows[0].status, "FAILED");
    assert.match(dbRecord.rows[0].error_message, /failed to extract text/i);
  });

  // 9. Valid PDF with no text handled safely
  await t.test("9. Valid PDF with no extractable text handled safely with 201 and COMPLETED status", async () => {
    const emptyPdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "empty-text.pdf"));
    const { body, contentTypeHeader } = createMultipartPayload({
      fileName: "blank_page.pdf",
      fileBuffer: emptyPdfBuffer,
    });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as { status: string; parsedData: { personal: object; experience: unknown[] } };
    assert.equal(json.status, "COMPLETED");
    assert.deepEqual(json.parsedData.experience, []);
  });

  // 10, 11, 12, 13, 14, 15, 16. Pipeline invocation and database persistence verification
  await t.test("10-16. Pipeline invocations: CV-04 extraction, CV-05 sections, CV-06 structured data, DB persistence", async () => {
    const multiPagePdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "multi-page.pdf"));
    const { body, contentTypeHeader } = createMultipartPayload({
      fileName: "multi_page_resume.pdf",
      fileBuffer: multiPagePdfBuffer,
      extraFields: { portfolioId: testPortfolioId },
    });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as {
      uploadId: string;
      status: string;
      upload: { portfolioId: string };
      parsedData: { experience: unknown[]; education: unknown[]; skills: unknown[] };
    };

    assert.ok(json.uploadId);
    assert.equal(json.status, "COMPLETED");
    assert.equal(json.upload.portfolioId, testPortfolioId);

    // Verify database row directly
    const rowRes = await pool.query<{
      id: string;
      status: string;
      raw_text: string;
      parsed_data: any;
      portfolio_id: string;
    }>(
      `SELECT id, status, raw_text, parsed_data, portfolio_id
       FROM cv_uploads
       WHERE id = $1`,
      [json.uploadId]
    );

    const dbRow = rowRes.rows[0]!;
    assert.equal(dbRow.status, "COMPLETED");
    assert.equal(dbRow.portfolio_id, testPortfolioId);
    assert.ok(dbRow.raw_text.includes("Page 1: Overview and Summary"));
    assert.ok(dbRow.raw_text.includes("Page 2: Work Experience and Projects"));
    assert.ok(dbRow.raw_text.includes("Page 3: Education and Skills"));

    const parsed = typeof dbRow.parsed_data === "string" ? JSON.parse(dbRow.parsed_data) : dbRow.parsed_data;
    assert.ok(parsed);
    assert.ok(Array.isArray(parsed.experience));
    assert.ok(Array.isArray(parsed.education));
    assert.ok(Array.isArray(parsed.skills));
  });

  // 18. Security: User A cannot create an upload record for User B (userId in body ignored)
  await t.test("18. Security: Authenticated User A cannot specify User B's ID in body", async () => {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.pdf"));
    const { body, contentTypeHeader } = createMultipartPayload({
      fileBuffer: pdfBuffer,
      extraFields: { userId: otherUserId }, // Attacker trying to set owner to User B
    });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`,
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as { upload: { userId: string } };
    // Ownership MUST belong to the authenticated user from the token, not the body parameter
    assert.equal(json.upload.userId, testUserId);
    assert.notEqual(json.upload.userId, otherUserId);
  });

  // 19. Security: User A cannot attach a CV to User B's portfolio (403 Forbidden)
  await t.test("19. Security: Attaching CV to another user's portfolio is rejected with 403 Forbidden", async () => {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.pdf"));
    const { body, contentTypeHeader } = createMultipartPayload({
      fileBuffer: pdfBuffer,
      extraFields: { portfolioId: otherPortfolioId }, // User B's portfolio
    });

    const res = await fetch(`${baseUrl}/api/cv/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserJwt}`, // User A's token
        "Content-Type": contentTypeHeader,
      },
      body,
    });

    assert.equal(res.status, 403);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /unauthorized to attach cv to this portfolio/i);
  });

  // 20. Existing unrelated endpoints continue to work
  await t.test("20. Existing unrelated endpoints (e.g. GET /api/portfolios) continue to work properly", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { portfolios: unknown[] };
    assert.ok(Array.isArray(json.portfolios));
  });
});
