import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAdmin } from '../middleware/auth';
import { validateRequest, zObjectId, zPaise } from '../middleware/validate';
import { ok, ApiError } from '../utils/respond';
import { paginate } from '../utils/pagination';
import { slugify } from '../utils/text';
import { User, publicUser } from '../models/User';
import { Product, publicProduct, type IProduct } from '../models/Product';
import {
  Order,
  publicOrder,
  canTransition,
  type FulfillmentStatus,
} from '../models/Order';
import { restoreStock } from './orders';
import { Collection, publicCollection } from '../models/Collection';
import { Coupon, publicCoupon } from '../models/Coupon';
import { Banner, publicBanner } from '../models/Banner';
import { upload, storeUpload } from '../services/upload';

const router = Router();
router.use(requireAdmin);

/* ================= dashboard ================= */

/** GET /admin/dashboard */
router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [ordersToday, pendingOrders, productCount, recentOrders, revenueAgg, lowStock] =
      await Promise.all([
        Order.countDocuments({ createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ fulfillment: { $in: ['pending', 'confirmed', 'processing'] } }),
        Product.countDocuments({}),
        Order.find({}).sort({ createdAt: -1 }).limit(10).lean(),
        Order.aggregate([
          { $match: { fulfillment: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } } },
          { $group: { _id: null, total: { $sum: '$totalPaise' } } },
        ]),
        Product.aggregate([
          { $unwind: '$variants' },
          {
            $match: {
              'variants.active': true,
              'variants.stock': { $lte: 5 },
              status: 'published',
            },
          },
          { $count: 'count' },
        ]),
      ]);
    res.json(
      ok({
        ordersToday,
        revenuePaise: revenueAgg[0]?.total ?? 0,
        pendingOrders,
        lowStockCount: lowStock[0]?.count ?? 0,
        productCount,
        recentOrders: recentOrders.map((o) => publicOrder(o as never)),
      }),
    );
  }),
);

/* ================= products ================= */

const variantInput = z.object({
  sku: z.string().trim().min(1).max(60),
  size: z.string().trim().min(1).max(20),
  color: z.string().trim().min(1).max(60),
  pricePaise: zPaise,
  compareAtPaise: zPaise.optional(),
  stock: z.number().int().min(0),
  active: z.boolean().default(true),
});

const productInput = z.object({
  name: z.string().trim().min(2).max(220),
  slug: z.string().trim().min(2).max(220).optional(),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(1).max(120),
  collections: z.array(z.string().trim().min(1).max(120)).default([]),
  images: z
    .array(z.object({ url: z.string().trim().min(1).max(800), alt: z.string().max(200).default('') }))
    .default([]),
  attributes: z.record(z.string(), z.string()).default({}),
  fabric: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().max(60)).default([]),
  seoTitle: z.string().trim().max(220).optional(),
  seoDescription: z.string().trim().max(400).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  isNew: z.boolean().default(false),
  variants: z.array(variantInput).min(1, 'At least one variant is required.'),
});

/** Keep Collection.productIds in sync for the given collection slugs. */
async function syncCollections(slugs: string[]): Promise<void> {
  const unique = [...new Set(slugs.map((s) => s.toLowerCase()))];
  for (const slug of unique) {
    const ids = await Product.find({ status: 'published', collections: slug }).select('_id');
    await Collection.updateOne({ slug }, { $set: { productIds: ids.map((p) => p._id) } });
  }
}

const productListQuery = z.object({
  q: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

/** GET /admin/products */
router.get(
  '/products',
  validateRequest({ query: productListQuery }),
  asyncHandler(async (req, res) => {
    const { q, status, page, pageSize } = req.query as unknown as z.infer<typeof productListQuery>;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (q) {
      const rx = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: rx, $options: 'i' } },
        { slug: { $regex: rx, $options: 'i' } },
        { 'variants.sku': { $regex: rx, $options: 'i' } },
      ];
    }
    const total = await Product.countDocuments(filter);
    const docs = await Product.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<IProduct[]>();
    res.json(ok(paginate(docs.map(publicProduct), total, page, pageSize)));
  }),
);

