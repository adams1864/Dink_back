import express from "express";
import {
  getSalesSummary,
  getSalesTrends,
  getTopProducts,
  getStatusCounts,
} from "../controllers/sales.controller.js";

const router = express.Router();

router.get("/summary", getSalesSummary);
router.get("/trends", getSalesTrends);
router.get("/top-products", getTopProducts);
router.get("/status-counts", getStatusCounts);

export default router;
