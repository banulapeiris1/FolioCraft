import { Router } from "express";
import { portfolioController } from "../controllers/portfolio.controller";
import { projectController } from "../controllers/project.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// GET /api/portfolios - Get all portfolios for authenticated user
router.get("/", authMiddleware, (req, res, next) =>
  portfolioController.getPortfolios(req, res, next)
);

// POST /api/portfolios - Create a new portfolio (authenticated)
router.post("/", authMiddleware, (req, res, next) =>
  portfolioController.createPortfolio(req, res, next)
);

// GET /api/portfolios/:id - Get a single portfolio by ID (authenticated, ownership-aware)
router.get("/:id", authMiddleware, (req, res, next) =>
  portfolioController.getPortfolioById(req, res, next)
);

// PUT /api/portfolios/:id - Update an existing portfolio (authenticated, ownership-aware)
router.put("/:id", authMiddleware, (req, res, next) =>
  portfolioController.updatePortfolio(req, res, next)
);

// DELETE /api/portfolios/:id - Delete an existing portfolio (authenticated, ownership-aware)
router.delete("/:id", authMiddleware, (req, res, next) =>
  portfolioController.deletePortfolio(req, res, next)
);

// POST /api/portfolios/:id/projects - Create a new project under portfolio (authenticated)
router.post("/:id/projects", authMiddleware, (req, res, next) =>
  projectController.createProject(req, res, next)
);

// GET /api/portfolios/:id/projects - Get all projects for portfolio (authenticated)
router.get("/:id/projects", authMiddleware, (req, res, next) =>
  projectController.getProjectsByPortfolio(req, res, next)
);

export const portfolioRoutes = router;



