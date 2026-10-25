import { Router } from "express";
import { z } from "zod";
import checkAuth from "../../middleware/checkAuth";
import { writeLimiter } from "../../middleware/rateLimiter";
import validateRequest from "../../middleware/validateRequest";
import { prisma } from "../../lib/prisma";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";

const router = Router();

router.post(
  "/subscribe",
  writeLimiter,
  validateRequest(
    z.object({
      email: z.string().email("Enter a valid email address"),
      locale: z.string().max(8).optional(),
      source: z.string().max(40).optional(),
    }),
  ),
  tryCatchAsync(async (req, res) => {
    const email = String(req.body.email).toLowerCase();
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { isActive: true, locale: req.body.locale ?? "en" },
      create: {
        email,
        locale: req.body.locale ?? "en",
        source: req.body.source ?? "footer",
        confirmedAt: new Date(),
      },
    });
    sendResponse(res, 201, "You're on the list — welcome to NORVA");
  }),
);

router.get(
  "/",
  checkAuth("ADMIN", "MANAGER"),
  tryCatchAsync(async (_req, res) => {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    sendResponse(res, 200, "Subscribers", subscribers);
  }),
);

export default router;
