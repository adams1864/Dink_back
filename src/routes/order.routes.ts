import express from "express";
import { createOrder, getOrder, getOrders, searchOrders, updateOrderStatus } from "../controllers/order.controller.js";

const router = express.Router();

router.post("/", createOrder);
router.get("/search", searchOrders);
router.get("/", getOrders);
router.get("/:id", getOrder);
router.patch("/:id/status", updateOrderStatus);

export default router;
