import { Router } from "express";
import checkAuth from "../../middleware/checkAuth";
import { upload } from "../../lib/multer";
import * as uploadController from "./upload.controller";

const router = Router();

router.post("/image", checkAuth("ADMIN", "MANAGER", "STAFF"), upload.single("image"), uploadController.uploadImage);

export default router;
