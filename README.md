# NORVA — Backend API

> **Style Without Limits.**
> A restock-ready commerce API for the NORVA storefront — Express 5, PostgreSQL, Prisma,
> Redis, JWT auth, Stripe-ready payments and a full admin/analytics surface.

This folder is **self-contained**. It has its own `package.json`, Prisma schema, Docker
setup and deployment configs, so it can be lifted out of this repository and deployed as a
standalone service without touching a single line of code.

---

## Why it looks the way it does

The architecture follows the same discipline as
[`bidyut-backend`](https://github.com/rayhaanrakib/bidyut-backend):

| Bidyut concept                                                   | NORVA equivalent                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/app.ts` + `src/server.ts` split                             | identical — app is importable by tests/serverless             |
| `src/app/modules/<module>/{route,controller,service,validation}` | one folder per domain (auth, product, cart, order, …)         |
| `checkAuth(...roles)` middleware                                 | same signature, reloads the user from the DB on every request |
| `validateRequest(zodSchema)`                                     | same, Zod-parsed bodies replace the raw body                  |
| `sendResponse(res, code, message, data, meta)`                   | same envelope: `{ success, message, data, meta }`             |
| `AppError` + `globalErrorHandler`                                | same, plus Prisma error-code mapping                          |
| `tryCatchAsync`                                                  | same                                                          |
| Redis cache with graceful degradation                            | same — OTPs and analytics fall back to memory                 |
| Cloudinary + in-memory multer                                    | same, with a local `/uploads` fallback                        |
| Nodemailer + EJS templates                                       | same, branded `templates/*.ejs`                               |
| `prisma/seed.ts` demo accounts                                   | same — admin / manager / customer                             |
| Forward-only state machines                                      | order lifecycle (`PENDING → … → DELIVERED`) with real 409s    |

Two deliberate departures: **Prisma 6 with the standard client generator** (no generated
folder to commit) and **no Passport dependency** — Google OAuth is a hand-rolled
authorization-code flow, which removes a large dependency tree from a service that only
needs one endpoint pair.

---

## Quick start

```bash
cd backend_codes_here
cp .env.example .env          # fill in DATABASE_URL
npm install
npm run db:generate           # requires network access (downloads the Prisma engine)
npm run db:migrate            # or: npm run db:push for a scratch database
npm run db:seed               # demo catalog, orders, reviews, discount codes
npm run dev                   # http://localhost:5000
```

Or bring up the whole stack (API + Postgres + Redis) with Docker:

```bash
docker compose up --build
```

### Seeded accounts

| Role     | Email                  | Password            |
| -------- | ---------------------- | ------------------- |
| Admin    | `admin@norva.store`    | `NorvaAdmin123!`    |
| Manager  | `studio@norva.store`   | `NorvaStudio123!`   |
| Customer | `customer@norva.store` | `NorvaCustomer123!` |

Seed data also creates 6 categories, 24 products with full size × colour variant matrices,
24 demo orders across every lifecycle state, review data, four discount codes
(`NORVA10`, `STYLE20`, `FREESHIP`, `NORVA25`) and three journal stories.

> Demo data is seeded **automatically on boot** (`SEED_ON_BOOT=true` by default), so a
> fresh instance is never an empty shell — the storefront's one-click demo logins depend
> on these accounts. The seed is idempotent (upserts by slug/email, skips existing
> products, only creates orders/reviews when the table is empty) and never overwrites
> existing rows. Set `SEED_ON_BOOT=false` to disable it, e.g. on a production database
> with real data.

---

## Feature map

**Auth & security**

- Email + password with bcrypt, 6-digit OTP email verification (Redis, 10-minute TTL)
- JWT access + refresh tokens in `httpOnly` cookies, `Authorization: Bearer` supported
- Refresh-token rotation with hashed sessions — revoking on logout, password change, or reset
- Per-request DB user reload → blocked/deleted accounts lose access instantly
- Helmet, CORS allowlist (incl. sandbox preview hosts), three tiers of rate limiting
- Google OAuth (authorization-code flow) that links to an existing email or creates an account
- Role ladder: `CUSTOMER → STAFF → MANAGER → ADMIN`

**Catalog**

- Products with images, variant matrix (size × colour, per-variant SKU/price/stock)
- Faceted filtering (category, size, colour, tag, material, fit, price, in-stock) + sorting
- Facet endpoint driven by real catalog data, cached for 120s
- Related products, featured / new-arrivals / best-sellers feeds
- Archive-not-delete so historical orders stay intact

**Cart & checkout**

- Guest carts by token, merged into the customer cart on login
- Stock-limited quantities with friendly 409s ("Only 2 left of this option")
- Coupon engine: percent / fixed / free-shipping, scope (all/category/product), min spend,
  expiry windows, usage caps, per-user limits
- **Server-authoritative pricing** — subtotal, discount, shipping, tax and total are always
  recomputed server-side; the client can never send an amount
- Atomic stock decrement inside a transaction (no overselling under concurrency)

**Orders & payments**

- Forward-only lifecycle with an `OrderEvent` timeline mirroring the customer UI
- Cancellation restores inventory; delivery credits loyalty store credit
- Stripe PaymentIntents + signed raw-body webhooks, idempotent replay handling
- **Sandbox mode**: with no Stripe key, `/payments/intent` returns a deterministic secret so
  the storefront demo can complete checkout end-to-end
- Cash on delivery, refunds, public order tracking (number + email)

**Admin**

- Analytics dashboard: KPIs with period-over-period deltas, revenue series, top products,
  status mix, category performance, top customers, low-stock alerts, recent orders
- Inventory movements ledger (restock / sale / return / damage / adjustment)
- Review moderation queue, discount management, journal CMS, contact inbox, newsletter list
- Customer management with soft delete and store credit

---

## API surface

Full route listing is served live at **`GET /`** (project card) and **`GET /api/v1/docs`**.
Every response uses the same envelope:

```json
{
  "success": true,
  "message": "Products retrieved",
  "data": [],
  "meta": { "page": 1, "limit": 12, "total": 24, "totalPages": 2 }
}
```

```jsonc
// Storefront bootstrap — one round-trip for the home page
GET /api/v1/public/bootstrap

// Catalog
GET  /api/v1/products?category=women&sizes=S,M&maxPrice=150&sort=price-asc&page=1&limit=12
GET  /api/v1/products/:slug
GET  /api/v1/products/facets
GET  /api/v1/categories

// Cart (guest token or session cookie)
POST /api/v1/cart/items           { variantId, quantity, guestToken? }
POST /api/v1/cart/coupon          { code }
POST /api/v1/orders/checkout      { items, email, shippingAddress, couponCode, paymentMethod }

// Orders
GET  /api/v1/orders/mine
GET  /api/v1/orders/track/NV-XXXX?email=
PATCH /api/v1/orders/:id/status   { status, note?, trackingNumber? }   // staff

// Admin analytics
GET  /api/v1/analytics/dashboard?days=30
```

### Auth convention

`POST /api/v1/auth/login` also sets two `httpOnly` cookies (`accessToken`,
`refreshToken`). Browser clients need nothing else; server-to-server clients can send
`Authorization: Bearer <accessToken>`. The Next.js storefront can forward the cookie
directly to the API, or proxy `/api/*` through a route handler to keep cookies same-site.

---

## Structure

```
backend_codes_here/
├─ prisma/
│  ├─ schema.prisma            # 23 models, 14 enums
│  └─ seed.ts                  # idempotent demo data
├─ src/
│  ├─ app.ts                   # express app (importable, serverless-safe)
│  ├─ server.ts                # listener + graceful boot
│  ├─ app/
│  │  ├─ config/               # typed env config, single source of truth
│  │  ├─ lib/                  # prisma, cache, stripe, cloudinary, mailer, logger
│  │  ├─ middleware/           # checkAuth, validateRequest, rate limiter, error handler
│  │  ├─ modules/              # 17 domain modules (route/controller/service)
│  │  ├─ templates/            # EJS emails (shared layout)
│  │  └─ utils/                # AppError, jwt, otp, money, pagination, slug, seed
│  └─ types/express.d.ts       # req.user augmentation
├─ api/index.ts                # Vercel serverless entry
├─ Dockerfile · docker-compose.yml · render.yaml
└─ docs/API.md                 # endpoint-by-endpoint reference
```

---

## Deployment

| Target          | How                                                                             |
| --------------- | ------------------------------------------------------------------------------- |
| **Render**      | `render.yaml` — build `npm ci && npm run build`, pre-deploy `npm run db:deploy` |
| **Docker**      | `docker compose up --build` (API + Postgres + Redis)                            |
| **Vercel**      | `api/index.ts` + `vercel.json`; set `DATABASE_URL`, secrets in project env      |
| **Railway/Fly** | use `Dockerfile`; run `npm run db:deploy` as a release command                  |

**Required env:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`FRONTEND_URL`, `BACKEND_URL`.
**Optional (degrades gracefully):** Redis, SMTP, Cloudinary, Stripe, Google OAuth.

Point the storefront at it with a single variable:

```bash
# frontend .env.local
NEXT_PUBLIC_API_URL=https://norva-backend.onrender.com/api/v1
```

---

## Scripts

```bash
npm run dev          # tsx watch
npm run build        # prisma generate + tsup bundle → dist/
npm start            # node dist/server.js
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:deploy    # prisma migrate deploy (production)
npm run db:seed      # tsx prisma/seed.ts
npm run typecheck    # tsc --noEmit
npm run lint         # biome check
```

---

## Notes

- `prisma generate` and all Prisma CLI commands need outbound access to
  `binaries.prisma.sh`. In a sandbox without it the client stays a stub and `tsc` reports
  missing Prisma types — nothing else in the codebase depends on that step.
- Money is stored as `Decimal(10,2)` and converted at the edges; the UI never does
  arithmetic on strings.
- Every write that touches stock happens inside `prisma.$transaction` with a conditional
  `updateMany`, so two concurrent checkouts cannot both take the last unit.
