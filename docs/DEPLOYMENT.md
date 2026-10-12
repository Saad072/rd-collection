# Deployment Guide — RD_COLLECTION

## 1. Prerequisites

- Node.js 20 LTS, npm 10+
- MongoDB (Atlas free tier M0 recommended for staging/production; local mongod for dev)
- Git
- Accounts (all free to start): MongoDB Atlas, Cloudinary, Razorpay (test mode), Render (or any VPS)

## 2. Local setup

```bash
git clone <repo-url> rd-collection && cd rd-collection

# Backend
cd server && cp ../.env.example .env   # then fill values (see section 3)
npm install
npm run seed        # safe dev seed: categories, collections, 12 sample products, admin user
npm run dev         # http://localhost:4000, /healthz

# Frontend (new terminal)
cd client
npm install
npm run dev         # http://localhost:5173 (proxies /api to :4000 in dev)
```

Seed is idempotent for dev and **never runs automatically against production**. It creates an admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (change immediately after first login).

## 3. Environment configuration

Copy root `.env.example` to `server/.env` (backend) and set frontend vars in `client/.env`:

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `development` / `production` |
| `PORT` | yes | default `4000` |
| `MONGODB_URI` | yes | Atlas connection string; use a DB user with least privilege |
| `JWT_SECRET` | yes | long random string; rotate if ever leaked |
| `CLIENT_ORIGIN` | yes | e.g. `https://rdcollection.in`; CORS allowlist (comma-separated allowed) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | bootstrap admin; change after first login |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | payments | **test keys** (`rzp_test_...`) until launch; live keys only after verification |
| `RAZORPAY_WEBHOOK_SECRET` | webhooks | set in Razorpay dashboard → Settings → Webhooks |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | images | unsigned preset not used; server-side signed uploads only |
| `VITE_API_BASE_URL` | frontend | e.g. `https://api.rdcollection.in/api/v1` |

Rules: never commit `.env`; never expose backend secrets via `VITE_` variables; `.env.example` contains placeholders only.

## 4. Database (MongoDB Atlas, free tier)

1. Create an M0 cluster, database user (readWrite on the app database only), and IP allowlist (or `0.0.0.0/0` for Render, tightened later).
2. Set `MONGODB_URI` accordingly.
3. **Backups:** M0 includes daily snapshots; before any production migration, take a manual backup via Atlas → Backup → Take snapshot now. For larger catalogs, schedule `mongodump` to object storage.

## 5. Payments (Razorpay)

1. Use **test keys** during development. The server detects missing keys and switches to `TestPaymentProvider`; the checkout UI then shows "Simulated payment — no real charge".
2. Webhook config (Razorpay dashboard → Settings → Webhooks): URL `https://<api-domain>/api/v1/payments/webhook`, events `payment.captured` and `payment.failed`, secret → `RAZORPAY_WEBHOOK_SECRET`.
3. Verification checklist before going live: real test payment of ₹1 in test mode, webhook delivery log shows 200, signature verification passes, duplicate webhook delivery does not double-mark the order, failed payment leaves order retryable, switch to live keys, re-run the checklist.

## 6. Images (Cloudinary)

1. Create a Cloudinary account; set the three `CLOUDINARY_*` variables.
2. Admin uploads go through the server (`POST /admin/products/:id/images`), which validates type/size and uploads server-side — API secrets never reach the browser.
3. Without Cloudinary configured, the server uses a local-disk dev adapter (not for production).

## 7. Build and deploy (Render example)

```bash
# Backend (Render Web Service)
# Build:   cd server && npm install && npm run build
# Start:   cd server && npm start
# Env:     all server variables above; NODE_ENV=production
# Health:  /healthz

# Frontend (Render Static Site)
# Build:   cd client && npm install && npm run build
# Publish: client/dist
# Env:     VITE_API_BASE_URL=https://<api-domain>/api/v1
```

VPS alternative: `pm2` or systemd for the API, nginx reverse proxy with HTTPS (Let's Encrypt), static files served from `client/dist`.

## 8. Domain and HTTPS

Point DNS (A/CNAME) to the host, terminate TLS at the host or nginx, set `CLIENT_ORIGIN` to the exact storefront origin, and enable HSTS once stable.

## 9. Health checks and monitoring

- `GET /healthz` → `{ ok:true, db:"connected" }` (used by the host for restarts).
- Log structured JSON to stdout; do not log passwords, tokens, payment secrets, or full PII.
- Suggested alerts: 5xx rate, webhook failures, order creation errors, disk/memory on VPS.

## 10. Production go-live checklist

- [ ] Real Razorpay keys + webhook verified (section 5)
- [ ] MongoDB user is least-privilege; backups enabled
- [ ] `JWT_SECRET` set to a fresh random value; admin password changed
- [ ] `CLIENT_ORIGIN` matches the live domain; CORS tight
- [ ] Cloudinary configured; no local-disk uploads in prod
- [ ] Seed script NOT run against production data
- [ ] Full E2E suite (including payment success/failure flows) passes against staging
- [ ] Privacy policy, terms, shipping, and returns pages published
- [ ] Contact email/phone monitored
