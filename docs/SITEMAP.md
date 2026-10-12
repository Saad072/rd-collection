# Sitemap — RD_COLLECTION

All routes for the React (React Router) frontend. `:slug` segments are URL-safe lowercase slugs.

## Public storefront

| Route | Page | Notes |
|---|---|---|
| `/` | Home | Announcement bar, header, hero, category tiles, product carousels, video block, tabbed grid, press, blog, SEO block, trust badges, newsletter, footer |
| `/collections/:slug` | Collection | Breadcrumb, title, description, product count, filters, sort, pagination |
| `/products/:slug` | Product detail | Gallery + thumbnails, price/discount, variant (size/color) selectors, size guide modal, qty stepper, add to cart, buy now, pincode checker, offers, related products, recently viewed |
| `/search` | Search results | Query from `?q=`, suggestions, no-result state |
| `/cart` | Cart page | Line items, qty controls, coupon field, totals, checkout CTA (drawer also available globally) |
| `/checkout` | Checkout | Steps: details → address → delivery → payment → review → confirmation. Guarded: redirects to `/cart` when cart is empty |
| `/order-success/:id` | Order confirmation | Order number, payment status, summary, address, tracking entry point |
| `/wishlist` | Wishlist | Saved products, move to bag |
| `/login` | Login | Email + password |
| `/register` | Register | Name, email, phone, password |
| `/contact` | Contact | Form + store contact details |
| `/about` | About | Brand story (original copy) |
| `/faq` | FAQ | Grouped questions |
| `/shipping-policy` | Shipping policy | Delivery timelines, charges |
| `/returns-policy` | Returns & exchange policy | 7-day exchange terms |
| `/privacy-policy` | Privacy policy | Data handling |
| `/terms` | Terms & conditions | Store terms |

## Customer account (protected, requires login)

| Route | Page | Notes |
|---|---|---|
| `/account` | Account dashboard | Profile summary, recent orders |
| `/account/orders` | Order history | Paginated list of own orders only |
| `/account/orders/:id` | Order details | Items snapshot, status timeline, tracking |
| `/account/addresses` | Address book | Add / edit / delete / set default |
| `/account/profile` | Profile settings | Name, phone, password change |

## Admin (protected, requires `role: "admin"`)

Separate layout with sidebar navigation.

| Route | Page | Notes |
|---|---|---|
| `/admin/login` | Admin login | Separate from customer login |
| `/admin` | Dashboard | Order count, sales summary, pending orders, inventory alerts, recent orders, product stats |
| `/admin/products` | Product list | Search, filter by status/category, bulk publish/unpublish |
| `/admin/products/new` | Create product | Full product form |
| `/admin/products/:id` | Edit product | Details, variants, images, inventory, SEO |
| `/admin/collections` | Collections | Create/edit, assign products, display order, activate/deactivate |
| `/admin/orders` | Order list | Filter by status, search by order number |
| `/admin/orders/:id` | Order details | Status transitions, tracking, cancellation, returns |
| `/admin/customers` | Customer list | Search, profile view, order history (no unnecessary PII) |
| `/admin/coupons` | Promotions | Create/edit coupon codes, discount rules, validity, usage limits |
| `/admin/banners` | Homepage management | Banner upload, destinations, featured collections/products, section order |
| `/admin/settings` | Store settings | Announcement bar text, promo rules, COD toggle, shipping rules |

## System routes

| Route | Purpose |
|---|---|
| `/sitemap.xml` | Generated XML sitemap (server) |
| `/robots.txt` | Crawl rules (server/static) |
| `*` | 404 page — helpful links, search box |

## Route guards

- `/checkout`, `/account/*` → redirect to `/login` when unauthenticated.
- `/admin/*` (except `/admin/login`) → redirect to `/admin/login` when not an admin. Backend enforces authorization independently of frontend routes.
