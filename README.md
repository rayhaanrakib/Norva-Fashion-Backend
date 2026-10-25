# NORVA — Backend API

A restock-ready commerce API for the NORVA storefront — Express 5, PostgreSQL, Prisma, Redis, JWT auth, Stripe-ready payments and a full admin/analytics surface. Prisma schema, Docker setup and deployment configs.

---

## Tech Stack

| Layer       | Choice                                                        |
| ----------- | ------------------------------------------------------------- |
| Runtime     | Node.js, TypeScript strict                                    |
| Framework   | Express 5                                                     |
| Database    | PostgreSQL + Prisma 6 (23 models, 14 enums)                   |
| Cache       | Redis (memory fallback)                                       |
| Auth        | JWT access + refresh rotation, OTP email, Google OAuth        |
| Payments    | Stripe PaymentIntents + webhooks (sandbox mode built-in)      |
| Validation  | Zod                                                           |
| Files       | Cloudinary (local `/uploads` fallback)                        |
| Email       | Nodemailer + EJS templates                                    |
| Lint/Build  | Biome · tsup                                                  |

---

## Feature Highlights

- **Auth** — bcrypt, 6-digit OTP, refresh-token rotation, per-request DB reload, role ladder (`CUSTOMER → STAFF → MANAGER → ADMIN`), Google OAuth.
- **Catalog** — variant matrix (size × colour, per-variant SKU/price/stock), faceted filtering, archive-not-delete.
- **Cart & checkout** — guest→account merge, stock-limited quantities, coupon engine, **server-authoritative pricing**, atomic stock decrement.
- **Orders** — forward-only lifecycle with event timeline, cancellation restores inventory, public tracking, refunds.
- **Payments** — Stripe + sandbox mode (deterministic secret, no key needed), cash on delivery, idempotent webhooks.
- **Admin** — analytics dashboard with period deltas, inventory ledger, review moderation, discount management, journal CMS, newsletter.
- **Security** — Helmet, CORS allowlist, three-tier rate limiting, `httpOnly` cookies.

---

## Scripts

```bash
npm run dev          # tsx watch
npm run build        # prisma generate + tsup bundle
npm start            # node dist/server.js
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:deploy    # prisma migrate deploy (production)
npm run db:seed      # tsx prisma/seed.ts
npm run typecheck    # tsc --noEmit
npm run lint         # biome check