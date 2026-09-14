import { Router } from "express";
import { portfolioController } from "../controllers/portfolio.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// POST /api/portfolios - Create a new portfolio (authenticated)
router.post("/", authMiddleware, (req, res, next) =>
  portfolioController.createPortfolio(req, res, next)
);

export const portfolioRoutes = router;
