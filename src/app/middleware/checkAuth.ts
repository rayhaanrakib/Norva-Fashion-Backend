import type { Request } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";
import { tryCatchAsync } from "../utils/tryCatchAsync";

type Role = "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN";

export function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (req.cookies?.accessToken) return req.cookies.accessToken as string;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return header ?? null;
}

/**
 * Verifies the JWT **and** reloads the user from the database on every request,
 * so blocked or deleted accounts lose access immediately rather than at expiry.
 */
export const checkAuth = (...requiredRoles: Role[]) =>
  tryCatchAsync(async (req, _res, next) => {
    const token = extractToken(req);
    if (!token) throw new AppError(401, "Authentication required");

    const verified = verifyAccessToken(token);
    if (!verified.success) throw new AppError(401, "Invalid or expired token");

    const user = await prisma.user.findUnique({ where: { id: verified.data.id } });
    if (!user || user.status === "DELETED") throw new AppError(401, "Session expired, please log in again");
    if (user.status === "BLOCKED") throw new AppError(403, "This account has been blocked");

    if (requiredRoles.length && !requiredRoles.includes(user.role as Role)) {
      throw new AppError(
        403,
        `Access denied. Required role: ${requiredRoles.join(", ")}. Your role: ${user.role}`,
      );
    }

    req.user = user;
    next();
  });

/** Same as checkAuth but lets anonymous visitors through (attaches user when present). */
export const optionalAuth = tryCatchAsync(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  const verified = verifyAccessToken(token);
  if (!verified.success) return next();

  const user = await prisma.user.findUnique({ where: { id: verified.data.id } });
  if (user && user.status === "ACTIVE") req.user = user;
  next();
});

export default checkAuth;
