import type { Request, Response } from "express";
import { and, desc, eq, like, or, inArray, asc, sql, gt } from "drizzle-orm";
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

    return res.status(201).json(newOrder);
  } catch (error: any) {
    console.error("Order failed:", error);
    return res.status(500).json({ message: error.message || "Failed to place order" });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  const clauses = [] as any[];

  const statusFilter = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (statusFilter) {
    clauses.push(eq(orders.status, statusFilter));
  }

  if (search) {
    clauses.push(buildSearchPredicate(search));
  }

  const whereClause =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);

  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20));
  const offset = (page - 1) * perPage;

  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

  let sortColumn = orders.createdAt;
  if (sortBy === "status") sortColumn = orders.status;
  if (sortBy === "total") sortColumn = orders.totalCents;

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(whereClause ?? sql`true`);

  const total = Number(totalRow?.count ?? 0);

  const baseQuery = db.select().from(orders);
  const statement = whereClause ? baseQuery.where(whereClause) : baseQuery;
  const rows = await statement
    .orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn))
    .limit(perPage)
    .offset(offset);

  res.json({
    data: rows,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      sortBy,
      sortOrder,
      status: statusFilter || undefined,
      q: search || undefined,
    },
  });
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

export const getNewOrdersSince = async (req: Request, res: Response) => {
  try {
    const sinceRaw = typeof req.query.since === "string" ? req.query.since.trim() : "";

    if (!sinceRaw) {
      const [latestRow] = await db
        .select({ latestCreatedAt: sql<Date | null>`max(${orders.createdAt})` })
        .from(orders);

      return res.json({ newCount: 0, latestCreatedAt: latestRow?.latestCreatedAt ?? null });
    }

    const sinceDate = new Date(sinceRaw);
    if (Number.isNaN(sinceDate.getTime())) {
      return res.status(400).json({ message: "Invalid since parameter" });
    }

    const [row] = await db
      .select({
        newCount: sql<number>`count(*)`,
        latestCreatedAt: sql<Date | null>`max(${orders.createdAt})`,
      })
      .from(orders)
      .where(gt(orders.createdAt, sinceDate));

    res.json({
      newCount: Number(row?.newCount ?? 0),
      latestCreatedAt: row?.latestCreatedAt ?? null,
    });
  } catch (error: any) {
    console.error("Error checking for new orders:", error);
    res.status(500).json({ message: error.message || "Failed to check new orders" });
  }
};

export const exportOrdersCsv = async (req: Request, res: Response) => {
  const clauses = [] as any[];
  const statusFilter = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (statusFilter) clauses.push(eq(orders.status, statusFilter));
  if (search) clauses.push(buildSearchPredicate(search));

  const whereClause =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);

  const rows = await (whereClause
    ? db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt))
    : db.select().from(orders).orderBy(desc(orders.createdAt)));

  const header = [
    "orderNumber",
    "customerName",
    "customerEmail",
    "customerPhone",
    "status",
    "total",
    "createdAt",
  ];

  const csvLines = [header.join(",")];
  for (const row of rows) {
    const total = row.totalCents ? Number(row.totalCents) / 100 : 0;
    const line = [
      row.orderNumber,
      row.customerName,
      row.customerEmail,
      (row as any).customerPhone ?? "",
      row.status,
      total.toFixed(2),
      row.createdAt ? new Date(row.createdAt as any).toISOString() : "",
    ]
      .map((value) => {
        const str = String(value ?? "");
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(",");
    csvLines.push(line);
  }

  const csv = csvLines.join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
  res.send(csv);
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
