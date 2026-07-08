import multer from 'multer';
import path from 'path';
import fs from 'fs';

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

// Use memory storage on Vercel (read-only filesystem), disk storage locally
const storage = isProduction
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
      },
    });

const fileFilter = (req: any, file: any, cb: any) => {
  // Allow all standard media types: images, videos, audio, PDFs, zips, docx, apk
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', // images
    '.mp4', '.mov', '.webm',                  // videos
    '.mp3', '.wav', '.ogg', '.m4a',           // audio
    '.pdf', '.zip', '.docx', '.doc', '.xlsx', '.txt', '.apk' // files
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Extension ${ext} is not allowed.`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size limit
  },
});

export default upload;
