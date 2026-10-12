/**
 * Shared pricing logic — mirrors the server-side rules so the client shows
 * totals identical to what the server will charge.
 *
 * - ₹200 (20000 paise) off on subtotal >= ₹1,999 (199900 paise)
 * - ₹350 (35000 paise) off on subtotal >= ₹2,999 (299900 paise)
 * - Free shipping when (subtotal - discount) >= ₹750 (75000 paise), else ₹99 (9900 paise)
 */

export const FREE_SHIP_THRESHOLD_PAISE = 75000;
export const SHIP_FEE_PAISE = 9900;
export const OFF_1999_PAISE = 20000;
export const OFF_2999_PAISE = 35000;
export const THRESHOLD_1999_PAISE = 199900;
export const THRESHOLD_2999_PAISE = 299900;

export interface Totals {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  freeShipping: boolean;
}

export function computeTotals(subtotalPaise: number): Totals {
  const sub = Math.max(0, Math.round(subtotalPaise));
  const discountPaise = sub >= THRESHOLD_2999_PAISE ? OFF_2999_PAISE : sub >= THRESHOLD_1999_PAISE ? OFF_1999_PAISE : 0;
  const afterDiscount = sub - discountPaise;
  const freeShipping = afterDiscount >= FREE_SHIP_THRESHOLD_PAISE || sub === 0;
  const shippingPaise = sub === 0 ? 0 : freeShipping ? 0 : SHIP_FEE_PAISE;
  return {
    subtotalPaise: sub,
    discountPaise,
    shippingPaise,
    totalPaise: afterDiscount + shippingPaise,
    freeShipping,
  };
}

export function discountPct(pricePaise: number, compareAtPaise?: number): number {
  if (!compareAtPaise || compareAtPaise <= pricePaise) return 0;
  return Math.round((1 - pricePaise / compareAtPaise) * 100);
}

/** Next promo milestone message for progress bars. */
export function nextMilestone(subtotalPaise: number): { label: string; progress: number } {
  const pct = (n: number) => Math.min(100, Math.round((subtotalPaise / n) * 100));
  if (subtotalPaise >= THRESHOLD_2999_PAISE)
    return { label: '₹350 OFF applied + FREE shipping unlocked', progress: 100 };
  if (subtotalPaise >= THRESHOLD_1999_PAISE)
    return { label: '₹200 OFF applied + FREE shipping unlocked', progress: 100 };
  if (subtotalPaise >= FREE_SHIP_THRESHOLD_PAISE)
    return {
      label: `FREE shipping unlocked — add ${formatINR(THRESHOLD_1999_PAISE - subtotalPaise)} more for ₹200 OFF`,
      progress: 100,
    };
  return {
    label: `Add ${formatINR(FREE_SHIP_THRESHOLD_PAISE - subtotalPaise)} more for FREE shipping`,
    progress: pct(FREE_SHIP_THRESHOLD_PAISE),
  };
}

export function formatINR(paise: number): string {
  return '₹' + (Math.round(paise) / 100).toLocaleString('en-IN');
}
