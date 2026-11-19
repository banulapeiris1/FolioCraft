import { z } from "zod";

/**
 * System-reserved usernames that cannot be claimed or published (PUB-03).
 * Includes web routes, system roles, and reserved protocol identifiers.
 */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "sys",
  "api",
  "auth",
  "login",
  "signin",
  "register",
  "signup",
  "logout",
  "signout",
  "dashboard",
  "portfolio",
  "portfolios",
  "project",
  "projects",
  "skill",
  "skills",
  "experience",
  "experiences",
  "education",
  "cv",
  "cv-parser",
  "preview",
  "template",
  "templates",
  "u",
  "user",
  "users",
  "settings",
  "profile",
  "public",
  "static",
  "assets",
  "help",
  "support",
  "terms",
  "privacy",
  "about",
  "contact",
  "null",
  "undefined",
  "status",
  "health",
  "test",
  "publish",
  "unpublish",
]);

/**
 * Supported portfolio templates in FolioCraft (PUB-03).
 */
export const SUPPORTED_TEMPLATES = new Set([
  "modern",
  "minimal",
  "professional",
]);

export interface UsernameValidationResult {
  isValid: boolean;
  normalizedUsername: string;
  error?: string;
  isReserved?: boolean;
}

/**
 * Validates and normalizes public portfolio usernames (PUB-03).
 * Enforces length (3-50 chars), allowed character set, and reserved word checks.
 */
export function validateUsername(
  rawUsername: unknown
): UsernameValidationResult {
  if (!rawUsername || typeof rawUsername !== "string") {
    return {
      isValid: false,
      normalizedUsername: "",
      error: "Username is required",
    };
  }

  const trimmed = rawUsername.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      isValid: false,
      normalizedUsername: "",
      error: "Username is required",
    };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      isValid: false,
      normalizedUsername: normalized,
      isReserved: true,
      error: `Username '${normalized}' is reserved for system use`,
    };
  }

  if (trimmed.length < 3) {
    return {
      isValid: false,
      normalizedUsername: normalized,
      error: "Username must be at least 3 characters long",
    };
  }

  if (trimmed.length > 50) {
    return {
      isValid: false,
      normalizedUsername: normalized,
      error: "Username cannot exceed 50 characters",
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      isValid: false,
      normalizedUsername: normalized,
      error:
        "Username can only contain alphanumeric characters, hyphens, and underscores",
    };
  }

  return {
    isValid: true,
    normalizedUsername: normalized,
  };
}

/**
 * Zod username field backed by the shared validateUsername() rules (PUB-06D / D5).
 * Used by portfolio create and update so they accept exactly the usernames that
 * check-username and publish accept. Outputs the normalized (trimmed, lowercased) value.
 */
const usernameField = z
  .string({ message: "Username is required" })
  .superRefine((value, ctx) => {
    const result = validateUsername(value);
    if (!result.isValid) {
      ctx.addIssue({
        code: "custom",
        message: result.error || "Invalid username",
      });
    }
  })
  .transform((value) => value.trim().toLowerCase());

/**
 * Publishing state fields that only POST /api/portfolios/:id/publish and
 * /unpublish may change (PUB-06D / D6).
 */
export const PROTECTED_PUBLISHING_FIELDS = [
  "published",
  "publishedAt",
  "published_at",
] as const;

export const PROTECTED_PUBLISHING_FIELD_MESSAGE =
  "Publishing state cannot be set through this endpoint. Use POST /api/portfolios/:id/publish or POST /api/portfolios/:id/unpublish.";

/**
 * Returns the first protected publishing field present in a request body, or null.
 */
export function findProtectedPublishingField(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  for (const field of PROTECTED_PUBLISHING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) return field;
  }
  return null;
}

/**
 * Validation schema for user registration.
 * Ensures name is non-empty, email is properly formatted and lowercased,
 * and password meets reasonable length requirements.
 */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password cannot exceed 100 characters"),
});

/**
 * Validation schema for user login.
 * Ensures email is normalized and password is present.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

/**
 * Validation schema for creating a new portfolio (PORTFOLIO-03).
 * Enforces presence of name, title, and username; safely validates optional fields.
 */
export const createPortfolioSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  title: z
    .string({ message: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(100, "Title cannot exceed 100 characters"),
  username: usernameField,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .max(50, "Phone number cannot exceed 50 characters")
    .optional()
    .nullable(),
  location: z
    .string()
    .trim()
    .max(255, "Location cannot exceed 255 characters")
    .optional()
    .nullable(),
  about: z.string().trim().optional().nullable(),
  profileImageUrl: z.string().trim().optional().nullable(),
  socialLinks: z
    .record(z.string(), z.string(), {
      message: "Social links must be an object with string values",
    })
    .optional(),
  template: z
    .string()
    .trim()
    .max(50, "Template name cannot exceed 50 characters")
    .optional(),
  // `published` intentionally absent: publishing state is managed only by the
  // dedicated publish/unpublish endpoints (PUB-06D / D6).
});

/**
 * Validation schema for updating an existing portfolio (PORTFOLIO-05).
 * All fields are optional. Enforces type correctness and length limits.
 */
