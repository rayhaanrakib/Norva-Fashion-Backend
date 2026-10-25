import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../utils/activity";
import { getPagination } from "../../utils/pagination";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";

export const overview = tryCatchAsync(async (_req, res) => {
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, product: { status: { not: "ARCHIVED" } } },
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      stock: true,
      lowStockThreshold: true,
      product: { select: { id: true, name: true, slug: true, images: { take: 1 } } },
    },
  });

  const outOfStock = variants.filter((v) => v.stock === 0);
  const lowStock = variants.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold);

  sendResponse(res, 200, "Inventory overview", {
    totals: {
      skus: variants.length,
      units: variants.reduce((sum, v) => sum + v.stock, 0),
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
    },
    alerts: [...outOfStock, ...lowStock]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 20)
      .map((v) => ({
        variantId: v.id,
        sku: v.sku,
        product: v.product.name,
        slug: v.product.slug,
        image: v.product.images[0]?.url ?? "",
        size: v.size,
        color: v.color,
        stock: v.stock,
        threshold: v.lowStockThreshold,
      })),
  });
});

export const movements = tryCatchAsync(async (req, res) => {
  const { limit, skip, meta } = getPagination(req.query as Record<string, unknown>, "createdAt");
  const [total, items] = await Promise.all([
    prisma.inventoryMovement.count(),
    prisma.inventoryMovement.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true, slug: true } },
        variant: { select: { sku: true, size: true, color: true } },
        actor: { select: { name: true } },
      },
    }),
  ]);
  sendResponse(res, 200, "Inventory movements", items, meta(total));
});

export const adjust = tryCatchAsync(async (req: Request, res: Response) => {
  const { variantId, delta, reason, note } = req.body as {
    variantId: string;
    delta: number;
    reason: "RESTOCK" | "ADJUSTMENT" | "DAMAGE" | "RETURN";
    note?: string;
  };

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new AppError(404, "Variant not found");
  if (variant.stock + delta < 0) {
    throw new AppError(409, `Cannot remove ${Math.abs(delta)} units — only ${variant.stock} in stock`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { increment: delta } },
    });
    await tx.inventoryMovement.create({
      data: {
        productId: variant.productId,
        variantId,
        delta,
        reason,
        note: note ?? "",
        actorId: req.user?.id,
      },
    });
    return next;
  });

  await logActivity("INVENTORY_ADJUSTED", "ProductVariant", variantId, req.user?.id, {
    delta,
    reason,
  });

  sendResponse(res, 200, "Stock adjusted", updated);
});

export const updateThreshold = tryCatchAsync(async (req: Request, res: Response) => {
  const variant = await prisma.productVariant.update({
    where: { id: String(req.params.variantId) },
    data: { lowStockThreshold: Number(req.body.lowStockThreshold) },
  });
  sendResponse(res, 200, "Threshold updated", variant);
});
