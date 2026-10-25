import { Router } from "express";
import checkAuth from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import { upload } from "../../lib/multer";
import * as userController from "./user.controller";
import * as uploadController from "../upload/upload.controller";
import {
  addressSchema,
  adminUpdateUserSchema,
  changePasswordSchema,
  updateMeSchema,
} from "./user.validation";

const router = Router();

// Self-service
router.get("/me", checkAuth(), userController.me);
router.patch("/me", checkAuth(), validateRequest(updateMeSchema), userController.updateMe);
router.post(
  "/me/avatar",
  checkAuth(),
  upload.single("image"),
  uploadController.uploadAvatar,
);
router.patch(
  "/me/password",
  checkAuth(),
  validateRequest(changePasswordSchema),
  userController.changePassword,
);
router.get("/me/addresses", checkAuth(), userController.listAddresses);
router.post("/me/addresses", checkAuth(), validateRequest(addressSchema), userController.createAddress);
router.patch(
  "/me/addresses/:id",
  checkAuth(),
  validateRequest(addressSchema.partial()),
  userController.updateAddress,
);
router.delete("/me/addresses/:id", checkAuth(), userController.deleteAddress);

// Admin
router.get("/", checkAuth("ADMIN", "MANAGER"), userController.listUsers);
router.get("/:id", checkAuth("ADMIN", "MANAGER"), userController.getUser);
router.patch(
  "/:id",
  checkAuth("ADMIN"),
  validateRequest(adminUpdateUserSchema),
  userController.updateUser,
);
router.delete("/:id", checkAuth("ADMIN"), userController.deleteUser);

export default router;
