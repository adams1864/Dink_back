import "./env.js";
import express from "express";
import cors from "cors";
import path from "path";
import { loggingMiddleware } from "./middleware/logging.js";
import productRoutes from "./routes/product.routes.js";
import bundleRoutes from "./routes/bundle.routes.js";
import orderRoutes from "./routes/order.routes.js";import metaRoutes from "./routes/meta.routes.js";
import authRoutes from "./auth/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

const app = express();

const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

const corsOptions = {
	origin: allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins,
	credentials: true,
	exposedHeaders: ["X-Total-Count"],
};

app.use(loggingMiddleware);
app.use(cors(corsOptions));
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

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));
