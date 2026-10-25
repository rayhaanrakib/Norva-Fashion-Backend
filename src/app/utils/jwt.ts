import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import config from "../config";

export type JwtPayload = { id: string; role: string; email: string };

export const createAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as SignOptions);

export const createRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as SignOptions);

export const verifyAccessToken = (
  token: string,
): { success: true; data: JwtPayload } | { success: false; error: string } => {
  try {
    return { success: true, data: jwt.verify(token, config.jwt.accessSecret) as JwtPayload };
  } catch (error: any) {
    return { success: false, error: error?.message ?? "Invalid token" };
  }
};

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;

/** Refresh tokens are persisted as hashes so a DB leak can't mint sessions. */
export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
