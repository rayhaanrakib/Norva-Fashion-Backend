import { Router } from "express";
import checkAuth, { optionalAuth } from "../../middleware/checkAuth";
import { writeLimiter } from "../../middleware/rateLimiter";
import validateRequest from "../../middleware/validateRequest";
import * as orderController from "./order.controller";
import { checkoutSchema, statusUpdateSchema } from "./order.validation";

const router = Router();

// Customer
router.post("/checkout", writeLimiter, optionalAuth, validateRequest(checkoutSchema), orderController.checkout);
router.get("/track/:number", orderController.trackOrder);
router.get("/mine", checkAuth(), orderController.myOrders);
router.get("/mine/:id", checkAuth(), orderController.myOrder);
router.post("/mine/:id/cancel", checkAuth(), orderController.cancel);

// Admin
router.get("/", checkAuth("ADMIN", "MANAGER", "STAFF"), orderController.listOrders);
router.get("/:id", checkAuth("ADMIN", "MANAGER", "STAFF"), orderController.getOrder);
router.patch(
  "/:id/status",
  checkAuth("ADMIN", "MANAGER", "STAFF"),
  validateRequest(statusUpdateSchema),
  orderController.updateStatus,
);

export default router;
