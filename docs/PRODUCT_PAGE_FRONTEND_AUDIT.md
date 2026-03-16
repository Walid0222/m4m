# Product Page Frontend Audit

**Scope:** Product detail page and related components.  
**Constraints:** No backend or API changes; only add/change UI for data already returned by the API.

---

## 1. API response shape (what the backend actually returns)

### `GET /products/{id}` (ProductController::show)

**Product** (after `hideAnalyticsFromProduct` / `hideAnalyticsForBuyers`):

- **Returned:** `id`, `user_id`, `offer_type_id`, `name`, `slug`, `description`, `price`, `stock`, `images`, `status`, `is_flash_deal`, `flash_price`, `flash_start`, `flash_end`, `delivery_time`, `delivery_type`, `delivery_content`, `seller_reminder`, `delivery_instructions`, `features`, `is_pinned`, `is_flash_active`, `effective_price`, `created_at`, `updated_at`, and relations: `seller`, `reviews` (with `reviewer`), `faqs`.
- **Hidden for buyers:** `views`, `views_last_3_days`, `orders_last_3_days`, `activity_reset_at`, `completed_orders_count`, `orders_count`. So **product-level sales/counts are not present** in this response.

**Seller** (loaded with select):

- **Returned:** `id`, `name`, `avatar`, `updated_at`, `is_verified_seller`, `last_activity_at`, `created_at`, `vacation_mode`.
- **Appends on User model:** `seller_level`, `member_since` (so these are in the response).
- **Not loaded in this endpoint:** `completed_sales`, `success_rate` are not in the seller select and are not appends on `User`; they live on seller stats. So **seller completed_sales and success_rate are not present** in the product-detail response.

**Reviews / FAQs:**

- **Returned:** `reviews` (each with `reviewer:id,name`), `faqs`.

---

## 2. Frontend usage vs API

| Data | In API (show)? | Used in UI? | Notes |
|------|----------------|-------------|--------|
| product.name | ✅ | ✅ | Title |
| product.price / effective_price | ✅ | ✅ | Price, flash |
| product.stock | ✅ | ✅ | Stock label |
| product.delivery_time | ✅ | ✅ | Shown near stock / delivery |
| product.delivery_type | ✅ | ✅ | Instant vs manual |
| product.completed_orders_count | ❌ (hidden) | ✅ (fallback) | Frontend uses `product.sales` as fallback; neither is in response → effectively 0/missing |
| product.sales | ❌ | ✅ (fallback) | Not in response |
| product.features | ✅ | ✅ | Feature chips |
| product.delivery_instructions | ✅ | ✅ | In delivery section |
| product.faqs | ✅ | ✅ | FAQ accordion |
| product.reviews | ✅ | ✅ | Reviews list + count/avg computed client-side |
| product.reviews_count | ❌ | ✅ (fallback) | Frontend uses `reviews.length` when missing → OK |
| product.reviews_avg_rating | ❌ | ✅ (fallback) | Frontend computes from `reviews` → OK |
| product.seller_reminder | ✅ | ✅ | Shown when present |
| product.created_at | ✅ | ❌ | Not displayed |
| product.slug | ✅ | ❌ | Not displayed (could be used in meta/canonical) |
| seller.name, avatar, id | ✅ | ✅ | Seller card / link |
| seller.seller_level | ✅ | ✅ | Badge/level |
| seller.success_rate | ❌ | ✅ (fallback) | Not in response → 0/missing |
| seller.completed_sales | ❌ | ✅ (fallback) | Not in response → 0/missing |
| seller.last_activity_at | ✅ | ✅ | “Last seen” / online |
| seller.vacation_mode | ✅ | ✅ | Banner |
| seller.is_verified_seller | ✅ | ✅ | Verified badge |
| seller.member_since / created_at | ✅ | ✅ | “Member since” |

---

## 3. Unused-but-returned fields (recommended UI additions)

Only fields that **are** in the API are suggested below.

### 3.1 Product “Listed” date

- **Field:** `product.created_at`
- **Placement:** Under the main title or near the price block (e.g. small muted text).
- **Suggestion:** e.g. “Listed on March 2025” (or full date) to add trust/recency.

**Example (ProductPage.jsx, near price/title area):**

```jsx
{product.created_at && (
  <p className="text-xs text-gray-500 mt-1">
    Listed {new Date(product.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
  </p>
)}
```

Use wherever the design has a small “meta” line (e.g. after the stock/delivery row).

---

### 3.2 Product slug (SEO / canonical)

- **Field:** `product.slug`
- **Placement:** Not visible text; use in `<meta>`, canonical link, or structured data if you have a product schema. No change to visible layout required.

---

## 4. Fields the frontend uses but API does not send (no backend change)

These are **not** in the product-detail response; the frontend already has fallbacks. No backend changes requested; only note for product/design:

- **product.completed_orders_count / product.sales:** Hidden or not loaded in `show()`. “X sold” may show 0 or be omitted when value is missing. Optional: hide “X sold” when value is 0 or undefined to avoid “0 sold”.
- **seller.completed_sales:** Not in seller payload for this endpoint. Seller “X sales” badge may show 0.
- **seller.success_rate:** Not in seller payload. Success rate line may show nothing or 0.

If you later add these to the API, the existing UI will start showing them without further frontend changes.

---

## 5. Emoji → icon replacements (done)

- **ProductPage.jsx**
  - “⭐ Best price” → `<Star className="w-3.5 h-3.5 fill-current" />` + “Best price”.
  - “🏖️” (vacation banner) → `<Sun className="w-6 h-6 text-amber-700 shrink-0" />`.
  - “✕ Out of stock” / “✓ X in stock” → `<X />` and `<CheckCircle2 />` with same copy.

Other emojis in ProductPage, ProductCard, and SellerBadges were already replaced with lucide-react icons in a previous pass.

---

## 6. Summary

- **API:** Product detail returns full product (minus hidden analytics), seller (with `seller_level`, `member_since`), reviews, faqs. It does **not** return product `completed_orders_count`/sales or seller `completed_sales`/`success_rate`.
- **Unused but returned:** `product.created_at` (recommend showing as “Listed on …”), `product.slug` (use in meta/canonical only).
- **Used but not returned:** Sales counts and seller success rate; frontend handles with fallbacks; optionally hide “X sold” / success rate when value is missing.
- **Icons:** Remaining emojis in ProductPage replaced with lucide-react (Star, Sun, X, CheckCircle2); no layout or behavior changes beyond that.

All recommendations are frontend-only; no backend or API response changes.
