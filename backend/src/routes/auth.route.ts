import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Public auth routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

// Protected auth routes
router.get('/me', requireAuth, (req, res) => authController.getMe(req, res));
router.patch('/profile', requireAuth, (req, res) => authController.updateProfile(req, res));

export const authRoutes = router;
