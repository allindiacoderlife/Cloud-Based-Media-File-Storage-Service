import { Router } from 'express';
import { healthRoutes } from './health.route.js';

const router = Router();

// Mount modules
router.use('/health', healthRoutes);

export const apiRouter = router;
