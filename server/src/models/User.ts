import { Schema, model, type Document } from 'mongoose';

export interface IAddress {
  fullName: string;
  phone: string;
  email?: string;
  addressLine: string;
  locality?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export const addressSchema = new Schema<IAddress>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    addressLine: { type: String, required: true, trim: true, maxlength: 300 },
    locality: { type: String, trim: true, maxlength: 160 },
    landmark: { type: String, trim: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    state: { type: String, required: true, trim: true, maxlength: 120 },
    pincode: { type: String, required: true, trim: true, match: /^[1-9][0-9]{5}$/ },
  },
  { _id: false },
);

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  phone?: string;
  addresses: IAddress[];
  wishlist: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    phone: { type: String, trim: true, maxlength: 20 },
    addresses: { type: [addressSchema], default: [] },
    wishlist: { type: [String], default: [] },
  },
  { timestamps: true },
);

/** Strip secrets before sending a user over the wire. */
export function publicUser(u: IUser) {
  return {
    _id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    role: u.role,
    addresses: u.addresses,
    wishlist: u.wishlist,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export const User = model<IUser>('User', userSchema);
