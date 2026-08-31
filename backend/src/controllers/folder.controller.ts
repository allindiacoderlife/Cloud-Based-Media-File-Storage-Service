import { Request, Response } from 'express';
import { folderService } from '../services/folder.service.js';
import { createFolderSchema, updateFolderSchema, folderQuerySchema } from '../validators/folder.validator.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class FolderController {
  async createFolder(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const validatedData = createFolderSchema.parse(req.body);
      const folder = await folderService.createFolder(userId, validatedData);

      return sendSuccess(res, { folder }, 'Folder created successfully', 201);
    } catch (err: any) {
      const status = err.message?.includes('already exists') ? 409 : 400;
      return sendError(res, err.message || 'Failed to create folder', status);
    }
  }

  async getFolder(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const folderId = req.params.id;
      const contents = await folderService.getFolderContents(userId, folderId);

      return sendSuccess(res, contents, 'Folder contents retrieved');
    } catch (err: any) {
      return sendError(res, err.message || 'Folder not found', 404);
    }
  }

  async listFolders(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const query = folderQuerySchema.parse(req.query);

      if (req.query.all === 'true') {
        const allFolders = await folderService.listAllFolders(userId);
        return sendSuccess(res, { folders: allFolders }, 'All folders retrieved');
      }

      const folders = await folderService.listFolders(userId, query.parentId);
      return sendSuccess(res, { folders }, 'Folders retrieved');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list folders', 400);
    }
  }

  async updateFolder(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const validatedData = updateFolderSchema.parse(req.body);
      const updated = await folderService.updateFolder(userId, req.params.id, validatedData);

      return sendSuccess(res, { folder: updated }, 'Folder updated successfully');
    } catch (err: any) {
      const status = err.message?.includes('already exists') ? 409 : 400;
      return sendError(res, err.message || 'Failed to update folder', status);
    }
  }

  async deleteFolder(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      await folderService.deleteFolder(userId, req.params.id);
      return sendSuccess(res, null, 'Folder deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to delete folder', 400);
    }
  }
}

export const folderController = new FolderController();
