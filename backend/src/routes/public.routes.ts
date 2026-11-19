import { Router } from "express";
import { publicPortfolioController } from "../controllers/publicPortfolio.controller";

const router = Router();

/**
 * Public Routes (PUB-02)
 * All endpoints mounted here are publicly accessible without authentication.
 */

// GET /api/public/:username - Retrieve published portfolio by username
router.get("/:username", (req, res, next) =>
  publicPortfolioController.getPublicPortfolio(req, res, next)
);

export const publicRoutes = router;

