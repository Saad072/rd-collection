# RD_COLLECTION

A complete, production-oriented fashion e-commerce platform for the Indian ethnic-wear brand **RD_COLLECTION** — kurtas and kurta sets, ethnic sets, sarees, fusion wear, and workwear. Inspired by the publicly observable structure of jaipurkurti.com (layout and design values only; all branding, copy, and imagery are original).

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS, React Router, Zustand, React Hook Form + Zod, Lucide icons
- **Backend:** Node.js + Express + TypeScript, REST API, Mongoose
- **Database:** MongoDB (Atlas free tier supported)
- **Images:** Cloudinary (local-disk dev adapter when unconfigured)
- **Payments:** Razorpay (TEST adapter when keys are absent — clearly labeled simulated)
- **Tests:** Vitest + React Testing Library, Playwright E2E

## Quickstart

```bash
# Backend
cd server && cp ../.env.example .env   # fill values
npm install && npm run seed && npm run dev    # http://localhost:4000

# Frontend
cd client && npm install && npm run dev       # http://localhost:5173
```

See `docs/DEPLOYMENT.md` for full setup, environment variables, and production deployment.

## Project structure

```
rd-collection/
  client/          # React storefront + admin UI
  server/          # Express API + Mongoose models
  docs/
    REFERENCE_ANALYSIS.md
    SITEMAP.md
    COMPONENT_ARCHITECTURE.md
    IMPLEMENTATION_PLAN.md
    API_DOCUMENTATION.md
    DEPLOYMENT.md
  tests/e2e/       # Playwright end-to-end flows
  README.md
  .env.example
```

Key docs: start with `docs/REFERENCE_ANALYSIS.md`, then `docs/IMPLEMENTATION_PLAN.md`; API contract in `docs/API_DOCUMENTATION.md`.

## Business rules

- Auto promos: ₹200 off on orders ≥ ₹1,999; ₹350 off on orders ≥ ₹2,999; free shipping ≥ ₹750, else ₹99 shipping. COD available.
- Money is integer **paise** across the API. API envelope: `{ ok:true, data }` / `{ ok:false, error:{ code, message } }`.

## Honest status of integrations

- **Razorpay:** fully designed (order creation, signature verification, idempotent webhooks). Without keys, the server uses a test adapter and the UI is labeled "Simulated payment — no real charge". Do not treat simulated payments as verified.
- **Cloudinary:** server-side signed uploads; local-disk adapter in dev only.
- **Email:** transactional provider interface with a dev log adapter; wire a real provider before launch.
- **Pincode checker:** returns simulated serviceability until a logistics API is configured (`simulated:true` in the response).
- **"Best selling" sort:** only exposed when real sales data exists; otherwise the option is hidden, never faked.
- **Reviews:** schema exists, but no fake reviews are seeded or displayed.
