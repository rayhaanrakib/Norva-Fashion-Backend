import { Router } from "express";
import { z } from "zod";
import checkAuth from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import { slugify } from "../../utils/slug";

const router = Router();

const postSchema = z.object({
  title: z.string().min(3).max(160),
  slug: z.string().max(160).optional(),
  excerpt: z.string().max(320).optional(),
  body: z.string().max(20000).optional(),
  coverImage: z.string().max(500).optional(),
  category: z.string().max(40).optional(),
  readTime: z.coerce.number().int().min(1).max(60).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

router.get(
  "/",
  tryCatchAsync(async (req, res) => {
    const category = req.query.category ? String(req.query.category) : undefined;
    const posts = await prisma.journalPost.findMany({
      where: { status: "PUBLISHED", ...(category ? { category } : {}) },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        category: true,
        readTime: true,
        publishedAt: true,
      },
    });
    sendResponse(res, 200, "Journal", posts);
  }),
);

router.get(
  "/:slug",
  tryCatchAsync(async (req, res) => {
    const post = await prisma.journalPost.findUnique({
      where: { slug: String(req.params.slug) },
      include: { author: { select: { name: true } } },
    });
    if (!post || post.status !== "PUBLISHED") throw new AppError(404, "Story not found");
    sendResponse(res, 200, "Story", post);
  }),
);

router.get("/admin/all", checkAuth("ADMIN", "MANAGER", "STAFF"), async (_req, res) => {
  const posts = await prisma.journalPost.findMany({ orderBy: { createdAt: "desc" } });
  sendResponse(res, 200, "All stories", posts);
});

router.post(
  "/",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(postSchema),
  tryCatchAsync(async (req, res) => {
    const post = await prisma.journalPost.create({
      data: {
        ...req.body,
        slug: slugify(req.body.slug ?? req.body.title),
        authorId: req.user!.id,
        publishedAt: req.body.status === "PUBLISHED" ? new Date() : null,
      },
    });
    sendResponse(res, 201, "Story created", post);
  }),
);

router.patch(
  "/:id",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(postSchema.partial()),
  tryCatchAsync(async (req, res) => {
    const post = await prisma.journalPost.update({
      where: { id: String(req.params.id) },
      data: {
        ...req.body,
        ...(req.body.slug ? { slug: slugify(req.body.slug) } : {}),
        ...(req.body.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      },
    });
    sendResponse(res, 200, "Story updated", post);
  }),
);

router.delete(
  "/:id",
  checkAuth("ADMIN"),
  tryCatchAsync(async (req, res) => {
    await prisma.journalPost.delete({ where: { id: String(req.params.id) } });
    sendResponse(res, 200, "Story deleted");
  }),
);

export default router;
