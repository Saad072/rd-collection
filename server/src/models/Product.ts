import { Schema, model, type Document } from 'mongoose';

export interface IVariant {
  _id?: unknown;
  sku: string;
  size: string;
  color: string;
  pricePaise: number;
  compareAtPaise?: number;
  stock: number;
  active: boolean;
}

export interface IProductImage {
  url: string;
  alt: string;
}

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  category: string;
  collections: string[];
  images: IProductImage[];
  attributes: Record<string, string>;
  fabric?: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  status: ProductStatus;
  isNew: boolean;
  soldCount: number;
  variants: IVariant[];
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<IVariant>(
  {
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 60 },
    size: { type: String, required: true, trim: true, maxlength: 20 },
    color: { type: String, required: true, trim: true, maxlength: 60 },
    pricePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    compareAtPaise: { type: Number, min: 0, validate: Number.isInteger },
    stock: { type: Number, required: true, min: 0, validate: Number.isInteger, default: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: true },
);

const imageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true, trim: true, maxlength: 800 },
    alt: { type: String, default: '', trim: true, maxlength: 200 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 220 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true, maxlength: 5000 },
    category: { type: String, required: true, lowercase: true, trim: true, index: true },
    collections: { type: [String], default: [], index: true },
    images: { type: [imageSchema], default: [] },
    attributes: { type: Map, of: String, default: {} },
    fabric: { type: String, trim: true, maxlength: 120, index: true },
    tags: { type: [String], default: [], index: true },
    seoTitle: { type: String, trim: true, maxlength: 220 },
    seoDescription: { type: String, trim: true, maxlength: 400 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isNew: { type: Boolean, default: false, index: true },
    soldCount: { type: Number, default: 0, min: 0 },
    variants: { type: [variantSchema], default: [] },
  },
  {
    timestamps: true,
    // `isNew` is required by the storefront contract; silence Mongoose's
    // reserved-key warning for this deliberate schema path.
    suppressReservedKeysWarning: true,
  },
);

productSchema.index({ name: 'text', description: 'text', 'variants.sku': 'text', tags: 'text' });
productSchema.index({ status: 1, category: 1 });
productSchema.index({ 'variants.sku': 1 });

export const Product = model<IProduct>('Product', productSchema);

export interface VariantView extends IVariant {
  _id: string;
}

export interface ProductView {
  _id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  collections: string[];
  images: IProductImage[];
  attributes: Record<string, string>;
  fabric?: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  status: ProductStatus;
  isNew: boolean;
  soldCount: number;
  variants: VariantView[];
  pricePaise: number | null;
  compareAtPaise: number | null;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Serialize a product with computed price helpers for cards and detail pages. */
export function publicProduct(p: IProduct): ProductView {
  const variants: VariantView[] = (p.variants || []).map((v) => ({
    _id: String((v as { _id?: unknown })._id ?? ''),
    sku: v.sku,
    size: v.size,
    color: v.color,
    pricePaise: v.pricePaise,
    compareAtPaise: v.compareAtPaise,
    stock: v.stock,
    active: v.active,
  }));
  const sellable = variants.filter((v) => v.active);
  const prices = sellable.map((v) => v.pricePaise);
  const attrs: Record<string, string> = {};
  const rawAttrs: unknown = p.attributes;
  if (rawAttrs instanceof Map) {
    for (const [k, v] of rawAttrs as Map<string, unknown>) attrs[k] = String(v);
  } else if (rawAttrs && typeof rawAttrs === 'object') {
    for (const [k, v] of Object.entries(rawAttrs as Record<string, unknown>)) {
      attrs[k] = String(v);
    }
  }
  const minPrice = prices.length ? Math.min(...prices) : null;
  const minVariant = sellable.find((v) => v.pricePaise === minPrice);
  return {
    _id: String(p._id),
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    collections: p.collections ?? [],
    images: p.images ?? [],
    attributes: attrs,
    fabric: p.fabric,
    tags: p.tags ?? [],
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    status: p.status,
    isNew: p.isNew,
    soldCount: p.soldCount,
    variants,
    pricePaise: minPrice,
    compareAtPaise: minVariant?.compareAtPaise ?? null,
    inStock: sellable.some((v) => v.stock > 0),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
