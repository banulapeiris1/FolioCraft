import type { Request, Response, NextFunction } from "express";
import { portfolioService } from "../services/portfolio.service";
import { createPortfolioSchema } from "../utils/validation";
import { AppError } from "../utils/errors";

export class PortfolioController {
  /**
   * Handles POST /api/portfolios
   * Creates a new portfolio for the authenticated user.
   * Derives user identity strictly from req.user.userId (never trusts client body userId).
   */
  async createPortfolio(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        res
          .status(400)
          .json({ message: "Request body must be a valid JSON object" });
        return;
      }

      const validationResult = createPortfolioSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const portfolio = await portfolioService.createPortfolio(
        req.user.userId,
        validationResult.data
      );

      res.status(201).json({ portfolio });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const portfolioController = new PortfolioController();
