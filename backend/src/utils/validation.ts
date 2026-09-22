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



