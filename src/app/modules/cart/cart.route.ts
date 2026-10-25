import { Router } from "express";
import checkAuth, { optionalAuth } from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import * as cartController from "./cart.controller";
import { addItemSchema, couponSchema, mergeSchema, updateItemSchema } from "./cart.validation";

const router = Router();

router.get("/", optionalAuth, cartController.getCart);
router.post("/items", optionalAuth, validateRequest(addItemSchema), cartController.addItem);
router.patch(
  "/items/:variantId",
  optionalAuth,
  validateRequest(updateItemSchema),
  cartController.updateItem,
);
router.delete("/items/:variantId", optionalAuth, cartController.removeItem);
router.delete("/", optionalAuth, cartController.clearCart);
router.post("/coupon", optionalAuth, validateRequest(couponSchema), cartController.applyCoupon);
router.post("/merge", checkAuth(), validateRequest(mergeSchema), cartController.merge);

export default router;
