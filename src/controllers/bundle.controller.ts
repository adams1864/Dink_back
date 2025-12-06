import path from "path";
import type { Request, Response } from "express";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  like,
  sql,
  type InferSelectModel,
} from "drizzle-orm";
import { db } from "../db/index.js";
import { bundles, bundleProducts, products } from "../db/schema.js";
import { mapProductRow, toIsoString } from "./product.controller.js";

type BundleRow = InferSelectModel<typeof bundles>;

interface BundlePayload {
  title?: string;
  description?: string;
  status?: string;
  coverImage?: string;
  productIds?: number[];
}

const PLACEHOLDER_BUNDLE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'%3E%3Crect width='600' height='800' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' fill='%236b7280' font-size='32' text-anchor='middle' font-family='system-ui' dy='.35em'%3ENo Image%3C/text%3E%3C/svg%3E";

const SORTABLE_COLUMNS = {
  createdAt: bundles.createdAt,
  title: bundles.title,
  status: bundles.status,
} as const;

function parseNumericQuery(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function normalizeStatus(value: unknown): "published" | "unpublished" {
  return value === "published" ? "published" : "unpublished";
}

function normalizeMediaPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveUploadedPath(file?: Express.Multer.File | null): string | null {
  if (!file) return null;
  return `/uploads/${path.basename(file.path)}`;
}

function parseProductIds(value: unknown): number[] {
  const collectNumbers = (items: unknown[]): number[] =>
    items
      .map((entry) => Number(entry))
      .filter((id) => Number.isInteger(id) && id > 0);

  if (Array.isArray(value)) {
    const flattened = value.flatMap((entry) => (typeof entry === "string" ? entry.split(",") : entry));
    return Array.from(new Set(collectNumbers(flattened)));
  }

  if (typeof value === "string") {
    try {
      const asJson = JSON.parse(value);
      if (Array.isArray(asJson)) {
        return Array.from(new Set(collectNumbers(asJson)));
      }
    } catch (_) {
      const numeric = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      return Array.from(new Set(collectNumbers(numeric)));
    }
  }

  return [];
}

async function validateProductIds(ids: number[]) {
  if (ids.length === 0) {
    return { valid: [] as number[], missing: [] as number[] };
  }

  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(inArray(products.id, ids));

  const validSet = new Set(rows.map((row) => row.id));
  const valid = ids.filter((id) => validSet.has(id));
  const missing = ids.filter((id) => !validSet.has(id));

  return { valid, missing };
}

function extractInsertId(result: unknown): number | null {
  if (!result) return null;

  if (Array.isArray(result)) {
    const [first] = result as Array<Record<string, unknown>>;
    const candidate = first?.insertId ?? first?.id;
    if (typeof candidate === "number" || typeof candidate === "bigint") {
      return Number(candidate);
    }
    return null;
  }

  const candidate =
    (result as Record<string, unknown>).insertId ??
    (result as Record<string, unknown>).id;
  if (typeof candidate === "number" || typeof candidate === "bigint") {
    return Number(candidate);
  }
  return null;
}

type BundleWithProducts = BundleRow & {
  products: ReturnType<typeof mapProductRow>[];
  productIds: number[];
};

function buildFilters(query: Request["query"]) {
  const conditions = [] as any[];
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const status = typeof query.status === "string" ? query.status.trim() : "";

  if (search) {
    conditions.push(like(bundles.title, `%${search}%`));
  }

  if (status && ["published", "unpublished"].includes(status)) {
    conditions.push(eq(bundles.status, status as any));
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

function mapBundleRow(row: BundleWithProducts) {
  const coverImage = normalizeMediaPath(row.coverImage);
  const bundleImage = coverImage ?? PLACEHOLDER_BUNDLE_IMAGE;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    status: row.status ?? "unpublished",
    coverImage: bundleImage,
    bundleImage,
    productIds: row.productIds,
    products: row.products,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

async function attachProducts(bundleList: BundleRow[]): Promise<BundleWithProducts[]> {
  if (bundleList.length === 0) return [];

  const ids = bundleList.map((bundle) => bundle.id);
  const rows = await db
    .select({
      bundleId: bundleProducts.bundleId,
      product: products,
    })
    .from(bundleProducts)
    .leftJoin(products, eq(bundleProducts.productId, products.id))
    .where(inArray(bundleProducts.bundleId, ids));

  const grouped = new Map<number, ReturnType<typeof mapProductRow>[]>();
  rows.forEach((row) => {
    if (!row.product) return;
    const list = grouped.get(row.bundleId) ?? [];
    list.push(mapProductRow(row.product));
    grouped.set(row.bundleId, list);
  });

  return bundleList.map((bundle) => {
    const productsForBundle = grouped.get(bundle.id) ?? [];
    return {
      ...bundle,
      products: productsForBundle,
      productIds: productsForBundle.map((product) => product.id),
    } satisfies BundleWithProducts;
  });
}

export const getBundles = async (req: Request, res: Response) => {
  const page = parseNumericQuery(req.query.page, 1);
  const perPageRaw = parseNumericQuery(req.query.perPage, 12);
  const perPage = Math.min(perPageRaw, 100);
  const offset = (page - 1) * perPage;

  const sortKey =
    typeof req.query.sort === "string" && req.query.sort in SORTABLE_COLUMNS
      ? (req.query.sort as keyof typeof SORTABLE_COLUMNS)
      : "createdAt";
  const sortOrder = req.query.order === "asc" ? "asc" : "desc";
  const sortColumn = SORTABLE_COLUMNS[sortKey];

  const whereClause = buildFilters(req.query);

  const countQuery = db.select({ value: sql<number>`count(*)` }).from(bundles);
  if (whereClause) {
    countQuery.where(whereClause);
  }
  const totalRows = await countQuery;
  const total = totalRows[0]?.value ?? 0;

  const query = db.select().from(bundles);
  if (whereClause) {
    query.where(whereClause);
  }
  query.orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn));
  query.limit(perPage).offset(offset);

  const rows = await query;
  const withProducts = await attachProducts(rows as BundleRow[]);
  const data = withProducts.map(mapBundleRow);

  res.json({
    data,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  });
};

export const getBundle = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid bundle id" });

  const row = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1);
  if (row.length === 0) return res.status(404).json({ message: "Bundle not found" });

  const [bundle] = await attachProducts(row as BundleRow[]);
  if (!bundle) {
    return res.status(404).json({ message: "Bundle not found" });
  }

  res.json({ bundle: mapBundleRow(bundle) });
};

