import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { authService } from '../services/auth.service.js';
import { registerSchema, loginSchema, refreshTokenSchema, updateProfileSchema, changePasswordSchema } from '../validators/auth.validator.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AuthController {
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);

      // Set HTTP-only cookie for convenience
      res.cookie('access_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return sendSuccess(res, result, 'Registration successful', 201);
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, err.errors[0]?.message || 'Validation failed', 400, err.errors);
      }
      const status = err.message?.includes('already exists') ? 409 : 400;
      return sendError(res, err.message || 'Registration failed', status);
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);

      res.cookie('access_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, err.errors[0]?.message || 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message || 'Authentication failed', 401);
    }
  }

  async logout(_req: Request, res: Response): Promise<Response> {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return sendSuccess(res, null, 'Logged out successfully');
  }

  async getMe(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const user = await authService.getCurrentUser(req.user.userId);
      return sendSuccess(res, { user }, 'User profile retrieved');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to retrieve profile', 404);
    }
  }

  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshToken(validatedData.refreshToken);

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      return sendSuccess(res, result, 'Token refreshed successfully');
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, err.errors[0]?.message || 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message || 'Token refresh failed', 401);
    }
  }

  async updateProfile(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const validatedData = updateProfileSchema.parse(req.body);
      const user = await authService.updateProfile(req.user.userId, validatedData);
      return sendSuccess(res, { user }, 'Profile updated successfully');
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, err.errors[0]?.message || 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message || 'Failed to update profile', 400);
    }
  }

  async changePassword(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const validatedData = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.user.userId, validatedData);
      return sendSuccess(res, null, 'Password updated successfully');
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, err.errors[0]?.message || 'Validation error', 400, err.errors);
      }
      const status = err.message === 'Current password is incorrect' ? 400 : 400;
      return sendError(res, err.message || 'Failed to update password', status);
    }
  }
}

export const authController = new AuthController();
