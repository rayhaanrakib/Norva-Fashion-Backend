import type { Response } from "express";

type Meta = Record<string, unknown>;

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: Meta,
) => {
  res.status(statusCode).json({
    success: statusCode < 400,
    message,
    ...(data !== undefined ? { data } : {}),
    ...(meta ? { meta } : {}),
  });
};
