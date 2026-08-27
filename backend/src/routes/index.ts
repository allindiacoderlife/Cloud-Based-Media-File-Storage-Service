import { Router } from 'express';
import { healthRoutes } from './health.route.js';
import { authRoutes } from './auth.route.js';
import { fileRoutes } from './file.route.js';

const router = Router();

// Mount modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/files', fileRoutes);

export const apiRouter = router;
