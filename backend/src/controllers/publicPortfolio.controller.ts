import type { Request, Response, NextFunction } from "express";
import { publicPortfolioService } from "../services/publicPortfolio.service";
import { AppError } from "../utils/errors";

export class PublicPortfolioController {
  /**
   * Handles GET /api/public/:username (PUB-02)
   * Public retrieval of published developer portfolio.
   * Anonymous access — does NOT require authentication.
   */
  async getPublicPortfolio(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const username = req.params.username as string;

      const portfolio = await publicPortfolioService.getPublicPortfolioByUsername(
        username
      );

      res.status(200).json({
        success: true,
        portfolio,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const publicPortfolioController = new PublicPortfolioController();

