import type { Request, Response, NextFunction } from "express";
import { portfolioService } from "../services/portfolio.service";
import {
  createPortfolioSchema,
  updatePortfolioSchema,
  findProtectedPublishingField,
  PROTECTED_PUBLISHING_FIELD_MESSAGE,
} from "../utils/validation";
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

      // D6 (PUB-06D): publishing state is owned by POST /:id/publish and /:id/unpublish
      const protectedField = findProtectedPublishingField(req.body);
      if (protectedField) {
        res.status(400).json({
          message: `'${protectedField}' cannot be set when creating a portfolio. ${PROTECTED_PUBLISHING_FIELD_MESSAGE}`,
        });
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

  /**
   * Handles GET /api/portfolios
   * Retrieves all portfolios belonging strictly to the authenticated user.
   */
  async getPortfolios(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const portfolios = await portfolioService.getPortfoliosByUserId(
        req.user.userId
      );

      res.status(200).json({ success: true, portfolios });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles GET /api/portfolios/:id
   * Retrieves a single portfolio by ID with ownership-aware verification.
   */
  async getPortfolioById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const id = req.params.id as string;
      const portfolio = await portfolioService.getPortfolioById(
        id,
        req.user.userId
      );

      res.status(200).json({ portfolio });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles PUT /api/portfolios/:id
   * Updates an existing portfolio belonging to the authenticated user.
   * Performs partial update, rejects empty updates with 400, and verifies ownership.
   */
  async updatePortfolio(
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

      // D6 (PUB-06D): publishing state is owned by POST /:id/publish and /:id/unpublish
      const protectedField = findProtectedPublishingField(req.body);
      if (protectedField) {
        res.status(400).json({
          message: `'${protectedField}' cannot be modified through portfolio update. ${PROTECTED_PUBLISHING_FIELD_MESSAGE}`,
        });
        return;
      }

      const validUpdateKeys = [
        "name",
        "title",
        "about",
        "email",
        "phone",
        "location",
        "profileImageUrl",
        "socialLinks",
        "username",
        "template",
        "animationStyle",
      ];

      const providedKeys = Object.keys(req.body).filter((k) =>
        validUpdateKeys.includes(k)
      );

      if (providedKeys.length === 0) {
        res.status(400).json({ message: "No fields provided for update" });
        return;
      }

      const validationResult = updatePortfolioSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const id = req.params.id as string;
      const portfolio = await portfolioService.updatePortfolio(
        id,
        req.user.userId,
        validationResult.data
      );

      res.status(200).json({ portfolio });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles DELETE /api/portfolios/:id
   * Deletes a portfolio belonging to the authenticated user.
   */
  async deletePortfolio(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const id = req.params.id as string;
      const result = await portfolioService.deletePortfolio(
        id,
        req.user.userId
      );

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles GET /api/portfolios/check-username/:username (PUB-03)
   * Authenticated check for username availability.
   */
  async checkUsername(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const username = req.params.username as string;
      const portfolioId = req.query.portfolioId as string | undefined;

      const result = await portfolioService.checkUsernameAvailability(
        username,
        req.user.userId,
        portfolioId
      );

      res.status(200).json({
        success: true,
        available: result.available,
        username: result.username,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles POST /api/portfolios/:id/publish (PUB-03)
   * Publishes portfolio, performs readiness verification, and returns public URL.
   */
  async publishPortfolio(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const id = req.params.id as string;
      const result = await portfolioService.publishPortfolio(
        id,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: "Portfolio published successfully",
        portfolio: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles POST /api/portfolios/:id/unpublish (PUB-03)
   * Unpublishes portfolio and immediately removes public accessibility.
   */
  async unpublishPortfolio(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const id = req.params.id as string;
      const result = await portfolioService.unpublishPortfolio(
        id,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: "Portfolio unpublished successfully",
        portfolio: result,
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

export const portfolioController = new PortfolioController();

