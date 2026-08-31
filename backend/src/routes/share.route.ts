import { Router } from 'express';
import { shareController } from '../controllers/share.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

// 1. User-to-User Shares Router
const shareRouter = Router();
shareRouter.use(requireAuth);

shareRouter.post('/', (req, res) => shareController.shareWithUser(req, res));
shareRouter.get('/shared-with-me', (req, res) => shareController.listSharedWithMe(req, res));
shareRouter.get('/:resourceType/:resourceId', (req, res) =>
  shareController.listSharesForResource(req, res)
);
shareRouter.delete('/:id', (req, res) => shareController.revokeShare(req, res));

// 2. Public Link Shares Management Router
const linkShareRouter = Router();
linkShareRouter.use(requireAuth);

linkShareRouter.post('/', (req, res) => shareController.createPublicLink(req, res));
linkShareRouter.get('/:resourceType/:resourceId', (req, res) =>
  shareController.getPublicLink(req, res)
);
linkShareRouter.delete('/:id', (req, res) => shareController.revokePublicLink(req, res));

// 3. Public Link Resolution Router (No Auth required)
const publicLinkRouter = Router();
publicLinkRouter.post('/:token/access', (req, res) => shareController.accessPublicLink(req, res));

export { shareRouter as shareRoutes, linkShareRouter as linkShareRoutes, publicLinkRouter as publicLinkRoutes };
