import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validateRequest, zObjectId } from '../middleware/validate';
import { ok, ApiError } from '../utils/respond';
import { Cart, type ICart } from '../models/Cart';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import { autoDiscountPaise, validateCoupon } from '../services/pricing';

const router = Router();
router.use(requireAuth);

export interface CartItemView {
  _id: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  image: string;
  size: string;
  color: string;
  unitPaise: number;
  qty: number;
  available: boolean;
  stock: number;
}

/** Enrich cart items with live product/variant snapshots. */
export async function cartView(cart: ICart): Promise<{ items: CartItemView[]; couponCode: string | null }> {
  const products = await Product.find({
    _id: { $in: cart.items.map((i) => i.productId) },
  }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items: CartItemView[] = cart.items.map((item) => {
    const p = byId.get(String(item.productId));
    const v = p?.variants?.find((vv) => String((vv as { _id?: unknown })._id) === String(item.variantId));
    return {
      _id: String((item as unknown as { _id: unknown })._id),
      productId: String(item.productId),
      variantId: String(item.variantId),
      slug: p?.slug ?? '',
      name: p?.name ?? 'Unavailable product',
      image: p?.images?.[0]?.url ?? '',
      size: v?.size ?? '',
      color: v?.color ?? '',
      unitPaise: item.unitPaise,
      qty: item.qty,
      available: Boolean(p && p.status === 'published' && v?.active && (v?.stock ?? 0) >= item.qty),
      stock: v?.stock ?? 0,
    };
  });
  return { items, couponCode: cart.couponCode ?? null };
}

async function getOrCreateCart(userId: string): Promise<ICart> {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ userId, items: [] });
  return cart;
}

function cartSubtotal(cart: ICart): number {
  return cart.items.reduce((s, i) => s + i.unitPaise * i.qty, 0);
}

/** GET /cart */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user!.id);
    res.json(ok(await cartView(cart)));
  }),
);

const addItemSchema = z.object({
  productId: zObjectId,
  variantId: zObjectId,
  qty: z.number().int().min(1).max(10).default(1),
});

/** POST /cart/items — price and stock are always revalidated server-side. */
router.post(
  '/items',
  validateRequest({ body: addItemSchema }),
  asyncHandler(async (req, res) => {
    const { productId, variantId, qty } = req.body as z.infer<typeof addItemSchema>;
    const product = await Product.findOne({ _id: productId, status: 'published' });
    if (!product) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
    const variant = product.variants.find((v) => String((v as { _id?: unknown })._id) === variantId);
    if (!variant || !variant.active) {
      throw new ApiError(404, 'NOT_FOUND', 'This variant is not available.');
    }
    if (variant.stock < qty) {
      throw new ApiError(409, 'INSUFFICIENT_STOCK', `Only ${variant.stock} left in stock.`);
    }
    const cart = await getOrCreateCart(req.user!.id);
    const existing = cart.items.find(
      (i) => String(i.productId) === productId && String(i.variantId) === variantId,
    );
    if (existing) {
      const nextQty = existing.qty + qty;
      if (variant.stock < nextQty) {
        throw new ApiError(409, 'INSUFFICIENT_STOCK', `Only ${variant.stock} left in stock.`);
      }
      existing.qty = nextQty;
      existing.unitPaise = variant.pricePaise; // refresh to authoritative price
    } else {
      cart.items.push({
        productId: product._id,
        variantId: (variant as { _id: unknown })._id as never,
        qty,
        unitPaise: variant.pricePaise,
      } as never);
    }
    await cart.save();
    res.status(201).json(ok(await cartView(cart)));
  }),
);

const patchItemSchema = z.object({ qty: z.number().int().min(1).max(10) });

/** PATCH /cart/items/:itemId */
router.patch(
  '/items/:itemId',
  validateRequest({ params: z.object({ itemId: zObjectId }), body: patchItemSchema }),
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user!.id);
    const item = cart.items.find((i) => String((i as unknown as { _id: unknown })._id) === req.params.itemId);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Cart item not found.');
    const product = await Product.findById(item.productId);
    const variant = product?.variants.find(
      (v) => String((v as { _id?: unknown })._id) === String(item.variantId),
    );
    const qty = (req.body as z.infer<typeof patchItemSchema>).qty;
    if (!variant || !variant.active || (product?.status !== 'published')) {
      throw new ApiError(409, 'UNAVAILABLE', 'This item is no longer available.');
    }
    if (variant.stock < qty) {
      throw new ApiError(409, 'INSUFFICIENT_STOCK', `Only ${variant.stock} left in stock.`);
    }
    item.qty = qty;
    item.unitPaise = variant.pricePaise;
    await cart.save();
    res.json(ok(await cartView(cart)));
  }),
);

/** DELETE /cart/items/:itemId */
router.delete(
  '/items/:itemId',
  validateRequest({ params: z.object({ itemId: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user!.id);
    const before = cart.items.length;
    cart.items = cart.items.filter(
      (i) => String((i as unknown as { _id: unknown })._id) !== req.params.itemId,
    ) as typeof cart.items;
    if (cart.items.length === before) throw new ApiError(404, 'NOT_FOUND', 'Cart item not found.');
    await cart.save();
    res.json(ok(await cartView(cart)));
  }),
);

/** POST /cart/coupon — attach a coupon code (authoritative check at checkout). */
router.post(
  '/coupon',
  validateRequest({ body: z.object({ code: z.string().trim().min(1).max(32) }) }),
  asyncHandler(async (req, res) => {
    const code = (req.body.code as string).toUpperCase().trim();
    const coupon = await Coupon.findOne({ code });
    if (!coupon) throw new ApiError(404, 'NOT_FOUND', 'Coupon not found.');
    const cart = await getOrCreateCart(req.user!.id);
    const subtotal = cartSubtotal(cart);
    if (!subtotal) throw new ApiError(400, 'EMPTY_CART', 'Your cart is empty.');
    const afterAuto = subtotal - autoDiscountPaise(subtotal);
    const check = validateCoupon(coupon, afterAuto);
    if (!check.valid) throw new ApiError(400, 'COUPON_INVALID', check.reason ?? 'Coupon invalid.');
    cart.couponCode = coupon.code;
    await cart.save();
    res.json(ok({ ...(await cartView(cart)), couponCode: coupon.code }));
  }),
);

/** DELETE /cart/coupon */
router.delete(
  '/coupon',
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user!.id);
    cart.couponCode = null;
    await cart.save();
    res.json(ok(await cartView(cart)));
  }),
);

export default router;
