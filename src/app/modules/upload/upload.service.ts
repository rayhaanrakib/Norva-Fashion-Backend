import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../lib/prisma";
import { destroyAsset, isCloudinaryConfigured, uploadBuffer } from "../../lib/cloudinary";
import { AppError } from "../../utils/AppError";

const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");

export type UploadedAsset = { url: string; publicId: string; provider: "cloudinary" | "local" };

/**
 * Uploads to Cloudinary when configured; otherwise stores to /public/uploads
 * so the API remains fully functional in a local demo environment.
 */
export async function uploadImage(file: Express.Multer.File, folder = "norva"): Promise<UploadedAsset> {
  if (!file) throw new AppError(400, 'No file provided. Send multipart/form-data with key "image"');

  if (isCloudinaryConfigured) {
    const result = await uploadBuffer(file.buffer, folder);
    await prisma.mediaAsset
      .create({
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          folder,
          alt: file.originalname,
        },
      })
      .catch(() => null);
    return { url: result.secure_url, publicId: result.public_id, provider: "cloudinary" };
  }

  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-60);
  const fileName = `${Date.now()}-${safeName}`;
  await fs.writeFile(path.join(LOCAL_DIR, fileName), file.buffer);
  return { url: `/uploads/${fileName}`, publicId: fileName, provider: "local" };
}

export async function removeAsset(publicId: string, provider: UploadedAsset["provider"]) {
  if (provider === "cloudinary") return destroyAsset(publicId);
  await fs.unlink(path.join(LOCAL_DIR, publicId)).catch(() => null);
  return null;
}
