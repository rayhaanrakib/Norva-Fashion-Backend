# NORVA API — endpoint reference

Base URL: `/api/v1` · All responses: `{ success, message, data?, meta? }`

Auth: `accessToken` / `refreshToken` cookies **or** `Authorization: Bearer <token>`.
Roles: `CUSTOMER` · `STAFF` · `MANAGER` · `ADMIN`.

Pagination params on list endpoints: `page` (≥1), `limit` (≤100). `meta` returns
`{ page, limit, total, totalPages }`.

---

## Auth — `/auth`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/register` | public | Sends a 6-digit OTP. In non-production the code is echoed as `devCode`. |
| POST | `/verify-otp` | public | `{ email, code }` → sets cookies, returns user |
| POST | `/login` | public | Sets cookies, rotates a refresh session |
| POST | `/refresh` | cookie | Rotates refresh token, revokes the old session |
| POST | `/logout` | public | Revokes session + clears cookies |
| GET | `/me` | auth | Current user + `{ orders, wishlist }` counts |
| POST | `/forgot-password` | public | Always 200 (never reveals registered emails) |
| POST | `/reset-password` | public | `{ email, code, password }`, revokes all sessions |
| GET | `/google` | public | Redirects to Google consent |
| GET | `/google/callback` | public | Redirects to storefront with cookies set |
| POST | `/google` | public | SPA variant: `{ code }` → JSON tokens |

## Users — `/users`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET/PATCH | `/me` | auth | Profile read/update |
| POST | `/me/avatar` | auth | `multipart/form-data` field `image` |
| PATCH | `/me/password` | auth | `{ currentPassword, newPassword }` |
| GET/POST | `/me/addresses` | auth | Address book; first address becomes default |
| PATCH/DELETE | `/me/addresses/:id` | auth | Promoting a default demotes the rest |
| GET | `/` | ADMIN, MANAGER | `?search&role&status`, includes order counts |
| GET | `/ :id` | ADMIN, MANAGER | User + addresses + last 10 orders |
| PATCH | `/:id` | ADMIN | `{ role?, status?, storeCredit? }` (cannot demote self) |
| DELETE | `/:id` | ADMIN | Soft delete, anonymises the email |

## Categories — `/categories`

| Method | Path | Access |
| --- | --- | --- |
| GET | `/` | public (active only) |
| GET | `/admin/all` | staff |
| GET | `/:slug` | public (includes children + product counts) |
| POST | `/` | ADMIN, MANAGER |
| PATCH | `/:id` | ADMIN, MANAGER |
| DELETE | `/:id` | ADMIN, MANAGER — 409 if products still reference it |

## Products — `/products`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/` | public | `search, category, categories, sizes, colors, tags, material, fit, minPrice, maxPrice, inStock, sort, page, limit` |
| GET | `/facets` | public | Distinct sizes/colours/materials/fits/tags + price range (cached 120s) |
| GET | `/search?q=` | public | Lightweight result shape for the search overlay |
| GET | `/featured` | public | `?limit` |
| GET | `/new-arrivals` | public | `?limit` |
| GET | `/best-sellers` | public | `?limit` |
| GET | `/id/:id/related` | public | Same category or ±40% price band |
| GET | `/:slug` | public | Includes reviews + rating distribution |
| GET | `/admin/all` | staff | Includes drafts/archived |
| POST | `/` | ADMIN, MANAGER | Creates images + variant matrix + opening stock movements |
| PATCH | `/:id` | ADMIN, MANAGER | Variants upserted by (size, colour); removed ones are deactivated |
| PATCH | `/:id/status` | ADMIN, MANAGER | `DRAFT \| ACTIVE \| ARCHIVED` |
| DELETE | `/:id` | ADMIN | Archives (history preserved) |

`sort`: `featured` (default) · `newest` · `price-asc` · `price-desc` · `rating` · `bestselling`

## Inventory — `/inventory`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/` | staff | Totals + low/out-of-stock alerts |
| GET | `/movements` | staff | Ledger of every stock change |
| POST | `/adjust` | staff | `{ variantId, delta, reason, note? }` — rejects negative stock |
| PATCH | `/variants/:variantId/threshold` | ADMIN, MANAGER | Low-stock threshold |

## Cart — `/cart`

