import type { Request, Response } from "express";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, orderItems, products } from "../db/schema.js";

const buildSearchPredicate = (term: string) => {
  const pattern = `%${term}%`;
  return or(
    like(orders.orderNumber, pattern),
    like(orders.customerName, pattern),
    like(orders.customerEmail, pattern)
  );
};

export const createOrder = async (req: Request, res: Response) => {
  const { items, customerName, customerEmail, address } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "No items in order" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      let totalAmount = 0;
      const finalItems = [];

      for (const item of items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        await tx
          .update(products)
          .set({ stock: product.stock - item.quantity })
          .where(eq(products.id, item.productId));

        totalAmount += Number(product.price) * item.quantity;
        finalItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: Number(product.price),
        });
      }

      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNumber: `ORD-${Date.now()}`,
          customerName,
          customerEmail,
          address: address || "",
          totalCents: Math.round(totalAmount * 100),
          status: "pending",
        })
        .returning();

      for (const fi of finalItems) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          productId: fi.productId,
          quantity: fi.quantity,
          price: fi.price.toString(),
        });
      }

      return newOrder;
    });

    return res.status(201).json(result);
  } catch (error: any) {
    console.error("Order failed:", error);
    return res.status(500).json({ message: error.message || "Failed to place order" });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  const clauses = [] as any[];

  if (typeof req.query.status === "string" && req.query.status.trim().length > 0) {
    clauses.push(eq(orders.status, req.query.status.trim()));
  }

  if (typeof req.query.q === "string" && req.query.q.trim().length > 0) {
    clauses.push(buildSearchPredicate(req.query.q.trim()));
  }

  const whereClause =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);

  const baseQuery = db.select().from(orders);
  const statement = whereClause ? baseQuery.where(whereClause) : baseQuery;
  const rows = await statement.orderBy(desc(orders.createdAt));
  res.json(rows);
};

export const searchOrders = async (req: Request, res: Response) => {
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!search) {
    return res.status(400).json({ message: "Missing required query parameter: q" });
  }

  const rows = await db
    .select()
    .from(orders)
    .where(buildSearchPredicate(search))
    .orderBy(desc(orders.createdAt))
    .limit(25);

  res.json(rows);
};

export const getOrder = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const row = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (row.length === 0) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json(row[0]);
};