export const updatePortfolioSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(100, "Title cannot exceed 100 characters")
    .optional(),
  username: usernameField.optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .max(50, "Phone number cannot exceed 50 characters")
    .optional()
    .nullable(),
  location: z
    .string()
    .trim()
    .max(255, "Location cannot exceed 255 characters")
    .optional()
    .nullable(),
  about: z.string().trim().optional().nullable(),
  profileImageUrl: z.string().trim().optional().nullable(),
  socialLinks: z
    .record(z.string(), z.string(), {
      message: "Social links must be an object with string values",
    })
    .optional(),
  template: z
    .string()
    .trim()
    .max(50, "Template name cannot exceed 50 characters")
    .optional(),
  // `published` intentionally absent: publishing state is managed only by the
  // dedicated publish/unpublish endpoints (PUB-06D / D6).
});

/**
 * Validation schema for creating a new project under a portfolio.
 * Enforces presence of title; validates optional description, technologies array,
 * URLs, and orderIndex.
 */
export const createProjectSchema = z.object({
  title: z
    .string({ message: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters"),
  description: z.string().trim().optional().nullable(),
  technologies: z
    .array(z.string().trim(), {
      message: "Technologies must be an array of strings",
    })
    .optional(),
  githubUrl: z.string().trim().optional().nullable(),
  projectUrl: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  orderIndex: z
    .number({ message: "Order index must be a number" })
    .int("Order index must be an integer")
    .min(0, "Order index cannot be negative")
    .optional(),
});

/**
 * Validation schema for updating an existing project.
 * All fields are optional. Enforces type correctness and constraints.
 */
export const updateProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(255, "Title cannot exceed 255 characters")
    .optional(),
  description: z.string().trim().optional().nullable(),
  technologies: z
    .array(z.string().trim(), {
      message: "Technologies must be an array of strings",
    })
    .optional(),
  githubUrl: z.string().trim().optional().nullable(),
  projectUrl: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  orderIndex: z
    .number({ message: "Order index must be a number" })
    .int("Order index must be an integer")
    .min(0, "Order index cannot be negative")
    .optional(),
});

/**
 * Validation schema for creating a new skill under a portfolio (SKILL-02).
 * Enforces presence of name (max 100) and category (max 50); optional orderIndex.
 */
export const createSkillSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  category: z
    .string({ message: "Category is required" })
    .trim()
    .min(1, "Category is required")
    .max(50, "Category cannot exceed 50 characters"),
  orderIndex: z
    .number({ message: "Order index must be a number" })
    .int("Order index must be an integer")
    .min(0, "Order index cannot be negative")
    .optional(),
});

/**
 * Validation schema for updating an existing skill (SKILL-02).
 * All fields are optional. Enforces type correctness and length limits.
 */
export const updateSkillSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  category: z
    .string()
    .trim()
    .min(1, "Category cannot be empty")
    .max(50, "Category cannot exceed 50 characters")
    .optional(),
  orderIndex: z
    .number({ message: "Order index must be a number" })
    .int("Order index must be an integer")
    .min(0, "Order index cannot be negative")
    .optional(),
});

/**
 * Validation schema for querying skill catalog items (SKILL-05).
 * Search: optional string, max 100 characters.
 * Category: optional string, max 50 characters.
 */
export const getSkillCatalogQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100, "Search query cannot exceed 100 characters")
    .optional(),
  category: z
    .string()
    .trim()
    .max(50, "Category filter cannot exceed 50 characters")
    .optional(),
});

/**
 * Strictly validates that a string is a real calendar date in YYYY-MM-DD format.
 * Prevents JavaScript Date overflow/rollover (e.g., February 31st rolling into March).
 */
export function isValidCalendarDate(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = val.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Validation schema for creating a new experience record under a portfolio (EXP-03).
 * Enforces presence of company, position, valid startDate (YYYY-MM-DD), and boolean isCurrent.
 * endDate is optional/nullable; if provided, must be on or after startDate.
 */
export const createExperienceSchema = z
  .object({
    company: z
      .string({ message: "Company is required" })
      .trim()
      .min(1, "Company is required")
      .max(255, "Company cannot exceed 255 characters"),
    position: z
      .string({ message: "Position is required" })
      .trim()
      .min(1, "Position is required")
      .max(255, "Position cannot exceed 255 characters"),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
    startDate: z
      .string({ message: "Start date is required" })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
      .refine(isValidCalendarDate, "Invalid calendar start date"),
    endDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
      .refine(isValidCalendarDate, "Invalid calendar end date")
      .or(z.literal(""))
      .optional()
      .nullable(),
    isCurrent: z.boolean().default(false).optional(),
  })
  .refine(
    (data) => {
      if (!data.endDate || data.endDate === "") return true;
      return data.endDate >= data.startDate;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

/**
 * Validation schema for updating an existing experience record (EXP-03).
 * All fields are optional. Enforces type correctness, length limits, and date consistency
 * when both dates are present in the update payload.
 */
export const updateExperienceSchema = z
  .object({
    company: z
      .string()
      .trim()
      .min(1, "Company cannot be empty")
      .max(255, "Company cannot exceed 255 characters")
      .optional(),
    position: z
      .string()
      .trim()
      .min(1, "Position cannot be empty")
      .max(255, "Position cannot exceed 255 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
    startDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
      .refine(isValidCalendarDate, "Invalid calendar start date")
      .optional(),
    endDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
      .refine(isValidCalendarDate, "Invalid calendar end date")
      .or(z.literal(""))
      .optional()
      .nullable(),
    isCurrent: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "No fields provided for update",
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate && data.endDate !== "") {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );




