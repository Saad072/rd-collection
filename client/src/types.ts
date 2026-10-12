/** Shared domain types. Monetary values are integer paise (INR). */

export interface ProductImage {
  url: string;
  alt: string;
}

export interface Variant {
  _id: string;
  sku: string;
  size: string;
  color: string;
  pricePaise: number;
  compareAtPaise?: number;
  stock: number;
  active: boolean;
}

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Product {
  _id: string;
  slug: string;
  name: string;
  description: string;
  category: string; // category slug
  collections: string[]; // collection slugs
  images: ProductImage[];
  attributes: Record<string, string>;
  fabric?: string;
  status: ProductStatus;
  isNew: boolean;
  soldCount: number;
  variants: Variant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  parentSlug?: string | null;
  sortOrder: number;
  active: boolean;
}

export interface CollectionDef {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  active: boolean;
  productCount?: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  image: string;
  size: string;
  color: string;
  unitPaise: number;
  qty: number;
}

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refund_pending'
  | 'refunded';

export interface OrderItemSnapshot {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  image: string;
  size: string;
  color: string;
  qty: number;
  unitPaise: number;
}

export interface Address {
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

export interface Order {
  _id: string;
  orderNumber: string;
  userId?: string | null;
  items: OrderItemSnapshot[];
  address: Address;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'cod_pending';
  paymentMethod: 'cod' | 'razorpay';
  status: OrderStatus;
  couponCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  addresses: Address[];
  wishlist: string[];
}

export interface Coupon {
  _id: string;
  code: string;
  type: 'flat' | 'percent';
  value: number; // paise for flat, percent number for percent
  minOrderPaise: number;
  maxDiscountPaise?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
}

export interface Banner {
  _id: string;
  position: string; // e.g. 'home-hero', 'home-promo'
  title?: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  sortOrder: number;
  active: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}
