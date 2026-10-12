# RD_COLLECTION API server

Express 4 + TypeScript (strict) + Mongoose 8. All money is integer **paise**.
API base: `/api/v1`. Envelope: `{ ok: true, data }` / `{ ok: false, error: { code, message } }`.

## Scripts

| Command         | What it does                          |
|-----------------|---------------------------------------|
| `npm run dev`   | tsx watch `src/server.ts`             |
| `npm run build` | `tsc` emit to `dist/`                 |
| `npm start`     | `node dist/server.js`                 |
| `npm run seed`  | seed catalog (`--force` to reseed)    |
| `npm test`      | vitest unit tests                     |

## Setup

1. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`.
2. `npm install`
3. `npm run seed` — creates categories, collections, 12 products (124 variants),
   banners and the admin user (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
4. `npm run dev`

## Pricing (server-authoritative, paise)

- Subtotal >= 199900 -> 20000 off; >= 299900 -> 35000 off (floored at 265000).
- Shipping free when (subtotal - discount) >= 75000, else 9900.
- Coupons apply after auto promos; min-order checked on the post-auto amount;
  percent coupons capped by `maxDiscountPaise`.

## Auth

JWT in an httpOnly cookie (`rd_token`, 7 days). Auth endpoints are rate-limited.

## Payments

Razorpay when `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are set; otherwise a
**test adapter** (every response has `simulated: true` and logs a warning).
Webhook signature is verified against the raw body at
`POST /api/v1/payments/webhook` (idempotent via paymentId dedupe).

## Uploads

Local disk under `./uploads`, served at `/uploads`, when Cloudinary env vars
are absent; Cloudinary when configured.

## Key routes

- Catalog: `GET /categories`, `GET /collections[/:slug]`, `GET /products[/:slug]`,
  `GET /search?q=`, `GET /banners?position=`, `POST /newsletter`, `GET /pincode/:code`
- Auth: `POST /auth/register|login|logout`, `GET /auth/me`
- Cart (auth): `GET /cart`, `POST|PATCH|DELETE /cart/items[/:id]`, `POST|DELETE /cart/coupon`
- Orders (auth): `POST /orders` (idempotent via `idempotencyKey`), `GET /orders[/:id]`,
  `POST /orders/:id/cancel`
- Payments: `POST /payments/create-order|verify|webhook`
- Admin (`requireAdmin`): `GET /admin/dashboard`, CRUD `/admin/products|collections|
  coupons|banners`, `GET|PATCH /admin/orders[/:id]`, `GET /admin/customers[/:id]`,
  `POST /admin/upload`
