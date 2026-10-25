import { Router } from "express";
import checkAuth from "../../middleware/checkAuth";
import { authLimiter, writeLimiter } from "../../middleware/rateLimiter";
import validateRequest from "../../middleware/validateRequest";
import * as authController from "./auth.controller";
import {
  forgotPasswordSchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "./auth.validation";

const router = Router();

router.post("/register", authLimiter, validateRequest(registerSchema), authController.register);
router.post("/verify-otp", authLimiter, validateRequest(verifyOtpSchema), authController.verifyOtp);
router.post("/login", authLimiter, validateRequest(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", checkAuth(), authController.me);
router.post(
  "/forgot-password",
  authLimiter,
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validateRequest(resetPasswordSchema),
  authController.resetPassword,
);

// Google OAuth
router.get("/google", authController.googleStart);
router.get("/google/callback", authController.googleCallback);
router.post("/google", writeLimiter, validateRequest(googleSchema), authController.googleCodeLogin);

export default router;
