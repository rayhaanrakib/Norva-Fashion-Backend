import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import config from "./app/config";
import { initializeServices } from "./app/lib/initServices";
import globalErrorHandler from "./app/middleware/globalErrorHandler";
import notFound from "./app/middleware/notFound";
import analyticsRoutes from "./app/modules/analytics/analytics.route";
import authRoutes from "./app/modules/auth/auth.route";
import cartRoutes from "./app/modules/cart/cart.route";
import categoryRoutes from "./app/modules/category/category.route";
import contactRoutes from "./app/modules/contact/contact.route";
import discountRoutes from "./app/modules/discount/discount.route";
import inventoryRoutes from "./app/modules/inventory/inventory.route";
import journalRoutes from "./app/modules/journal/journal.route";
import newsletterRoutes from "./app/modules/newsletter/newsletter.route";
import orderRoutes from "./app/modules/order/order.route";
import paymentRoutes from "./app/modules/payment/payment.route";
import productRoutes from "./app/modules/product/product.route";
import publicRoutes from "./app/modules/public/public.route";
import reviewRoutes from "./app/modules/review/review.route";
import uploadRoutes from "./app/modules/upload/upload.route";
import userRoutes from "./app/modules/user/user.route";
import wishlistRoutes from "./app/modules/wishlist/wishlist.route";
import { sendResponse } from "./app/utils/sendResponse";

const app: Application = express();

// Behind a proxy (Vercel/Render) so rate limiting sees real client IPs.
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin/server-to-server calls (no Origin header) and any
      // configured storefront origin — including sandbox preview hosts.
      if (!origin) return callback(null, true);
      const allowed = config.server.frontendUrls.some(
        (url) => origin === url || origin.endsWith(".e2b.app") || origin.startsWith("http://localhost"),
      );
      return callback(null, allowed);
    },
    credentials: true,
  }),
);

app.use(cookieParser());

// Stripe webhooks need the raw body for signature verification.
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Uploaded files written by the local (no-Cloudinary) storage adapter.
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads"), { maxAge: "7d" }));

// Lazily connect datastores on the first request (serverless-friendly).
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await initializeServices();
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the NORVA backend ✦",
    project: {
      name: "NORVA",
      tagline: "Style Without Limits",
      description: "A modern destination for fashion and everyday essentials.",
      type: "REST API",
      version: "1.0.0",
      environment: config.server.nodeEnv,
    },
    server: {
      status: "online",
      framework: "Express.js",
      runtime: "Node.js",
      language: "TypeScript",
      database: "PostgreSQL",
      orm: "Prisma",
      cache: "Redis",
      authentication: "JWT (httpOnly cookies + Bearer)",
      validation: "Zod",
      payments: "Stripe + Cash on Delivery",
    },
    api: { version: "v1", base: "/api/v1", health: "/health", docs: "/api/v1/docs" },
    request: {
      method: req.method,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/health", async (_req, res) => {
  let database = "down";
  try {
    const { prisma } = await import("./app/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }
  res.status(database === "up" ? 200 : 503).json({
    success: database === "up",
    message: database === "up" ? "NORVA API is healthy" : "Database unreachable",
    uptime: Math.round(process.uptime()),
    database,
    environment: config.server.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1/docs", (_req, res) => {
  const routes: Record<string, string[]> = {
    auth: [
      "POST /api/v1/auth/register",
      "POST /api/v1/auth/verify-otp",
      "POST /api/v1/auth/login",
      "POST /api/v1/auth/refresh",
      "POST /api/v1/auth/logout",
      "GET  /api/v1/auth/me",
      "POST /api/v1/auth/forgot-password",
      "POST /api/v1/auth/reset-password",
      "GET  /api/v1/auth/google",
      "GET  /api/v1/auth/google/callback",
    ],
    catalog: [
      "GET  /api/v1/products",
      "GET  /api/v1/products/facets",
      "GET  /api/v1/products/search?q=",
      "GET  /api/v1/products/featured",
      "GET  /api/v1/products/new-arrivals",
      "GET  /api/v1/products/best-sellers",
      "GET  /api/v1/products/:slug",
      "GET  /api/v1/categories",
      "GET  /api/v1/categories/:slug",
      "GET  /api/v1/products/id/:id/related",
    ],
    commerce: [
      "GET    /api/v1/cart",
      "POST   /api/v1/cart/items",
      "PATCH  /api/v1/cart/items/:variantId",
      "DELETE /api/v1/cart/items/:variantId",
      "POST   /api/v1/cart/coupon",
      "POST   /api/v1/cart/merge",
      "POST   /api/v1/orders/checkout",
      "GET    /api/v1/orders/mine",
      "GET    /api/v1/orders/track/:number?email=",
      "POST   /api/v1/orders/mine/:id/cancel",
      "POST   /api/v1/payments/intent/:orderId",
      "POST   /api/v1/payments/webhook",
    ],
    account: [
      "GET   /api/v1/users/me",
      "PATCH /api/v1/users/me",
      "POST  /api/v1/users/me/avatar",
      "PATCH /api/v1/users/me/password",
      "GET   /api/v1/users/me/addresses",
      "POST  /api/v1/users/me/addresses",
      "GET   /api/v1/wishlist",
      "POST  /api/v1/wishlist",
      "GET   /api/v1/reviews/mine",
      "GET   /api/v1/analytics/me",
    ],
    admin: [
      "GET   /api/v1/analytics/dashboard",
      "GET   /api/v1/products/admin/all",
      "POST  /api/v1/products",
      "PATCH /api/v1/products/:id",
      "GET   /api/v1/inventory",
      "POST  /api/v1/inventory/adjust",
      "GET   /api/v1/orders",
      "PATCH /api/v1/orders/:id/status",
      "GET   /api/v1/users",
      "GET   /api/v1/reviews?status=PENDING",
      "GET   /api/v1/discounts",
      "GET   /api/v1/newsletter",
      "GET   /api/v1/contact",
      "POST  /api/v1/upload/image",
    ],
    public: ["GET /api/v1/public/bootstrap", "GET /api/v1/public/store-status", "GET /api/v1/discounts/public"],
  };

  sendResponse(res, 200, "NORVA API v1", {
    brand: "NORVA",
    tagline: "Style Without Limits",
    conventions: {
      success: { success: true, message: "…", data: {}, meta: {} },
      error: { success: false, message: "…" },
      auth: "httpOnly cookies (accessToken, refreshToken) or Authorization: Bearer <token>",
      pagination: "?page=1&limit=12 → meta: { page, limit, total, totalPages }",
    },
    routes,
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/discounts", discountRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/journal", journalRoutes);
app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/public", publicRoutes);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
