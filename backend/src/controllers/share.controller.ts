import { Request, Response } from 'express';
import { shareService } from '../services/share.service.js';
import {
  createShareSchema,
  createLinkShareSchema,
  accessLinkShareSchema
} from '../validators/share.validator.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { ResourceType } from '../types/index.js';

export class ShareController {
  // ==========================================
  // User-to-User Shares
  // ==========================================

  async shareWithUser(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const validatedData = createShareSchema.parse(req.body);
      const result = await shareService.shareWithUser(userId, validatedData);

      return sendSuccess(res, result, 'Resource shared successfully', 201);
    } catch (err: any) {
      const status =
        err.message?.includes('not found') ? 404 :
        err.message?.includes('yourself') ? 400 :
        err.message?.includes('permission') ? 403 : 400;

      return sendError(res, err.message || 'Failed to share resource', status);
    }
  }

  async listSharesForResource(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const { resourceType, resourceId } = req.params;
      if (resourceType !== 'file' && resourceType !== 'folder') {
        return sendError(res, 'Invalid resource type', 400);
      }

      const result = await shareService.listSharesForResource(
        userId,
        resourceType as ResourceType,
        resourceId
      );

      return sendSuccess(res, result, 'Shares retrieved');
    } catch (err: any) {
      const status = err.message?.includes('permission') ? 403 : 404;
      return sendError(res, err.message || 'Failed to get shares', status);
    }
  }

  async listSharedWithMe(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const result = await shareService.listSharedWithMe(userId);
      return sendSuccess(res, result, 'Shared resources retrieved');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to get shared resources', 400);
    }
  }

  async revokeShare(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      await shareService.revokeShare(userId, req.params.id);
      return sendSuccess(res, null, 'Share revoked successfully');
    } catch (err: any) {
      const status = err.message?.includes('permission') ? 403 : 400;
      return sendError(res, err.message || 'Failed to revoke share', status);
    }
  }

  // ==========================================
  // Public Link Shares
  // ==========================================

  async createPublicLink(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const validatedData = createLinkShareSchema.parse(req.body);
      const result = await shareService.createPublicLink(userId, validatedData);

      return sendSuccess(res, { linkShare: result }, 'Public link generated', 201);
    } catch (err: any) {
      const status = err.message?.includes('permission') ? 403 : 400;
      return sendError(res, err.message || 'Failed to generate public link', status);
    }
  }

  async getPublicLink(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const { resourceType, resourceId } = req.params;
      if (resourceType !== 'file' && resourceType !== 'folder') {
        return sendError(res, 'Invalid resource type', 400);
      }

      const link = await shareService.getPublicLink(
        userId,
        resourceType as ResourceType,
        resourceId
      );

      return sendSuccess(res, { linkShare: link }, 'Public link retrieved');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to get public link', 400);
    }
  }

  async revokePublicLink(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      await shareService.revokePublicLink(userId, req.params.id);
      return sendSuccess(res, null, 'Public link revoked');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to revoke public link', 400);
    }
  }

  async accessPublicLink(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.params;
      const validated = accessLinkShareSchema.safeParse(req.body);
      const password = validated.success ? validated.data.password : undefined;

      const result = await shareService.accessPublicLink(token, password);
      return sendSuccess(res, result, 'Public share accessed successfully');
    } catch (err: any) {
      if (err.message === 'PASSWORD_REQUIRED') {
        return sendError(res, 'Password required to access this link', 401, {
          passwordRequired: true
        });
      }
      if (err.message?.includes('Incorrect password')) {
        return sendError(res, 'Incorrect password for shared link', 401, {
          passwordRequired: true
        });
      }
      if (err.message?.includes('expired')) {
        return sendError(res, err.message, 410);
      }
      return sendError(res, err.message || 'Link access failed', 404);
    }
  }
}

export const shareController = new ShareController();
