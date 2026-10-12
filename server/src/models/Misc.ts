import { Schema, model, type Document, type Types } from 'mongoose';

export interface INewsletterSubscriber extends Document {
  email: string;
  createdAt: Date;
}

const newsletterSchema = new Schema<INewsletterSubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const NewsletterSubscriber = model<INewsletterSubscriber>(
  'NewsletterSubscriber',
  newsletterSchema,
);

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface IReview extends Document {
  productId: Types.ObjectId;
  userName: string;
  rating: number;
  title?: string;
  body: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    userName: { type: String, required: true, trim: true, maxlength: 120 },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    title: { type: String, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export const Review = model<IReview>('Review', reviewSchema);
