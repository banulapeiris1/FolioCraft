import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { registerSchema, loginSchema } from "../utils/validation";
import { AppError } from "../utils/errors";

export class AuthController {
  /**
   * Handles user registration request.
   * Validates payload, invokes authService.register, and returns 201 on success.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError = validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const result = await authService.register(validationResult.data);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles user login request.
   * Validates payload, invokes authService.login, and returns 200 on success.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError = validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const result = await authService.login(validationResult.data);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const authController = new AuthController();
