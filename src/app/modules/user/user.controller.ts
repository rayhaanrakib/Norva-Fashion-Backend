import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getPagination } from "../../utils/pagination";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import * as userService from "./user.service";

export const me = tryCatchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: userService.safeSelect,
  });
  sendResponse(res, 200, "Profile", { user });
});

export const updateMe = tryCatchAsync(async (req, res) => {
  const user = await userService.updateMe(req.user!.id, req.body);
  sendResponse(res, 200, "Profile updated", { user });
});

export const changePassword = tryCatchAsync(async (req, res) => {
  await userService.changePassword(req.user!, req.body.currentPassword, req.body.newPassword);
  sendResponse(res, 200, "Password updated — please log in again on other devices");
});

export const listAddresses = tryCatchAsync(async (req, res) => {
  const addresses = await userService.listAddresses(req.user!.id);
  sendResponse(res, 200, "Addresses", addresses);
});

export const createAddress = tryCatchAsync(async (req, res) => {
  const address = await userService.createAddress(req.user!.id, req.body);
  sendResponse(res, 201, "Address saved", address);
});

export const updateAddress = tryCatchAsync(async (req, res) => {
  const address = await userService.updateAddress(req.user!.id, String(req.params.id), req.body);
  sendResponse(res, 200, "Address updated", address);
});

export const deleteAddress = tryCatchAsync(async (req, res) => {
  await userService.deleteAddress(req.user!.id, String(req.params.id));
  sendResponse(res, 200, "Address removed");
});

export const listUsers = tryCatchAsync(async (req, res) => {
  const { limit, skip, meta } = getPagination(req.query as Record<string, unknown>, "createdAt");
  const { search, role, status } = req.query as Record<string, string | undefined>;

  const where: Prisma.UserWhereInput = { status: { not: "DELETED" } };
  if (role) where.role = role as Prisma.UserWhereInput["role"];
  if (status) where.status = status as Prisma.UserWhereInput["status"];
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { ...userService.safeSelect, orders: { select: { id: true } } },
    }),
  ]);

  sendResponse(
    res,
    200,
    "Customers retrieved",
    users.map(({ orders, ...user }) => ({ ...user, orderCount: orders.length })),
    meta(total),
  );
});

export const getUser = tryCatchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: String(req.params.id) },
    select: {
      ...userService.safeSelect,
      addresses: true,
      orders: {
        orderBy: { placedAt: "desc" },
        take: 10,
        select: { id: true, number: true, status: true, grandTotal: true, placedAt: true },
      },
    },
  });
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  sendResponse(res, 200, "Customer", user);
});

export const updateUser = tryCatchAsync(async (req: Request, res: Response) => {
  const user = await userService.adminUpdateUser(req.user!, String(req.params.id), req.body);
  sendResponse(res, 200, "Customer updated", { user });
});

export const deleteUser = tryCatchAsync(async (req, res) => {
  await userService.adminDeleteUser(req.user!, String(req.params.id));
  sendResponse(res, 200, "Customer removed");
});
