import type { Request, Response, NextFunction } from "express";
import { projectService } from "../services/project.service";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../utils/validation";
import { AppError } from "../utils/errors";

export class ProjectController {
  /**
   * Handles POST /api/portfolios/:id/projects
   * Creates a new project under the specified portfolio for the authenticated user.
   */
  async createProject(
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

      const validationResult = createProjectSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const project = await projectService.createProject(
        portfolioId,
        req.user.userId,
        validationResult.data
      );

      res.status(201).json({ project });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles GET /api/portfolios/:id/projects
   * Retrieves all projects belonging to the specified portfolio for the authenticated user.
   */
  async getProjectsByPortfolio(
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

      const projects = await projectService.getProjectsByPortfolio(
        portfolioId,
        req.user.userId
      );

      res.status(200).json({ projects });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles GET /api/projects/:id
   * Retrieves a single project by ID with ownership verification via parent portfolio.
   */
  async getProjectById(
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
      const project = await projectService.getProjectById(
        id,
        req.user.userId
      );

      res.status(200).json({ project });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles PUT /api/projects/:id
   * Updates an existing project belonging to the authenticated user's portfolio.
   */
  async updateProject(
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
        "title",
        "description",
        "technologies",
        "githubUrl",
        "projectUrl",
        "imageUrl",
        "orderIndex",
      ];

      const providedKeys = Object.keys(req.body).filter((k) =>
        validUpdateKeys.includes(k)
      );

      if (providedKeys.length === 0) {
        res.status(400).json({ message: "No fields provided for update" });
        return;
      }

      const validationResult = updateProjectSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.issues?.[0]?.message || "Invalid input data";
        res.status(400).json({ message: firstError });
        return;
      }

      const project = await projectService.updateProject(
        id,
        req.user.userId,
        validationResult.data
      );

      res.status(200).json({ project });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * Handles DELETE /api/projects/:id
   * Deletes a project belonging to the authenticated user's portfolio.
   */
  async deleteProject(
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
      const result = await projectService.deleteProject(
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

export const projectController = new ProjectController();
