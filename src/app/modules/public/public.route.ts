import { Router } from "express";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import { productInclude } from "../product/product.service";

const router = Router();

/** Storefront bootstrap: everything the shell needs in one round-trip. */
router.get(
  "/bootstrap",
  tryCatchAsync(async (_req, res) => {
    const [categories, featured, newest, offers, journal] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { position: "asc" },
        include: { _count: { select: { products: true } } },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE", featured: true },
        take: 8,
        orderBy: { soldCount: "desc" },
        include: productInclude,
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        take: 8,
        orderBy: { createdAt: "desc" },
        include: productInclude,
      }),
      prisma.discount.findMany({
        where: { isActive: true },
        take: 6,
        select: { code: true, description: true, type: true, value: true, minOrder: true },
      }),
      prisma.journalPost.findMany({
        where: { status: "PUBLISHED" },
        take: 3,
        orderBy: { publishedAt: "desc" },
        select: { title: true, slug: true, excerpt: true, coverImage: true, category: true, readTime: true },
      }),
    ]);

    sendResponse(res, 200, "Storefront bootstrap", {
      brand: {
        name: "NORVA",
        tagline: "Style Without Limits",
        positioning: "A modern destination for fashion and everyday essentials.",
      },
      config: {
        currency: config.commerce.currency,
        freeShippingThreshold: config.commerce.freeShippingThreshold,
        shippingFee: config.commerce.shippingFee,
        taxRate: config.commerce.taxRate,
      },
      categories,
      featured,
      newest,
      offers,
      journal,
    });
  }),
);

router.get(
  "/store-status",
  tryCatchAsync(async (_req, res) => {
    sendResponse(res, 200, "Store status", {
      open: true,
      message: "Free standard shipping on orders over $100",
      currency: config.commerce.currency,
      payments: ["STRIPE", "COD"],
    });
  }),
);

export default router;
