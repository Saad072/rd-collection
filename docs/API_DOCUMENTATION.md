# API Documentation — RD_COLLECTION

Base URL: `{API_ORIGIN}/api/v1` (frontend uses `VITE_API_BASE_URL`).

## Conventions

- **Money is integer paise everywhere** (`pricePaise: 149900` = ₹1,499.00). Never floats.
- **Response envelope:**
  - Success: `{ "ok": true, "data": <payload> }`
  - Error: `{ "ok": false, "error": { "code": "string_code", "message": "human readable" } }`
- **Pagination:** `?page=1&limit=24` → `data: { items: [...], page, limit, total, totalPages }`.
- **Auth:** JWT Bearer token in `Authorization` header. Admin endpoints require `role: "admin"`.
- **Common status codes:** 200 OK, 201 Created, 400 validation, 401 unauthenticated, 403 forbidden/not owner, 404 not found, 409 conflict (duplicate), 422 business rule (e.g. insufficient stock), 429 rate limited, 500 server error.
- **Common error codes:** `validation_error`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `insufficient_stock`, `invalid_coupon`, `payment_failed`, `rate_limited`.

## Promo rules (server-authoritative)

Applied automatically, no coupon code needed:
- Subtotal ≥ ₹2,999 (299900 paise) → ₹350 (35000) off
- Subtotal ≥ ₹1,999 (199900 paise) → ₹200 (20000) off
- Shipping: free when (subtotal − discount) ≥ ₹750 (75000 paise), else ₹99 (9900)

## Public catalog

### `GET /categories`
List categories (tree with children for nav dropdowns).
→ `200 { ok:true, data:[{ id, name, slug, parentId, image?, sortOrder }] }`

### `GET /collections`
→ `200 { ok:true, data:[{ id, name, slug, description?, image?, productCount, isActive, sortOrder }] }`

### `GET /collections/:slug`
→ `200 { ok:true, data:{ id, name, slug, description, image?, seoTitle?, seoDescription? } }` · `404` unknown slug

### `GET /products`
Filters: `collection` (slug) · `category` (slug) · `q` (search) · `minPrice`/`maxPrice` (paise) · `size` (repeatable) · `color` (repeatable) · `fabric` · `inStock=true` · `isNew=true` · `onSale=true`
Sort: `sort=featured|price_asc|price_desc|newest|name_asc` (`best_selling` only when sales data exists)
Pagination: `page`, `limit` (default 24, max 48)
→ `200 { ok:true, data:{ items:[ProductSummary], facets:{ sizes:[], colors:[], fabrics:[], priceRange:{min,max} }, page, limit, total, totalPages } }`

`ProductSummary = { id, slug, name, image, pricePaise, compareAtPaise?, discountPct?, colors:[], sizes:[], inStock, isNew?, badge? }`

### `GET /products/:slug`
→ `200 { ok:true, data:{ ProductDetail } }` · `404` not found / unpublished
`ProductDetail` adds: `description, fabric, sku, vendor?, images:[{url,alt}], variants:[{ id, sku, size, color, pricePaise?, stockQty, isActive }], attributes:{}, relatedSlugs:[], seoTitle?, seoDescription?`

### `GET /search?q=...&page=&limit=`
Sanitized server-side; searches name, SKU, category, tags.
→ `200 { ok:true, data:{ items:[ProductSummary], page, limit, total, totalPages, query } }` · `400` empty query

### `GET /banners`
Homepage banners/carousels.
→ `200 { ok:true, data:[{ id, image, mobileImage?, title?, subtitle?, ctaLabel?, ctaUrl, sortOrder }] }`

### `POST /newsletter/subscribe`
Body: `{ email }` → `201 { ok:true, data:{ subscribed:true } }` · `409 { code:"already_subscribed" }` · `400` invalid email

### `POST /pincode/check`
Body: `{ pincode }` (6 digits)
→ `200 { ok:true, data:{ serviceable:true, etaDays:"4-6", codAvailable:true, simulated:true } }`
`simulated:true` until a logistics API is configured. `422` invalid pincode.

## Auth

### `POST /auth/register`
Body: `{ name, email, phone, password }` (Zod-validated; password ≥ 8 chars)
→ `201 { ok:true, data:{ user:{ id, name, email, phone, role }, token } }` · `409` email exists · rate limited

### `POST /auth/login`
Body: `{ email, password }`
→ `200 { ok:true, data:{ user, token } }` · `401 { code:"invalid_credentials" }` · rate limited

### `POST /auth/logout` (auth)
→ `200 { ok:true, data:{ ok:true } }` (client discards token)

### `GET /auth/me` (auth)
→ `200 { ok:true, data:{ user } }` · `401` invalid/expired token

## Cart (auth optional; guests use server session or merge on login)

`CartLine = { itemId, productId, variantId, name, image, size, color, qty, unitPricePaise, lineTotalPaise }`

### `GET /cart` → `200 { ok:true, data:{ lines:[CartLine], couponCode?, subtotalPaise, discountPaise, shippingPaise, totalPaise, promoDetails } }`
Prices/stock revalidated; unavailable lines flagged with `unavailable:true`.

