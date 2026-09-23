import { z } from "zod";

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
  username: z
    .string({ message: "Username is required" })
    .trim()
    .min(1, "Username is required")
    .max(50, "Username cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain alphanumeric characters, hyphens, and underscores"
    ),
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
  published: z.boolean().optional(),
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
  username: z
    .string()
    .trim()
    .min(1, "Username cannot be empty")
    .max(50, "Username cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain alphanumeric characters, hyphens, and underscores"
    )
    .optional(),
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
  published: z.boolean().optional(),
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
 * Validation schema for creating a new education record under a portfolio (EDU-03).
 * Enforces presence of institution, degree, field, and valid startDate (YYYY-MM-DD).
 * endDate is optional/nullable; if provided, must be on or after startDate.
 */
export const createEducationSchema = z
  .object({
    institution: z
      .string({ message: "Institution is required" })
      .trim()
      .min(1, "Institution is required")
      .max(255, "Institution cannot exceed 255 characters"),
    degree: z
      .string({ message: "Degree is required" })
      .trim()
      .min(1, "Degree is required")
      .max(255, "Degree cannot exceed 255 characters"),
    field: z
      .string({ message: "Field of study is required" })
      .trim()
      .min(1, "Field of study is required")
      .max(255, "Field of study cannot exceed 255 characters"),
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
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
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
 * Validation schema for updating an existing education record (EDU-03).
 * All fields are optional. Enforces type correctness and constraints.
 */
export const updateEducationSchema = z
  .object({
    institution: z
      .string()
      .trim()
      .min(1, "Institution cannot be empty")
      .max(255, "Institution cannot exceed 255 characters")
      .optional(),
    degree: z
      .string()
      .trim()
      .min(1, "Degree cannot be empty")
      .max(255, "Degree cannot exceed 255 characters")
      .optional(),
    field: z
      .string()
      .trim()
      .min(1, "Field of study cannot be empty")
      .max(255, "Field of study cannot exceed 255 characters")
      .optional(),
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
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
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





