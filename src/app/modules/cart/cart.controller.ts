import type { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import * as cartService from "./cart.service";

const guestToken = (req: Request) =>
  (req.body?.guestToken ?? req.query?.guestToken) as string | undefined;

export const getCart = tryCatchAsync(async (req, res) => {
  const result = await cartService.getCart(req.user?.id, guestToken(req), String(req.query.coupon ?? ""));
  sendResponse(res, 200, "Cart", result);
});

export const addItem = tryCatchAsync(async (req, res) => {
  const result = await cartService.addItem(req.user?.id, req.body);
  sendResponse(res, 201, "Added to cart", result);
});

export const updateItem = tryCatchAsync(async (req, res) => {
  const result = await cartService.updateItem(
    req.user?.id,
    String(req.params.variantId),
    Number(req.body.quantity),
    guestToken(req),
  );
  sendResponse(res, 200, "Cart updated", result);
});

export const removeItem = tryCatchAsync(async (req, res) => {
  const result = await cartService.removeItem(req.user?.id, String(req.params.variantId), guestToken(req));
  sendResponse(res, 200, "Item removed", result);
});

export const clearCart = tryCatchAsync(async (req, res) => {
  const result = await cartService.clearCart(req.user?.id, guestToken(req));
  sendResponse(res, 200, "Cart cleared", result);
});

export const applyCoupon = tryCatchAsync(async (req, res) => {
  const result = await cartService.applyCoupon(req.user?.id, req.body.code, guestToken(req));
  sendResponse(res, 200, "Coupon applied", result);
});

export const merge = tryCatchAsync(async (req, res) => {
  const result = await cartService.mergeGuestCart(req.user!.id, req.body.guestToken);
  sendResponse(res, 200, "Cart merged", result);
});
