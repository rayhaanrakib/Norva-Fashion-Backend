import bcrypt from "bcryptjs";
import type { Prisma, User } from "@prisma/client";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { safeUser } from "../auth/auth.service";

export const safeSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
  emailVerified: true,
  storeCredit: true,
  locale: true,
  marketingOptIn: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function updateMe(userId: string, input: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id: userId }, data: input, select: safeSelect });
}

export async function changePassword(user: User, current: string, next: string) {
  if (!user.passwordHash) {
    throw new AppError(409, "This account signs in with Google and has no password yet");
  }
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) throw new AppError(401, "Your current password is incorrect");

  const passwordHash = await bcrypt.hash(next, config.bcryptSaltRounds);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  // Every other device is logged out after a password change.
  await prisma.refreshSession.updateMany({
    where: { userId: user.id },
    data: { revokedAt: new Date() },
  });
}

export async function setAvatar(userId: string, url: string, publicId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: url, avatarPublicId: publicId },
    select: safeSelect,
  });
}

// ------------------------------------------------------------
// Addresses
// ------------------------------------------------------------

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAddress(userId: string, input: Prisma.AddressUncheckedCreateInput) {
  const count = await prisma.address.count({ where: { userId } });
  const makeDefault = input.isDefault || count === 0;

  return prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.create({ data: { ...input, userId, isDefault: makeDefault } });
  });
}

export async function updateAddress(
  userId: string,
  id: string,
  input: Prisma.AddressUncheckedUpdateInput,
) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "Address not found");

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.update({ where: { id }, data: input });
  });
}

export async function deleteAddress(userId: string, id: string) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "Address not found");
  await prisma.address.delete({ where: { id } });
  if (existing.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}

// ------------------------------------------------------------
// Admin
// ------------------------------------------------------------

export async function adminUpdateUser(actor: User, userId: string, input: Prisma.UserUpdateInput) {
  if (actor.id === userId && input.role && input.role !== "ADMIN") {
    throw new AppError(409, "You cannot demote your own admin account");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");
  return prisma.user.update({ where: { id: userId }, data: input, select: safeSelect });
}

export async function adminDeleteUser(actor: User, userId: string) {
  if (actor.id === userId) throw new AppError(409, "You cannot delete your own account");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");
  // Soft delete keeps order history + analytics intact.
  await prisma.user.update({
    where: { id: userId },
    data: { status: "DELETED", email: `deleted+${userId}@norva.invalid` },
  });
}

export { safeUser };
