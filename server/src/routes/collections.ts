import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validate';
import { ok } from '../utils/respond';
import { ApiError } from '../utils/respond';
import { Collection, publicCollection } from '../models/Collection';
import { Product } from '../models/Product';
import { listProducts } from '../services/catalog';

const router = Router();

/** GET /collections — active collections with product counts. */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const cols = await Collection.find({ active: true }).sort({ displayOrder: 1, title: 1 }).lean();
    const withCounts = await Promise.all(
      cols.map(async (c) => {
        const count = await Product.countDocuments({ status: 'published', collections: c.slug });
        return publicCollection(c as never, count);
      }),
    );
    res.json(ok(withCounts));
  }),
);

const collectionQuery = z.object({
  q: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  fabric: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  availability: z.string().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
});

/** GET /collections/:slug — collection + paginated/filtered/sorted products. */
router.get(
  '/:slug',
  validateRequest({ query: collectionQuery }),
  asyncHandler(async (req, res) => {
    const col = await Collection.findOne({ slug: req.params.slug.toLowerCase(), active: true }).lean();
    if (!col) throw new ApiError(404, 'NOT_FOUND', 'Collection not found.');
    const q = req.query as unknown as z.infer<typeof collectionQuery>;
    const products = await listProducts({
      collection: col.slug,
      q: q.q,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      size: q.size,
      color: q.color,
      fabric: q.fabric,
      inStock: q.inStock ?? q.availability === 'in-stock',
      sort: q.sort,
      page: q.page,
      pageSize: q.pageSize ?? q.limit,
    });
    res.json(ok({ collection: publicCollection(col as never, products.total), products }));
  }),
);

export default router;
