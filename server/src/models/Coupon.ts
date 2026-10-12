import { Schema, model, type Document } from 'mongoose';

export type CouponType = 'flat' | 'percent';

export interface ICoupon extends Document {
  code: string;
  type: CouponType;
  /** flat discount in paise (type=flat) */
  valuePaise?: number;
  /** percent number 1-100 (type=percent) */
  percentValue?: number;
  maxDiscountPaise?: number;
  minOrderPaise: number;
  validFrom?: Date;
  validTo?: Date;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
      index: true,
    },
    type: { type: String, enum: ['flat', 'percent'], required: true },
    valuePaise: { type: Number, min: 0, validate: Number.isInteger },
    percentValue: { type: Number, min: 1, max: 100 },
    maxDiscountPaise: { type: Number, min: 0, validate: Number.isInteger },
    minOrderPaise: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    validFrom: { type: Date },
    validTo: { type: Date },
    usageLimit: { type: Number, min: 1, validate: Number.isInteger },
    usedCount: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Coupon = model<ICoupon>('Coupon', couponSchema);

/** Serialize with client-compatible aliases (value, startsAt, endsAt). */
export function publicCoupon(c: ICoupon) {
  return {
    _id: String(c._id),
    code: c.code,
    type: c.type,
    valuePaise: c.valuePaise,
    percentValue: c.percentValue,
    value: c.type === 'flat' ? c.valuePaise : c.percentValue,
    maxDiscountPaise: c.maxDiscountPaise,
    minOrderPaise: c.minOrderPaise,
    validFrom: c.validFrom,
    validTo: c.validTo,
    startsAt: c.validFrom,
    endsAt: c.validTo,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    active: c.active,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
