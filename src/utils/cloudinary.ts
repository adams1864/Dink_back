import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

if (!cloudName) {
  throw new Error('CLOUDINARY_CLOUD_NAME is required for uploads');
}

if (!uploadPreset) {
  throw new Error('CLOUDINARY_UPLOAD_PRESET is required for unsigned uploads');
}

// Configure Cloudinary (unsigned uploads only need cloud name)
cloudinary.config({
  cloud_name: cloudName,
});

/**
 * Upload image buffer to Cloudinary using unsigned preset (no API key needed)
 * @param buffer - Image file buffer
 * @param folder - Cloudinary folder path (default: 'dink_sports/products')
 * @returns Cloudinary upload result with secure_url
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string = 'dink_sports/products'
): Promise<{ url: string; publicId: string }> {
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;

  const formData = new (global as any).FormData();
  const blob = new (global as any).Blob([buffer]);
  formData.append('file', blob);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);
  formData.append('resource_type', 'image');

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudinary upload failed: ${text}`);
  }

  const data = await response.json();

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
  };
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
    // Don't throw - allow operation to continue even if delete fails
  }
}

/**
 * Upload from file path (for multer uploads)
 * @param filePath - Local file path
 * @param folder - Cloudinary folder path
 */
export async function uploadFileToCloudinary(
  filePath: string,
  folder: string = 'dink_sports/products'
): Promise<{ url: string; publicId: string }> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 1000, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

export default cloudinary;
