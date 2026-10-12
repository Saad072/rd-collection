# Component Architecture — RD_COLLECTION

## 1. Frontend structure (`client/src`)

```
client/src
  app/                 # router, providers, global styles
    router.tsx         # route definitions + guards
    providers.tsx      # Zustand/query providers, toast, error boundary
  assets/              # static images, fonts
  components/
    layout/            # AnnouncementBar, Header, DesktopNav, MegaMenu(optional),
                       # MobileDrawer, SearchOverlay, Footer, NewsletterForm,
                       # CartDrawer, Breadcrumbs
    product/           # ProductCard, ProductGrid, ProductGallery, VariantSelector,
                       # SizeGuideModal, PincodeChecker, RelatedProducts,
                       # RecentlyViewed, OfferTickets
    collection/        # CollectionToolbar, FilterSidebar, FilterDrawer(mobile),
                       # SortSelect, Pagination, ActiveFilters
    cart/              # CartLineItem, QtyStepper, CouponField, CartTotals,
                       # FreeShippingProgress
    checkout/          # CheckoutSteps, AddressForm, PaymentMethodPicker,
                       # OrderReview, OrderConfirmation
    forms/             # TextInput, SelectInput, FormError (React Hook Form + Zod wrappers)
    feedback/          # Skeleton, EmptyState, ErrorState, Toast
    common/            # Button, Badge, Price, Modal, Drawer, Tabs
  pages/               # one folder per route (see SITEMAP.md)
    features/          # feature-specific page composition
  hooks/               # useDebounce, usePincode, useRecentlyViewed, useMediaQuery
  services/            # api.ts (typed client), productService, cartService,
                       # authService, orderService, paymentService, uploadService
  store/               # Zustand stores (see section 3)
  types/               # shared TypeScript types (Product, Variant, Cart, Order, ...)
  utils/               # money.ts (paise<->INR), pricing.ts (promo rules),
                       # validation.ts, seo.ts
  styles/              # tailwind.css, design tokens
```

Design tokens live in one place (`styles/tokens.ts` + Tailwind theme extension): brand colors (`#1C1C1C` ink, `#E32C2B` sale red), Dosis headings (uppercase, 0.18em tracking), Poppins body, zero border radius, breakpoints 700/1000/1150/1400/1600, section spacing 2.5rem mobile / 4rem desktop.

## 2. Component tree (key pages)

```
<App>
  <AnnouncementBar/>
  <Header>
    <DesktopNav/> <SearchOverlay/> <AccountMenu/> <WishlistButton/> <CartButton/>
    <MobileDrawer/>
  </Header>
  <CartDrawer>
    <FreeShippingProgress/> <CartLineItem/>* <CartTotals/> <CouponField/>
  </CartDrawer>
  <Routes>
    <HomePage>
      <HeroSlider/> <CategoryTiles/>
      <ProductCarousel title/>* <VideoBlock/> <TabbedProductGrid/>
      <PressLogos/> <BlogTeasers/> <SeoTextBlock/> <TrustBadges/> <NewsletterForm/>
    </HomePage>
    <CollectionPage>
      <Breadcrumbs/> <FilterSidebar|FilterDrawer/> <CollectionToolbar/>
      <ProductGrid> <ProductCard/>* </ProductGrid> <Pagination/>
    </CollectionPage>
    <ProductPage>
      <ProductGallery/> (thumbnails + lightbox)
      <VariantSelector/> (size pills, color pills) <SizeGuideModal/>
      <QtyStepper/> <PincodeChecker/> <OfferTickets/>
      <RelatedProducts/> <RecentlyViewed/>
    </ProductPage>
    <CartPage/> <CheckoutPage> <CheckoutSteps/>* </CheckoutPage>
    <AccountPages/>* <AdminPages/>* (separate <AdminLayout/>)
  </Routes>
  <Footer/>
  <Toast/>
```

## 3. State ownership (Zustand)

