/**
 * Server-authoritative pricing. All money is integer paise.
 *
 * Auto promos:
 *  - subtotal >= 199900 paise -> 20000 off
 *  - subtotal >= 299900 paise -> 35000 off, floored so the discounted
 *    subtotal never drops below 265000 (pins the 299900 -> 265000 boundary)
 *  - shipping free when (subtotal - discount) >= 75000, else 9900
 *
 * Coupon stacking: an optional coupon applies AFTER the auto promo.
 * Its min-order is checked against the post-auto-promo amount, percent
 * coupons are capped by maxDiscountPaise, and the coupon can never
 * discount more than the remaining payable amount.
 */

export const FREE_SHIPPING_THRESHOLD_PAISE = 75000;
export const SHIPPING_FEE_PAISE = 9900;
export const AUTO_TIER_1_MIN = 199900;
export const AUTO_TIER_1_OFF = 20000;
export const AUTO_TIER_2_MIN = 299900;
export const AUTO_TIER_2_OFF = 35000;
export const AUTO_TIER_2_FLOOR = 265000;

export function autoDiscountPaise(subtotalPaise: number): number {
  const s = Math.max(0, Math.floor(subtotalPaise));
  if (s >= AUTO_TIER_2_MIN) {
    // 35000 off, but never below the 265000 promo-price floor.
    return Math.min(AUTO_TIER_2_OFF, Math.max(0, s - AUTO_TIER_2_FLOOR));
  }
  if (s >= AUTO_TIER_1_MIN) return AUTO_TIER_1_OFF;
  return 0;
}

export function shippingPaise(discountedSubtotalPaise: number): number {
  return discountedSubtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : SHIPPING_FEE_PAISE;
}

export interface CouponLike {
  type: 'flat' | 'percent';
  valuePaise?: number | null;
  percentValue?: number | null;
  maxDiscountPaise?: number | null;
  minOrderPaise?: number | null;
}

/** Coupon discount in paise given the amount AFTER the auto promo. */
export function couponDiscountPaise(
  afterAutoPaise: number,
  coupon: CouponLike | null | undefined,
): number {
  if (!coupon) return 0;
  const base = Math.max(0, Math.floor(afterAutoPaise));
  if (base <= 0) return 0;
  const minOrder = coupon.minOrderPaise ?? 0;
  if (base < minOrder) return 0;
  let d = 0;
  if (coupon.type === 'flat') {
    d = Math.max(0, Math.floor(coupon.valuePaise ?? 0));
  } else {
    const pct = coupon.percentValue ?? 0;
    if (pct <= 0) return 0;
    d = Math.floor((base * pct) / 100);
  }
  if (coupon.maxDiscountPaise != null) d = Math.min(d, coupon.maxDiscountPaise);
  return Math.min(d, base);
}

export interface Totals {
  subtotalPaise: number;
  autoDiscountPaise: number;
  couponDiscountPaise: number;
  /** auto + coupon */
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
}

export function computeTotals(
  subtotalPaise: number,
  coupon: CouponLike | null | undefined = null,
): Totals {
  const subtotal = Math.max(0, Math.floor(subtotalPaise));
  const auto = autoDiscountPaise(subtotal);
  const afterAuto = subtotal - auto;
  const couponDisc = couponDiscountPaise(afterAuto, coupon);
  const discount = auto + couponDisc;
  const ship = shippingPaise(subtotal - discount);
  return {
    subtotalPaise: subtotal,
    autoDiscountPaise: auto,
    couponDiscountPaise: couponDisc,
    discountPaise: discount,
    shippingPaise: ship,
    totalPaise: subtotal - discount + ship,
  };
}

export interface CouponDocLike extends CouponLike {
  active: boolean;
  validFrom?: Date | null;
  validTo?: Date | null;
  usageLimit?: number | null;
  usedCount: number;
}

export interface CouponCheck {
  valid: boolean;
  reason?: string;
}

/** Validate a coupon document against the current time and order amount. */
export function validateCoupon(
  coupon: CouponDocLike,
  amountAfterAutoPaise: number,
  now: Date = new Date(),
): CouponCheck {
  if (!coupon.active) return { valid: false, reason: 'This coupon is no longer active.' };
  if (coupon.validFrom && now < coupon.validFrom)
    return { valid: false, reason: 'This coupon is not valid yet.' };
  if (coupon.validTo && now > coupon.validTo)
    return { valid: false, reason: 'This coupon has expired.' };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    return { valid: false, reason: 'This coupon has reached its usage limit.' };
  const minOrder = coupon.minOrderPaise ?? 0;
  if (amountAfterAutoPaise < minOrder)
    return {
      valid: false,
      reason: `This coupon needs a minimum order of ₹${(minOrder / 100).toLocaleString('en-IN')}.`,
    };
  return { valid: true };
}
