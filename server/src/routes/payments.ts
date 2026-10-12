import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validateRequest, zObjectId } from '../middleware/validate';
import { ok, fail, ApiError } from '../utils/respond';
import { Order } from '../models/Order';
import { Coupon } from '../models/Coupon';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  razorpayKeyId,
  isSimulatedMode,
} from '../services/razorpay';

const router = Router();

/** Payment ids already processed via webhook (in-memory dedupe; persisted via order.payment). */
const processedPayments = new Set<string>();

/** POST /payments/create-order — create a Razorpay order for a pending order. */
router.post(
  '/create-order',
  requireAuth,
  validateRequest({ body: z.object({ orderId: zObjectId }) }),
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({
      _id: (req.body as { orderId: string }).orderId,
      userId: req.user!.id,
    });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    if (order.payment.method !== 'razorpay') {
      throw new ApiError(400, 'INVALID_PAYMENT_METHOD', 'This order is not a Razorpay order.');
    }
    if (order.payment.status === 'paid') {
      throw new ApiError(400, 'ALREADY_PAID', 'This order is already paid.');
    }
    const rpOrder = await createRazorpayOrder(order.totalPaise, order.orderNumber);
    order.payment.razorpayOrderId = rpOrder.id;
    await order.save();
    res.json(
      ok({
        razorpayOrderId: rpOrder.id,
        amountPaise: rpOrder.amount,
        keyId: razorpayKeyId(),
        simulated: rpOrder.simulated,
      }),
    );
  }),
);

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

/** POST /payments/verify — verify payment signature, mark order paid. */
router.post(
  '/verify',
  requireAuth,
  validateRequest({ body: verifySchema }),
  asyncHandler(async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.body as z.infer<typeof verifySchema>;
    const order = await Order.findOne({
      'payment.razorpayOrderId': razorpayOrderId,
      userId: req.user!.id,
    });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    const { verified, simulated } = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
    if (!verified) {
      order.payment.status = 'failed';
      await order.save();
      throw new ApiError(400, 'PAYMENT_FAILED', 'Payment verification failed.');
    }
    if (order.payment.status !== 'paid') {
      order.payment.status = 'paid';
      order.payment.razorpayPaymentId = razorpayPaymentId;
      if (order.fulfillment === 'pending') {
        order.fulfillment = 'confirmed';
        order.statusHistory.push({ status: 'confirmed', at: new Date(), note: 'Payment received' });
      }
      await order.save();
      if (order.couponCode) {
        await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } });
      }
    }
    res.json(ok({ verified: true, simulated }));
  }),
);

/**
 * POST /payments/webhook — Razorpay webhook.
 * NOTE: mounted with express.raw() in app.ts so the signature is verified
 * against the raw request body. Idempotent via paymentId dedupe.
 */
export const webhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.body as Buffer;
  const signature = (req.headers['x-razorpay-signature'] as string | undefined) ?? '';
  const { verified, simulated } = verifyWebhookSignature(raw, signature);
  if (!verified) {
    res.status(400).json(fail('BAD_SIGNATURE', 'Invalid webhook signature.'));
    return;
  }
  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(raw.toString('utf8')) as typeof event;
  } catch {
    res.status(400).json(fail('BAD_PAYLOAD', 'Invalid webhook JSON.'));
    return;
  }
  const entity = event.payload?.payment?.entity;
  const paymentId = entity?.id;
  if (event.event === 'payment.captured' && paymentId) {
    if (!processedPayments.has(paymentId)) {
      processedPayments.add(paymentId);
      const order = await Order.findOne({ 'payment.razorpayOrderId': entity?.order_id });
      if (order && order.payment.status !== 'paid') {
        order.payment.status = 'paid';
        order.payment.razorpayPaymentId = paymentId;
        if (order.fulfillment === 'pending') {
          order.fulfillment = 'confirmed';
          order.statusHistory.push({
            status: 'confirmed',
            at: new Date(),
            note: 'Payment captured (webhook)',
          });
        }
        await order.save();
        if (order.couponCode) {
          await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } });
        }
      }
    }
  }
  res.json(ok({ received: true, simulated }));
});

const webhookRouter = Router();
webhookRouter.post('/', webhookHandler);

export default router;
export { webhookRouter };
