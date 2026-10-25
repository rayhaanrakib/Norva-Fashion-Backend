import type { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import * as orderService from "./order.service";

export const checkout = tryCatchAsync(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.user?.id, req.body);
  sendResponse(res, 201, "Order placed", order);
});

export const myOrders = tryCatchAsync(async (req, res) => {
  const { items, meta } = await orderService.listMyOrders(req.user!.id, req.query as any);
  sendResponse(res, 200, "Your orders", items, meta);
});

export const myOrder = tryCatchAsync(async (req, res) => {
  const order = await orderService.getOrder(String(req.params.id), {
    id: req.user!.id,
    role: req.user!.role,
  });
  sendResponse(res, 200, "Order", order);
});

export const listOrders = tryCatchAsync(async (req, res) => {
  const { items, meta } = await orderService.listAllOrders(req.query as any);
  sendResponse(res, 200, "Orders retrieved", items, meta);
});

export const getOrder = tryCatchAsync(async (req, res) => {
  const order = await orderService.getOrder(String(req.params.id), {
    id: req.user!.id,
    role: req.user!.role,
  });
  sendResponse(res, 200, "Order", order);
});

/** Public tracking: order number + email acts as the capability. */
export const trackOrder = tryCatchAsync(async (req: Request, res: Response) => {
  const order = await orderService.getOrder(String(req.params.number), undefined);
  const email = String(req.query.email ?? "").toLowerCase();
  if (!email || email !== order.email) {
    res.status(404).json({ success: false, message: "No order found for those details" });
    return;
  }
  sendResponse(res, 200, "Order found", {
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    placedAt: order.placedAt,
    items: order.items,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    events: order.events,
  });
});

export const updateStatus = tryCatchAsync(async (req: Request, res: Response) => {
  const order = await orderService.updateStatus(
    String(req.params.id),
    req.body,
    req.user!.id,
  );
  sendResponse(res, 200, "Order updated", order);
});

export const cancel = tryCatchAsync(async (req: Request, res: Response) => {
  const order = await orderService.cancelByCustomer(String(req.params.id), req.user!.id);
  sendResponse(res, 200, "Order cancelled", order);
});
