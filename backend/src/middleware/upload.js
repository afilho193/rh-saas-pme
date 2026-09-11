import multer from 'multer';

// Files go straight to Vercel Blob (see controllers/documentController.js), not to disk —
// serverless functions on Vercel have a read-only filesystem at runtime, so there's no
// local directory to write to. memoryStorage() just buffers the upload in memory long
// enough to hand off to Blob.
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Unsupported file type. Allowed: PDF, JPEG, PNG, DOC, DOCX'));
    }
    cb(null, true);
  },
});
