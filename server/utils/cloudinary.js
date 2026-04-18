const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    return {
      folder:        'contritrack/proofs',
      resource_type: isPdf ? 'raw' : 'image',
      allowed_formats: isPdf ? ['pdf'] : ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      // Resize and compress images on Cloudinary's side as a safety net
      ...(isPdf ? {} : {
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
      }),
    };
  },
});

module.exports = { cloudinary, storage };
