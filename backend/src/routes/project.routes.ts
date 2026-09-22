import { Router } from "express";
import { projectController } from "../controllers/project.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// GET /api/projects/:id - Get a single project by ID (authenticated, ownership-aware)
router.get("/:id", authMiddleware, (req, res, next) =>
  projectController.getProjectById(req, res, next)
);

// PUT /api/projects/:id - Update an existing project (authenticated, ownership-aware)
router.put("/:id", authMiddleware, (req, res, next) =>
  projectController.updateProject(req, res, next)
);

// DELETE /api/projects/:id - Delete an existing project (authenticated, ownership-aware)
router.delete("/:id", authMiddleware, (req, res, next) =>
  projectController.deleteProject(req, res, next)
);

export const projectRoutes = router;