/** GET /admin/products/:id */
router.get(
  '/products/:id',
  validateRequest({ params: z.object({ id: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const p = await Product.findById(req.params.id);
    if (!p) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
    res.json(ok(publicProduct(p)));
  }),
);

/** POST /admin/products */
router.post(
  '/products',
  validateRequest({ body: productInput }),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof productInput>;
    const slug = slugify(data.slug || data.name);
    const clash = await Product.findOne({ slug }).select('_id').lean();
    if (clash) throw new ApiError(409, 'DUPLICATE', 'A product with this slug already exists.');
    const p = await Product.create({
      ...data,
      slug,
      category: data.category.toLowerCase(),
      collections: data.collections.map((c) => c.toLowerCase()),
      variants: data.variants.map((v) => ({ ...v, sku: v.sku.toUpperCase() })),
    });
    await syncCollections(p.collections);
    res.status(201).json(ok(publicProduct(p)));
  }),
);

const productPatch = productInput.partial();

/** PATCH /admin/products/:id */
router.patch(
  '/products/:id',
  validateRequest({ params: z.object({ id: zObjectId }), body: productPatch }),
  asyncHandler(async (req, res) => {
    const p = await Product.findById(req.params.id);
    if (!p) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
    const data = req.body as z.infer<typeof productPatch>;
    const oldCollections = [...p.collections];
    if (data.name !== undefined) p.name = data.name;
    if (data.slug !== undefined) {
      const slug = slugify(data.slug);
      const clash = await Product.findOne({ slug, _id: { $ne: p._id } }).select('_id').lean();
      if (clash) throw new ApiError(409, 'DUPLICATE', 'A product with this slug already exists.');
      p.slug = slug;
    }
    if (data.description !== undefined) p.description = data.description;
    if (data.category !== undefined) p.category = data.category.toLowerCase();
    if (data.collections !== undefined) p.collections = data.collections.map((c) => c.toLowerCase());
    if (data.images !== undefined) p.images = data.images as never;
    if (data.attributes !== undefined) p.attributes = data.attributes as never;
    if (data.fabric !== undefined) p.fabric = data.fabric;
    if (data.tags !== undefined) p.tags = data.tags;
    if (data.seoTitle !== undefined) p.seoTitle = data.seoTitle;
    if (data.seoDescription !== undefined) p.seoDescription = data.seoDescription;
    if (data.status !== undefined) p.status = data.status;
    if (data.isNew !== undefined) p.isNew = data.isNew;
    if (data.variants !== undefined) {
      p.variants = data.variants.map((v) => ({ ...v, sku: v.sku.toUpperCase() })) as never;
    }
    await p.save();
    await syncCollections([...oldCollections, ...p.collections]);
    res.json(ok(publicProduct(p)));
  }),
);

