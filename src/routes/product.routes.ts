import express, { type RequestHandler } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller.js";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: function (_req, _file, cb) {
		cb(null, uploadDir);
	},
	filename: function (_req, file, cb) {
		const ext = path.extname(file.originalname);
		cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
	},
});

const upload = multer({ storage });

const maybeUploadMedia: RequestHandler = (req, res, next) => {
	if (req.is("multipart/form-data")) {
		return upload.fields([
			{ name: "coverImage", maxCount: 1 },
			{ name: "image1", maxCount: 1 },
			{ name: "image2", maxCount: 1 },
		])(req, res, next);
	}
	next();
};

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", maybeUploadMedia, createProduct);
router.put("/:id", maybeUploadMedia, updateProduct);
router.delete("/:id", deleteProduct);

export default router;
