import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validate';
import { ok } from '../utils/respond';
import { Banner, publicBanner } from '../models/Banner';

const router = Router();

/** GET /banners?position=home-hero — active banners for a slot. */
router.get(
  '/',
  validateRequest({ query: z.object({ position: z.string().max(60).optional() }) }),
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { active: true };
    const position = (req.query as { position?: string }).position;
    if (position) filter.position = position;
    const banners = await Banner.find(filter).sort({ displayOrder: 1, createdAt: -1 }).lean();
    res.json(ok(banners.map((b) => publicBanner(b as never))));
  }),
);

export default router;
