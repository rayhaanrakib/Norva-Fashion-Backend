import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { cache } from "../../lib/cache";
import { AppError } from "../../utils/AppError";
import { slugify, uniqueSlug } from "../../utils/slug";

export const productInclude = {
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

export type ProductFilters = {
  search?: string;
  category?: string;
  categories?: string;
  sizes?: string;
  colors?: string;
  tags?: string;
  material?: string;
  fit?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: "true" | "false";
  sort?: string;
  page?: number;
  limit?: number;
};

const csv = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export function buildWhere(filters: ProductFilters, includeDrafts = false): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = includeDrafts ? {} : { status: "ACTIVE" };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { material: { contains: filters.search, mode: "insensitive" } },
      { brand: { contains: filters.search, mode: "insensitive" } },
      { tags: { has: filters.search.toLowerCase() } },
    ];
  }

  const slugs = [...csv(filters.categories), ...(filters.category ? [filters.category] : [])];
  if (slugs.length) where.category = { slug: { in: slugs } };

  const sizes = csv(filters.sizes);
  if (sizes.length) where.variants = { some: { size: { in: sizes }, stock: { gt: 0 } } };

  const colors = csv(filters.colors);
  if (colors.length) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { variants: { some: { color: { in: colors }, stock: { gt: 0 } } } },
    ];
  }

  const tags = csv(filters.tags);
  if (tags.length) where.tags = { hasSome: tags };

  if (filters.material) where.material = { contains: filters.material, mode: "insensitive" };
  if (filters.fit) where.fit = { contains: filters.fit, mode: "insensitive" };

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }

  if (filters.inStock === "true") {
    where.variants = {
      some: {
        stock: { gt: 0 },
        ...(sizes.length ? { size: { in: sizes } } : {}),
        ...(colors.length ? { color: { in: colors } } : {}),
      },
    };
  }

  return where;
}

const orderByFor = (sort?: string): Prisma.ProductOrderByWithRelationInput[] => {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }, { name: "asc" }];
    case "price-desc":
      return [{ price: "desc" }, { name: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "rating":
      return [{ rating: "desc" }, { ratingCount: "desc" }];
    case "bestselling":
      return [{ soldCount: "desc" }, { rating: "desc" }];
    default:
      return [{ featured: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }];
  }
};

export async function listProducts(filters: ProductFilters, includeDrafts = false) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 12));
  const where = buildWhere(filters, includeDrafts);

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: orderByFor(filters.sort),
      include: productInclude,
    }),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      ...productInclude,
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!product) throw new AppError(404, "Product not found");

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = product.reviews.filter((r) => r.rating === star).length;
    return { star, count };
  });

  return { ...product, reviewDistribution: distribution };
}

export async function getRelated(productId: string, limit = 8) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, price: true },
  });
  if (!product) throw new AppError(404, "Product not found");

  return prisma.product.findMany({
    where: {
      id: { not: productId },
      status: "ACTIVE",
      OR: [
        { categoryId: product.categoryId },
        {
          price: {
            gte: Number(product.price) * 0.6,
            lte: Number(product.price) * 1.6,
          },
        },
      ],
    },
    take: limit,
    orderBy: [{ soldCount: "desc" }, { rating: "desc" }],
    include: productInclude,
  });
}

export async function getFacets() {
  return cache.remember("catalog:facets", 120, async () => {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { sizes: true, colors: true, material: true, fit: true, price: true, tags: true },
    });

    const sizeSet = new Set<string>();
    const colorMap = new Map<string, string>();
    const materialSet = new Set<string>();
    const fitSet = new Set<string>();
    const tagSet = new Set<string>();
    let min = Number.POSITIVE_INFINITY;
    let max = 0;

    for (const product of products) {
      product.sizes.forEach((s) => sizeSet.add(s));
      (product.colors as { name: string; hex: string }[]).forEach((c) => colorMap.set(c.name, c.hex));
      if (product.material) materialSet.add(product.material);
      if (product.fit) fitSet.add(product.fit);
      product.tags.forEach((t) => tagSet.add(t));
      min = Math.min(min, Number(product.price));
      max = Math.max(max, Number(product.price));
    }

    return {
      sizes: [...sizeSet],
      colors: [...colorMap.entries()].map(([name, hex]) => ({ name, hex })),
      materials: [...materialSet].sort(),
      fits: [...fitSet].sort(),
      tags: [...tagSet].sort(),
      price: {
        min: Number.isFinite(min) ? min : 0,
        max: max || 0,
      },
    };
  });
}

const skuFor = (name: string, size: string, color: string, index: number) =>
  `${slugify(name)
    .slice(0, 10)
    .toUpperCase()
    .replace(/-/g, "")}-${slugify(size).slice(0, 4).toUpperCase()}-${slugify(color)
    .slice(0, 6)
    .toUpperCase()}-${index}`;

