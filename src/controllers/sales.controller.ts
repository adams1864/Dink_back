import type { Request, Response } from "express";
import { and, asc, desc, eq, gte, lte, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { orderItems, orders, products } from "../db/schema.js";

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;
const revenueStatuses = ["paid", "completed"] as const;

type Range = { start: Date; end: Date; rangeDays: number };

function parseRangeDays(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_RANGE_DAYS;
  return Math.min(Math.round(parsed), MAX_RANGE_DAYS);
}

function buildRange(query: Request["query"]): Range {
  const rangeDays = parseRangeDays((query.rangeDays as string) ?? (query.days as string));
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (rangeDays - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end, rangeDays };
}

function buildDateWhere(range: Range) {
  return and(gte(orders.createdAt, range.start), lte(orders.createdAt, range.end));
}

export async function getSalesSummary(req: Request, res: Response) {
  try {
    const range = buildRange(req.query);
    const dateWhere = buildDateWhere(range);

    const [row] = await db
      .select({
        revenueCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} in ('paid','completed')), 0)`,
        orderCount: sql<number>`count(*)`,
        avgOrderValueCents: sql<number>`coalesce(avg(${orders.totalCents}) filter (where ${orders.status} in ('paid','completed')), 0)`,
        pendingValueCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} = 'pending'), 0)`,
        pendingCount: sql<number>`count(*) filter (where ${orders.status} = 'pending')`,
        paidCount: sql<number>`count(*) filter (where ${orders.status} = 'paid')`,
        completedCount: sql<number>`count(*) filter (where ${orders.status} = 'completed')`,
        cancelledCount: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')`,
      })
      .from(orders)
      .where(dateWhere);

    const revenue = Number(row?.revenueCents ?? 0) / 100;
    const ordersCount = Number(row?.orderCount ?? 0);
    const avgOrderValue = Number(row?.avgOrderValueCents ?? 0) / 100;
    const pendingValue = Number(row?.pendingValueCents ?? 0) / 100;

    res.json({
      rangeDays: range.rangeDays,
      from: range.start.toISOString(),
      to: range.end.toISOString(),
      revenue: Number.isFinite(revenue) ? revenue : 0,
      orders: Number.isFinite(ordersCount) ? ordersCount : 0,
      averageOrderValue: Number.isFinite(avgOrderValue) ? avgOrderValue : 0,
      pendingValue: Number.isFinite(pendingValue) ? pendingValue : 0,
      pendingCount: Number(row?.pendingCount ?? 0),
      paidCount: Number(row?.paidCount ?? 0),
      completedCount: Number(row?.completedCount ?? 0),
      cancelledCount: Number(row?.cancelledCount ?? 0),
    });
  } catch (error: any) {
    console.error("Failed to load sales summary", error);
    res.status(500).json({ message: error?.message || "Failed to load sales summary" });
  }
}

export async function getSalesTrends(req: Request, res: Response) {
  try {
    const range = buildRange(req.query);
    const dateWhere = buildDateWhere(range);
    const bucket = sql`date_trunc('day', ${orders.createdAt})`;

    const rows = await db
      .select({
        bucket: sql<string>`to_char(${bucket}, 'YYYY-MM-DD')`,
        revenueCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} in ('paid','completed')), 0)`,
        orderCount: sql<number>`count(*)`,
      })
      .from(orders)
      .where(dateWhere)
      .groupBy(bucket)
      .orderBy(asc(bucket));

    const seriesMap = new Map<string, { revenue: number; orders: number }>();
    rows.forEach((row) => {
      const revenue = Number(row.revenueCents ?? 0) / 100;
      const ordersCount = Number(row.orderCount ?? 0);
      seriesMap.set(row.bucket, {
        revenue: Number.isFinite(revenue) ? revenue : 0,
        orders: Number.isFinite(ordersCount) ? ordersCount : 0,
      });
    });

    const points: Array<{ date: string; revenue: number; orders: number }> = [];
    const cursor = new Date(range.start);
    while (cursor <= range.end) {
      const key = cursor.toISOString().slice(0, 10);
      const existing = seriesMap.get(key) ?? { revenue: 0, orders: 0 };
      points.push({ date: key, revenue: existing.revenue, orders: existing.orders });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({ rangeDays: range.rangeDays, from: range.start.toISOString(), to: range.end.toISOString(), points });
  } catch (error: any) {
    console.error("Failed to load sales trends", error);
    res.status(500).json({ message: error?.message || "Failed to load sales trends" });
  }
}

export async function getTopProducts(req: Request, res: Response) {
  try {
    const range = buildRange(req.query);
    const dateWhere = buildDateWhere(range);
    const limitParam = Number(req.query.limit);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.round(limitParam), 25) : 5;

    const rows = await db
      .select({
        productId: products.id,
        name: products.name,
        coverImage: products.coverImage,
        stock: products.stock,
        quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        revenueCents: sql<number>`coalesce(sum(${orderItems.quantity} * ${orderItems.price} * 100), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(and(dateWhere, inArray(orders.status, revenueStatuses)))
      .groupBy(products.id, products.name, products.coverImage, products.stock)
      .orderBy(desc(sql`coalesce(sum(${orderItems.quantity} * ${orderItems.price} * 100), 0)`))
      .limit(limit);

    const productsResult = rows.map((row) => {
      const revenue = Number(row.revenueCents ?? 0) / 100;
      const quantity = Number(row.quantity ?? 0);
      return {
        productId: row.productId,
        name: row.name,
        coverImage: row.coverImage ?? "",
        stock: Number(row.stock ?? 0),
        quantity: Number.isFinite(quantity) ? quantity : 0,
        revenue: Number.isFinite(revenue) ? revenue : 0,
      };
    });

    res.json({
      rangeDays: range.rangeDays,
      from: range.start.toISOString(),
      to: range.end.toISOString(),
      products: productsResult,
    });
  } catch (error: any) {
    console.error("Failed to load top products", error);
    res.status(500).json({ message: error?.message || "Failed to load top products" });
  }
}

export async function getStatusCounts(req: Request, res: Response) {
  try {
    const range = buildRange(req.query);
    const dateWhere = buildDateWhere(range);

    const rows = await db
      .select({
        status: orders.status,
        count: sql<number>`count(*)`,
      })
      .from(orders)
      .where(dateWhere)
      .groupBy(orders.status);

    res.json({
      rangeDays: range.rangeDays,
      from: range.start.toISOString(),
      to: range.end.toISOString(),
      statuses: rows.map((row) => ({ status: row.status ?? "unknown", count: Number(row.count ?? 0) })),
    });
  } catch (error: any) {
    console.error("Failed to load status counts", error);
    res.status(500).json({ message: error?.message || "Failed to load status counts" });
  }
}
