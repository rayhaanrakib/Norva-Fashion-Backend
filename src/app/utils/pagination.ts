export type PageMeta = { page: number; limit: number; total: number; totalPages: number };

export function getPagination(query: Record<string, unknown>, defaultSortBy = "createdAt") {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
  const skip = (page - 1) * limit;
  const sortBy = typeof query.sortBy === "string" ? query.sortBy : defaultSortBy;
  const sortOrder: "asc" | "desc" = query.sortOrder === "asc" ? "asc" : "desc";
  const meta = (total: number): PageMeta => ({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
  return { page, limit, skip, sortBy, sortOrder, meta };
}

/** Sort keys map to safe Prisma orderBy objects (never trust the client blindly). */
export function parseSort<T extends string>(
  raw: unknown,
  allowed: Record<string, T>,
  fallback: T,
): T {
  const key = typeof raw === "string" ? raw.toLowerCase() : "";
  return allowed[key] ?? fallback;
}
