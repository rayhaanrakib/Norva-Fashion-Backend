import rateLimit from "express-rate-limit";

const message = (text: string) => ({ success: false, message: text });

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many attempts — please try again in a minute"),
});

export const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many requests — slow down a little"),
});

export const publicLimiter = rateLimit({
  windowMs: 60_000,
  limit: 240,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many requests — please try again shortly"),
});

export const paymentLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many payment requests — slow down"),
});
