import { Router } from "express";
import { z } from "zod";
import checkAuth from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../utils/activity";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import { productInclude } from "../product/product.service";

const router = Router();

router.use(checkAuth());

router.get(
  "/",
  tryCatchAsync(async (req, res) => {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { product: { include: productInclude } },
    });
    sendResponse(res, 200, "Wishlist", items);
  }),
);

router.post(
  "/",
  validateRequest(z.object({ productId: z.string().uuid() })),
  tryCatchAsync(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.body.productId } });
    if (!product) throw new AppError(404, "Product not found");

    const item = await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user!.id, productId: req.body.productId } },
      update: {},
      create: { userId: req.user!.id, productId: req.body.productId },
      include: { product: { include: productInclude } },
    });
    sendResponse(res, 201, "Saved to wishlist", item);
  }),
);

router.delete(
  "/:productId",
  tryCatchAsync(async (req, res) => {
    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user!.id, productId: String(req.params.productId) },
    });
    sendResponse(res, 200, "Removed from wishlist");
  }),
);

router.post(
  "/:productId/move-to-cart",
  tryCatchAsync(async (req, res) => {
    const item = await prisma.wishlistItem.findFirst({
      where: { userId: req.user!.id, productId: String(req.params.productId) },
      include: { product: { include: { variants: true } } },
    });
    if (!item) throw new AppError(404, "That product isn't in your wishlist");

    const variant = item.product.variants.find((v) => v.stock > 0 && v.isActive);
    if (!variant) throw new AppError(409, "This product is out of stock");

    const cart = await prisma.cart.findFirst({ where: { userId: req.user!.id } });
    const target =
      cart ?? (await prisma.cart.create({ data: { userId: req.user!.id } }));

    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: target.id, variantId: variant.id } },
      update: { quantity: { increment: 1 } },
      create: {
        cartId: target.id,
        productId: item.productId,
        variantId: variant.id,
        quantity: 1,
      },
    });

    await prisma.wishlistItem.delete({ where: { id: item.id } });
    await logActivity("WISHLIST_MOVED_TO_CART", "Product", item.productId, req.user!.id);
    sendResponse(res, 200, "Moved to cart", { variantId: variant.id, cartId: target.id });
  }),
);

export default router;
