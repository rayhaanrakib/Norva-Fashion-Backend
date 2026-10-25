import { z } from "zod";

export const addItemSchema = z.object({
  variantId: z.string().uuid("Pick a size and colour"),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  guestToken: z.string().min(8).max(64).optional(),
});

export const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(20),
});

export const couponSchema = z.object({
  code: z.string().min(2).max(40),
  guestToken: z.string().min(8).max(64).optional(),
});

export const mergeSchema = z.object({
  guestToken: z.string().min(8).max(64),
});
