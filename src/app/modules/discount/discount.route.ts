import { Router } from "express";
import { z } from "zod";
import checkAuth, { optionalAuth } from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../utils/activity";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";

const router = Router();

const discountSchema = z.object({
  code: z.string().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
  description: z.string().max(160).optional(),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0).default(0),
  minOrder: z.coerce.number().min(0).default(0),
  scope: z.enum(["ALL", "CATEGORY", "PRODUCT"]).default("ALL"),
  categoryId: z.string().uuid().nullable().optional(),
  productIds: z.array(z.string().uuid()).max(200).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  maxUses: z.coerce.number().int().min(1).max(1_000_000).nullable().optional(),
  perUserLimit: z.coerce.number().int().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

/** Public: validate a code against a live subtotal before applying it. */
router.post(
  "/validate",
  optionalAuth,
  validateRequest(z.object({ code: z.string().min(2).max(40), subtotal: z.coerce.number().min(0).default(0) })),
  tryCatchAsync(async (req, res) => {
    const discount = await prisma.discount.findUnique({
      where: { code: String(req.body.code).toUpperCase() },
    });
    if (!discount || !discount.isActive) throw new AppError(404, "That code doesn't exist");

    const now = new Date();
    if (discount.startsAt > now) throw new AppError(400, "This code isn't live yet");
    if (discount.endsAt && discount.endsAt < now) throw new AppError(400, "This code has expired");
    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      throw new AppError(400, "This code has been fully redeemed");
    }
    if (Number(req.body.subtotal) < Number(discount.minOrder)) {
      throw new AppError(400, `Spend at least ${Number(discount.minOrder)} to use this code`);
    }

    sendResponse(res, 200, "Code is valid", {
      code: discount.code,
      description: discount.description,
      type: discount.type,
      value: Number(discount.value),
    });
  }),
);

router.get(
  "/public",
  tryCatchAsync(async (_req, res) => {
    const now = new Date();
    const discounts = await prisma.discount.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      select: { code: true, description: true, type: true, value: true, minOrder: true, endsAt: true },
      take: 8,
      orderBy: { createdAt: "desc" },
    });
    sendResponse(res, 200, "Live offers", discounts);
  }),
);

// ---- Admin ----
router.get(
  "/",
  checkAuth("ADMIN", "MANAGER"),
  tryCatchAsync(async (_req, res) => {
    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true, products: true } }, category: true },
    });
    sendResponse(res, 200, "Discounts", discounts);
  }),
);

router.post(
  "/",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(discountSchema),
  tryCatchAsync(async (req, res) => {
    const { productIds, ...body } = req.body;
    const discount = await prisma.discount.create({
      data: {
        ...body,
        code: body.code.toUpperCase(),
        ...(productIds ? { products: { connect: productIds.map((id: string) => ({ id })) } } : {}),
      },
      include: { products: true },
    });
    await logActivity("DISCOUNT_CREATED", "Discount", discount.id, req.user?.id, {
      code: discount.code,
    });
    sendResponse(res, 201, "Discount created", discount);
  }),
);

router.patch(
  "/:id",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(discountSchema.partial()),
  tryCatchAsync(async (req, res) => {
    const { productIds, ...body } = req.body;
    const discount = await prisma.discount.update({
      where: { id: String(req.params.id) },
      data: {
        ...body,
        ...(body.code ? { code: body.code.toUpperCase() } : {}),
        ...(productIds ? { products: { set: productIds.map((id: string) => ({ id })) } } : {}),
      },
    });
    sendResponse(res, 200, "Discount updated", discount);
  }),
);

router.delete(
  "/:id",
  checkAuth("ADMIN"),
  tryCatchAsync(async (req, res) => {
    await prisma.discount.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
    });
    sendResponse(res, 200, "Discount deactivated");
  }),
);

export default router;
