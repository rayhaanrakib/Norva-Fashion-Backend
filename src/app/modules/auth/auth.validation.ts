import { z } from "zod";

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  email: z.string().email("Enter a valid email address"),
  password,
  locale: z.string().max(8).optional(),
  marketingOptIn: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "The code is 6 digits"),
});

export const forgotPasswordSchema = z.object({ email: z.string().email() });

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "The code is 6 digits"),
  password,
});

export const googleSchema = z.object({
  code: z.string().min(10, "Missing Google authorization code"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
