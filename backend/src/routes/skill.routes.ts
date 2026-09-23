import { Router } from "express";
import { skillController } from "../controllers/skill.controller";
import { skillCatalogController } from "../controllers/skillCatalog.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// GET /api/skills/catalog - Get global skill catalog (public/unrestricted, optional search & category)
router.get("/catalog", (req, res, next) =>
  skillCatalogController.getCatalog(req, res, next)
);

// GET /api/skills/:id - Get a single skill by ID (authenticated, ownership-aware)
router.get("/:id", authMiddleware, (req, res, next) =>
  skillController.getSkillById(req, res, next)
);

// PUT /api/skills/:id - Update an existing skill (authenticated, ownership-aware)
router.put("/:id", authMiddleware, (req, res, next) =>
  skillController.updateSkill(req, res, next)
);

// DELETE /api/skills/:id - Delete an existing skill (authenticated, ownership-aware)
router.delete("/:id", authMiddleware, (req, res, next) =>
  skillController.deleteSkill(req, res, next)
);

export const skillRoutes = router;
