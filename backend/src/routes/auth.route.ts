import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Public auth routes (rate limited)
router.post('/register', authRateLimiter, (req, res) => authController.register(req, res));
router.post('/login', authRateLimiter, (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', authRateLimiter, (req, res) => authController.refreshToken(req, res));

// Protected auth routes
router.get('/me', requireAuth, (req, res) => authController.getMe(req, res));
router.patch('/profile', requireAuth, (req, res) => authController.updateProfile(req, res));
router.post('/change-password', requireAuth, authRateLimiter, (req, res) => authController.changePassword(req, res));
router.patch('/password', requireAuth, authRateLimiter, (req, res) => authController.changePassword(req, res));

export const authRoutes = router;
