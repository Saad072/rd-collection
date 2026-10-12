import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { ok } from '../utils/respond';
import { Category, publicCategory } from '../models/Category';

const router = Router();

/** GET /categories — active categories, parents before children. */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const cats = await Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();
    res.json(ok(cats.map((c) => publicCategory(c as never))));
  }),
);

export default router;
