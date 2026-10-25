import { Router } from "express";
import { z } from "zod";
import checkAuth from "../../middleware/checkAuth";
import { paymentLimiter } from "../../middleware/rateLimiter";
import validateRequest from "../../middleware/validateRequest";
import * as paymentController from "./payment.controller";

const router = Router();

router.post(
  "/intent/:orderId",
  paymentLimiter,
  validateRequest(z.object({ provider: z.enum(["STRIPE", "COD", "SANDBOX"]).default("STRIPE") })),
  paymentController.createIntent,
);
router.post("/sandbox/:orderId/confirm", paymentLimiter, paymentController.confirmSandbox);
router.post("/refund/:orderId", checkAuth("ADMIN", "MANAGER"), paymentController.refund);

export default router;
