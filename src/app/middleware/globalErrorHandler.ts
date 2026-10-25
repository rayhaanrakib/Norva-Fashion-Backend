import type { NextFunction, Request, Response } from "express";
import config from "../config";
import { logger } from "../lib/logger";
import { AppError } from "../utils/AppError";

/** Detects Prisma errors by name/code without importing generated classes. */
const isPrismaError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "PrismaClientKnownRequestError" ||
    error.name === "PrismaClientValidationError" ||
    error.name === "PrismaClientInitializationError" ||
    error.name === "PrismaClientUnknownRequestError");

const globalErrorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = "Something went wrong";
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (isPrismaError(err)) {
    const { name, code, meta } = err as { name: string; code?: string; meta?: { target?: string[] } };

    if (name === "PrismaClientValidationError") {
      statusCode = 400;
      message = "Invalid request data. Please check your input.";
    } else if (name === "PrismaClientInitializationError") {
      statusCode = 503;
      message = "Service temporarily unavailable";
    } else {
      switch (code) {
        case "P2002": {
          statusCode = 409;
          const target = meta?.target?.join(", ");
          message = target
            ? `A record with this ${target} already exists`
            : "This record already exists";
          break;
        }
        case "P2003":
          statusCode = 400;
          message = "This action references a record that does not exist";
          break;
        case "P2025":
          statusCode = 404;
          message = "Record not found";
          break;
        default:
          statusCode = 500;
          message = "A database error occurred";
      }
    }
  } else if (err instanceof Error) {
    if ((err as { code?: string }).code === "LIMIT_FILE_SIZE") {
      statusCode = 400;
      message = "Uploaded file is too large (max 4 MB)";
    } else if (err.message.includes("Only image uploads")) {
      statusCode = 400;
      message = err.message;
    } else if (err.message.includes("Multipart: Boundary not found")) {
      statusCode = 400;
      message =
        'Invalid upload request. Send multipart/form-data with the file in the "image" field.';
    }
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${statusCode}`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(config.server.isProduction
      ? {}
      : {
          error: {
            name: err instanceof Error ? err.name : "UnknownError",
            stack: err instanceof Error ? err.stack : undefined,
          },
        }),
  });
};

export default globalErrorHandler;
