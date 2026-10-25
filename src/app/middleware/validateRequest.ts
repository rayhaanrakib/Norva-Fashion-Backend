import type { ZodType } from "zod";
import { AppError } from "../utils/AppError";
import { tryCatchAsync } from "../utils/tryCatchAsync";

const validateRequest = (schema: ZodType) =>
  tryCatchAsync(async (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue?.path.join(".");
      throw new AppError(
        400,
        `Validation failed${field ? ` for "${field}"` : ""}: ${issue?.message ?? "invalid payload"}`,
      );
    }
    req.body = result.data;
    next();
  });

/** Validates and replaces req.query (query strings are always strings). */
export const validateQuery = (schema: ZodType) =>
  tryCatchAsync(async (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new AppError(400, issue?.message ?? "Invalid query parameters");
    }
    // Express 5 makes req.query a getter — assign onto a parallel field.
    (req as unknown as { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  });

export default validateRequest;
