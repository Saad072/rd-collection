/**
 * Image upload.
 * - When Cloudinary is configured: uploads there (cloudinary package is
 *   required lazily; falls back to local disk with a warning if missing).
 * - Otherwise: local disk storage under <UPLOAD_DIR>, served at /uploads.
 */
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env, cloudinaryConfigured } from '../config/env';

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

async function uploadToCloudinary(localPath: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cloudinary = require('cloudinary') as {
      v2: {
        config: (c: unknown) => void;
        uploader: { upload: (p: string, o: unknown) => Promise<{ secure_url: string }> };
      };
    };
    cloudinary.v2.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    const res = await cloudinary.v2.uploader.upload(localPath, { folder: 'rd-collection' });
    fs.unlink(localPath, () => undefined);
    return res.secure_url;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[upload] cloudinary unavailable, keeping local file:', (e as Error).message);
    return localFileUrl(localPath);
  }
}

export function localFileUrl(localPath: string): string {
  return `/uploads/${path.basename(localPath)}`;
}

/** Store an uploaded file and return its public URL. */
export async function storeUpload(file: Express.Multer.File): Promise<string> {
  if (cloudinaryConfigured) return uploadToCloudinary(file.path);
  return localFileUrl(file.path);
}

/** Absolute disk path of the upload directory (for express.static). */
export function uploadsPath(): string {
  return uploadDir;
}
