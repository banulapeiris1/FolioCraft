import { Router } from "express";
import { experienceController } from "../controllers/experience.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// GET /api/experience/:id - Get a single experience record by ID (authenticated, ownership-aware)
router.get("/:id", authMiddleware, (req, res, next) =>
  experienceController.getExperienceById(req, res, next)
);

// PUT /api/experience/:id - Update an existing experience record (authenticated, ownership-aware)
router.put("/:id", authMiddleware, (req, res, next) =>
  experienceController.updateExperience(req, res, next)
);

// DELETE /api/experience/:id - Delete an existing experience record (authenticated, ownership-aware)
router.delete("/:id", authMiddleware, (req, res, next) =>
  experienceController.deleteExperience(req, res, next)
);

export const experienceRoutes = router;
