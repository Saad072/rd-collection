import { Schema, model, type Document } from 'mongoose';

export interface ICategory extends Document {
  slug: string;
  name: string;
  /** parent category slug, or null for top-level */
  parent: string | null;
  description?: string;
  image?: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    parent: { type: String, default: null, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String, trim: true, maxlength: 500 },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Category = model<ICategory>('Category', categorySchema);

/** Serialize with client-compatible aliases (parentSlug, imageUrl). */
export function publicCategory(c: ICategory) {
  return {
    _id: String(c._id),
    slug: c.slug,
    name: c.name,
    parent: c.parent,
    parentSlug: c.parent,
    description: c.description ?? undefined,
    image: c.image ?? undefined,
    imageUrl: c.image ?? undefined,
    sortOrder: c.sortOrder,
    active: c.active,
  };
}
