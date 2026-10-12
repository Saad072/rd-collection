import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validate';
import { ok } from '../utils/respond';
import { Product, publicProduct, type IProduct } from '../models/Product';
import { sanitizeSearch } from '../services/catalog';

const router = Router();

const searchQuery = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

/**
 * GET /search?q= — sanitized search across name, SKU, category, tags.
 * Returns a ranked array (suggestions + results); `limit` caps it.
 */
router.get(
  '/',
  validateRequest({ query: searchQuery }),
  asyncHandler(async (req, res) => {
    const { q: raw, limit } = req.query as unknown as z.infer<typeof searchQuery>;
    const q = sanitizeSearch(raw);
    if (!q) {
      res.json(ok([]));
      return;
    }
    const base = { status: 'published' } as const;
    let docs: IProduct[] = [];
    try {
      // Whole-word ranked search. If the text index is still building
      // (e.g. right after a fresh deploy), fall through to the regex path.
      docs = await Product.find(
        { ...base, $text: { $search: q } },
        { score: { $meta: 'textScore' } },
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean<IProduct[]>();
    } catch {
      docs = [];
    }
    if (!docs.length) {
      const rx = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      docs = await Product.find({
        ...base,
        $or: [
          { name: { $regex: rx, $options: 'i' } },
          { 'variants.sku': { $regex: rx, $options: 'i' } },
          { category: { $regex: rx, $options: 'i' } },
          { tags: { $regex: rx, $options: 'i' } },
        ],
      })
        .limit(limit)
        .lean<IProduct[]>();
    }
    res.json(ok(docs.map(publicProduct)));
  }),
);

export default router;
