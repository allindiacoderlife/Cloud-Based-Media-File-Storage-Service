import { Request, Response } from 'express';
import { trashRepository } from '../repositories/trash.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { ResourceType } from '../types/index.js';

export class TrashController {
  async listTrash(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const result = await trashRepository.listTrash(userId);
      return sendSuccess(res, result, 'Trash items retrieved');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list trash items', 400);
    }
  }

  async restoreItem(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const { resourceType, resourceId } = req.params;
      if (!resourceType || !resourceId) return sendError(res, 'Missing resourceType or resourceId', 400);

      await trashRepository.restoreResource(userId, resourceType as ResourceType, resourceId);

      await activityRepository.logActivity({
        user_id: userId,
        action: 'restore',
        resource_type: resourceType as ResourceType,
        resource_id: resourceId
      });

      return sendSuccess(res, { restored: true }, 'Item restored from trash');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to restore item', 400);
    }
  }

  async emptyTrash(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const result = await trashRepository.emptyTrash(userId);

      await activityRepository.logActivity({
        user_id: userId,
        action: 'empty_trash'
      });

      return sendSuccess(res, result, 'Trash emptied permanently');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to empty trash', 400);
    }
  }
}

export const trashController = new TrashController();
