import { Request, Response } from 'express';
import { searchService } from '../services/search.service.js';
import {
  searchQuerySchema,
  toggleStarSchema,
  recentActivityQuerySchema
} from '../validators/search.validator.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class SearchController {
  async search(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const validatedQuery = searchQuerySchema.parse(req.query);
      const results = await searchService.search(userId, validatedQuery);

      return sendSuccess(res, results, 'Search results retrieved', 200, {
        total: results.total,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Search failed', 400);
    }
  }

  async toggleStar(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const validatedData = toggleStarSchema.parse(req.body);
      const result = await searchService.toggleStar(userId, validatedData);

      const message = result.isStarred ? 'Item starred' : 'Item unstarred';
      return sendSuccess(res, result, message);
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 400;
      return sendError(res, err.message || 'Failed to toggle star', status);
    }
  }

  async listStarred(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const results = await searchService.listStarred(userId);
      return sendSuccess(res, results, 'Starred items retrieved');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list starred items', 400);
    }
  }

  async listRecent(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const query = recentActivityQuerySchema.parse(req.query);
      const results = await searchService.listRecent(userId, query.limit);

      return sendSuccess(res, results, 'Recent activity retrieved');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to get recent activity', 400);
    }
  }
}

export const searchController = new SearchController();
