import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(80).optional(),
  tagline: z.string().max(140).optional(),
  description: z.string().max(1200).optional(),
  heroImage: z.string().url().or(z.string().startsWith("/")).optional(),
  position: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().uuid().nullable().optional(),
});
