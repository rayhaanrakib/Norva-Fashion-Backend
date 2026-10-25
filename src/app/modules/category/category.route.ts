import { Router } from "express";
import checkAuth from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import * as categoryController from "./category.controller";
import { categorySchema } from "./category.validation";

const router = Router();

router.get("/", categoryController.listCategories);
router.get("/admin/all", checkAuth("ADMIN", "MANAGER", "STAFF"), categoryController.listAllCategories);
router.get("/:slug", categoryController.getCategory);

router.post(
  "/",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(categorySchema),
  categoryController.createCategory,
);
router.patch(
  "/:id",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(categorySchema.partial()),
  categoryController.updateCategory,
);
router.delete("/:id", checkAuth("ADMIN", "MANAGER"), categoryController.deleteCategory);

export default router;
