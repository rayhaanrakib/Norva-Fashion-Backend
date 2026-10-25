import type { Response } from "express";
import config from "../config";

const baseOptions = {
  httpOnly: true,
  secure: config.server.isProduction,
  sameSite: config.server.isProduction ? ("none" as const) : ("lax" as const),
  path: "/",
};

const ACCESS_MAX_AGE = 60 * 60 * 1000; // 1 hour ceiling, JWT still expires sooner
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("accessToken", accessToken, { ...baseOptions, maxAge: ACCESS_MAX_AGE });
  res.cookie("refreshToken", refreshToken, { ...baseOptions, maxAge: REFRESH_MAX_AGE });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken", baseOptions);
  res.clearCookie("refreshToken", baseOptions);
}
