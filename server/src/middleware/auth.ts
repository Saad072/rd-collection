import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/respond';
import { User } from '../models/User';

export interface AuthPayload {
  sub: string;
  role: 'customer' | 'admin';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: 'customer' | 'admin' };
    }
  }
}

export const AUTH_COOKIE = 'rd_token';

export function signToken(userId: string, role: 'customer' | 'admin'): string {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
}

/** Require a valid JWT (httpOnly cookie). Attaches req.user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token || typeof token !== 'string') {
    return next(new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.'));
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.'));
  }
}

/** Require an authenticated admin user (role re-checked from the database). */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  await requireAuth(req, _res, (err?: unknown) => {
    if (err) return next(err);
    void (async () => {
      try {
        const user = await User.findById(req.user?.id).select('role').lean();
        if (!user || user.role !== 'admin') {
          return next(new ApiError(403, 'FORBIDDEN', 'Admin access required.'));
        }
        req.user = { id: String(user._id), role: 'admin' };
        return next();
      } catch (e) {
        return next(e);
      }
    })();
  });
}
