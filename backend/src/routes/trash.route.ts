import { Router } from 'express';
import { trashController } from '../controllers/trash.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => trashController.listTrash(req, res));
router.post('/restore/:resourceType/:resourceId', (req, res) => trashController.restoreItem(req, res));
router.delete('/empty', (req, res) => trashController.emptyTrash(req, res));

export const trashRoutes = router;
