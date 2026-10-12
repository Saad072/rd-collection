import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env, clientOrigins } from './config/env';
import v1 from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { uploadsPath } from './services/upload';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow /uploads images cross-origin
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || clientOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin ${origin}`));
      },
      credentials: true,
    }),
  );

  // Razorpay webhook needs the RAW body for signature verification —
  // mount before the JSON parser.
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '200kb' }));
  app.use(cookieParser());

  // Rate limits
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } },
  });
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1', apiLimiter);

  // Static assets: uploaded files + seeded catalog images
  app.use('/uploads', express.static(uploadsPath()));
  app.use('/images', express.static(path.resolve(process.cwd(), 'public/images')));

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, data: { status: 'up', env: env.NODE_ENV } });
  });

  app.use('/api/v1', v1);

  // Optional: serve the built client (single-service deploy) when CLIENT_DIST is set,
  // e.g. CLIENT_DIST=../client/dist. Mounted after the API so routes never conflict.
  const clientDist = process.env.CLIENT_DIST;
  if (clientDist) {
    const distPath = path.resolve(process.cwd(), clientDist);
    app.use(express.static(distPath));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
