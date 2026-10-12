# Implementation Plan — RD_COLLECTION

Monorepo root: `~/workspace/rd-collection/` with `client/`, `server/`, `docs/`, `tests/e2e/`.

Business rules (apply across phases): auto promos — ₹200 off on orders ≥ ₹1,999; ₹350 off on orders ≥ ₹2,999; free shipping ≥ ₹750, otherwise ₹99 shipping. COD available. Razorpay uses the TEST adapter when keys are absent (clearly marked simulated). Money is integer paise everywhere.

## Phase 1 — Reference analysis and documentation

- Produce `docs/REFERENCE_ANALYSIS.md`, `docs/SITEMAP.md`, `docs/COMPONENT_ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md` (this file).
- Deliverable: docs reviewed; verified observations separated from assumptions.
- Done when: all four docs exist and are consistent with each other.

## Phase 2 — Project init and design tokens

- Scaffold `client/` (React + Vite + TypeScript + Tailwind) and `server/` (Node + Express + TypeScript).
- Centralize design tokens: colors (`#1C1C1C`, `#E32C2B`, greys), Dosis/Poppins typography, zero radius, spacing, breakpoints, z-index.
- `.env.example`, `.gitignore`, ESLint + Prettier, README skeleton.
- Done when: `client` dev server renders a blank themed shell; `server` responds on `/healthz`; lint passes.

## Phase 3 — Global layout, header, navigation, footer

- AnnouncementBar (configurable text, dismissible), Header (desktop nav with dropdowns, search/account/wishlist/cart icons), MobileDrawer, SearchOverlay, Footer (4 columns + newsletter + socials).
- Sticky header behavior; Escape closes menus; keyboard-focus support.
- Done when: all nav links route correctly on desktop and mobile at 360/390/768/1280px with no overflow.

## Phase 4 — Homepage sections

- Hero slider, category tiles, product carousels, video block, tabbed product grid, press logos, blog teasers, SEO text block, trust badges, newsletter form (validation, loading/success/error/duplicate states).
- All sections data-driven via services; empty sections hidden; loading and error states present.
- Done when: homepage matches the reference section order and every CTA leads somewhere valid.

## Phase 5 — Product cards and collection pages

- Reusable `ProductCard`; `CollectionPage` with breadcrumb, title, description, count, filters (category/price/color/size/fabric/availability), sorting (featured, price asc/desc, newest, A–Z; "best selling" only when real sales data exists), numbered pagination, active-filter chips, clear-all, empty/loading/error states.
- Done when: filter combinations work, URL preserves shareable filter state, back/forward navigation works.

## Phase 6 — Product detail and variants

- Gallery with thumbnails + lightbox, price/discount, variant selectors (unavailable disabled), size-guide modal (XS–6XL tables), qty stepper, add-to-cart with server validation, pincode checker (6-digit; labeled simulated until a logistics API is configured), offers block, related + recently viewed.
- Done when: out-of-stock variants cannot be added; failed adds keep the user's selection and show a useful error.

## Phase 7 — Search, wishlist, cart

- Debounced search overlay with suggestions; search results page with no-result state.
- Wishlist (guest localStorage, server for logged-in users).
- Cart drawer + cart page: add/remove/qty, coupon apply/remove, server-recalculated totals, free-shipping progress bar, guest persistence + merge on login.
- Done when: totals always come from the server; price/stock changes surface clear feedback.

## Phase 8 — Backend, database, APIs

- Mongoose models (User, Address, Category, Collection, Product, ProductVariant, Cart, Order, Payment, Coupon, Review, Wishlist, Banner, NewsletterSubscriber, InventoryMovement) with validation, indexes, timestamps.
- REST API per `docs/API_DOCUMENTATION.md`: consistent `{ ok, data } / { ok, error }` envelope, pagination, Zod validation, rate limiting, secure headers, CORS.
- Done when: integration tests for product/collection/cart/auth endpoints pass.

## Phase 9 — Authentication and customer accounts

- Register/login/logout/me, JWT auth, bcrypt password hashing, address book, order history (ownership enforced), wishlist sync.
- Done when: private routes reject unauthenticated access; users can only see their own orders.

## Phase 10 — Checkout and payments

- Checkout steps (details → address → delivery → payment → review → confirmation); server validates address, inventory, pricing; duplicate-order protection (idempotency keys).
- Razorpay: server creates order → returns public payment info → client opens Razorpay checkout → server verifies signature → webhook (signature over raw body, idempotent) reconciles status. COD path when enabled.
- Without keys: TestPaymentProvider, UI clearly labeled "Simulated payment".
- Done when: payment success/failure/cancellation flows tested; no order is marked paid before server-side verification.

## Phase 11 — Orders and admin dashboard

- Order lifecycle with valid status transitions (pending payment → confirmed → processing → shipped → delivered; cancelled / return requested / returned / refund pending / refunded) and status history.
- Admin: dashboard stats, product CRUD + image upload (Cloudinary; local-disk dev adapter), collections, orders, customers, coupons, banners, settings. Backend authorization on every admin route; audit logging for inventory/order changes.
- Done when: admin login → create product → update inventory → publish shows on storefront.

## Phase 12 — SEO, accessibility, performance

- Unique titles/meta, canonical URLs, Open Graph, XML sitemap, robots.txt, product + breadcrumb structured data (real data only, no fake ratings), semantic HTML, alt text.
- WCAG 2.2 AA practices: keyboard navigation, focus management, visible focus, form labels, contrast, reduced motion, screen-reader cart announcements.
- Performance: responsive images, lazy below-fold, hero eager, code splitting, debounced search, pagination, skeletons, no CLS.
- Done when: Lighthouse-style checks pass at mobile and desktop viewports.

## Phase 13 — Tests, bug fixes, responsive validation

- Unit (Vitest): pricing, discounts, promos, cart totals, coupon rules, validation.
- Integration: product/collection/auth/cart/order/payment APIs, authorization checks.
- E2E (Playwright): the 8 flows — (1) home→collection→product→size→add to cart; (2) cart→qty→coupon→checkout; (3) login→orders→order details; (4) admin login→create product→inventory→publish; (5) checkout→simulated payment success→confirmation; (6) payment failure→safe retry; (7) product unavailable→cart validation feedback; (8) mobile nav→search→PDP→add to cart.
- Responsive validation at 360/390/430/768/1024/1280/1440px: no overflow, correct grids, usable drawers/modals.
- Done when: all suites pass; no test is marked passed without execution.

## Phase 14 — Deployment documentation and handover

- `docs/DEPLOYMENT.md` complete; seed script safe for dev; production checklist verified (payments, webhooks, DB permissions, domain/HTTPS, order flow).
- Done when: a fresh checkout can go from clone to running staging by following the docs.

## Definition of done (project-level)

1. Homepage responsive. 2. Navigation links work. 3. Collections load correctly. 4. Filters and sorting work. 5. PDP shows valid data. 6. Variant selection works. 7. Cart operations work. 8. Cart totals validated server-side. 9. Customer auth works. 10. Customers see only their own orders. 11. Checkout validates addresses and inventory. 12. Payment verified or clearly simulated. 13. Order status handled consistently. 14. Admin routes protected. 15. Product/inventory management works. 16. Error/loading states present. 17. Core automated tests pass. 18. Mobile tested. 19. No secrets exposed. 20. Setup/deployment docs complete.
