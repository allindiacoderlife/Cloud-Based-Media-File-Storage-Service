import { Router } from 'express';
import multer from 'multer';
import { fileController } from '../controllers/file.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { MAX_FILE_SIZE_BYTES } from '../validators/file.validator.js';

const router = Router();

// Configure Multer with memory storage and size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  }
});

// All file routes require authentication
router.use(requireAuth);

// Upload routes
router.post('/init', (req, res) => fileController.initUpload(req, res));
router.post('/complete', (req, res) => fileController.completeUpload(req, res));
router.post('/upload-direct', upload.single('file'), (req, res) => fileController.directUpload(req, res));

// File retrieval and listing
router.get('/', (req, res) => fileController.listFiles(req, res));
router.get('/:id', (req, res) => fileController.getFile(req, res));
router.get('/:id/download', (req, res) => fileController.getDownloadUrl(req, res));

export const fileRoutes = router;
