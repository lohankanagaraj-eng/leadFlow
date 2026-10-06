import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { ApiError } from '../utils/api.js';

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 10);

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const folder = req.params.id ? String(req.params.id) : 'misc';
    const dir = path.resolve('uploads', folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});

const allowed = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/zip', 'application/x-zip-compressed',
  'application/json', 'video/mp4',
]);

export const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!allowed.has(file.mimetype)) {
      return cb(ApiError.badRequest(`File type not allowed: ${file.mimetype}`));
    }
    return cb(null, true);
  },
});
