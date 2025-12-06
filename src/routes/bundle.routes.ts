import express, { type RequestHandler } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { getBundles, getBundle, createBundle, updateBundle, deleteBundle } from "../controllers/bundle.controller.js";

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

const maybeUploadCover: RequestHandler = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return upload.single("cover")(req, res, next);
  }
  next();
};

router.get("/", getBundles);
router.get("/:id", getBundle);
router.post("/", maybeUploadCover, createBundle);
router.put("/:id", maybeUploadCover, updateBundle);
router.delete("/:id", deleteBundle);

export default router;
