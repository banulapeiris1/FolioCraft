import type { Request, Response, NextFunction } from "express";

/**
 * Centralized error handler middleware.
 * Catches unhandled errors and ensures internal errors (stack traces, SQL errors, etc.)
 * are never leaked to the client.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Unhandled server error:", err);
  res.status(500).json({ message: "Internal server error" });
}
