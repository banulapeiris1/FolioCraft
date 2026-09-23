import type { Request, Response, NextFunction } from "express";
import { skillService } from "../services/skill.service";
import {
  createSkillSchema,
  updateSkillSchema,
} from "../utils/validation";
import { AppError } from "../utils/errors";

export class SkillController {
  /**
   * Handles POST /api/portfolios/:id/skills
   * Creates a new skill under the specified portfolio for the authenticated user.
   */
  async createSkill(
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

      const validationResult = createSkillSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const skill = await skillService.createSkill(
        req.user.userId,
        portfolioId,
        validationResult.data
      );

      res.status(201).json({ skill });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles GET /api/portfolios/:id/skills
   * Retrieves all skills belonging to the specified portfolio for the authenticated user.
   */
  async getSkills(
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

      const skills = await skillService.getSkills(
        req.user.userId,
        portfolioId
      );

      res.status(200).json({ skills });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles GET /api/skills/:id
   * Retrieves a single skill by ID with ownership verification via parent portfolio.
   */
  async getSkillById(
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
      const skill = await skillService.getSkillById(
        req.user.userId,
        id
      );

      res.status(200).json({ skill });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles PUT /api/skills/:id
   * Updates an existing skill belonging to the authenticated user's portfolio.
   */
  async updateSkill(
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

      const validUpdateKeys = ["name", "category", "orderIndex"];

      const providedKeys = Object.keys(req.body).filter((k) =>
        validUpdateKeys.includes(k)
      );

      if (providedKeys.length === 0) {
        res.status(400).json({ message: "No fields provided for update" });
        return;
      }

      const validationResult = updateSkillSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const skill = await skillService.updateSkill(
        req.user.userId,
        id,
        validationResult.data
      );

      res.status(200).json({ skill });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles DELETE /api/skills/:id
   * Deletes a skill belonging to the authenticated user's portfolio.
   */
  async deleteSkill(
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
      const result = await skillService.deleteSkill(
        req.user.userId,
        id
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

export const skillController = new SkillController();
