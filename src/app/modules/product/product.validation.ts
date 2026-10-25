import { z } from "zod";

const colorSchema = z.object({
  name: z.string().min(1).max(30),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour"),
});

const imageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().max(160).optional(),
  publicId: z.string().optional(),
  position: z.coerce.number().int().min(0).optional(),
});

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(2).max(48).optional(),
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(30),
  colorHex: z.string().optional(),
  price: z.coerce.number().min(0).optional().nullable(),
  compareAt: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).max(100000),
  lowStockThreshold: z.coerce.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).optional(),
  subtitle: z.string().max(160).optional(),
  description: z.string().max(4000).optional(),
  story: z.string().max(6000).optional(),
  material: z.string().max(160).optional(),
  fit: z.string().max(60).optional(),
  care: z.string().max(600).optional(),
  brand: z.string().max(60).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  featured: z.boolean().optional(),
  price: z.coerce.number().min(0),
  compareAt: z.coerce.number().min(0).nullable().optional(),
  cost: z.coerce.number().min(0).nullable().optional(),
  currency: z.string().length(3).optional(),
  tags: z.array(z.string().max(24)).max(12).optional(),
  categoryId: z.string().uuid(),
  seoTitle: z.string().max(160).optional(),
  seoDescription: z.string().max(320).optional(),
  images: z.array(imageSchema).min(1, "Add at least one image").max(12),
  variants: z.array(variantSchema).min(1, "Add at least one variant").max(400),
  sizes: z.array(z.string().max(20)).optional(),
  colors: z.array(colorSchema).optional(),
});

export const productQuerySchema = z.object({
  search: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  categories: z.string().max(400).optional(),
  sizes: z.string().max(200).optional(),
  colors: z.string().max(400).optional(),
  tags: z.string().max(200).optional(),
  material: z.string().max(120).optional(),
  fit: z.string().max(120).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(["true", "false"]).optional(),
  sort: z
    .enum(["featured", "newest", "price-asc", "price-desc", "rating", "bestselling"])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const statusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});
