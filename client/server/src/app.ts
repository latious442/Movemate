import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { config, isCloudinaryConfigured } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { itemsRouter } from "./routes/items.js";
import { uploadsRouter } from "./routes/uploads.js";
import { messagesRouter } from "./routes/messages.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      storageDriver: config.storageDriver,
      photoStorage: isCloudinaryConfigured() ? "cloudinary" : "unconfigured",
    });
  });

  app.use("/api", authRouter);
  app.use("/api", itemsRouter);
  app.use("/api", messagesRouter);
  app.use("/api", uploadsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(`[api] ${req.method} ${req.originalUrl}:`, error);
    res.status(500).json({ error: message });
  };
  app.use(errorHandler);

  return app;
}

export const app = createApp();
