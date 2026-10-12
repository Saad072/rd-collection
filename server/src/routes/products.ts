import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validate';
import { ok, ApiError } from '../utils/respond';
import { Product, publicProduct } from '../models/Product';
import { Review } from '../models/Misc';
import { listProducts } from '../services/catalog';

const router = Router();

const productQuery = z.object({
  category: z.string().optional(),
  collection: z.string().optional(),
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

/** GET /products — filterable, sortable, paginated product listing. */
router.get(
  '/',
  validateRequest({ query: productQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof productQuery>;
    const result = await listProducts({
      category: q.category,
      collection: q.collection,
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
    res.json(ok(result));
  }),
);

/** GET /products/:slug — full detail with variants. */
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const p = await Product.findOne({ slug: req.params.slug.toLowerCase(), status: 'published' });
    if (!p) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
    res.json(ok(publicProduct(p)));
  }),
);

/** GET /products/:slug/reviews — approved reviews for a product. */
router.get(
  '/:slug/reviews',
  asyncHandler(async (req, res) => {
    const p = await Product.findOne({ slug: req.params.slug.toLowerCase() }).select('_id');
    if (!p) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
    const reviews = await Review.find({ productId: p._id, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(
      ok(
        reviews.map((r) => ({
          _id: String(r._id),
          userName: r.userName,
          rating: r.rating,
          title: r.title,
          body: r.body,
          createdAt: r.createdAt,
        })),
      ),
    );
  }),
);

/** GET /products/:slug/related — same-category products, excluding self. */
router.get(
  '/:slug/related',
  asyncHandler(async (req, res) => {
    const p = await Product.findOne({ slug: req.params.slug.toLowerCase() }).select('_id category');
    if (!p) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
    const related = await Product.find({
      _id: { $ne: p._id },
      status: 'published',
      category: p.category,
    })
      .limit(8)
      .lean();
    res.json(ok(related.map((r) => publicProduct(r as never))));
  }),
);

export default router;
