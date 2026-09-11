import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// backend/uploads — gitignored, not committed. On Railway (or any host without a
// persistent volume attached) this directory is wiped on every redeploy; see
// docs/known-limitations.md for what moving to real object storage would take.
export const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // Random, non-sequential name — the file is served back without auth (see
    // known-limitations.md), so an unguessable name is the only thing standing between
    // "have the exact link" and "can view the document."
    const randomName = crypto.randomBytes(24).toString('hex');
    cb(null, `${randomName}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Unsupported file type. Allowed: PDF, JPEG, PNG, DOC, DOCX'));
    }
    cb(null, true);
  },
});
