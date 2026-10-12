/**
 * Razorpay integration.
 * - When RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET are configured: real client.
 * - Otherwise: a TEST adapter that simulates order creation / verification.
 *   Every test-adapter response includes `simulated: true` and logs a warning.
 */
import crypto from 'crypto';
import { env, razorpayConfigured } from '../config/env';

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  simulated: boolean;
}

export interface RazorpayVerifyResult {
  verified: boolean;
  simulated: boolean;
}

function warnTestAdapter(action: string): void {
  // eslint-disable-next-line no-console
  console.warn(
    `[razorpay] TEST ADAPTER in use for "${action}" — Razorpay credentials are not configured. ` +
      'This is NOT a real payment. Set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET for live payments.',
  );
}

// The razorpay package ships without bundled types for this import style;
// require it lazily only when credentials exist.
function realClient(): {
  orders: { create: (o: unknown) => Promise<{ id: string; amount: number; currency: string }> };
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Razorpay = require('razorpay') as new (opts: {
    key_id: string;
    key_secret: string;
  }) => {
    orders: { create: (o: unknown) => Promise<{ id: string; amount: number; currency: string }> };
  };
  return new Razorpay({ key_id: env.RAZORPAY_KEY_ID as string, key_secret: env.RAZORPAY_KEY_SECRET as string });
}

export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
): Promise<RazorpayOrderResult> {
  if (!razorpayConfigured) {
    warnTestAdapter('create order');
    return {
      id: `order_test_${receipt}`,
      amount: amountPaise,
      currency: 'INR',
      simulated: true,
    };
  }
  const order = await realClient().orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
  });
  return { id: order.id, amount: order.amount, currency: order.currency, simulated: false };
}

/** Verify a Razorpay payment signature: HMAC-SHA256(orderId|paymentId, key_secret). */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): RazorpayVerifyResult {
  if (!razorpayConfigured) {
    warnTestAdapter('verify signature');
    // Test adapter: accept signatures shaped like "test_<paymentId>" so the
    // frontend demo flow can complete without real credentials.
    const verified = razorpaySignature === `test_${razorpayPaymentId}`;
    return { verified, simulated: true };
  }
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET as string)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return { verified: expected === razorpaySignature, simulated: false };
}

/** Verify a webhook signature against the RAW request body. */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): {
  verified: boolean;
  simulated: boolean;
} {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    warnTestAdapter('webhook');
    return { verified: signature === 'test_webhook', simulated: true };
  }
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return { verified: expected === signature, simulated: false };
}

export function razorpayKeyId(): string {
  return env.RAZORPAY_KEY_ID ?? '';
}

export function isSimulatedMode(): boolean {
  return !razorpayConfigured;
}
