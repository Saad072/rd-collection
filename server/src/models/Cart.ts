import { Schema, model, type Document, type Types } from 'mongoose';

export interface ICartItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  qty: number;
  /** snapshot of the authoritative unit price at add time (paise) */
  unitPaise: number;
}

export interface ICart extends Document {
  userId: Types.ObjectId;
  items: Types.DocumentArray<ICartItem & Document>;
  couponCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    qty: { type: Number, required: true, min: 1, max: 10, validate: Number.isInteger },
    unitPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { _id: true },
);

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, default: null, uppercase: true, trim: true },
  },
  { timestamps: true },
);

export const Cart = model<ICart>('Cart', cartSchema);
