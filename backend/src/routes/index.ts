import { Router } from 'express';
import { healthRoutes } from './health.route.js';
import { authRoutes } from './auth.route.js';
import { fileRoutes } from './file.route.js';
import { folderRoutes } from './folder.route.js';
import { shareRoutes, linkShareRoutes, publicLinkRoutes } from './share.route.js';

const router = Router();

// Mount modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/files', fileRoutes);
router.use('/folders', folderRoutes);
router.use('/shares', shareRoutes);
router.use('/link-shares', linkShareRoutes);
router.use('/link', publicLinkRoutes);

export const apiRouter = router;
