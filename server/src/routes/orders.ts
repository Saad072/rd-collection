import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validateRequest, zObjectId } from '../middleware/validate';
import { ok, ApiError } from '../utils/respond';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import {
  Order,
  publicOrder,
  type IOrderItem,
  type FulfillmentStatus,
} from '../models/Order';
import { computeTotals, validateCoupon, autoDiscountPaise } from '../services/pricing';
import { generateOrderNumber } from '../utils/text';
import { sendOrderConfirmation } from '../services/email';

const router = Router();
router.use(requireAuth);

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(20),
  email: z.string().email().optional(),
  addressLine: z.string().trim().min(5).max(300),
  locality: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode.'),
});

const createOrderSchema = z.object({
  address: addressSchema,
  paymentMethod: z.enum(['cod', 'razorpay']),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
});

interface StockLine {
  productId: string;
  variantId: string;
  qty: number;
}

/** Atomically decrement variant stock (with $gte guard). Restores on partial failure. */
export async function decrementStock(lines: StockLine[]): Promise<boolean> {
  const done: StockLine[] = [];
  for (const line of lines) {
    const res = await Product.updateOne(
      {
        _id: line.productId,
        variants: { $elemMatch: { _id: line.variantId, stock: { $gte: line.qty } } },
      },
      { $inc: { 'variants.$.stock': -line.qty, soldCount: line.qty } },
    );
    if (res.modifiedCount === 0) {
      for (const d of done) {
        await Product.updateOne(
          { _id: d.productId, 'variants._id': d.variantId },
          { $inc: { 'variants.$.stock': d.qty, soldCount: -d.qty } },
        );
      }
      return false;
    }
    done.push(line);
  }
  return true;
}

export async function restoreStock(lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    await Product.updateOne(
      { _id: line.productId, 'variants._id': line.variantId },
      { $inc: { 'variants.$.stock': line.qty, soldCount: -line.qty } },
    );
  }
}

/**
 * POST /orders — create an order from the user's cart.
 * Prices, stock and totals are always recomputed server-side.
 * Idempotent via idempotencyKey (body or x-idempotency-key header).
 */
router.post(
  '/',
  validateRequest({ body: createOrderSchema }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { address, paymentMethod } = req.body as z.infer<typeof createOrderSchema>;
    const idempotencyKey =
      (req.body.idempotencyKey as string | undefined) ??
      (req.headers['x-idempotency-key'] as string | undefined) ??
      null;

    if (idempotencyKey) {
      const dup = await Order.findOne({ idempotencyKey, userId });
      if (dup) {
        res.json(ok(publicOrder(dup)));
        return;
      }
    }

    const cart = await Cart.findOne({ userId });
    if (!cart || !cart.items.length) {
      throw new ApiError(400, 'EMPTY_CART', 'Your cart is empty.');
    }

    // Revalidate every line against live product data.
    const snapshots: IOrderItem[] = [];
    const stockLines: StockLine[] = [];
    for (const item of cart.items) {
      const product = await Product.findOne({ _id: item.productId, status: 'published' });
      const variant = product?.variants.find(
        (v) => String((v as { _id?: unknown })._id) === String(item.variantId),
      );
      if (!product || !variant || !variant.active) {
        throw new ApiError(409, 'UNAVAILABLE', 'An item in your cart is no longer available.');
      }
      if (variant.stock < item.qty) {
        throw new ApiError(409, 'INSUFFICIENT_STOCK', `Only ${variant.stock} left of ${product.name}.`);
      }
      snapshots.push({
        productId: product._id,
        variantId: (variant as { _id: unknown })._id as never,
        name: product.name,
        image: product.images?.[0]?.url ?? '',
        size: variant.size,
        color: variant.color,
        qty: item.qty,
        unitPaise: variant.pricePaise, // authoritative — never trust the stored cart price
      });
      stockLines.push({
        productId: String(product._id),
        variantId: String((variant as { _id: unknown })._id),
        qty: item.qty,
      });
    }

    const subtotal = snapshots.reduce((s, i) => s + i.unitPaise * i.qty, 0);

    let couponCode: string | null = null;
    let couponLike: {
      type: 'flat' | 'percent';
      valuePaise?: number | null;
      percentValue?: number | null;
      maxDiscountPaise?: number | null;
      minOrderPaise?: number | null;
    } | null = null;
    if (cart.couponCode) {
      const coupon = await Coupon.findOne({ code: cart.couponCode });
      if (!coupon) throw new ApiError(400, 'COUPON_INVALID', 'Coupon no longer exists.');
      const afterAuto = subtotal - autoDiscountPaise(subtotal);
      const check = validateCoupon(coupon, afterAuto);
      if (!check.valid) throw new ApiError(400, 'COUPON_INVALID', check.reason ?? 'Coupon invalid.');
      couponCode = coupon.code;
      couponLike = {
        type: coupon.type,
        valuePaise: coupon.valuePaise,
        percentValue: coupon.percentValue,
        maxDiscountPaise: coupon.maxDiscountPaise,
        minOrderPaise: coupon.minOrderPaise,
      };
    }

    const totals = computeTotals(subtotal, couponLike);
    if (couponLike && totals.couponDiscountPaise <= 0) {
      throw new ApiError(400, 'COUPON_INVALID', 'This coupon cannot be applied to your cart.');
    }

    const stockOk = await decrementStock(stockLines);
    if (!stockOk) {
      throw new ApiError(409, 'INSUFFICIENT_STOCK', 'An item just went out of stock.');
    }

    const fulfillment: FulfillmentStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending';
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      userId,
      items: snapshots,
      address,
      subtotalPaise: totals.subtotalPaise,
      discountPaise: totals.discountPaise,
      couponCode,
      shippingPaise: totals.shippingPaise,
      totalPaise: totals.totalPaise,
      payment: { method: paymentMethod, status: 'pending' },
      fulfillment,
      statusHistory: [{ status: fulfillment, at: new Date(), note: 'Order placed' }],
      idempotencyKey,
    });

    if (paymentMethod === 'cod' && couponCode) {
      await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: 1 } });
    }

    cart.items = [] as never;
    cart.couponCode = null;
    await cart.save();

    if (address.email) {
      sendOrderConfirmation({
        to: address.email,
        name: address.fullName,
        orderNumber: order.orderNumber,
        totalPaise: order.totalPaise,
        paymentMethod,
      }).catch(() => undefined);
    }

    res.status(201).json(ok(publicOrder(order)));
  }),
);

/** GET /orders — the signed-in user's own orders. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ userId: req.user!.id }).sort({ createdAt: -1 }).lean();
    res.json(ok(orders.map((o) => publicOrder(o as never))));
  }),
);

/** GET /orders/:id — own order only. */
router.get(
  '/:id',
  validateRequest({ params: z.object({ id: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    res.json(ok(publicOrder(order)));
  }),
);

/** POST /orders/:id/cancel — only while pending/confirmed; restores stock. */
router.post(
  '/:id/cancel',
  validateRequest({ params: z.object({ id: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    if (!['pending', 'confirmed'].includes(order.fulfillment)) {
      throw new ApiError(400, 'CANNOT_CANCEL', 'This order can no longer be cancelled.');
    }
    await restoreStock(
      order.items.map((i) => ({
        productId: String(i.productId),
        variantId: String(i.variantId),
        qty: i.qty,
      })),
    );
    order.fulfillment = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', at: new Date(), note: 'Cancelled by customer' });
    await order.save();
    res.json(ok(publicOrder(order)));
  }),
);

export default router;
