import type { Request, Response } from "express";
import { getPagination } from "../../utils/pagination";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import * as productService from "./product.service";

export const listProducts = tryCatchAsync(async (req, res) => {
  const { items, meta } = await productService.listProducts(req.query as any);
  sendResponse(res, 200, "Products retrieved", items, meta);
});

export const listAdminProducts = tryCatchAsync(async (req, res) => {
  const { items, meta } = await productService.listProducts(req.query as any, true);
  sendResponse(res, 200, "Products retrieved", items, meta);
});

export const getProduct = tryCatchAsync(async (req, res) => {
  const product = await productService.getProductBySlug(String(req.params.slug));
  sendResponse(res, 200, "Product retrieved", product);
});

export const getRelated = tryCatchAsync(async (req, res) => {
  const related = await productService.getRelated(String(req.params.id), Number(req.query.limit) || 8);
  sendResponse(res, 200, "Related products", related);
});

export const getFacets = tryCatchAsync(async (_req, res) => {
  const facets = await productService.getFacets();
  sendResponse(res, 200, "Catalog facets", facets);
});

export const featured = tryCatchAsync(async (req, res) => {
  const { items } = await productService.listProducts({
    page: 1,
    limit: Number(req.query.limit) || 8,
    sort: "featured",
  });
  sendResponse(res, 200, "Featured products", items);
});

export const newArrivals = tryCatchAsync(async (req, res) => {
  const { items } = await productService.listProducts({
    page: 1,
    limit: Number(req.query.limit) || 8,
    sort: "newest",
  });
  sendResponse(res, 200, "New arrivals", items);
});

export const bestSellers = tryCatchAsync(async (req, res) => {
  const { items } = await productService.listProducts({
    page: 1,
    limit: Number(req.query.limit) || 8,
    sort: "bestselling",
  });
  sendResponse(res, 200, "Best sellers", items);
});

export const createProduct = tryCatchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  sendResponse(res, 201, "Product created", product);
});

export const updateProduct = tryCatchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(String(req.params.id), req.body);
  sendResponse(res, 200, "Product updated", product);
});

export const updateStatus = tryCatchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(String(req.params.id), { status: req.body.status });
  sendResponse(res, 200, `Product ${req.body.status.toLowerCase()}`, product);
});

export const deleteProduct = tryCatchAsync(async (req: Request, res: Response) => {
  await productService.deleteProduct(String(req.params.id));
  sendResponse(res, 200, "Product archived");
});

export const search = tryCatchAsync(async (req, res) => {
  const q = String(req.query.q ?? "");
  const { limit } = getPagination(req.query as any);
  const { items, meta } = await productService.listProducts({ search: q, limit, page: 1 });
  sendResponse(
    res,
    200,
    "Search results",
    items.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      compareAt: p.compareAt,
      image: p.images[0]?.url ?? "",
      category: p.category,
      rating: p.rating,
    })),
    meta,
  );
});
