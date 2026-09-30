import type { Request, Response, NextFunction } from "express";
import { cvUploadService } from "../services/cvUpload.service";
import { AppError } from "../utils/errors";

export class CvController {
  /**
   * Handles POST /api/cv/upload
   * Authenticated multipart file upload endpoint for CV document processing.
   */
  async uploadCv(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          message: "No CV file uploaded. Please provide a file.",
        });
        return;
      }

      const portfolioId =
        typeof req.body?.portfolioId === "string" &&
        req.body.portfolioId.trim() !== ""
          ? req.body.portfolioId.trim()
          : null;

      const uploadResult = await cvUploadService.processCvUpload({
        userId: req.user.userId,
        portfolioId,
        file: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer,
        },
      });

      res.status(201).json({
        message: "CV uploaded and processed successfully",
        upload: {
          id: uploadResult.id,
          userId: uploadResult.userId,
          portfolioId: uploadResult.portfolioId,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          status: uploadResult.status,
          parsedData: uploadResult.parsedData,
          createdAt: uploadResult.createdAt,
          updatedAt: uploadResult.updatedAt,
        },
        uploadId: uploadResult.id,
        status: uploadResult.status,
        parsedData: uploadResult.parsedData,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const cvController = new CvController();
