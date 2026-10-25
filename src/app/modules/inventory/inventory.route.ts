import { Router } from "express";
import checkAuth from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import * as inventoryController from "./inventory.controller";
import { adjustSchema, thresholdSchema } from "./inventory.validation";

const router = Router();

router.get("/", checkAuth("ADMIN", "MANAGER", "STAFF"), inventoryController.overview);
router.get("/movements", checkAuth("ADMIN", "MANAGER", "STAFF"), inventoryController.movements);
router.post(
  "/adjust",
  checkAuth("ADMIN", "MANAGER", "STAFF"),
  validateRequest(adjustSchema),
  inventoryController.adjust,
);
router.patch(
  "/variants/:variantId/threshold",
  checkAuth("ADMIN", "MANAGER"),
  validateRequest(thresholdSchema),
  inventoryController.updateThreshold,
);

export default router;
