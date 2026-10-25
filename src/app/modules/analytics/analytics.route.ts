import { Router } from "express";
import checkAuth from "../../middleware/checkAuth";
import { sendResponse } from "../../utils/sendResponse";
import { tryCatchAsync } from "../../utils/tryCatchAsync";
import * as analyticsService from "./analytics.service";

const router = Router();

router.get(
  "/dashboard",
  checkAuth("ADMIN", "MANAGER", "STAFF"),
  tryCatchAsync(async (req, res) => {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
    const data = await analyticsService.dashboard(days);
    sendResponse(res, 200, "Dashboard analytics", data);
  }),
);

router.get(
  "/summary",
  checkAuth("ADMIN", "MANAGER", "STAFF"),
  tryCatchAsync(async (req, res) => {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
    sendResponse(res, 200, "Summary", await analyticsService.summary(days));
  }),
);

router.get(
  "/revenue",
  checkAuth("ADMIN", "MANAGER", "STAFF"),
  tryCatchAsync(async (req, res) => {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
    sendResponse(res, 200, "Revenue series", await analyticsService.revenueSeries(days));
  }),
);

router.get(
  "/products",
  checkAuth("ADMIN", "MANAGER", "STAFF"),
  tryCatchAsync(async (_req, res) => {
    sendResponse(res, 200, "Top products", await analyticsService.topProducts());
  }),
);

router.get(
  "/me",
  checkAuth("CUSTOMER"),
  tryCatchAsync(async (req, res) => {
    sendResponse(res, 200, "Your insights", await analyticsService.customerInsights(req.user!.id));
  }),
);

export default router;