### `POST /cart/items`
Body: `{ productId, variantId, qty }`
→ `201` updated cart · `422 { code:"insufficient_stock" }` · `404` product/variant

### `PATCH /cart/items/:itemId`
Body: `{ qty }` (0 removes)
→ `200` updated cart · `422` insufficient stock

### `DELETE /cart/items/:itemId`
→ `200` updated cart

### `POST /cart/coupon`
Body: `{ code }` → `200` cart with coupon applied · `422 { code:"invalid_coupon" }` (expired, min-order not met, usage limit)

### `DELETE /cart/coupon`
→ `200` cart without coupon

## Orders (auth required; users see only their own)

### `POST /orders`
Body: `{ addressId?, address?:{...}, paymentMethod:"razorpay"|"cod", idempotencyKey }`
Server: revalidates inventory + pricing, creates order (status `pending_payment` or `confirmed` for COD), reserves stock.
→ `201 { ok:true, data:{ order:{ id, orderNumber, status, paymentStatus, totalPaise, ... } } }` · `409` duplicate idempotency key · `422` stock/validation failure

### `GET /orders?page=&limit=`
→ `200` paginated own orders (summary)

### `GET /orders/:id`
→ `200 { ok:true, data:{ order detail with items snapshot, address snapshot, pricing breakdown, statusHistory, tracking? } }` · `403` not owner · `404`

### `POST /orders/:id/cancel` (auth)
Allowed only before shipment.
→ `200 { ok:true, data:{ order } }` · `422 { code:"cannot_cancel" }`

Order statuses: `pending_payment, confirmed, processing, shipped, delivered, cancelled, return_requested, returned, refund_pending, refunded`. Only valid transitions allowed.

## Payments

### `POST /payments/create-order` (auth)
Body: `{ orderId }`
Server validates the order, creates a Razorpay order with server credentials, returns only public fields.
→ `200 { ok:true, data:{ razorpayOrderId, amountPaise, currency:"INR", keyId, orderId } }`

### `POST /payments/verify` (auth)
Body: `{ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }`
Server verifies the signature; on success marks order paid (idempotent).
→ `200 { ok:true, data:{ verified:true, order } }` · `400 { code:"payment_failed" }` bad signature

### `POST /payments/webhook` (no auth; signature verified)
Headers: `x-razorpay-signature` verified against the **raw request body** using `RAZORPAY_WEBHOOK_SECRET`. Handles `payment.captured`, `payment.failed`; idempotent via stored event ids.
→ `200 { ok:true }` always (after processing) to avoid provider retries on business errors.

**Test mode:** when Razorpay keys are absent, `TestPaymentProvider` is used; `/payments/create-order` returns `{ simulated:true, ... }` and the client shows "Simulated payment — no real charge". Never expose key secrets to the client.

## Admin (auth + `role:"admin"` on every route)

### Dashboard
- `GET /admin/dashboard` → `{ ordersToday, revenuePaise, pendingOrders, lowStockProducts:[], recentOrders:[], productStats:{ total, published, outOfStock } }`

### Products
- `GET /admin/products?q=&status=&category=&page=&limit=`
- `POST /admin/products` → `201` (body: full product incl. variants)
- `GET /admin/products/:id`
- `PATCH /admin/products/:id` → `200` (partial update; inventory changes audit-logged)
- `DELETE /admin/products/:id` → soft delete (`isDeleted`), `200`
- `POST /admin/products/:id/images` (multipart) → `201 { images:[{url}] }` — Cloudinary in production, local-disk dev adapter; file-type + size validated

### Collections
- `GET /admin/collections` · `POST /admin/collections` · `PATCH /admin/collections/:id` · `DELETE /admin/collections/:id`
- `POST /admin/collections/:id/products` Body `{ productIds:[], sortOrder? }`

### Orders
- `GET /admin/orders?status=&q=&page=&limit=`
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id` Body `{ status, trackingNumber?, trackingUrl?, note? }` — only valid transitions; every change appended to `statusHistory` + audit log

### Customers
- `GET /admin/customers?q=&page=&limit=` → `{ id, name, email, phone, orderCount, totalSpentPaise, createdAt }` (no unnecessary PII)
- `GET /admin/customers/:id` → profile + order history

### Coupons
- `GET /admin/coupons` · `POST /admin/coupons` · `PATCH /admin/coupons/:id` · `DELETE /admin/coupons/:id`
- Coupon: `{ code, type:"flat"|"percent", valuePaise|valuePct, minOrderPaise?, maxUses?, usedCount, startsAt?, endsAt?, isActive }`

### Banners / homepage
- `GET /admin/banners` · `POST /admin/banners` (multipart image + `{ title?, subtitle?, ctaLabel?, ctaUrl, sortOrder, isActive }`) · `PATCH /admin/banners/:id` · `DELETE /admin/banners/:id`
- `GET /admin/settings` · `PATCH /admin/settings` — announcement bar, promo toggles, COD enabled, shipping rules

All admin mutations validate input (Zod), enforce authorization server-side (never frontend-only), and write audit entries for inventory and order changes.
