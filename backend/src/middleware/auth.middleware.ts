import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";

/**
 * Authentication middleware that protects private API routes.
 * Enforces Bearer token scheme, verifies JWT validity using verifyToken,
 * attaches verified userId identity to req.user, and rejects invalid requests with 401.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== "string") {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  // Parse Bearer scheme and token safely
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const token = parts[1];
  if (!token || token.trim() === "") {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    // Return generic authentication failure without leaking internal JWT errors
    res.status(401).json({ message: "Authentication required" });
  }
}
