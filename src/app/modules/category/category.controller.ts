import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { slugify } from "../../utils/slug";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import { AppError } from "../../utils/AppError";

const withCounts = {
  _count: { select: { products: true } },
} satisfies Prisma.CategoryInclude;

export const listCategories = tryCatchAsync(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: withCounts,
  });
  sendResponse(res, 200, "Categories", categories);
});

export const listAllCategories = tryCatchAsync(async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: withCounts,
  });
  sendResponse(res, 200, "All categories", categories);
});

export const getCategory = tryCatchAsync(async (req: Request, res: Response) => {
  const category = await prisma.category.findUnique({
    where: { slug: String(req.params.slug) },
    include: { children: true, ...withCounts },
  });
  if (!category) throw new AppError(404, "Category not found");
  sendResponse(res, 200, "Category", category);
});

export const createCategory = tryCatchAsync(async (req: Request, res: Response) => {
  const body = req.body as Prisma.CategoryUncheckedCreateInput;
  const category = await prisma.category.create({
    data: { ...body, slug: slugify(body.slug ?? body.name) },
  });
  sendResponse(res, 201, "Category created", category);
});

export const updateCategory = tryCatchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Category not found");

  const body = req.body as Prisma.CategoryUncheckedUpdateInput;
  const category = await prisma.category.update({
    where: { id },
    data: { ...body, ...(body.slug ? { slug: slugify(String(body.slug)) } : {}) },
  });
  sendResponse(res, 200, "Category updated", category);
});

export const deleteCategory = tryCatchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const products = await prisma.product.count({ where: { categoryId: id } });
  if (products > 0) {
    throw new AppError(409, `Move or archive the ${products} products in this category first`);
  }
  await prisma.category.delete({ where: { id } });
  sendResponse(res, 200, "Category deleted");
});
