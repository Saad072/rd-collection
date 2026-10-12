import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ApiError, fail } from '../utils/respond';
import { env } from '../config/env';

/** Final error middleware. Always responds with the { ok:false, error } envelope. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    res.status(err.status).json(fail(err.code, err.message));
    return;
  }
  if (err instanceof z.ZodError) {
    res.status(400).json(fail('VALIDATION_ERROR', 'Invalid request data.'));
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json(fail('VALIDATION_ERROR', err.message));
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json(fail('INVALID_ID', 'Invalid identifier.'));
    return;
  }
  // Duplicate key (e.g. unique email / slug / coupon code)
  const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoErr && mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'field';
    res.status(409).json(fail('DUPLICATE', `A record with this ${field} already exists.`));
    return;
  }
  if (env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error('[error]', err instanceof Error ? err.stack ?? err.message : err);
  }
  res.status(500).json(fail('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
}

/** 404 for unknown /api/v1 routes. */
export function notFound(_req: Request, res: Response) {
  res.status(404).json(fail('NOT_FOUND', 'Route not found.'));
}
