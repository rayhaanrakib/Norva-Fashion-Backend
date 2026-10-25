import type { Request, Response } from "express";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { setAuthCookies } from "../../utils/authCookie";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import * as authService from "./auth.service";

const metaFrom = (req: Request) => ({
  userAgent: req.get("user-agent") ?? undefined,
  ip: req.ip,
});

export const register = tryCatchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  sendResponse(res, 201, result.message, result);
});

export const verifyOtp = tryCatchAsync(async (req, res) => {
  const result = await authService.verifyEmail(req.body, metaFrom(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendResponse(res, 200, "Email verified — welcome to NORVA", result);
});

export const login = tryCatchAsync(async (req, res) => {
  const result = await authService.login(req.body, metaFrom(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendResponse(res, 200, "Login successful", result);
});

export const me = tryCatchAsync(async (req, res) => {
  const user = req.user!;
  const [orders, wishlist] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
  ]);
  sendResponse(res, 200, "Current user", {
    user: authService.safeUser(user),
    stats: { orders, wishlist },
  });
});

export const refresh = tryCatchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken ?? req.body?.refreshToken;
  const tokens = await authService.refreshTokens(token, metaFrom(req));
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  sendResponse(res, 200, "New tokens issued", tokens);
});

export const logout = tryCatchAsync(async (req, res) => {
  await authService.logout(req.cookies?.refreshToken ?? req.body?.refreshToken);
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
  sendResponse(res, 200, "Logged out successfully");
});

export const forgotPassword = tryCatchAsync(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  sendResponse(res, 200, result.message, result);
});

export const resetPassword = tryCatchAsync(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  sendResponse(res, 200, result.message);
});

export const googleStart = (req: Request, res: Response) => {
  const redirect = authService.googleAuthUrl(String(req.query.state ?? "norva"));
  res.redirect(redirect);
};

export const googleCallback = tryCatchAsync(async (req, res) => {
  const code = String(req.query.code ?? "");
  if (!code) {
    res.redirect(`${config.server.frontendUrls[0]}/login?error=google_cancelled`);
    return;
  }
  const result = await authService.loginWithGoogle(code, metaFrom(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.redirect(`${config.server.frontendUrls[0]}/login?google=success`);
});

/** SPA-friendly variant: accepts { code } and returns tokens as JSON. */
export const googleCodeLogin = tryCatchAsync(async (req, res) => {
  const code = String(req.body?.code ?? "");
  if (!code) throw new Error("Missing Google authorization code");
  const result = await authService.loginWithGoogle(code, metaFrom(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendResponse(res, 200, "Google login successful", result);
});
