import { z } from "zod";

export const adjustSchema = z.object({
  variantId: z.string().uuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Delta cannot be zero"),
  reason: z.enum(["RESTOCK", "ADJUSTMENT", "DAMAGE", "RETURN"]),
  note: z.string().max(240).optional(),
});

export const thresholdSchema = z.object({
  lowStockThreshold: z.coerce.number().int().min(0).max(100),
});
