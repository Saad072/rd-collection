import type { NextFunction, Request, Response } from 'express';
import { z, type ZodSchema } from 'zod';
import { ApiError } from '../utils/respond';

export interface RequestSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/** Validate body/query/params with zod. Replaces them with parsed values. */
export function validateRequest(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = (schemas.body as z.ZodTypeAny).parse(req.body);
      if (schemas.query) {
        const parsed = (schemas.query as z.ZodTypeAny).parse(req.query);
        req.query = parsed as Request['query'];
      }
      if (schemas.params) req.params = (schemas.params as z.ZodTypeAny).parse(req.params);
      return next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.issues[0];
        const where = first?.path?.join('.') || 'input';
        return next(
          new ApiError(400, 'VALIDATION_ERROR', `${where}: ${first?.message ?? 'invalid value'}`),
        );
      }
      return next(err);
    }
  };
}

/** Common zod primitives reused across routes. */
export const zObjectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

export const zPaise = z.number().int().min(0);
