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
