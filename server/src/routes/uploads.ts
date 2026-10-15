import { Router } from "express";
import multer from "multer";
import { config, isCloudinaryConfigured } from "../config";
import { uploadImage } from "../cloudinary";
import { db } from "../db";

export const uploadsRouter = Router();

const BEARER = /^Bearer\s+(\S+)\s*$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
});

uploadsRouter.post("/uploads", upload.single("file"), async (req, res, next) => {
  try {
    const match = req.headers.authorization ? BEARER.exec(req.headers.authorization) : null;
    const ownerId = match?.[1] ? await db.getUserIdBySessionToken(match[1]) : undefined;
    if (!ownerId) {
      res.status(401).json({ error: "Sign in to upload listing photos." });
      return;
    }
    if (!isCloudinaryConfigured()) {
      res.status(503).json({
        error:
          "Photo storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
      });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file provided under the 'file' field" });
      return;
    }
    if (!req.file.mimetype.startsWith("image/")) {
      res.status(415).json({ error: "Only image uploads are supported" });
      return;
    }
    res.status(201).json(await uploadImage(req.file.buffer));
  } catch (error) {
    next(error);
  }
});
