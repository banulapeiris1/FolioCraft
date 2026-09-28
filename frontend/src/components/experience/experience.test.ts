import test from "node:test";
import assert from "node:assert/strict";
import {
  createExperience,
  getExperiences,
  getExperience,
  updateExperience,
  deleteExperience,
} from "../../lib/api";
import type { Experience, ExperienceFormData } from "../../types/experience";

// Setup global mock for NEXT_PUBLIC_API_URL and fetch
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

test("EXP-06: Frontend Experience Module Test Suite", async (t) => {
  // -------------------------------------------------------------
  // Section 1: API Client Methods
  // -------------------------------------------------------------
  await t.test("API Client: createExperience sends POST with auth token and payload", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockResponse: { experience: Experience } = {
      experience: {
        id: "exp-1",
        portfolioId: "port-1",
        company: "Stripe",
        position: "Staff Software Engineer",
        description: "Scaling payments infrastructure",
        startDate: "2022-01-01",
        endDate: null,
        isCurrent: true,
        createdAt: "2026-09-28T00:00:00Z",
        updatedAt: "2026-09-28T00:00:00Z",
      },
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
      const payload: ExperienceFormData = {
        company: "Stripe",
        position: "Staff Software Engineer",
        description: "Scaling payments infrastructure",
        startDate: "2022-01-01",
        endDate: null,
        isCurrent: true,
      };

      const res = await createExperience("port-1", payload, "test-token-xyz");
      assert.equal(capturedUrl, "http://localhost:5000/api/portfolios/port-1/experience");
      assert.equal(capturedOptions?.method, "POST");
      const headers = capturedOptions?.headers as Record<string, string>;
      assert.equal(headers["Authorization"], "Bearer test-token-xyz");
      assert.equal(headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(capturedOptions?.body as string), payload);
      assert.equal(res.experience.id, "exp-1");
      assert.equal(res.experience.company, "Stripe");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("API Client: getExperiences sends GET with auth token", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockResponse = {
      experience: [
        {
          id: "exp-1",
          portfolioId: "port-1",
          company: "Meta",
          position: "Frontend Architect",
          description: null,
          startDate: "2020-03-01",
          endDate: "2022-05-31",
          isCurrent: false,
          createdAt: "2026-09-28T00:00:00Z",
          updatedAt: "2026-09-28T00:00:00Z",
        },
      ],
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedOptions = init;
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const res = await getExperiences("port-1", "test-token-xyz");
      assert.equal(capturedUrl, "http://localhost:5000/api/portfolios/port-1/experience");
      assert.equal(capturedOptions?.method, "GET");
      const headers = capturedOptions?.headers as Record<string, string>;
      assert.equal(headers["Authorization"], "Bearer test-token-xyz");
      assert.equal(res.experience.length, 1);
      assert.equal(res.experience[0].company, "Meta");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("API Client: getExperience sends GET to /api/experience/:id", async () => {
    let capturedUrl = "";
    const mockResponse = {
      experience: {
        id: "exp-99",
        portfolioId: "port-1",
        company: "Google",
        position: "Senior Staff Engineer",
        description: "Cloud systems",
        startDate: "2018-01-01",
        endDate: null,
        isCurrent: true,
        createdAt: "2026-09-28T00:00:00Z",
        updatedAt: "2026-09-28T00:00:00Z",
      },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const res = await getExperience("exp-99", "test-token-xyz");
      assert.equal(capturedUrl, "http://localhost:5000/api/experience/exp-99");
      assert.equal(res.experience.company, "Google");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("API Client: updateExperience sends PUT to /api/experience/:id", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockResponse = {
      experience: {
        id: "exp-1",
        portfolioId: "port-1",
        company: "Apple",
        position: "Principal Engineer",
        description: "Updated description",
        startDate: "2021-01-01",
        endDate: null,
        isCurrent: true,
        createdAt: "2026-09-28T00:00:00Z",
        updatedAt: "2026-09-28T00:00:00Z",
      },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedOptions = init;
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const updateData = { position: "Principal Engineer" };
      const res = await updateExperience("exp-1", updateData, "test-token-xyz");
      assert.equal(capturedUrl, "http://localhost:5000/api/experience/exp-1");
      assert.equal(capturedOptions?.method, "PUT");
      const headers = capturedOptions?.headers as Record<string, string>;
      assert.equal(headers["Authorization"], "Bearer test-token-xyz");
      assert.deepEqual(JSON.parse(capturedOptions?.body as string), updateData);
      assert.equal(res.experience.position, "Principal Engineer");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("API Client: deleteExperience sends DELETE to /api/experience/:id", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockResponse = { message: "Experience deleted successfully" };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedOptions = init;
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const res = await deleteExperience("exp-1", "test-token-xyz");
      assert.equal(capturedUrl, "http://localhost:5000/api/experience/exp-1");
      assert.equal(capturedOptions?.method, "DELETE");
      const headers = capturedOptions?.headers as Record<string, string>;
      assert.equal(headers["Authorization"], "Bearer test-token-xyz");
      assert.equal(res.message, "Experience deleted successfully");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // Section 2: Validation Logic Tests
  // -------------------------------------------------------------
  function validateExperienceFields(data: {
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string | null;
    isCurrent?: boolean;
    description?: string | null;
  }) {
    const errors: Record<string, string> = {};

    // Company
    if (!data.company || !data.company.trim()) {
      errors.company = "Company name is required";
    } else if (data.company.trim().length > 255) {
      errors.company = "Company name cannot exceed 255 characters";
    }

    // Position
    if (!data.position || !data.position.trim()) {
      errors.position = "Job title / position is required";
    } else if (data.position.trim().length > 255) {
      errors.position = "Position cannot exceed 255 characters";
    }

    // Start Date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!data.startDate || !data.startDate.trim()) {
      errors.startDate = "Start date is required";
    } else if (!dateRegex.test(data.startDate.trim())) {
      errors.startDate = "Start date must be a valid calendar date (YYYY-MM-DD)";
    }

    // End Date
    if (!data.isCurrent && data.endDate && data.endDate.trim()) {
      if (!dateRegex.test(data.endDate.trim())) {
        errors.endDate = "End date must be a valid calendar date (YYYY-MM-DD)";
      } else if (data.startDate && data.endDate.trim() < data.startDate.trim()) {
        errors.endDate = "End date cannot be earlier than start date";
      }
    }

    // Description
    if (data.description && data.description.length > 2000) {
      errors.description = "Description cannot exceed 2000 characters";
    }

    return errors;
  }

  await t.test("Validation: requires non-empty company, position, and start date", () => {
    const errs = validateExperienceFields({ company: "", position: "", startDate: "" });
    assert.equal(errs.company, "Company name is required");
    assert.equal(errs.position, "Job title / position is required");
    assert.equal(errs.startDate, "Start date is required");
  });

  await t.test("Validation: rejects invalid date formats", () => {
    const errs = validateExperienceFields({
      company: "Acme",
      position: "Dev",
      startDate: "2022/01/01",
    });
    assert.equal(errs.startDate, "Start date must be a valid calendar date (YYYY-MM-DD)");
  });

  await t.test("Validation: rejects end date earlier than start date", () => {
    const errs = validateExperienceFields({
      company: "Acme",
      position: "Dev",
      startDate: "2023-01-01",
      endDate: "2022-01-01",
      isCurrent: false,
    });
    assert.equal(errs.endDate, "End date cannot be earlier than start date");
  });

  await t.test("Validation: permits omitted or null end date when isCurrent=true", () => {
    const errs = validateExperienceFields({
      company: "Acme",
      position: "Dev",
      startDate: "2023-01-01",
      endDate: null,
      isCurrent: true,
    });
    assert.equal(Object.keys(errs).length, 0);
  });

  await t.test("Validation: accepts valid full experience payload", () => {
    const errs = validateExperienceFields({
      company: "Acme Corp",
      position: "Staff Architect",
      startDate: "2021-06-01",
      endDate: "2023-12-31",
      isCurrent: false,
      description: "Led platform architecture.",
    });
    assert.equal(Object.keys(errs).length, 0);
  });

  // -------------------------------------------------------------
  // Section 3: Date & Display Formatting
  // -------------------------------------------------------------
  function formatExperienceRange(startDate: string, endDate: string | null, isCurrent: boolean) {
    const format = (d: string | null) => {
      if (!d) return "";
      const [year, month, day] = d.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day || 1));
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    };

    const start = format(startDate);
    const end = isCurrent ? "Present" : endDate ? format(endDate) : "Present";
    return `${start} — ${end}`;
  }

  await t.test("Formatting: correctly renders date ranges for past and current roles", () => {
    assert.equal(
      formatExperienceRange("2021-06-01", "2023-12-31", false),
      "Jun 2021 — Dec 2023"
    );
    assert.equal(
      formatExperienceRange("2024-01-01", null, true),
      "Jan 2024 — Present"
    );
    assert.equal(
      formatExperienceRange("2024-01-01", "2024-05-01", true),
      "Jan 2024 — Present" // isCurrent takes priority over endDate
    );
  });
});
