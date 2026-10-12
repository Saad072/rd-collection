import { describe, expect, it } from 'vitest';
import {
  autoDiscountPaise,
  computeTotals,
  couponDiscountPaise,
  shippingPaise,
  validateCoupon,
  type CouponLike,
} from './pricing';

describe('autoDiscountPaise', () => {
  it('gives no discount below 199900', () => {
    expect(autoDiscountPaise(0)).toBe(0);
    expect(autoDiscountPaise(50000)).toBe(0);
    expect(autoDiscountPaise(199899)).toBe(0);
  });
  it('gives 20000 off from 199900', () => {
    expect(autoDiscountPaise(199900)).toBe(20000);
    expect(autoDiscountPaise(250000)).toBe(20000);
    expect(autoDiscountPaise(299899)).toBe(20000);
  });
  it('gives 35000 off from 299900, floored at the 265000 promo price', () => {
    expect(autoDiscountPaise(299900)).toBe(34900); // 299900 - 265000
    expect(autoDiscountPaise(300000)).toBe(35000);
    expect(autoDiscountPaise(500000)).toBe(35000);
  });
});

describe('shippingPaise', () => {
  it('is 9900 below the 75000 threshold, free at/above it', () => {
    expect(shippingPaise(74999)).toBe(9900);
    expect(shippingPaise(75000)).toBe(0);
    expect(shippingPaise(200000)).toBe(0);
  });
});

describe('computeTotals — required vectors', () => {
  const cases: Array<[number, number]> = [
    [50000, 59900],
    [75000, 75000],
    [199900, 179900],
    [299900, 265000],
    [300000, 265000],
  ];
  for (const [subtotal, total] of cases) {
    it(`${subtotal} -> total ${total}`, () => {
      expect(computeTotals(subtotal).totalPaise).toBe(total);
    });
  }
  it('breaks down discount and shipping', () => {
    expect(computeTotals(50000)).toMatchObject({
      subtotalPaise: 50000,
      autoDiscountPaise: 0,
      shippingPaise: 9900,
      totalPaise: 59900,
    });
    expect(computeTotals(199900)).toMatchObject({
      autoDiscountPaise: 20000,
      shippingPaise: 0,
      totalPaise: 179900,
    });
  });
  it('floors negative/NaN subtotals at zero', () => {
    expect(computeTotals(-5).totalPaise).toBe(9900);
  });
});

describe('couponDiscountPaise — stacking after auto promo', () => {
  const flat500: CouponLike = { type: 'flat', valuePaise: 50000 };
  it('flat coupon applies after auto promo', () => {
    // subtotal 250000 -> auto 20000 -> base 230000 -> flat 50000 -> 180000
    const t = computeTotals(250000, flat500);
    expect(t.autoDiscountPaise).toBe(20000);
    expect(t.couponDiscountPaise).toBe(50000);
    expect(t.discountPaise).toBe(70000);
    expect(t.totalPaise).toBe(180000); // shipping free
  });
  it('respects minOrderPaise against the post-auto amount', () => {
    const coupon: CouponLike = { type: 'flat', valuePaise: 10000, minOrderPaise: 200000 };
    expect(couponDiscountPaise(150000, coupon)).toBe(0);
    expect(couponDiscountPaise(200000, coupon)).toBe(10000);
  });
  it('caps percent coupons at maxDiscountPaise', () => {
    const coupon: CouponLike = { type: 'percent', percentValue: 10, maxDiscountPaise: 15000 };
    expect(couponDiscountPaise(200000, coupon)).toBe(15000); // 10% = 20000 -> capped
    expect(couponDiscountPaise(100000, coupon)).toBe(10000); // below cap
  });
  it('never discounts more than the remaining amount', () => {
    const coupon: CouponLike = { type: 'flat', valuePaise: 999999 };
    expect(couponDiscountPaise(50000, coupon)).toBe(50000);
  });
  it('floors percent math (no fractional paise)', () => {
    const coupon: CouponLike = { type: 'percent', percentValue: 7 };
    expect(couponDiscountPaise(10001, coupon)).toBe(700); // 700.07 -> 700
  });
  it('coupon can trigger free shipping off the combined discount', () => {
    // 80000 subtotal, no auto promo; flat 6000 -> 74000 < 75000 -> still 9900 shipping
    expect(computeTotals(80000, { type: 'flat', valuePaise: 6000 }).shippingPaise).toBe(9900);
    // flat 5000 -> 75000 -> free
    expect(computeTotals(80000, { type: 'flat', valuePaise: 5000 }).shippingPaise).toBe(0);
  });
});

describe('validateCoupon', () => {
  const base = {
    type: 'flat' as const,
    valuePaise: 10000,
    active: true,
    usedCount: 0,
  };
  it('accepts a valid coupon', () => {
    expect(validateCoupon(base, 50000).valid).toBe(true);
  });
  it('rejects inactive coupons', () => {
    expect(validateCoupon({ ...base, active: false }, 50000).valid).toBe(false);
  });
  it('rejects expired / not-yet-valid coupons', () => {
    const past = new Date('2020-01-01');
    const future = new Date('2030-01-01');
    expect(validateCoupon({ ...base, validTo: past }, 50000, new Date('2026-01-01')).valid).toBe(false);
    expect(validateCoupon({ ...base, validFrom: future }, 50000, new Date('2026-01-01')).valid).toBe(false);
  });
  it('rejects when usage limit is reached', () => {
    expect(validateCoupon({ ...base, usageLimit: 10, usedCount: 10 }, 50000).valid).toBe(false);
    expect(validateCoupon({ ...base, usageLimit: 10, usedCount: 9 }, 50000).valid).toBe(true);
  });
  it('rejects below minOrderPaise', () => {
    const r = validateCoupon({ ...base, minOrderPaise: 100000 }, 99999);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/minimum order/i);
  });
});
