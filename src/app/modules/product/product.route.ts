import { Router } from "express";
import checkAuth from "../../middleware/checkAuth";
import { publicLimiter } from "../../middleware/rateLimiter";
import validateRequest from "../../middleware/validateRequest";
import * as productController from "./product.controller";
import { productQuerySchema, productSchema, statusSchema } from "./product.validation";

const router = Router();

// Public storefront
router.get("/", publicLimiter, productController.listProducts);
router.get("/facets", productController.getFacets);
router.get("/search", productController.search);
router.get("/featured", productController.featured);
router.get("/new-arrivals", productController.newArrivals);
router.get("/best-sellers", productController.bestSellers);
router.get("/id/:id/related", productController.getRelated);
router.get("/:slug", productController.getProduct);

// Admin
router.get("/admin/all", checkAuth("ADMIN", "MANAGER", "STAFF"), productController.listAdminProducts);
router.post(
  "/",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(productSchema),
  productController.createProduct,
);
router.patch(
  "/:id",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(productSchema.partial()),
  productController.updateProduct,
);
router.patch(
  "/:id/status",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(statusSchema),
  productController.updateStatus,
);
router.delete("/:id", checkAuth("ADMIN"), productController.deleteProduct);

export default router;
