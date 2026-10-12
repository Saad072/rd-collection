/**
 * Typed API client. All money values are integer paise.
 * Base URL: import.meta.env.VITE_API_BASE_URL, defaulting to /api/v1.
 */
import type {
  Address,
  ApiResponse,
  Banner,
  CartItem,
  Category,
  CollectionDef,
  Coupon,
  Order,
  Paginated,
  Product,
  User,
} from '../types';
import { formatINR } from '../lib/pricing';

export { formatINR };

const BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('BAD_RESPONSE', `Request failed with status ${res.status}`, res.status);
  }
  if (!res.ok || !body.ok) {
    throw new ApiError(body.error?.code || 'REQUEST_FAILED', body.error?.message || 'Request failed', res.status);
  }
  return body.data as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) });
const patch = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: 'PATCH', body: data === undefined ? undefined : JSON.stringify(data) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

/* ---------- catalog ---------- */

export interface ProductQuery {
  category?: string;
  collection?: string;
  q?: string;
  minPrice?: number; // paise
  maxPrice?: number; // paise
  size?: string;
  color?: string;
  fabric?: string;
  inStock?: boolean;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'name';
  page?: number;
  pageSize?: number;
}

function qs<T extends object>(params: T): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  /* catalog */
  getCategories: () => get<Category[]>('/categories'),
  getCollections: () => get<CollectionDef[]>('/collections'),
  getCollection: (slug: string, params: Omit<ProductQuery, 'collection'> = {}) =>
    get<{ collection: CollectionDef; products: Paginated<Product> }>(`/collections/${slug}${qs(params)}`),
  getProducts: (params: ProductQuery = {}) => get<Paginated<Product>>(`/products${qs(params)}`),
  getProduct: (slug: string) => get<Product>(`/products/${slug}`),
  search: (q: string) => get<Product[]>(`/search${qs({ q })}`),
  getBanners: (position: string) => get<Banner[]>(`/banners${qs({ position })}`),
  newsletter: (email: string) => post<{ subscribed: boolean; duplicate: boolean }>('/newsletter', { email }),
  checkPincode: (code: string) =>
    get<{ serviceable: boolean; cod: boolean; etaDays: [number, number] }>(`/pincode/${code}`),

  /* auth */
  auth: {
    register: (data: { name: string; email: string; password: string; phone?: string }) =>
      post<User>('/auth/register', data),
    login: (data: { email: string; password: string }) => post<User>('/auth/login', data),
    logout: () => post<{ ok: true }>('/auth/logout'),
    me: () => get<User>('/auth/me'),
  },

  /* cart (server-side, used when logged in) */
  cart: {
    get: () => get<{ items: CartItem[]; couponCode?: string | null }>('/cart'),
    addItem: (data: { productId: string; variantId: string; qty: number }) =>
      post<{ items: CartItem[] }>('/cart/items', data),
    patchItem: (itemId: string, data: { qty: number }) =>
      patch<{ items: CartItem[] }>(`/cart/items/${itemId}`, data),
    removeItem: (itemId: string) => del<{ items: CartItem[] }>(`/cart/items/${itemId}`),
    applyCoupon: (code: string) => post<{ items: CartItem[]; couponCode: string }>('/cart/coupon', { code }),
    removeCoupon: () => del<{ items: CartItem[] }>('/cart/coupon'),
  },

  /* orders */
  orders: {
    create: (data: { address: Address; paymentMethod: 'cod' | 'razorpay'; idempotencyKey: string }) =>
      post<Order>('/orders', data),
    list: () => get<Order[]>('/orders'),
    get: (orderId: string) => get<Order>(`/orders/${orderId}`),
    cancel: (orderId: string) => post<Order>(`/orders/${orderId}/cancel`),
  },

  /* payments */
  payments: {
    createOrder: (orderId: string) => post<{ razorpayOrderId: string; amountPaise: number; keyId: string }>('/payments/create-order', { orderId }),
    verify: (data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
      post<{ verified: boolean }>('/payments/verify', data),
  },

  /* admin */
  admin: {
    dashboard: () =>
      get<{
        ordersToday: number;
        revenuePaise: number;
        pendingOrders: number;
        lowStockCount: number;
        productCount: number;
        recentOrders: Order[];
      }>('/admin/dashboard'),
    products: {
      list: (params: { q?: string; status?: string; page?: number } = {}) =>
        get<Paginated<Product>>(`/admin/products${qs(params)}`),
      get: (id: string) => get<Product>(`/admin/products/${id}`),
      create: (data: Partial<Product>) => post<Product>('/admin/products', data),
      update: (id: string, data: Partial<Product>) => patch<Product>(`/admin/products/${id}`, data),
      remove: (id: string) => del<{ deleted: boolean }>(`/admin/products/${id}`),
    },
    orders: {
      list: (params: { status?: string; q?: string; page?: number } = {}) =>
        get<Paginated<Order>>(`/admin/orders${qs(params)}`),
      get: (id: string) => get<Order>(`/admin/orders/${id}`),
      updateStatus: (id: string, status: Order['status'], tracking?: string) =>
        patch<Order>(`/admin/orders/${id}`, { status, tracking }),
    },
    collections: {
      list: () => get<CollectionDef[]>('/admin/collections'),
      create: (data: Partial<CollectionDef>) => post<CollectionDef>('/admin/collections', data),
      update: (id: string, data: Partial<CollectionDef>) => patch<CollectionDef>(`/admin/collections/${id}`, data),
      remove: (id: string) => del<{ deleted: boolean }>(`/admin/collections/${id}`),
    },
    coupons: {
      list: () => get<Coupon[]>('/admin/coupons'),
      create: (data: Partial<Coupon>) => post<Coupon>('/admin/coupons', data),
      update: (id: string, data: Partial<Coupon>) => patch<Coupon>(`/admin/coupons/${id}`, data),
      remove: (id: string) => del<{ deleted: boolean }>(`/admin/coupons/${id}`),
    },
    banners: {
      list: () => get<Banner[]>('/admin/banners'),
      create: (data: Partial<Banner>) => post<Banner>('/admin/banners', data),
      update: (id: string, data: Partial<Banner>) => patch<Banner>(`/admin/banners/${id}`, data),
      remove: (id: string) => del<{ deleted: boolean }>(`/admin/banners/${id}`),
    },
    customers: {
      list: (params: { q?: string; page?: number } = {}) => get<Paginated<User>>(`/admin/customers${qs(params)}`),
      get: (id: string) => get<{ user: User; orders: Order[] }>(`/admin/customers/${id}`),
    },
  },
};

export { ApiError };