export async function createProduct(input: any) {
  const slug = input.slug ? slugify(input.slug) : uniqueSlug(input.name);

  return prisma.$transaction(async (tx) => {
    const sizes = input.sizes ?? [...new Set(input.variants.map((v: any) => v.size))];
    const colors =
      input.colors ??
      [...new Map(input.variants.map((v: any) => [v.color, { name: v.color, hex: v.colorHex ?? "" }])).values()];

    const product = await tx.product.create({
      data: {
        name: input.name,
        slug,
        subtitle: input.subtitle ?? "",
        description: input.description ?? "",
        story: input.story ?? "",
        material: input.material ?? "",
        fit: input.fit ?? "",
        care: input.care ?? "",
        brand: input.brand ?? "NORVA",
        status: input.status ?? "DRAFT",
        featured: input.featured ?? false,
        price: input.price,
        compareAt: input.compareAt ?? null,
        cost: input.cost ?? null,
        currency: input.currency ?? "USD",
        tags: input.tags ?? [],
        sizes,
        colors,
        categoryId: input.categoryId,
        seoTitle: input.seoTitle ?? "",
        seoDescription: input.seoDescription ?? "",
        publishedAt: input.status === "ACTIVE" ? new Date() : null,
        images: {
          create: input.images.map((image: any, index: number) => ({
            url: image.url,
            alt: image.alt ?? input.name,
            publicId: image.publicId ?? "",
            position: image.position ?? index,
          })),
        },
        variants: {
          create: input.variants.map((variant: any, index: number) => ({
            sku: variant.sku ?? skuFor(input.name, variant.size, variant.color, index),
            size: variant.size,
            color: variant.color,
            colorHex: variant.colorHex ?? "",
            price: variant.price ?? null,
            compareAt: variant.compareAt ?? null,
            stock: variant.stock,
            lowStockThreshold: variant.lowStockThreshold ?? 3,
            isActive: variant.isActive ?? true,
          })),
        },
      },
      include: productInclude,
    });

    if (input.variants.some((v: any) => v.stock > 0)) {
      await tx.inventoryMovement.createMany({
        data: input.variants
          .filter((v: any) => v.stock > 0)
          .map((v: any, index: number) => ({
            productId: product.id,
            variantId: product.variants.find((pv: any) => pv.size === v.size && pv.color === v.color)?.id,
            delta: v.stock,
            reason: "RESTOCK" as const,
            note: "Initial stock",
          })),
      });
    }

    return product;
  }).then(async (product) => {
    await cache.del("catalog:facets");
    return product;
  });
}

export async function updateProduct(id: string, input: any) {
  const existing = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!existing) throw new AppError(404, "Product not found");

  const result = await prisma.$transaction(async (tx) => {
    if (input.images) {
      await tx.productImage.deleteMany({ where: { productId: id } });
    }

    const data: Prisma.ProductUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.story !== undefined ? { story: input.story } : {}),
      ...(input.material !== undefined ? { material: input.material } : {}),
      ...(input.fit !== undefined ? { fit: input.fit } : {}),
      ...(input.care !== undefined ? { care: input.care } : {}),
      ...(input.brand !== undefined ? { brand: input.brand } : {}),
      ...(input.featured !== undefined ? { featured: input.featured } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.compareAt !== undefined ? { compareAt: input.compareAt } : {}),
      ...(input.cost !== undefined ? { cost: input.cost } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.sizes !== undefined ? { sizes: input.sizes } : {}),
      ...(input.colors !== undefined ? { colors: input.colors } : {}),
      ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
      ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription } : {}),
      ...(input.categoryId !== undefined ? { category: { connect: { id: input.categoryId } } } : {}),
      ...(input.status !== undefined
        ? {
            status: input.status,
            publishedAt:
              input.status === "ACTIVE" ? existing.publishedAt ?? new Date() : existing.publishedAt,
          }
        : {}),
      ...(input.images
        ? {
            images: {
              create: input.images.map((image: any, index: number) => ({
                url: image.url,
                alt: image.alt ?? input.name ?? existing.name,
                publicId: image.publicId ?? "",
                position: image.position ?? index,
              })),
            },
          }
        : {}),
    };

    const product = await tx.product.update({ where: { id }, data, include: productInclude });

    // Variants are upserted by (size, color) so existing stock and order history survive.
    if (input.variants) {
      const keepIds: string[] = [];
      for (const [index, variant] of input.variants.entries()) {
        const match = existing.variants.find(
          (v) => v.size === variant.size && v.color === variant.color,
        );
        if (match) {
          keepIds.push(match.id);
          await tx.productVariant.update({
            where: { id: match.id },
            data: {
              stock: variant.stock,
              price: variant.price ?? null,
              compareAt: variant.compareAt ?? null,
              lowStockThreshold: variant.lowStockThreshold ?? match.lowStockThreshold,
              isActive: variant.isActive ?? true,
              colorHex: variant.colorHex ?? match.colorHex,
            },
          });
        } else {
          const created = await tx.productVariant.create({
            data: {
              productId: id,
              sku: variant.sku ?? skuFor(product.name, variant.size, variant.color, index),
              size: variant.size,
              color: variant.color,
              colorHex: variant.colorHex ?? "",
              price: variant.price ?? null,
              compareAt: variant.compareAt ?? null,
              stock: variant.stock,
              lowStockThreshold: variant.lowStockThreshold ?? 3,
              isActive: variant.isActive ?? true,
            },
          });
          keepIds.push(created.id);
        }
      }
      // Variants that still exist in carts/orders are deactivated, never deleted.
      await tx.productVariant.updateMany({
        where: { productId: id, id: { notIn: keepIds } },
        data: { isActive: false },
      });
    }

    return product;
  });

  await cache.del("catalog:facets");
  return result;
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(404, "Product not found");
  // Archive rather than hard-delete so historical orders stay intact.
  const archived = await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  await cache.del("catalog:facets");
  return archived;
}

export async function recalculateRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { rating: agg._avg.rating ?? 0, ratingCount: agg._count._all },
  });
}
