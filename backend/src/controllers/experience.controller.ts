import type { Request, Response, NextFunction } from "express";
import { experienceService } from "../services/experience.service";
import {
  createExperienceSchema,
  updateExperienceSchema,
} from "../utils/validation";
import { AppError } from "../utils/errors";

export class ExperienceController {
  /**
   * Handles POST /api/portfolios/:id/experience
   * Creates a new experience record under the specified portfolio for the authenticated user.
   */
  async createExperience(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const portfolioId = (req.params.id || req.params.portfolioId) as string;

      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        res
          .status(400)
          .json({ message: "Request body must be a valid JSON object" });
        return;
      }

      const validationResult = createExperienceSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const experience = await experienceService.createExperience(
        portfolioId,
        req.user.userId,
        validationResult.data
      );

      res.status(201).json({ experience });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles GET /api/portfolios/:id/experience
   * Retrieves all experience records belonging to the specified portfolio for the authenticated user.
   */
  async getExperiencesByPortfolio(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const portfolioId = (req.params.id || req.params.portfolioId) as string;

      const experiences = await experienceService.getExperiencesByPortfolio(
        portfolioId,
        req.user.userId
      );

      res.status(200).json({ experience: experiences, experiences });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles GET /api/experience/:id
   * Retrieves a single experience record by ID with ownership verification via parent portfolio.
   */
  async getExperienceById(
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
      const experience = await experienceService.getExperienceById(
        id,
        req.user.userId
      );

      res.status(200).json({ experience });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles PUT /api/experience/:id
   * Updates an existing experience record belonging to the authenticated user's portfolio.
   */
  async updateExperience(
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

      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        res
          .status(400)
          .json({ message: "Request body must be a valid JSON object" });
        return;
      }

      const validUpdateKeys = [
        "company",
        "position",
        "description",
        "startDate",
        "endDate",
        "isCurrent",
      ];

      const providedKeys = Object.keys(req.body).filter((k) =>
        validUpdateKeys.includes(k)
      );

      if (providedKeys.length === 0) {
        res.status(400).json({ message: "No fields provided for update" });
        return;
      }

      const validationResult = updateExperienceSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const experience = await experienceService.updateExperience(
        id,
        req.user.userId,
        validationResult.data
      );

      res.status(200).json({ experience });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles DELETE /api/experience/:id
   * Deletes an experience record belonging to the authenticated user's portfolio.
   */
  async deleteExperience(
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
      const result = await experienceService.deleteExperience(
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
}

export const experienceController = new ExperienceController();
