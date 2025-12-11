import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * POST /api/upload
 * Upload single image to Cloudinary
 */
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/upload/multiple
 * Upload multiple images to Cloudinary
 */
router.post('/multiple', upload.array('images', 3), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided',
      });
    }

    // Upload all images to Cloudinary
    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer));
    const results = await Promise.all(uploadPromises);

    return res.status(200).json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      images: results,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
