import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "../../lib/nodemailer";
import { AppError } from "../../utils/AppError";
import { clearAuthCookies } from "../../utils/authCookie";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { issueOtp, verifyOtp } from "../../utils/otp";
import type { LoginInput, RegisterInput, ResetPasswordInput } from "./auth.validation";

export const safeUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  avatarUrl: user.avatarUrl,
  emailVerified: user.emailVerified,
  storeCredit: user.storeCredit,
  locale: user.locale,
  marketingOptIn: user.marketingOptIn,
  createdAt: user.createdAt,
});

const sessionMeta = ({ userAgent, ip }: { userAgent?: string; ip?: string }) => ({
  userAgent: userAgent?.slice(0, 180) ?? null,
  ip: ip ?? null,
});

export async function issueTokens(
  user: User,
  meta: { userAgent?: string; ip?: string } = {},
) {
  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken(payload);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      ...sessionMeta(meta),
    },
  });

  return { accessToken, refreshToken, expiresAt };
}

export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, config.bcryptSaltRounds);
  const isBootstrapAdmin = config.adminEmails.includes(email);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      role: isBootstrapAdmin ? "ADMIN" : "CUSTOMER",
      locale: input.locale ?? "en",
      marketingOptIn: input.marketingOptIn ?? false,
      emailVerified: false,
    },
  });

  if (input.marketingOptIn) {
    await prisma.newsletterSubscriber
      .upsert({
        where: { email },
        update: { isActive: true },
        create: { email, locale: input.locale ?? "en", source: "signup" },
      })
      .catch(() => null);
  }

  const code = await issueOtp(email, "verify");
  await sendEmail(email, "Verify your NORVA account", "verify-otp", {
    name: user.name,
    code,
  }).catch(() => null);

  return {
    message: "Account created — check your email for the 6-digit verification code",
    email,
    // Exposed only outside production so the flow is demoable without SMTP.
    ...(config.server.isProduction ? {} : { devCode: code }),
  };
}

export async function verifyEmail(input: { email: string; code: string }, meta = {}) {
  const email = input.email.toLowerCase().trim();
  const valid = await verifyOtp(email, "verify", input.code);
  if (!valid) throw new AppError(400, "That code is invalid or has expired");

  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: true, lastLoginAt: new Date() },
  });

  const tokens = await issueTokens(user, meta);
  await sendEmail(user.email, "Welcome to NORVA", "welcome", { name: user.name }).catch(() => null);

  return { user: safeUser(user), ...tokens };
}

export async function login(input: LoginInput, meta = {}) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) throw new AppError(401, "Incorrect email or password");
  if (user.status === "BLOCKED") throw new AppError(403, "This account has been blocked");
  if (user.status === "DELETED") throw new AppError(401, "Incorrect email or password");

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) throw new AppError(401, "Incorrect email or password");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await issueTokens(updated, meta);
  return { user: safeUser(updated), ...tokens };
}

export async function refreshTokens(refreshToken?: string, meta = {}) {
  if (!refreshToken) throw new AppError(401, "No refresh token provided");

  let payload: { id: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "Refresh token is invalid or expired");
  }

  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError(401, "Session expired — please log in again");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.status !== "ACTIVE") throw new AppError(401, "Session no longer valid");

  // Rotate: the old session is revoked the moment a new one is issued.
  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(user, meta);
}

export async function logout(refreshToken?: string) {
  if (refreshToken) {
    await prisma.refreshSession
      .updateMany({
        where: { tokenHash: hashToken(refreshToken) },
        data: { revokedAt: new Date() },
      })
      .catch(() => null);
  }
  return { clearAuthCookies };
}

export async function forgotPassword(email: string) {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  // Always return success — never reveal whether an email is registered.
  if (user) {
    const code = await issueOtp(normalized, "reset");
    await sendEmail(normalized, "Reset your NORVA password", "reset-password", {
      name: user.name,
      code,
    }).catch(() => null);
    return {
      message: "If that email exists, a reset code is on its way",
      ...(config.server.isProduction ? {} : { devCode: code }),
    };
  }

  return { message: "If that email exists, a reset code is on its way" };
}

export async function resetPassword(input: ResetPasswordInput) {
  const email = input.email.toLowerCase().trim();
  const valid = await verifyOtp(email, "reset", input.code);
  if (!valid) throw new AppError(400, "That reset code is invalid or has expired");

  const passwordHash = await bcrypt.hash(input.password, config.bcryptSaltRounds);
  await prisma.user.update({ where: { email }, data: { passwordHash } });

  // Password change invalidates every existing session.
  await prisma.refreshSession.updateMany({
    where: { user: { email } },
    data: { revokedAt: new Date() },
  });

  return { message: "Password updated — you can log in now" };
}

// ------------------------------------------------------------
// Google OAuth (authorization-code flow, no passport dependency)
// ------------------------------------------------------------

export function googleAuthUrl(state = "norva") {
  if (!config.google.clientId) throw new AppError(503, "Google sign-in is not configured");
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type GoogleProfile = { sub: string; email: string; name?: string; picture?: string };

async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.callbackUrl,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) throw new AppError(401, "Google rejected the authorization code");
  const tokens = (await tokenResponse.json()) as { access_token?: string };
  if (!tokens.access_token) throw new AppError(401, "Google did not return an access token");

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileResponse.ok) throw new AppError(401, "Could not load your Google profile");
  return (await profileResponse.json()) as GoogleProfile;
}

export async function loginWithGoogle(code: string, meta = {}) {
  const profile = await exchangeGoogleCode(code);
  const email = profile.email.toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId ?? profile.sub,
        emailVerified: true,
        avatarUrl: user.avatarUrl || (profile.picture ?? ""),
        lastLoginAt: new Date(),
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        name: profile.name ?? email.split("@")[0],
        email,
        googleId: profile.sub,
        provider: "GOOGLE",
        emailVerified: true,
        avatarUrl: profile.picture ?? "",
        role: config.adminEmails.includes(email) ? "ADMIN" : "CUSTOMER",
        lastLoginAt: new Date(),
      },
    });
    await sendEmail(email, "Welcome to NORVA", "welcome", { name: user.name }).catch(() => null);
  }

  if (user.status === "BLOCKED") throw new AppError(403, "This account has been blocked");

  const tokens = await issueTokens(user, meta);
  return { user: safeUser(user), ...tokens };
}
