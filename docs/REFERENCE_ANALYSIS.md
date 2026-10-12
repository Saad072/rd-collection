# Reference Analysis — jaipurkurti.com

**Reference site:** https://jaipurkurti.com/
**Analysis date:** 2026-10-11 (prior technical audit)
**Source document:** `~/workspace/your_files/jaipurkurti-clone-decode/jaipurkurti-decode.md`
**Purpose:** Inform the RD_COLLECTION build with publicly observable layout patterns, navigation hierarchy, and shopping workflows. This document records structure and design values only. Do not reproduce the reference site's branding, marketing copy, product photography, logos, or proprietary assets.

---

## 1. Platform and stack (verified)

- The reference site runs on **Shopify** (backend shop `jaipurkurtiin.myshopify.com`), currency **INR (Rs.)**.
- Theme: **Prestige v10.11.0 by Maestrooo**, heavily customized, with extra custom CSS files (`bish-custom.css`, `custom.css`) layered on top.
- Cart is a **slide-in drawer**, not a cart page.
- Third-party apps detected: **Wishlist Hero** (wishlist buttons + header icon), **Releasit COD Fee** (COD charge logic), **Copilot.live** (AI chat widget, bottom-right). No review app detected (no Judge.me / Yotpo / Loox).
- Tracking: Google Ads, GA4, Meta Pixel. Newsletter uses the platform-native form (no Klaviyo).
- Image lightbox: Photoswipe.

RD_COLLECTION is a custom build (not Shopify), so these are patterns to re-implement, not plugins to install.

## 2. Design tokens (verified)

- Headings: **Dosis**, always uppercase, letter-spacing `0.18em`.
- Body: **Poppins** (light, weight 300).
- Buttons: uppercase, `0.18em` letter-spacing.
- `#1C1C1C` — buttons, "EXCLUSIVE" badge, main text (near-black).
- `#E32C2B` — "SAVE NN%" sale badge and sale price (red).
- `#FFFFFF` — page/header/footer background.
- `#DDDDDD` — borders.
- `#EFEFEF` — sold-out badge background.
- `#F3F3F3` — light grey section background (text `#5C5C5C`).
- `#48517C` — navy accent section.
- **Border radius = 0** everywhere: buttons, inputs, badges all have sharp corners. This is the site's most distinctive design choice.
- Breakpoints observed: 700 / 1000 / 1150 / 1400 / 1600 px.
- Section spacing: 2.5rem mobile / 4rem desktop.

## 3. Homepage structure (verified, top to bottom)

1. Announcement bar — rotating image strip (offers, retail presence).
2. Hero slider — full-width, 4 slides (~1920×800), headline and SHOP NOW baked into the banner image, dots bottom-right.
3. Sticky header — logo left; center nav: NEW ARRIVALS, WORKWEAR (dropdown), ETHNIC SETS (dropdown), KURTA & KURTI, SAREES, DRESS MATERIAL, FUSION WEAR (dropdown), BOTTOMS, SALE; right: account, wishlist heart, search, cart icons. Dropdowns are simple ~200px white link lists (no mega menu).
4. SHOP BY CATEGORY — 8 cards in a horizontal scroll row (Suit Set, Kurta Set, Sarees, Workwear, Fusion Wear, Bottom Wear, Dress Material, Plus Size); square image + bottom-center white label; hover zoom.
5–10. Six product carousels, each with centered Dosis H2 + Poppins subheading + Prev/Next arrows + dots (festive kurta sets, sarees, new arrivals, drapes, workwear, everyday kurtas).
11. Full-width video block with custom controls.
12. Tabbed product grid — pill tabs (SUIT SET / KURTA & KURTI / FUSION WEAR / FESTIVE WEAR) + "VIEW ALL" links.
13. PRESS & MEDIA — "AS FEATURED IN" with 5 press logos.
14. Blog — 3 article cards (image + date + title + excerpt) + VIEW ALL.
15. SEO text block — H2 + collapsed paragraph with "+" expander.
16. Trust badges ×4 — MADE IN INDIA / BEST QUALITY / SECURED PAYMENT / FREE SHIPPING (icon + caps label).
17. Footer (white) — 4 columns: ABOUT (brand blurb + DISCOVER: Blog, About Us, Founder, Contact, Store Locator, Franchise, Trade); INFORMATION (Account, Privacy, Shipping, Return/Exchange Policy, Terms); NEWSLETTER (email field + SUBSCRIBE); CUSTOMER SERVICE (email + phone numbers); social icons (FB, IG, Pinterest, YT); copyright row.
18. Overlays — size-chart modal (XS–6XL, 3 measurement tables), cart drawer, AI chat widget bottom-right.

