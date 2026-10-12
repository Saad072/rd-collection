import { Schema, model, type Document, type Types } from 'mongoose';
import { addressSchema, type IAddress } from './User';

export type PaymentMethod = 'cod' | 'razorpay';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type FulfillmentStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface IOrderItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  name: string;
  image: string;
  size: string;
  color: string;
  qty: number;
  unitPaise: number;
}

export interface IStatusHistory {
  status: FulfillmentStatus;
  at: Date;
  note?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId?: Types.ObjectId | null;
  items: IOrderItem[];
  address: IAddress;
  subtotalPaise: number;
  discountPaise: number;
  couponCode?: string | null;
  shippingPaise: number;
  totalPaise: number;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };
  fulfillment: FulfillmentStatus;
  statusHistory: IStatusHistory[];
  idempotencyKey?: string | null;
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, maxlength: 220 },
    image: { type: String, default: '', maxlength: 800 },
    size: { type: String, required: true, maxlength: 20 },
    color: { type: String, required: true, maxlength: 60 },
    qty: { type: Number, required: true, min: 1, validate: Number.isInteger },
    unitPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    address: { type: addressSchema, required: true },
    subtotalPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    discountPaise: { type: Number, required: true, min: 0, validate: Number.isInteger, default: 0 },
    couponCode: { type: String, default: null, uppercase: true, trim: true },
    shippingPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    totalPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    payment: {
      method: { type: String, enum: ['cod', 'razorpay'], required: true },
      status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
      razorpayOrderId: { type: String, trim: true },
      razorpayPaymentId: { type: String, trim: true },
    },
    fulfillment: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
      index: true,
    },
    statusHistory: {
      type: [
        {
          status: { type: String, required: true },
          at: { type: Date, default: Date.now },
          note: { type: String, maxlength: 300 },
        },
      ],
      default: [],
    },
    idempotencyKey: { type: String, default: null, index: true, sparse: true },
    trackingNumber: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });

export const Order = model<IOrder>('Order', orderSchema);

/** Valid fulfillment transitions; anything else is rejected. */
export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export function canTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return FULFILLMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Client-compatible paymentStatus derived from the stored payment block. */
export function clientPaymentStatus(o: IOrder): 'pending' | 'paid' | 'failed' | 'cod_pending' {
  if (o.payment.method === 'cod') return 'cod_pending';
  return o.payment.status;
}

/** Client-compatible OrderStatus derived from fulfillment + payment. */
export function clientOrderStatus(o: IOrder): string {
  if (o.fulfillment === 'pending') {
    return o.payment.method === 'razorpay' && o.payment.status !== 'paid'
      ? 'pending_payment'
      : 'confirmed';
  }
  return o.fulfillment;
}

/** Serialize an order for API responses (both task spec and client shapes). */
export function publicOrder(o: IOrder) {
  return {
    _id: String(o._id),
    orderNumber: o.orderNumber,
    userId: o.userId ? String(o.userId) : null,
    items: o.items.map((i) => ({
      productId: String(i.productId),
      variantId: String(i.variantId),
      name: i.name,
      image: i.image,
      size: i.size,
      color: i.color,
      qty: i.qty,
      unitPaise: i.unitPaise,
    })),
    address: o.address,
    subtotalPaise: o.subtotalPaise,
    discountPaise: o.discountPaise,
    couponCode: o.couponCode ?? null,
    shippingPaise: o.shippingPaise,
    totalPaise: o.totalPaise,
    payment: {
      method: o.payment.method,
      status: o.payment.status,
      razorpayOrderId: o.payment.razorpayOrderId,
      razorpayPaymentId: o.payment.razorpayPaymentId,
    },
    paymentMethod: o.payment.method,
    paymentStatus: clientPaymentStatus(o),
    fulfillment: o.fulfillment,
    status: clientOrderStatus(o),
    statusHistory: o.statusHistory,
    trackingNumber: o.trackingNumber,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}
