import { Router } from "express";
import { z } from "zod";
import checkAuth, { optionalAuth } from "../../middleware/checkAuth";
import { writeLimiter } from "../../middleware/rateLimiter";
import validateRequest from "../../middleware/validateRequest";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../utils/activity";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import { recalculateRating } from "../product/product.service";

const router = Router();

const createSchema = z.object({
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10, "Tell us a little more").max(2000),
  customerName: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
});

const moderateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

/** Verified purchase = a delivered/paid order by this customer contains the product. */
async function hasPurchased(userId: string, productId: string) {
  const count = await prisma.orderItem.count({
    where: {
      productId,
      order: { userId, status: { in: ["DELIVERED", "SHIPPED", "OUT_FOR_DELIVERY", "PROCESSING"] } },
    },
  });
  return count > 0;
}

router.get(
  "/product/:productId",
  tryCatchAsync(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { productId: String(req.params.productId), status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        customerName: true,
        verifiedPurchase: true,
        helpfulCount: true,
        createdAt: true,
      },
    });
    sendResponse(res, 200, "Reviews", reviews);
  }),
);

router.post(
  "/",
  writeLimiter,
  optionalAuth,
  validateRequest(createSchema),
  tryCatchAsync(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.body.productId } });
    if (!product) throw new AppError(404, "Product not found");

    const existing = req.user
      ? await prisma.review.findFirst({
          where: { productId: req.body.productId, userId: req.user.id },
        })
      : null;
    if (existing) throw new AppError(409, "You've already reviewed this product");

    const review = await prisma.review.create({
      data: {
        productId: req.body.productId,
        userId: req.user?.id,
        orderId: undefined,
        rating: req.body.rating,
        title: req.body.title ?? "",
        body: req.body.body,
        customerName: req.user?.name ?? req.body.customerName ?? "NORVA customer",
        email: req.user?.email ?? req.body.email ?? "",
        status: "PENDING",
        verifiedPurchase: req.user ? await hasPurchased(req.user.id, req.body.productId) : false,
      },
    });

    sendResponse(res, 201, "Thanks — your review is awaiting moderation", review);
  }),
);

router.post(
  "/:id/helpful",
  tryCatchAsync(async (req, res) => {
    const review = await prisma.review.update({
      where: { id: String(req.params.id) },
      data: { helpfulCount: { increment: 1 } },
      select: { id: true, helpfulCount: true },
    });
    sendResponse(res, 200, "Marked helpful", review);
  }),
);

router.get(
  "/mine",
  checkAuth(),
  tryCatchAsync(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, slug: true } } },
    });
    sendResponse(res, 200, "Your reviews", reviews);
  }),
);

// ---- Admin moderation ----
router.get(
  "/",
  checkAuth("ADMIN", "MANAGER", "STAFF"),
  tryCatchAsync(async (req, res) => {
    const status = String(req.query.status ?? "PENDING");
    const reviews = await prisma.review.findMany({
      where: { status: status as "PENDING" | "APPROVED" | "REJECTED" },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, slug: true } } },
    });
    sendResponse(res, 200, "Reviews", reviews);
  }),
);

router.patch(
  "/:id",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(moderateSchema),
  tryCatchAsync(async (req, res) => {
    const review = await prisma.review.update({
      where: { id: String(req.params.id) },
      data: {
        status: req.body.status,
        moderatedById: req.user!.id,
        moderatedAt: new Date(),
      },
    });
    await recalculateRating(review.productId);
    await logActivity("REVIEW_MODERATED", "Review", review.id, req.user!.id, {
      status: req.body.status,
    });
    sendResponse(res, 200, `Review ${req.body.status.toLowerCase()}`, review);
  }),
);

router.delete(
  "/:id",
  checkAuth("ADMIN"),
  tryCatchAsync(async (req, res) => {
    const review = await prisma.review.delete({ where: { id: String(req.params.id) } });
    await recalculateRating(review.productId);
    sendResponse(res, 200, "Review deleted");
  }),
);

export default router;
