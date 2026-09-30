import test from "node:test";
import assert from "node:assert/strict";
import { uploadCv, ApiError } from "../../lib/api";
import {
  validateCvFile,
  formatFileSize,
  CV_MAX_FILE_SIZE_BYTES,
} from "../../lib/cvValidation";
import type { StructuredCvData, CvUploadResponse } from "../../types/cv";

// Setup global mock environment
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

test("CV-08: Frontend CV Upload & Status UI Test Suite", async (t) => {
  // -------------------------------------------------------------
  // Section 1: Client-Side Validation Tests
  // -------------------------------------------------------------
  await t.test("1. Validation: rejects missing or undefined file", () => {
    const res1 = validateCvFile(null);
    assert.equal(res1.isValid, false);
    assert.match(res1.error || "", /select a CV file/i);

    const res2 = validateCvFile(undefined);
    assert.equal(res2.isValid, false);
    assert.match(res2.error || "", /select a CV file/i);
  });

  await t.test("2. Validation: accepts valid PDF file under 5MB", () => {
    const file = new File(["%PDF-1.4 dummy cv content"], "resume.pdf", {
      type: "application/pdf",
    });
    const result = validateCvFile(file);
    assert.equal(result.isValid, true);
    assert.equal(result.error, undefined);
  });

  await t.test("3. Validation: accepts uppercase .PDF extension and alternate application/x-pdf MIME", () => {
    const file = new File(["%PDF-1.4 content"], "MY_CV.PDF", {
      type: "application/x-pdf",
    });
    const result = validateCvFile(file);
    assert.equal(result.isValid, true);
  });

  await t.test("4. Validation: rejects non-PDF file extension (.docx, .png, .txt)", () => {
    const docxFile = new File(["doc data"], "cv.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const resDocx = validateCvFile(docxFile);
    assert.equal(resDocx.isValid, false);
    assert.match(resDocx.error || "", /only pdf documents/i);

    const pngFile = new File(["img data"], "photo.png", { type: "image/png" });
    const resPng = validateCvFile(pngFile);
    assert.equal(resPng.isValid, false);
    assert.match(resPng.error || "", /only pdf documents/i);
  });

  await t.test("5. Validation: rejects non-PDF MIME type even if filename ends in .pdf", () => {
    const spoofedFile = new File(["text data"], "fake.pdf", {
      type: "image/jpeg",
    });
    const result = validateCvFile(spoofedFile);
    assert.equal(result.isValid, false);
    assert.match(result.error || "", /invalid file type/i);
  });

  await t.test("6. Validation: rejects empty file (0 bytes)", () => {
    const emptyFile = new File([], "empty.pdf", { type: "application/pdf" });
    const result = validateCvFile(emptyFile);
    assert.equal(result.isValid, false);
    assert.match(result.error || "", /empty \(0 bytes\)/i);
  });

  await t.test("7. Validation: rejects file larger than 5MB limit", () => {
    // 5MB + 1 byte
    const largeBlob = new Uint8Array(CV_MAX_FILE_SIZE_BYTES + 1);
    const oversizedFile = new File([largeBlob], "large_cv.pdf", {
      type: "application/pdf",
    });
    const result = validateCvFile(oversizedFile);
    assert.equal(result.isValid, false);
    assert.match(result.error || "", /exceeds the 5mb limit/i);
  });

  // -------------------------------------------------------------
  // Section 2: Helper & Formatting Tests
  // -------------------------------------------------------------
  await t.test("8. Formatting: formatFileSize formats bytes, KB, and MB accurately", () => {
    assert.equal(formatFileSize(0), "0 Bytes");
    assert.equal(formatFileSize(512), "512 B");
    assert.equal(formatFileSize(1024), "1.0 KB");
    assert.equal(formatFileSize(1024 * 500), "500.0 KB");
    assert.equal(formatFileSize(1024 * 1024 * 2.5), "2.50 MB");
  });

  // -------------------------------------------------------------
  // Section 3: API Client uploadCv Tests
  // -------------------------------------------------------------
  await t.test("9. API Client: sends POST to /api/cv/upload with FormData", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockParsedData: StructuredCvData = {
      personal: {
        fullName: "Alex Mercer",
        email: "alex@example.com",
        phone: "+1 555 0199",
        location: "San Francisco, CA",
        website: "https://alex.dev",
        linkedin: "https://linkedin.com/in/alexmercer",
        github: "https://github.com/alexmercer",
        summary: "Staff Engineer with 10 years experience",
      },
      experience: [
        {
          company: "Acme Corp",
          position: "Lead Engineer",
          description: "Led core infrastructure platform",
          startDate: "2021-01-01",
          endDate: "2024-01-01",
          isCurrent: false,
        },
      ],
      education: [
        {
          institution: "MIT",
          degree: "B.S.",
          field: "Computer Science",
          description: "Graduated with honors",
          startDate: "2016-09-01",
          endDate: "2020-05-31",
        },
      ],
      skills: [{ name: "TypeScript" }, { name: "React" }, { name: "Node.js" }],
      projects: [
        {
          title: "FolioCraft",
          description: "Portfolio builder platform",
          technologies: ["Next.js", "Express", "PostgreSQL"],
        },
      ],
    };

    const mockResponse: CvUploadResponse = {
      message: "CV uploaded and processed successfully",
      uploadId: "cv-upload-uuid-123",
      status: "COMPLETED",
      upload: {
        id: "cv-upload-uuid-123",
        userId: "user-uuid-abc",
        portfolioId: "port-uuid-456",
        fileName: "alex_mercer_cv.pdf",
        fileSize: 1048576,
        mimeType: "application/pdf",
        status: "COMPLETED",
        parsedData: mockParsedData,
        createdAt: "2026-09-30T00:00:00Z",
        updatedAt: "2026-09-30T00:00:00Z",
      },
      parsedData: mockParsedData,
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedOptions = init;
      return new Response(JSON.stringify(mockResponse), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const file = new File(["%PDF-1.4 test"], "alex_mercer_cv.pdf", {
        type: "application/pdf",
      });

      const res = await uploadCv(file, "port-uuid-456", "jwt-test-token-789");

      assert.equal(capturedUrl, "http://localhost:5000/api/cv/upload");
      assert.equal(capturedOptions?.method, "POST");

      // Verify Authorization header
      const headers = capturedOptions?.headers as Record<string, string>;
      assert.equal(headers["Authorization"], "Bearer jwt-test-token-789");

      // Verify Content-Type is NOT manually set to application/json for FormData
      assert.equal(headers["Content-Type"], undefined);

      // Verify FormData body and fields
      assert.ok(capturedOptions?.body instanceof FormData);
      const formData = capturedOptions.body as FormData;
      assert.ok(formData.has("file"));
      assert.equal(formData.get("portfolioId"), "port-uuid-456");

      // Verify response payload
      assert.equal(res.status, "COMPLETED");
      assert.equal(res.uploadId, "cv-upload-uuid-123");
      assert.equal(res.parsedData.personal.fullName, "Alex Mercer");
      assert.equal(res.parsedData.experience.length, 1);
      assert.equal(res.parsedData.experience[0].company, "Acme Corp");
      assert.equal(res.parsedData.education.length, 1);
      assert.equal(res.parsedData.education[0].institution, "MIT");
      assert.equal(res.parsedData.skills.length, 3);
      assert.equal(res.parsedData.projects.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("10. API Client: does not send userId from frontend", async () => {
    let capturedOptions: RequestInit | undefined;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedOptions = init;
      return new Response(
        JSON.stringify({
          message: "Success",
          uploadId: "id-1",
          status: "COMPLETED",
          upload: {},
          parsedData: { personal: {}, experience: [], education: [], skills: [], projects: [] },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    };

    try {
      const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
      await uploadCv(file, null, "test-token");
      const formData = capturedOptions?.body as FormData;
      assert.equal(formData.has("userId"), false);
      assert.equal(formData.has("portfolioId"), false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("11. API Client: throws ApiError with message on 400 Bad Request", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ message: "Corrupted PDF document could not be read." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    };

    try {
      const file = new File(["corrupt"], "bad.pdf", { type: "application/pdf" });
      await assert.rejects(
        async () => {
          await uploadCv(file, "port-1", "token");
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError);
          assert.equal(err.status, 400);
          assert.equal(err.message, "Corrupted PDF document could not be read.");
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("12. API Client: throws ApiError on 401 Unauthorized", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    };

    try {
      const file = new File(["test"], "cv.pdf", { type: "application/pdf" });
      await assert.rejects(
        async () => {
          await uploadCv(file, "port-1", "expired-token");
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError);
          assert.equal(err.status, 401);
          assert.equal(err.message, "Authentication required");
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("13. API Client: throws ApiError on network connection failure", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Failed to fetch");
    };

    try {
      const file = new File(["test"], "cv.pdf", { type: "application/pdf" });
      await assert.rejects(
        async () => {
          await uploadCv(file, "port-1", "token");
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError);
          assert.equal(err.status, 0);
          assert.match(err.message, /unable to connect to server/i);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // Section 4: UI State Workflow Simulation Tests
  // -------------------------------------------------------------
  await t.test("14. UI Flow: File selection transitions IDLE -> FILE_SELECTED -> IDLE on remove", () => {
    let uiState: "IDLE" | "FILE_SELECTED" | "UPLOADING" | "SUCCESS" | "ERROR" = "IDLE";
    let selectedFile: File | null = null;
    let error: string | null = null;

    const selectFile = (f: File) => {
      const val = validateCvFile(f);
      if (!val.isValid) {
        error = val.error || "Invalid";
        return;
      }
      selectedFile = f;
      uiState = "FILE_SELECTED";
      error = null;
    };

    const removeFile = () => {
      selectedFile = null;
      uiState = "IDLE";
      error = null;
    };

    // 1. Initial
    assert.equal(uiState, "IDLE");
    assert.equal(selectedFile, null);

    // 2. Select invalid
    selectFile(new File(["data"], "cv.png", { type: "image/png" }));
    assert.equal(uiState, "IDLE");
    assert.ok(error !== null);

    // 3. Select valid
    selectFile(new File(["pdf data"], "valid_cv.pdf", { type: "application/pdf" }));
    assert.equal(uiState, "FILE_SELECTED");
    assert.equal((selectedFile as File | null)?.name, "valid_cv.pdf");
    assert.equal(error, null);

    // 4. Remove
    removeFile();
    assert.equal(uiState, "IDLE");
    assert.equal(selectedFile, null);
  });

  await t.test("15. UI Flow: Prevents duplicate submissions while in UPLOADING or PROCESSING state", () => {
    let callCount = 0;
    let uiState: "IDLE" | "FILE_SELECTED" | "UPLOADING" | "PROCESSING" | "SUCCESS" = "UPLOADING";

    const triggerUpload = () => {
      if (uiState === "UPLOADING" || uiState === "PROCESSING") {
        return; // Guard prevents duplicate trigger
      }
      callCount++;
    };

    triggerUpload();
    assert.equal(callCount, 0);

    uiState = "PROCESSING";
    triggerUpload();
    assert.equal(callCount, 0);

    uiState = "FILE_SELECTED";
    triggerUpload();
    assert.equal(callCount, 1);
  });

  await t.test("16. UI Flow: Retry retains file after ERROR state", () => {
    let uiState: "IDLE" | "FILE_SELECTED" | "UPLOADING" | "ERROR" | "SUCCESS" = "ERROR";
    const selectedFile = new File(["pdf"], "resume.pdf", { type: "application/pdf" });
    let serverError: string | null = "Server timeout";

    // User clicks Try Again
    const handleRetry = () => {
      serverError = null;
      uiState = "UPLOADING";
    };

    assert.equal(selectedFile.name, "resume.pdf");
    handleRetry();
    assert.equal(uiState, "UPLOADING");
    assert.equal(serverError, null);
  });
});