| Store | Owns | Persists |
|---|---|---|
| `useCartStore` | lines (product, variant, qty), coupon code, totals snapshot from server | yes (localStorage; guest cart). Merges into server cart on login |
| `useAuthStore` | user, access token, login/logout/register, `me()` | yes (token only) |
| `useWishlistStore` | product ids | yes (localStorage for guests, server for logged-in users) |
| `useUIStore` | cart drawer open, mobile drawer open, search overlay open, toasts | no |

Rules:
- Server is authoritative for prices, stock, promos, and totals. The frontend never trusts client-submitted prices; cart totals are revalidated via `GET /api/v1/cart` / checkout quote endpoints.
- Product/catalog data is fetched per page (React Query or plain fetch in services); no global product cache beyond request-level caching.
- Recently viewed lives in localStorage only (max 12, no PII).

## 4. Props contracts (important ones)

- `<ProductCard product: ProductCardData, onQuickAdd?: (p) => void />` — one shared implementation used in carousels, grids, related, search results. No duplicated card variants.
  - `ProductCardData = { id, slug, name, image, pricePaise, compareAtPaise?, discountPct?, colors: string[], sizes: string[], inStock: boolean, isNew?: boolean, badge?: "SAVE"|"EXCLUSIVE"|"NEW" }`
- `<ProductGrid products, loading, error, emptyLabel />` — handles skeleton / error / empty states internally.
- `<VariantSelector sizes, colors, stockByVariant, value, onChange, disabled />` — unavailable options render disabled; never selectable.
- `<QtyStepper value, min=1, max=stockCap, onChange />` — clamps, no negatives.
- `<FreeShippingProgress subtotalPaise />` — milestones computed from shared `pricing.ts` (75000 / 199900 / 299900 paise).
- `<FilterSidebar filters: FilterState, facets: Facets, onChange />` — only renders facets the catalog supports.
- Forms: React Hook Form + Zod schemas from `utils/validation.ts`; server re-validates everything.

## 5. Service layer (`services/`)

- `api.ts` — single fetch wrapper: base URL from `VITE_API_BASE_URL`, attaches JWT, parses the `{ ok, data } / { ok, error }` envelope, throws typed `ApiError`.
- Domain services (`productService`, `cartService`, `authService`, `orderService`, `paymentService`, `adminService`) expose typed functions; components never call `fetch` directly.
- `utils/pricing.ts` — client-side mirror of promo rules (₹200 off ≥ ₹1,999; ₹350 off ≥ ₹2,999; free shipping ≥ ₹750 else ₹99) for instant UI feedback. Server recomputes authoritatively at checkout.
- `utils/money.ts` — `paiseToInr`, `formatInr` (Intl.NumberFormat `en-IN`, INR). Money is integer paise across the API; display formatting only in the client.

## 6. Backend structure (`server/src`)

```
server/src
  config/        # env, db, cloudinary, razorpay client, logger
  models/        # Mongoose: User, Address, Category, Collection, Product,
                 # ProductVariant, Cart, Order, Payment, Coupon, Review,
                 # Wishlist, Banner, NewsletterSubscriber, InventoryMovement
  routes/        # v1 routers: public, auth, cart, orders, payments, admin, webhooks
  controllers/   # thin: validate -> service -> respond
  services/      # pricingService, cartService, orderService, paymentService
                 # (RazorpayProvider + TestPaymentProvider behind one interface),
                 # inventoryService, emailService (provider + dev log adapter)
  middleware/    # auth (JWT), requireAdmin, validate (Zod), rateLimit,
                 # errorHandler, idempotency (orders/webhooks)
  validators/    # Zod schemas shared by controllers
  jobs/          # optional: abandoned-cart, inventory alerts (stubs)
  utils/         # money, slugs, pagination
  app.ts server.ts
```

Money: stored and transferred as integer paise. Webhook verification uses the raw request body. Admin mutations are validated and audit-logged (`InventoryMovement` + order status history).
