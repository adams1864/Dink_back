import type { Request, Response } from "express";
import { sql, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { bundles, orders, products } from "../db/schema.js";

export const getMeta = async (_req: Request, res: Response) => {
  const allowedRevenueStatuses = ["paid", "completed"] as const;

  const [productCount] = await db.select({ value: sql<number>`count(*)` }).from(products);
  const [bundleCount] = await db.select({ value: sql<number>`count(*)` }).from(bundles);
  const [orderCount] = await db.select({ value: sql<number>`count(*)` }).from(orders);
  const [revenueRow] = await db
    .select({ value: sql<number>`coalesce(sum(${orders.totalCents}), 0)` })
    .from(orders)
    .where(inArray(orders.status, allowedRevenueStatuses));

  const productsTotal = Number(productCount?.value ?? 0);
  const bundlesTotal = Number(bundleCount?.value ?? 0);
  const ordersTotal = Number(orderCount?.value ?? 0);
  const revenueCents = Number(revenueRow?.value ?? 0);

  return res.json({
    products: Number.isFinite(productsTotal) ? productsTotal : 0,
    bundles: Number.isFinite(bundlesTotal) ? bundlesTotal : 0,
    orders: Number.isFinite(ordersTotal) ? ordersTotal : 0,
    leads: 0,
    discounts: 0,
    revenue: Number.isFinite(revenueCents) ? revenueCents / 100 : 0,
  });
};
