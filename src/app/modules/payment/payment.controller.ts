import type { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import * as paymentService from "./payment.service";

export const createIntent = tryCatchAsync(async (req: Request, res: Response) => {
  const intent = await paymentService.createIntent(String(req.params.orderId), req.body.provider);
  sendResponse(res, 201, "Payment intent created", intent);
});

export const confirmSandbox = tryCatchAsync(async (req: Request, res: Response) => {
  const order = await paymentService.confirmSandbox(String(req.params.orderId));
  sendResponse(res, 200, "Sandbox payment confirmed", order);
});

export const refund = tryCatchAsync(async (req: Request, res: Response) => {
  const order = await paymentService.refund(String(req.params.orderId), req.user!.id);
  sendResponse(res, 200, "Refund issued", order);
});

/** Stripe calls this endpoint directly; the raw body is verified by signature. */
export const webhook = tryCatchAsync(async (req: Request, res: Response) => {
  const { isStripeConfigured, stripe } = await import("../../lib/stripe");
  const config = (await import("../../config")).default;

  if (!isStripeConfigured || !stripe) {
    sendResponse(res, 200, "Stripe not configured — webhook ignored");
    return;
  }

  const signature = req.headers["stripe-signature"] as string | undefined;
  let event: any;

  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature ?? "",
      config.stripe.webhookSecret,
    );
  } catch (error: any) {
    res.status(400).json({ success: false, message: `Webhook signature failed: ${error.message}` });
    return;
  }

  const result = await paymentService.handleWebhookEvent(event);
  sendResponse(res, 200, "Webhook processed", result);
});
