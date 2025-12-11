import type { Request, Response } from "express";
import { and, desc, eq, like, or, inArray } from "drizzle-orm";
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
  const { items, customerName, customerEmail, customerPhone, address, selectedSize, selectedColor, deliveryPreferences, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "No items in order" });
  }

  if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.trim().length === 0) {
    return res.status(400).json({ message: "Customer phone is required" });
  }

  try {
    // Removed transaction - Neon HTTP driver doesn't support transactions
    let totalCents = 0;
    const finalItems = [];

    for (const item of items) {
      const productId = Number(item?.productId);
      const quantity = Number(item?.quantity ?? 0);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product id" });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      const [product] = await db.select().from(products).where(eq(products.id, productId));

      if (!product) {
        return res.status(404).json({ message: `Product ${productId} not found` });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      const price = Number(product.price);
      const priceCents = Math.round(price * 100);
      totalCents += priceCents * quantity;
      finalItems.push({
        productId,
        quantity,
        price,
        priceCents,
        productName: product.name,
      });
    }

    // Create order
    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber: `ORD-${Date.now()}`,
        customerName,
        customerEmail,
        customerPhone: customerPhone.trim(),
        address: address || "",
        selectedSize: selectedSize || null,
        selectedColor: selectedColor || null,
        deliveryPreferences: deliveryPreferences || null,
        notes: notes || null,
        totalCents,
        status: "pending",
      })
      .returning();

    // Insert order items
    for (const fi of finalItems) {
      await db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: fi.productId,
        productName: fi.productName,
        quantity: fi.quantity,
        price: fi.price,
        priceCents: fi.priceCents,
      });
    }

    // Update product stock
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      
      const [product] = await db.select().from(products).where(eq(products.id, productId));
      if (product) {
        await db
          .update(products)
          .set({ stock: product.stock - quantity })
          .where(eq(products.id, productId));
      }
    }

    return res.status(201).json(newOrder);
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

  const [orderRow] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!orderRow) {
    return res.status(404).json({ message: "Order not found" });
  }

  const itemRows = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      price: orderItems.price,
      productName: products.name,
      productPrice: products.price,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, id));

  const items = itemRows.map((row) => {
    const priceNumber = Number(row.price);
    return {
      id: row.id,
      productId: row.productId,
      quantity: row.quantity,
      price: Number.isFinite(priceNumber) ? priceNumber : 0,
      priceCents: Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : 0,
      productName: row.productName ?? "",
      productPrice: Number(row.productPrice ?? priceNumber ?? 0),
    };
  });

  const total = Number.isFinite(orderRow.totalCents) ? orderRow.totalCents / 100 : 0;

  res.json({ ...orderRow, total, items });
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const validStatuses = ["pending", "paid", "completed", "cancelled", "refunded", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Get current order
    const [currentOrder] = await db.select().from(orders).where(eq(orders.id, id));
    
    if (!currentOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If status is changing to "paid" and wasn't paid before, decrement stock
    if (status === "paid" && currentOrder.status !== "paid") {
      // Get order items
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
      
      // Decrement stock for each product
      for (const item of items) {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        
        if (product) {
          const newStock = product.stock - item.quantity;
          
          if (newStock < 0) {
            return res.status(400).json({ 
              message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
            });
          }
          
          await db
            .update(products)
            .set({ stock: newStock })
            .where(eq(products.id, item.productId));
        }
      }
    }

    // Update order status
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    res.json(updatedOrder);
  } catch (error: any) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: error.message || "Failed to update order status" });
  }
};
