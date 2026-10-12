import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validate';
import { requireAuth, signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth';
import { ok, ApiError } from '../utils/respond';
import { User, publicUser } from '../models/User';
import { sendWelcomeEmail } from '../services/email';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120),
  email: z.string().email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must include a letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
  phone: z.string().trim().max(20).optional(),
});

/** POST /auth/register */
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body as z.infer<typeof registerSchema>;
    const normalized = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalized }).select('_id').lean();
    if (existing) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: normalized, passwordHash, phone });
    setAuthCookie(res, signToken(String(user._id), user.role));
    // Best-effort welcome email; never fail registration if it errors.
    sendWelcomeEmail(user.email, user.name).catch(() => undefined);
    res.status(201).json(ok(publicUser(user)));
  }),
);

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.').max(128),
});

/** POST /auth/login */
router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '+passwordHash',
    );
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    setAuthCookie(res, signToken(String(user._id), user.role));
    res.json(ok(publicUser(user)));
  }),
);

/** POST /auth/logout */
router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearAuthCookie(res);
    res.json(ok({ ok: true }));
  }),
);

/** GET /auth/me */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?.id);
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    res.json(ok(publicUser(user)));
  }),
);

export default router;
