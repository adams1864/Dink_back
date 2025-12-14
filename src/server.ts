import "./env.js";
import express from "express";
import cors from "cors";
import path from "path";
import { loggingMiddleware } from "./middleware/logging.js";
import productRoutes from "./routes/product.routes.js";
import bundleRoutes from "./routes/bundle.routes.js";
import orderRoutes from "./routes/order.routes.js";
import metaRoutes from "./routes/meta.routes.js";
import authRoutes from "./auth/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import salesRoutes from "./routes/sales.routes.js";

const app = express();

// --- CORS (allow Vercel + localhost) ---
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(loggingMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.resolve("./uploads");
app.use("/uploads", express.static(uploadsDir));

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bundles", bundleRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/sales", salesRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));
