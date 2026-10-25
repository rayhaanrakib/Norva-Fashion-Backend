import { Router } from "express";
import { z } from "zod";
import checkAuth from "../../middleware/checkAuth";
import { writeLimiter } from "../../middleware/rateLimiter";
import validateRequest from "../../middleware/validateRequest";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "../../lib/nodemailer";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";

const router = Router();

const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  subject: z.string().max(120).optional(),
  message: z.string().min(10).max(3000),
});

router.post(
  "/",
  writeLimiter,
  validateRequest(contactSchema),
  tryCatchAsync(async (req, res) => {
    const message = await prisma.contactMessage.create({
      data: {
        name: req.body.name,
        email: String(req.body.email).toLowerCase(),
        subject: req.body.subject ?? "",
        message: req.body.message,
      },
    });

    await sendEmail(message.email, "We received your message — NORVA", "contact-received", {
      name: message.name,
      message: message.message,
    }).catch(() => null);

    sendResponse(res, 201, "Message received — we'll reply within one business day", message);
  }),
);

router.get(
  "/",
  checkAuth("ADMIN", "MANAGER", "STAFF"),
  tryCatchAsync(async (req, res) => {
    const status = String(req.query.status ?? "");
    const messages = await prisma.contactMessage.findMany({
      where: status ? { status: status as "NEW" | "READ" | "REVIEWED" | "CLOSED" } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    sendResponse(res, 200, "Messages", messages);
  }),
);

router.patch(
  "/:id",
  checkAuth("ADMIN", "MANAGER", "STAFF"),
  validateRequest(
    z.object({
      status: z.enum(["NEW", "READ", "REVIEWED", "CLOSED"]).optional(),
      reply: z.string().max(3000).optional(),
    }),
  ),
  tryCatchAsync(async (req, res) => {
    const updated = await prisma.contactMessage.update({
      where: { id: String(req.params.id) },
      data: req.body,
    });
    sendResponse(res, 200, "Message updated", updated);
  }),
);

export default router;
