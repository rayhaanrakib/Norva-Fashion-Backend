import { z } from "zod";

export const updateMeSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    phone: z.string().max(24).nullable().optional(),
    locale: z.string().max(8).optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

export const addressSchema = z.object({
  label: z.string().max(30).optional(),
  fullName: z.string().min(2).max(80),
  phone: z.string().min(6).max(24),
  line1: z.string().min(3).max(160),
  line2: z.string().max(160).optional(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional(),
  postcode: z.string().min(2).max(16),
  country: z.string().length(2).default("US"),
  type: z.enum(["SHIPPING", "BILLING"]).optional(),
  isDefault: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Use at least 8 characters").max(72),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(["CUSTOMER", "STAFF", "MANAGER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
  storeCredit: z.coerce.number().min(0).max(100000).optional(),
});
