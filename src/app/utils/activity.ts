import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/** Fire-and-forget audit trail — never breaks the request that triggered it. */
export async function logActivity(
  action: string,
  entity: string,
  entityId: string,
  actorId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await prisma.activityLog.create({
      data: { action, entity, entityId, actorId: actorId ?? null, metadata },
    });
  } catch (error) {
    logger.warn("Activity log failed", error);
  }
}
