import { v2 as cloudinary } from "cloudinary";
import config from "../config";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export const isCloudinaryConfigured = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret,
);

/** Streams a memory-buffered file to Cloudinary and resolves the secure URL. */
export const uploadBuffer = (buffer: Buffer, folder = "norva"): Promise<any> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });

export const destroyAsset = (publicId?: string | null) =>
  publicId ? cloudinary.uploader.destroy(publicId).catch(() => null) : Promise.resolve(null);

export { cloudinary };