/** DELETE /admin/products/:id */
router.delete(
  '/products/:id',
  validateRequest({ params: z.object({ id: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
    await syncCollections(p.collections);
    res.json(ok({ deleted: true }));
  }),
);

/** POST /admin/upload — image upload, returns public URLs. */
router.post(
  '/upload',
  upload.array('images', 8),
  asyncHandler(async (req, res) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    if (!files.length) throw new ApiError(400, 'NO_FILES', 'No images were uploaded.');
    const urls = await Promise.all(files.map(storeUpload));
    res.status(201).json(ok({ urls }));
  }),
);

/* ================= orders ================= */

const CLIENT_TO_FULFILLMENT: Record<string, FulfillmentStatus> = {
  pending_payment: 'pending',
  confirmed: 'confirmed',
  processing: 'processing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  returned: 'returned',
  return_requested: 'returned',
  refund_pending: 'returned',
  refunded: 'returned',
  pending: 'pending',
};

const orderListQuery = z.object({
  status: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

/** GET /admin/orders */
router.get(
  '/orders',
  validateRequest({ query: orderListQuery }),
  asyncHandler(async (req, res) => {
    const { status, q, page, pageSize } = req.query as unknown as z.infer<typeof orderListQuery>;
    const filter: Record<string, unknown> = {};
    if (status) {
      const mapped = CLIENT_TO_FULFILLMENT[status] ?? (status as FulfillmentStatus);
      filter.fulfillment = mapped;
    }
    if (q) {
      const rx = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { orderNumber: { $regex: rx, $options: 'i' } },
        { 'address.fullName': { $regex: rx, $options: 'i' } },
        { 'address.phone': { $regex: rx, $options: 'i' } },
      ];
    }
    const total = await Order.countDocuments(filter);
    const docs = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();
    res.json(ok(paginate(docs.map((o) => publicOrder(o as never)), total, page, pageSize)));
  }),
);

/** GET /admin/orders/:id */
router.get(
  '/orders/:id',
  validateRequest({ params: z.object({ id: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const o = await Order.findById(req.params.id);
    if (!o) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    res.json(ok(publicOrder(o)));
  }),
);

/** PATCH /admin/orders/:id — valid status transitions only. */
router.patch(
  '/orders/:id',
  validateRequest({
    params: z.object({ id: zObjectId }),
    body: z.object({
      status: z.string().min(1).max(40),
      tracking: z.string().trim().max(120).optional(),
      note: z.string().trim().max(300).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const o = await Order.findById(req.params.id);
    if (!o) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    const { status: rawStatus, tracking, note } = req.body as {
      status: string;
      tracking?: string;
      note?: string;
    };
    const next = CLIENT_TO_FULFILLMENT[rawStatus] ?? (rawStatus as FulfillmentStatus);
    if (!Object.keys(CLIENT_TO_FULFILLMENT).includes(rawStatus) && !['pending','confirmed','processing','shipped','delivered','cancelled','returned'].includes(rawStatus)) {
      throw new ApiError(400, 'INVALID_STATUS', `Unknown status "${rawStatus}".`);
    }
    if (next === o.fulfillment) {
      throw new ApiError(400, 'NO_CHANGE', 'Order is already in this status.');
    }
    if (!canTransition(o.fulfillment, next)) {
      throw new ApiError(
        400,
        'INVALID_TRANSITION',
        `Cannot move order from ${o.fulfillment} to ${next}.`,
      );
    }
    if (next === 'cancelled') {
      await restoreStock(
        o.items.map((i) => ({
          productId: String(i.productId),
          variantId: String(i.variantId),
          qty: i.qty,
        })),
      );
    }
    o.fulfillment = next;
    if (tracking) o.trackingNumber = tracking;
    o.statusHistory.push({ status: next, at: new Date(), note: note ?? `Status -> ${next}` });
    await o.save();
    res.json(ok(publicOrder(o)));
  }),
);

/* ================= collections ================= */

function normalizeCollectionInput(data: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...data };
  if (typeof out.name === 'string' && out.title === undefined) out.title = out.name;
  if (typeof out.sortOrder === 'number' && out.displayOrder === undefined)
    out.displayOrder = out.sortOrder;
  if (typeof out.imageUrl === 'string' && out.image === undefined) out.image = out.imageUrl;
  delete out.name;
  delete out.sortOrder;
  delete out.imageUrl;
  return out;
}

const collectionInput = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  name: z.string().trim().min(2).max(160).optional(),
  slug: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(800).optional(),
  image: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  displayOrder: z.number().int().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

/** GET /admin/collections */
router.get(
  '/collections',
  asyncHandler(async (_req, res) => {
    const cols = await Collection.find({}).sort({ displayOrder: 1, title: 1 }).lean();
    res.json(ok(cols.map((c) => publicCollection(c as never))));
  }),
);

/** POST /admin/collections */
router.post(
  '/collections',
  validateRequest({ body: collectionInput }),
  asyncHandler(async (req, res) => {
    const data = normalizeCollectionInput(req.body as Record<string, unknown>);
    const title = data.title as string | undefined;
    if (!title) throw new ApiError(400, 'VALIDATION_ERROR', 'title: Required');
    const slug = slugify((data.slug as string | undefined) || title);
    const clash = await Collection.findOne({ slug }).select('_id').lean();
    if (clash) throw new ApiError(409, 'DUPLICATE', 'A collection with this slug already exists.');
    const col = await Collection.create({ ...data, title, slug });
    await syncCollections([col.slug]);
    res.status(201).json(ok(publicCollection(col)));
  }),
);

/** PATCH /admin/collections/:id */
router.patch(
  '/collections/:id',
  validateRequest({ params: z.object({ id: zObjectId }), body: collectionInput.partial() }),
  asyncHandler(async (req, res) => {
    const col = await Collection.findById(req.params.id);
    if (!col) throw new ApiError(404, 'NOT_FOUND', 'Collection not found.');
    const data = normalizeCollectionInput(req.body as Record<string, unknown>);
    if (typeof data.slug === 'string') {
      const slug = slugify(data.slug);
      const clash = await Collection.findOne({ slug, _id: { $ne: col._id } }).select('_id').lean();
      if (clash) throw new ApiError(409, 'DUPLICATE', 'A collection with this slug already exists.');
      data.slug = slug;
    }
    Object.assign(col, data);
    await col.save();
    await syncCollections([col.slug]);
    res.json(ok(publicCollection(col)));
  }),
);

/** DELETE /admin/collections/:id */
router.delete(
  '/collections/:id',
  validateRequest({ params: z.object({ id: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const col = await Collection.findByIdAndDelete(req.params.id);
    if (!col) throw new ApiError(404, 'NOT_FOUND', 'Collection not found.');
    res.json(ok({ deleted: true }));
  }),
);

/* ================= coupons ================= */

function normalizeCouponInput(data: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...data };
  if (out.code !== undefined) out.code = String(out.code).toUpperCase().trim();
  // client shape: value (+type) -> valuePaise / percentValue
  if (out.value !== undefined && out.type === 'flat' && out.valuePaise === undefined)
    out.valuePaise = out.value;
  if (out.value !== undefined && out.type === 'percent' && out.percentValue === undefined)
    out.percentValue = out.value;
  if (out.startsAt !== undefined && out.validFrom === undefined) out.validFrom = out.startsAt;
  if (out.endsAt !== undefined && out.validTo === undefined) out.validTo = out.endsAt;
  delete out.value;
  delete out.startsAt;
  delete out.endsAt;
  return out;
}

const couponInput = z.object({
  code: z.string().trim().min(2).max(32),
  type: z.enum(['flat', 'percent']),
  value: z.number().min(0).optional(),
  valuePaise: zPaise.optional(),
  percentValue: z.number().min(1).max(100).optional(),
  maxDiscountPaise: zPaise.optional(),
  minOrderPaise: zPaise.default(0),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  usageLimit: z.number().int().min(1).optional(),
  active: z.boolean().default(true),
});

/** GET /admin/coupons */
router.get(
  '/coupons',
  asyncHandler(async (_req, res) => {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
    res.json(ok(coupons.map((c) => publicCoupon(c as never))));
  }),
);

/** POST /admin/coupons */
router.post(
  '/coupons',
  validateRequest({ body: couponInput }),
  asyncHandler(async (req, res) => {
    const data = normalizeCouponInput(req.body as Record<string, unknown>);
    if (data.type === 'flat' && data.valuePaise === undefined)
      throw new ApiError(400, 'VALIDATION_ERROR', 'valuePaise is required for flat coupons.');
    if (data.type === 'percent' && data.percentValue === undefined)
      throw new ApiError(400, 'VALIDATION_ERROR', 'percentValue is required for percent coupons.');
    const c = await Coupon.create(data);
    res.status(201).json(ok(publicCoupon(c)));
  }),
);

/** PATCH /admin/coupons/:id */
router.patch(
  '/coupons/:id',
  validateRequest({ params: z.object({ id: zObjectId }), body: couponInput.partial() }),
  asyncHandler(async (req, res) => {
    const c = await Coupon.findById(req.params.id);
    if (!c) throw new ApiError(404, 'NOT_FOUND', 'Coupon not found.');
    const data = normalizeCouponInput(req.body as Record<string, unknown>);
    Object.assign(c, data);
    await c.save();
    res.json(ok(publicCoupon(c)));
  }),
);

/** DELETE /admin/coupons/:id */
router.delete(
  '/coupons/:id',
  validateRequest({ params: z.object({ id: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const c = await Coupon.findByIdAndDelete(req.params.id);
    if (!c) throw new ApiError(404, 'NOT_FOUND', 'Coupon not found.');
    res.json(ok({ deleted: true }));
  }),
);

/* ================= banners ================= */

function normalizeBannerInput(data: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...data };
  if (typeof out.imageUrl === 'string' && out.image === undefined) out.image = out.imageUrl;
  if (typeof out.mobileImageUrl === 'string' && out.mobileImage === undefined)
    out.mobileImage = out.mobileImageUrl;
  if (typeof out.ctaUrl === 'string' && out.link === undefined) out.link = out.ctaUrl;
  if (typeof out.sortOrder === 'number' && out.displayOrder === undefined)
    out.displayOrder = out.sortOrder;
  delete out.imageUrl;
  delete out.mobileImageUrl;
  delete out.ctaUrl;
  delete out.sortOrder;
  return out;
}

const bannerInput = z.object({
  title: z.string().trim().max(160).optional(),
  subtitle: z.string().trim().max(300).optional(),
  image: z.string().trim().min(1).max(800).optional(),
  imageUrl: z.string().trim().min(1).max(800).optional(),
  mobileImage: z.string().trim().max(800).optional(),
  mobileImageUrl: z.string().trim().max(800).optional(),
  link: z.string().trim().max(500).optional(),
  ctaUrl: z.string().trim().max(500).optional(),
  ctaLabel: z.string().trim().max(60).optional(),
  position: z.string().trim().min(1).max(60),
  displayOrder: z.number().int().default(0),
  sortOrder: z.number().int().optional(),
  active: z.boolean().default(true),
});

/** GET /admin/banners */
router.get(
  '/banners',
  asyncHandler(async (_req, res) => {
    const banners = await Banner.find({}).sort({ position: 1, displayOrder: 1 }).lean();
    res.json(ok(banners.map((b) => publicBanner(b as never))));
  }),
);

/** POST /admin/banners */
router.post(
  '/banners',
  validateRequest({ body: bannerInput }),
  asyncHandler(async (req, res) => {
    const data = normalizeBannerInput(req.body as Record<string, unknown>);
    if (!data.image) throw new ApiError(400, 'VALIDATION_ERROR', 'image: Required');
    const b = await Banner.create(data);
    res.status(201).json(ok(publicBanner(b)));
  }),
);

/** PATCH /admin/banners/:id */
router.patch(
  '/banners/:id',
  validateRequest({ params: z.object({ id: zObjectId }), body: bannerInput.partial() }),
  asyncHandler(async (req, res) => {
    const b = await Banner.findById(req.params.id);
    if (!b) throw new ApiError(404, 'NOT_FOUND', 'Banner not found.');
    Object.assign(b, normalizeBannerInput(req.body as Record<string, unknown>));
    await b.save();
    res.json(ok(publicBanner(b)));
  }),
);

/** DELETE /admin/banners/:id */
router.delete(
  '/banners/:id',
  validateRequest({ params: z.object({ id: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const b = await Banner.findByIdAndDelete(req.params.id);
    if (!b) throw new ApiError(404, 'NOT_FOUND', 'Banner not found.');
    res.json(ok({ deleted: true }));
  }),
);

/* ================= customers ================= */

const customerListQuery = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

/** GET /admin/customers */
router.get(
  '/customers',
  validateRequest({ query: customerListQuery }),
  asyncHandler(async (req, res) => {
    const { q, page, pageSize } = req.query as unknown as z.infer<typeof customerListQuery>;
    const filter: Record<string, unknown> = { role: 'customer' };
    if (q) {
      const rx = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: rx, $options: 'i' } },
        { email: { $regex: rx, $options: 'i' } },
      ];
    }
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    res.json(ok(paginate(users.map(publicUser), total, page, pageSize)));
  }),
);

/** GET /admin/customers/:id — profile + order history. */
router.get(
  '/customers/:id',
  validateRequest({ params: z.object({ id: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'Customer not found.');
    const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
    res.json(ok({ user: publicUser(user), orders: orders.map((o) => publicOrder(o as never)) }));
  }),
);

export default router;
