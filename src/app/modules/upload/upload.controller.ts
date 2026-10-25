import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import * as uploadService from "./upload.service";

export const uploadImage = tryCatchAsync(async (req: Request, res: Response) => {
  const asset = await uploadService.uploadImage(req.file as Express.Multer.File, "norva/products");
  sendResponse(res, 201, "Image uploaded", asset);
});

export const uploadAvatar = tryCatchAsync(async (req, res) => {
  const asset = await uploadService.uploadImage(req.file as Express.Multer.File, "norva/avatars");
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarUrl: asset.url, avatarPublicId: asset.publicId },
  });
  sendResponse(res, 201, "Avatar updated", asset);
});
