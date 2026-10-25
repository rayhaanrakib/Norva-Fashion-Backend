import { z } from "zod";

export const addressInput = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().min(6).max(24),
  line1: z.string().min(3).max(160),
  line2: z.string().max(160).optional().nullable(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional().nullable(),
  postcode: z.string().min(2).max(16),
  country: z.string().length(2).default("US"),
});

export const checkoutSchema = z
  .object({
    items: z
      .array(
        z.object({
          variantId: z.string().uuid(),
          quantity: z.coerce.number().int().min(1).max(20),
        }),
      )
      .max(60)
      .optional(),
    fromCart: z.boolean().optional(),
    guestToken: z.string().min(8).max(64).optional(),
    email: z.string().email(),
    phone: z.string().max(24).optional(),
    shippingAddress: addressInput,
    billingAddress: addressInput.optional(),
    couponCode: z.string().max(40).optional().nullable(),
    paymentMethod: z.enum(["STRIPE", "COD", "SANDBOX"]).default("STRIPE"),
    notes: z.string().max(500).optional(),
    saveAddress: z.boolean().optional(),
  })
  .refine((data) => data.fromCart || (data.items && data.items.length > 0), {
    message: "Your cart is empty",
    path: ["items"],
  });

export const statusUpdateSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
  note: z.string().max(300).optional(),
  trackingNumber: z.string().max(80).optional(),
  trackingUrl: z.string().url().optional(),
});

export const trackingSchema = z.object({
  trackingNumber: z.string().min(2).max(80),
  trackingUrl: z.string().url().optional(),
});

export const orderQuerySchema = z.object({
  status: z.string().max(40).optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
