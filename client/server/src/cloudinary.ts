import { v2 as cloudinary } from "cloudinary";
import { config, isCloudinaryConfigured } from "./config.js";

let configured = false;

function client() {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export interface UploadedImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

export function uploadImage(buffer: Buffer, folder = config.cloudinary.folder): Promise<UploadedImage> {
  const cl = client();
  return new Promise((resolve, reject) => {
    const stream = cl.uploader.upload_stream(
      { folder, resource_type: "image", overwrite: false },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function destroyImage(publicId: string): Promise<void> {
  try {
    await client().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  } catch {
    // Best effort: the record should still be deletable if the asset is already gone.
  }
}

/**
 * Cloudinary can also store the JSON database as a raw asset. This is what makes
 * the app persistent on serverless hosts (Vercel/Netlify) where the local
 * filesystem is read-only and ephemeral.
 */
export async function uploadRawJson(
  publicId: string,
  data: Buffer,
): Promise<void> {
  const cl = client();
  await new Promise<void>((resolve, reject) => {
    const stream = cl.uploader.upload_stream(
      { resource_type: "raw", public_id: publicId, overwrite: true, invalidate: true },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary raw upload failed"));
          return;
        }
        resolve();
      },
    );
    stream.end(data);
  });
}

export async function fetchRawJson<T>(publicId: string): Promise<T | null> {
  const cl = client();
  // Cloudinary's CDN caches raw assets by path and ignores query strings, so a
  // plain delivery URL keeps serving a stale copy after an overwrite (which
  // makes read-modify-write cycles lose data). Look up the current version via
  // the Admin API and read the versioned URL, which changes on every upload.
  let version: number | undefined;
  let secureUrl: string | undefined;
  try {
    const resource = await cl.api.resource(publicId, {
      resource_type: "raw",
      type: "upload",
    });
    version = resource.version;
    secureUrl = resource.secure_url;
  } catch (error) {
    if ((error as { http_code?: number }).http_code === 404) return null;
    throw error;
  }
  const url =
    secureUrl ??
    cl.utils.url(publicId, {
      resource_type: "raw",
      type: "upload",
      secure: true,
      version,
    });
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to read Cloudinary asset (${res.status})`);
  }
  return (await res.json()) as T;
}

export { client as cloudinaryClient };
