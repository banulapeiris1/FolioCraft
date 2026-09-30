import { Router } from "express";
import { cvController } from "../controllers/cv.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { uploadCvMiddleware } from "../middleware/upload.middleware";

const router = Router();

/**
 * POST /api/cv/upload
 * Requires authentication and multipart file upload with 'file' field.
 */
router.post(
  "/upload",
  authMiddleware,
  uploadCvMiddleware,
  (req, res, next) => cvController.uploadCv(req, res, next)
);

export const cvRoutes = router;
