import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  ADMIN_EMAIL: z.string().email().default('admin@rdcollection.in'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@123'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  UPLOAD_DIR: z.string().default('uploads'),
});

export type Env = z.infer<typeof envSchema>;

// Throws a descriptive error at boot when required config is missing.
export const env: Env = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === 'production';
export const razorpayConfigured =
  Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
export const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);
export const clientOrigins = env.CLIENT_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
