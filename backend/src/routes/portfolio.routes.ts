import { Router } from "express";
import { portfolioController } from "../controllers/portfolio.controller";
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

export const portfolioRoutes = router;

