import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { uploadCvMiddleware } from "./upload.middleware";

test("CV-03: Upload Middleware Integration Suite", async (t) => {
  let server: Server;
  let baseUrl: string;

  t.before(() => {
    const testApp = express();

    // Test endpoint using uploadCvMiddleware
    testApp.post(
      "/api/test-upload",
      uploadCvMiddleware,
      (req, res) => {
        res.status(200).json({
          message: "Upload successful",
          file: {
            originalname: req.file?.originalname,
            mimetype: req.file?.mimetype,
            size: req.file?.size,
          },
        });
      }
    );

    server = testApp.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://localhost:${addr.port}`;
  });

  t.after(() => {
    server.close();
  });

  // Helper function to create multipart/form-data payload with boundary
  function createMultipartBody(
    fieldName: string,
    fileName: string,
    contentType: string,
    fileBuffer: Buffer
  ): { body: Buffer; contentTypeHeader: string } {
    const boundary = `----FolioCraftBoundary${Date.now()}`;
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, fileBuffer, footer]);

    return {
      body,
      contentTypeHeader: `multipart/form-data; boundary=${boundary}`,
    };
  }

  await t.test("1. valid PDF upload succeeds and returns 200 with sanitized filename", async () => {
    const validPdfBuffer = Buffer.from("%PDF-1.7\nSample valid CV content for FolioCraft testing\n%%EOF");
    const { body, contentTypeHeader } = createMultipartBody(
      "file",
      "../path/traversal/My_Resume.pdf",
      "application/pdf",
      validPdfBuffer
    );

    const res = await fetch(`${baseUrl}/api/test-upload`, {
      method: "POST",
      headers: { "Content-Type": contentTypeHeader },
      body,
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as { message: string; file: { originalname: string; size: number } };
    assert.equal(json.message, "Upload successful");
    assert.equal(json.file.originalname, "My_Resume.pdf", "Filename must be sanitized of directory traversal");
    assert.equal(json.file.size, validPdfBuffer.length);
  });

  await t.test("2. uploading with non-'file' field name (e.g. 'cv') is rejected with 400 Bad Request", async () => {
    const validPdfBuffer = Buffer.from("%PDF-1.4\nSimple CV body\n%%EOF");
    const { body, contentTypeHeader } = createMultipartBody(
      "cv",
      "curriculum_vitae.pdf",
      "application/pdf",
      validPdfBuffer
    );

    const res = await fetch(`${baseUrl}/api/test-upload`, {
      method: "POST",
      headers: { "Content-Type": contentTypeHeader },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /Unexpected file field 'cv'/i);
    assert.match(json.message, /Only 'file' field is allowed/i);
  });


  await t.test("3. missing file returns 400 Bad Request", async () => {
    // Empty multipart request
    const boundary = "----FolioCraftEmpty";
    const body = Buffer.from(`--${boundary}--\r\n`);

    const res = await fetch(`${baseUrl}/api/test-upload`, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /No CV file uploaded/i);
  });

  await t.test("4. empty file buffer (0 bytes) returns 400 Bad Request", async () => {
    const { body, contentTypeHeader } = createMultipartBody(
      "file",
      "empty.pdf",
      "application/pdf",
      Buffer.alloc(0)
    );

    const res = await fetch(`${baseUrl}/api/test-upload`, {
      method: "POST",
      headers: { "Content-Type": contentTypeHeader },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /empty \(0 bytes\)/i);
  });

  await t.test("5. non-PDF extension returns 400 Bad Request", async () => {
    const validBytes = Buffer.from("%PDF-1.4 test");
    const { body, contentTypeHeader } = createMultipartBody(
      "file",
      "resume.docx",
      "application/pdf",
      validBytes
    );

    const res = await fetch(`${baseUrl}/api/test-upload`, {
      method: "POST",
      headers: { "Content-Type": contentTypeHeader },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /Only PDF documents \(\.pdf\) are allowed/i);
  });

  await t.test("6. non-PDF MIME type returns 400 Bad Request", async () => {
    const validBytes = Buffer.from("%PDF-1.4 test");
    const { body, contentTypeHeader } = createMultipartBody(
      "file",
      "resume.pdf",
      "text/plain",
      validBytes
    );

    const res = await fetch(`${baseUrl}/api/test-upload`, {
      method: "POST",
      headers: { "Content-Type": contentTypeHeader },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /Only 'application\/pdf' is allowed/i);
  });

  await t.test("7. spoofed file (.pdf extension with non-PDF magic bytes) returns 400 Bad Request", async () => {
    const fakePdfBytes = Buffer.from("<html><body>Malicious HTML/Script file</body></html>");
    const { body, contentTypeHeader } = createMultipartBody(
      "file",
      "fake_resume.pdf",
      "application/pdf",
      fakePdfBytes
    );

    const res = await fetch(`${baseUrl}/api/test-upload`, {
      method: "POST",
      headers: { "Content-Type": contentTypeHeader },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /valid PDF header signature \(%PDF\)/i);
  });

  await t.test("8. file exceeding 5MB limit returns 400 Bad Request with size error", async () => {
    // 5MB + 1000 bytes
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1000);
    // Write %PDF at the beginning so magic bytes would pass if size check didn't catch it
    Buffer.from("%PDF-1.4").copy(oversizedBuffer);

    const { body, contentTypeHeader } = createMultipartBody(
      "file",
      "huge_resume.pdf",
      "application/pdf",
      oversizedBuffer
    );

    const res = await fetch(`${baseUrl}/api/test-upload`, {
      method: "POST",
      headers: { "Content-Type": contentTypeHeader },
      body,
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /File size exceeds maximum limit of 5MB/i);
  });
});
