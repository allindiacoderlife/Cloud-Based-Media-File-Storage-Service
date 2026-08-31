import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

// Search router
const searchRouter = Router();
searchRouter.use(requireAuth);
searchRouter.get('/', (req, res) => searchController.search(req, res));

// Star router
const starRouter = Router();
starRouter.use(requireAuth);
starRouter.post('/toggle', (req, res) => searchController.toggleStar(req, res));
starRouter.get('/', (req, res) => searchController.listStarred(req, res));

// Activity router
const activityRouter = Router();
activityRouter.use(requireAuth);
activityRouter.get('/recent', (req, res) => searchController.listRecent(req, res));

export { searchRouter as searchRoutes, starRouter as starRoutes, activityRouter as activityRoutes };