export const createBundle = async (req: Request, res: Response) => {
  const payload = req.body as BundlePayload;
  const title = typeof payload.title === "string" ? payload.title.trim() : undefined;
  const description = typeof payload.description === "string" ? payload.description.trim() : undefined;
  const normalizedStatus = normalizeStatus(payload.status);

  const coverFile = (req as { file?: Express.Multer.File }).file ?? null;
  const coverImage = resolveUploadedPath(coverFile) ?? normalizeMediaPath(payload.coverImage) ?? "";

  const rawProductInput =
    (req.body as any).productIds ??
    (req.body as any).products ??
    (req.body as any).productID ??
    [];
  const parsedProductIds = parseProductIds(rawProductInput);
  const { valid: validProductIds, missing: missingProductIds } = await validateProductIds(parsedProductIds);

  if (missingProductIds.length > 0) {
    return res.status(400).json({
      message: "One or more selected products do not exist",
      invalidProductIds: missingProductIds,
    });
  }

  if (!title) return res.status(400).json({ message: "Missing required field: title" });
  if (!description) return res.status(400).json({ message: "Missing required field: description" });

  try {
    // Create bundle (no transaction - Neon HTTP driver doesn't support it)
    const insertResult = await db
      .insert(bundles)
      .values({
        title,
        description,
        status: normalizedStatus,
        coverImage,
      })
      .returning({ id: bundles.id });

    const bundleId = insertResult[0]?.id;
    if (!bundleId) {
      throw new Error("Unable to determine bundle id after insert");
    }

    // Insert product associations
    if (validProductIds.length > 0) {
      const relations = validProductIds.map((productId: number) => ({ bundleId, productId }));
      await db.insert(bundleProducts).values(relations);
    }

    // Fetch the created bundle
    const rows = await db.select().from(bundles).where(eq(bundles.id, bundleId)).limit(1);
    const bundle = rows[0];

    if (!bundle) {
      return res.status(500).json({ message: "Failed to create bundle" });
    }

    const [withProducts] = await attachProducts([bundle as BundleRow]);
    if (!withProducts) {
      return res.status(201).json({ message: "Bundle created" });
    }

    return res.status(201).json({ message: "Bundle created", bundle: mapBundleRow(withProducts) });
  } catch (error) {
    console.error("Failed to create bundle", error);
    return res.status(500).json({ message: "Failed to create bundle" });
  }
};

export const updateBundle = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid bundle id" });

  const existing = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1);
  if (existing.length === 0) return res.status(404).json({ message: "Bundle not found" });

  const payload = req.body as BundlePayload;
  const updates: Record<string, unknown> = {};

  if (typeof payload.title === "string") updates.title = payload.title.trim();
  if (typeof payload.description === "string") updates.description = payload.description.trim();
  if (payload.status !== undefined) updates.status = normalizeStatus(payload.status);

  const cover = (req as { file?: Express.Multer.File }).file ?? null;
  const uploadedCover = resolveUploadedPath(cover);
  if (uploadedCover) {
    updates.coverImage = uploadedCover;
  } else if (typeof payload.coverImage === "string") {
    updates.coverImage = normalizeMediaPath(payload.coverImage) ?? "";
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db.update(bundles).set(updates).where(eq(bundles.id, id));
  }

  if (
    (req.body as any)?.productIds !== undefined ||
    (req.body as any)?.products !== undefined ||
    (req.body as any)?.productID !== undefined
  ) {
    const rawProductInput =
      (req.body as any).productIds ??
      (req.body as any).products ??
      (req.body as any).productID;
    const parsedProductIds = parseProductIds(rawProductInput);
    const { valid: validProductIds, missing: missingProductIds } = await validateProductIds(parsedProductIds);

    if (missingProductIds.length > 0) {
      return res.status(400).json({
        message: "One or more selected products do not exist",
        invalidProductIds: missingProductIds,
      });
    }

    // Update product associations (no transaction - Neon HTTP driver doesn't support it)
    await db.delete(bundleProducts).where(eq(bundleProducts.bundleId, id));
    if (validProductIds.length > 0) {
      const relations = validProductIds.map((productId: number) => ({ bundleId: id, productId }));
      await db.insert(bundleProducts).values(relations);
    }
  }

  const updated = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1);
  const [withProducts] = await attachProducts(updated as BundleRow[]);
  if (!withProducts) {
    return res.json({ message: "Bundle updated" });
  }

  res.json({ message: "Bundle updated", bundle: mapBundleRow(withProducts) });
};

export const deleteBundle = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid bundle id" });

  await db.delete(bundleProducts).where(eq(bundleProducts.bundleId, id));
  await db.delete(bundles).where(eq(bundles.id, id));
  return res.status(204).send();
};
