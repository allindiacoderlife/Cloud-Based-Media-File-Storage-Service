import { Router } from 'express';
import { folderController } from '../controllers/folder.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// All folder routes require authentication
router.use(requireAuth);

router.post('/', (req, res) => folderController.createFolder(req, res));
router.get('/', (req, res) => folderController.listFolders(req, res));
router.get('/:id', (req, res) => folderController.getFolder(req, res));
router.patch('/:id', (req, res) => folderController.updateFolder(req, res));
router.delete('/:id', (req, res) => folderController.deleteFolder(req, res));

export const folderRoutes = router;
