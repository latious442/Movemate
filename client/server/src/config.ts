import { loadServerEnv } from "./loadEnv.js";
import path from "node:path";

loadServerEnv();
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..");
const dataFile = process.env.DATA_FILE
  ? path.resolve(serverRoot, process.env.DATA_FILE)
  : path.resolve(serverRoot, "data", "db.json");

export type StorageDriver = "file" | "cloudinary";

const storageDriver = (process.env.STORAGE_DRIVER ?? "file") as StorageDriver;

export const config = {
  port: Number(process.env.PORT ?? 3001),
  storageDriver,
  dataFile,
  messagesDataFile: path.resolve(path.dirname(dataFile), "messages.json"),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 8 * 1024 * 1024),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER ?? "movemate",
  },
} as const;

export function isCloudinaryConfigured(): boolean {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}
