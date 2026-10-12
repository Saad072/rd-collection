import { Schema, model, type Document, type Types } from 'mongoose';

export interface ICollection extends Document {
  slug: string;
  title: string;
  description?: string;
  image?: string;
  productIds: Types.ObjectId[];
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 800 },
    image: { type: String, trim: true, maxlength: 500 },
    productIds: { type: [Schema.Types.ObjectId], ref: 'Product', default: [] },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Collection = model<ICollection>('Collection', collectionSchema);

/** Serialize with client-compatible aliases (name, sortOrder, imageUrl). */
export function publicCollection(c: ICollection, productCount?: number) {
  return {
    _id: String(c._id),
    slug: c.slug,
    title: c.title,
    name: c.title,
    description: c.description ?? undefined,
    image: c.image ?? undefined,
    imageUrl: c.image ?? undefined,
    sortOrder: c.displayOrder,
    displayOrder: c.displayOrder,
    active: c.active,
    ...(productCount !== undefined ? { productCount } : {}),
  };
}
