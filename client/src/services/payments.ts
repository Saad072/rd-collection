/**
 * Razorpay checkout.js integration.
 *
 * - `loadRazorpayScript()` loads https://checkout.razorpay.com/v1/checkout.js
 *   once and resolves when `window.Razorpay` is available. It rejects with a
 *   descriptive error if the script cannot be loaded (offline / blocked).
 * - `openRazorpayPayment()` opens the Razorpay modal for an order that was
 *   created server-side. The public key id and Razorpay order id must come
 *   from the server — the secret key never touches the client.
 * - Payment success alone never marks an order paid: callers must verify the
 *   signature server-side (POST /payments/verify) before treating payment
 *   as complete.
 */

export interface RazorpayOrder {
  /** Razorpay order id (from server). */
  id: string;
  /** Amount in paise. */
  amount: number;
  currency: string;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface OpenRazorpayOptions {
  key: string;
  order: RazorpayOrder;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  themeColor?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void | Promise<void>;
  onDismiss: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void };
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve();
      else {
        scriptPromise = null;
        reject(new Error('Payment gateway did not initialise. Please try again.'));
      }
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(
        new Error(
          'Could not load the payment gateway. Check your connection or try Cash on Delivery.',
        ),
      );
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export async function openRazorpayPayment(options: OpenRazorpayOptions): Promise<void> {
  await loadRazorpayScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('Payment gateway did not initialise. Please try again.');

  const rzp = new Razorpay({
    key: options.key,
    amount: options.order.amount,
    currency: options.order.currency,
    order_id: options.order.id,
    name: options.name ?? 'RD_COLLECTION',
    description: options.description ?? 'Order payment',
    prefill: options.prefill ?? {},
    notes: options.notes ?? {},
    theme: { color: options.themeColor ?? '#1C1C1C' },
    handler: (response: RazorpaySuccessResponse) => {
      void options.onSuccess(response);
    },
  });
  rzp.on('payment.failed', () => {
    options.onDismiss();
  });
  rzp.open();
}

/** UUID for order idempotency keys (per order attempt). */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
