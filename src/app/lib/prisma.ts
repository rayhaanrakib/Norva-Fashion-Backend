import { PrismaClient } from "@prisma/client";
import config from "../config";

/**
 * A single PrismaClient per process. In dev, Next/tsx hot-reloads modules,
 * so the instance is cached on `globalThis` to avoid exhausting connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.server.isProduction ? ["error"] : ["warn", "error"],
  });

if (!config.server.isProduction) globalForPrisma.prisma = prisma;
