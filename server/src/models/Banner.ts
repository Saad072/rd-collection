import { Schema, model, type Document } from 'mongoose';

export interface IBanner extends Document {
  title?: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  ctaLabel?: string;
  position: string;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, trim: true, maxlength: 160 },
    subtitle: { type: String, trim: true, maxlength: 300 },
    image: { type: String, required: true, trim: true, maxlength: 800 },
    mobileImage: { type: String, trim: true, maxlength: 800 },
    link: { type: String, trim: true, maxlength: 500 },
    ctaLabel: { type: String, trim: true, maxlength: 60 },
    position: { type: String, required: true, trim: true, index: true, maxlength: 60 },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Banner = model<IBanner>('Banner', bannerSchema);

/** Serialize with client-compatible aliases (imageUrl, ctaUrl, sortOrder). */
export function publicBanner(b: IBanner) {
  return {
    _id: String(b._id),
    title: b.title,
    subtitle: b.subtitle,
    image: b.image,
    imageUrl: b.image,
    mobileImage: b.mobileImage,
    mobileImageUrl: b.mobileImage,
    link: b.link,
    ctaUrl: b.link,
    ctaLabel: b.ctaLabel,
    position: b.position,
    displayOrder: b.displayOrder,
    sortOrder: b.displayOrder,
    active: b.active,
  };
}
