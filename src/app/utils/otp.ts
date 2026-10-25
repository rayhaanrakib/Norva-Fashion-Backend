import { cache } from "../lib/cache";

const KEY = (email: string, purpose: string) => `otp:${purpose}:${email.toLowerCase()}`;

export const OTP_TTL_SECONDS = 10 * 60;

export async function issueOtp(email: string, purpose: "verify" | "reset") {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await cache.set(KEY(email, purpose), code, OTP_TTL_SECONDS);
  return code;
}

export async function verifyOtp(email: string, purpose: "verify" | "reset", code: string) {
  const stored = await cache.get(KEY(email, purpose));
  if (!stored || stored !== code) return false;
  await cache.del(KEY(email, purpose));
  return true;
}

export async function peekOtp(email: string, purpose: "verify" | "reset") {
  return cache.get(KEY(email, purpose));
}
