import type { Request, Response, NextFunction } from "express";
import { skillCatalogService } from "../services/skillCatalog.service";
import { getSkillCatalogQuerySchema } from "../utils/validation";
import { AppError } from "../utils/errors";

export class SkillCatalogController {
  /**
   * Handles GET /api/skills/catalog
   * Retrieves global predefined skills with optional search and category filters.
   */
  async getCatalog(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validationResult = getSkillCatalogQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.issues?.[0]?.message || "Invalid query parameters";
        res.status(400).json({ message: firstError });
        return;
      }

      const { search, category } = validationResult.data;
      const skills = await skillCatalogService.getSkillCatalog(search, category);

      res.status(200).json({ skills });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const skillCatalogController = new SkillCatalogController();