## 4. Product card anatomy (verified)

- Badge top-left: red `SAVE NN%` or black `EXCLUSIVE`.
- Portrait image 3:4, zoom on hover.
- Wishlist heart top-right (white circle).
- Below image: "Choose options" (multi-size products) / "Add to cart" (single-size, e.g. sarees).
- Title with 2-line clamp, letterspaced.
- Price row: red sale price + strikethrough regular price.
- Size pills: XS–XXL or "One Size"; carousel cards also show a "VIEW PRODUCT" link.
- No star ratings — the reference has no review system.

## 5. Product detail page (verified)

Right column order: vendor link (small caps) → title (Dosis, uppercase) → price (`RS. 3,399.00`) + "Inclusive of all taxes" → exchange note → SKU → short description → offer-ticket images (prepaid / first-purchase discounts) → `SIZE:` label + `SIZE CHART >` link → size pills XS–XXL (selected = navy background + white text) → `COLOR:` + color pill → quantity stepper → **ADD TO CART** (full-width black) → **BUY IT NOW** (outline) → wishlist heart → pincode checker (textbox + CHECK) → delivery estimate (4–6 business days) → return note → **Best Offers** (coupon codes) → 4 feature blocks (Cash on Delivery / Free Shipping / Ships in 1–2 Days / 7-Day Returns).

Left: stacked gallery of 900×1200 portrait images, vertical thumbnail rail on the left, Photoswipe lightbox on click. A sticky add-to-cart bar appears on scroll (thumbnail + title + price + button). RELATED PRODUCTS: 10-product carousel (4 visible on desktop). No breadcrumb, no reviews widget.

## 6. Collection page (verified)

- Centered H1, no banner image.
- Toolbar: left = grid-density switcher (3 sizes); center = "NNNN PRODUCTS" count; right = SORT BY dropdown (9 options: Featured, Best selling, Price low→high, high→low, A–Z, Newest, etc.).
- Left sidebar filters (collapsible): Availability, Price, Size, Color.
- Grid: 4 columns desktop, **48 products per page, numbered pagination** (no infinite scroll).
- Below grid: SEO text + "popular searches" links.

## 7. Cart drawer and checkout entry (verified)

- Right slide-in drawer with offer banner on top.
- Free-shipping progress bar with milestones: ₹750 = FREE SHIPPING · ₹1,999 = ₹200 OFF · ₹2,999 = ₹350 OFF ("Add ₹___ more to get Free Shipping").
- "Offers · Tap to view coupons" button + new-arrivals upsell card.
- Bottom: Estimated TOTAL + secure payment buttons leading to standard checkout.

## 8. Mobile patterns (verified)

- Slide-out navigation drawer (departments expandable), touch-sized controls.
- Announcement bar, sticky search, full-bleed hero.
- Product grids: 2 columns on phones.
- Touch-friendly product, cart, and checkout layouts.
- Footer stacks into a single column.

## 9. Conversion patterns worth adopting (verified as present on reference)

Offer-ticket images on PDP, coupon codes on PDP, prepaid-discount nudge, XS–6XL size chart modal, pincode delivery checker, sticky add-to-cart bar, free-shipping progress bar in cart, trust badges, press logos, SEO text blocks, blog-driven traffic.

## 10. Assumptions (not verified)

The following were NOT directly verified during the audit and are treated as assumptions:

- Exact font loading strategy and fallback stacks.
- Exact animation timings and easing curves.
- Whether the header hides on scroll-down vs. always-sticky.
- Exact server response times and caching behavior.
- Internal app configuration (e.g. exact COD fee rules in Releasit).
- Whether "Best selling" sort uses real sales data.
- Exact pincode serviceability logic behind the checker.

Where these matter, RD_COLLECTION defines its own reasonable behavior and documents it (see IMPLEMENTATION_PLAN.md).

## 11. What we will NOT copy

The reference site's written text, product photos, logo, brand name, press logos, and offer-ticket artwork. RD_COLLECTION uses original content, original/sample photography (replaceable), and its own brand identity. Layout, structure, and design values are the only things carried over.
