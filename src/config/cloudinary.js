'use strict';
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function createStorage(folder, allowedTypes) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: `uniportal/${folder}`,
      resource_type: 'auto',
      public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
    }),
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
      cb(null, true);
    },
  });
}

module.exports = {
  cloudinary,
  uploadImage: createStorage('images', ALLOWED_IMAGE_TYPES),
  uploadDocument: createStorage('documents', ALLOWED_DOC_TYPES),
  uploadAvatar: createStorage('avatars', ALLOWED_IMAGE_TYPES),
};