Guest carts are addressed with `guestToken` (body or query). Signed-in users use cookies.

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/` | optional auth | Returns cart + full pricing breakdown |
| POST | `/items` | optional auth | `{ variantId, quantity, guestToken? }` — stock-checked |
| PATCH | `/items/:variantId` | optional auth | `{ quantity }` (0 removes) |
| DELETE | `/items/:variantId` | optional auth | |
| DELETE | `/` | optional auth | Clear |
| POST | `/coupon` | optional auth | `{ code }` — 400 with the reason when invalid |
| POST | `/merge` | auth | `{ guestToken }` — folds a guest cart into the account |

**Pricing payload**

```json
{
  "lines": [{ "variantId": "…", "unitPrice": 96, "quantity": 2, "lineTotal": 192, "stock": 4 }],
  "subtotal": 192, "discountTotal": 19.2, "shippingTotal": 0, "taxTotal": 8.64,
  "grandTotal": 181.44, "itemCount": 2,
  "freeShippingRemaining": 0, "freeShippingThreshold": 100,
  "coupon": { "code": "NORVA10", "valid": true, "type": "PERCENT", "value": 10 }
}
```

## Wishlist — `/wishlist`

| Method | Path | Access |
| --- | --- | --- |
| GET | `/` | auth — products included |
| POST | `/` | auth — `{ productId }` (idempotent upsert) |
| DELETE | `/:productId` | auth |
| POST | `/:productId/move-to-cart` | auth — picks the first in-stock variant |

## Orders — `/orders`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/checkout` | optional auth | `items` **or** `fromCart`, + email, address, coupon, payment method |
| GET | `/track/:number?email=` | public | Number + email as capability |
| GET | `/mine` | auth | `?status&page&limit` |
| GET | `/mine/:id` | auth | By id or number |
| POST | `/mine/:id/cancel` | auth | Allowed while PENDING/CONFIRMED |
| GET | `/` | staff | `?status&search&from&to` |
| GET | `/:id` | staff | Full order incl. events |
| PATCH | `/:id/status` | staff | Forward-only; 409 on illegal transitions |

Lifecycle: `PENDING → CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED`,
plus `CANCELLED` (restores stock) and `REFUNDED`.

## Payments — `/payments`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/intent/:orderId` | public | `{ provider: STRIPE \| COD \| SANDBOX }` — returns `clientSecret` |
| POST | `/sandbox/:orderId/confirm` | public | Demo-only confirmation, marks paid |
| POST | `/refund/:orderId` | ADMIN, MANAGER | Stripe refund when configured |
| POST | `/webhook` | Stripe | Raw body + signature verified; idempotent |

## Discounts — `/discounts`

| Method | Path | Access |
| --- | --- | --- |
| POST | `/validate` | public — `{ code, subtotal }` |
| GET | `/public` | public — live offers for banners |
| GET | `/` | ADMIN, MANAGER — with usage counts |
| POST | `/` | ADMIN, MANAGER |
| PATCH | `/:id` | ADMIN, MANAGER |
| DELETE | `/:id` | ADMIN — deactivates |

## Reviews — `/reviews`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/product/:productId` | public | Approved only |
| POST | `/` | optional auth | Goes to moderation; verified-purchase detected from order history |
| POST | `/:id/helpful` | public | Increments counter |
| GET | `/mine` | auth | |
| GET | `/` | staff | `?status=PENDING` moderation queue |
| PATCH | `/:id` | ADMIN, MANAGER | Approve/reject → product rating recalculated |
| DELETE | `/:id` | ADMIN | |

## Journal — `/journal`

`GET /` (published) · `GET /:slug` · `GET /admin/all` (staff) · `POST /` · `PATCH /:id` ·
`DELETE /:id`

## Growth — `/newsletter` · `/contact`

| Method | Path | Access |
| --- | --- | --- |
| POST | `/newsletter/subscribe` | public — idempotent upsert |
| GET | `/newsletter` | ADMIN, MANAGER |
| POST | `/contact` | public — sends a receipt email |
| GET | `/contact` | staff — `?status` |
| PATCH | `/contact/:id` | staff — status / reply |

## Analytics — `/analytics`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/dashboard?days=30` | staff | Combined payload (cached 60s) |
| GET | `/summary?days=30` | staff | KPIs + period-over-period deltas |
| GET | `/revenue?days=30` | staff | Daily buckets, gaps zero-filled |
| GET | `/products` | staff | Top products by revenue |
| GET | `/me` | CUSTOMER | Order count, lifetime spend, wishlist size |

## Upload — `/upload`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/image` | staff | Field `image`, ≤4 MB. Cloudinary, or `/uploads/*` locally |

## Public — `/public`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/bootstrap` | Brand block, commerce config, categories, featured, newest, offers, journal |
| GET | `/store-status` | Open flag, free-shipping message, payment methods |

## Health

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Project card: stack, environment, request echo |
| GET | `/health` | 200 with `database: "up"`, 503 when Postgres is unreachable |
| GET | `/api/v1/docs` | Machine-readable route listing |
