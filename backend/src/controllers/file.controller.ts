import { Request, Response } from 'express';
import { storageService } from '../services/storage.service.js';
import { fileRepository } from '../repositories/file.repository.js';
import { initUploadSchema, completeUploadSchema, listFilesQuerySchema, updateFileSchema } from '../validators/file.validator.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class FileController {
  async initUpload(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const validatedData = initUploadSchema.parse(req.body);
      const result = await storageService.initiateUpload(userId, validatedData);

      return sendSuccess(res, result, 'Upload initialized successfully', 201);
    } catch (err: any) {
      const status = err.message?.includes('quota exceeded') ? 403 : 400;
      return sendError(res, err.message || 'Failed to initialize upload', status);
    }
  }

  async completeUpload(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const validatedData = completeUploadSchema.parse(req.body);
      const result = await storageService.completeUpload(userId, validatedData);

      return sendSuccess(res, result, 'Upload marked as completed');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to complete upload', 400);
    }
  }

  async directUpload(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      if (!req.file) {
        return sendError(res, 'No file provided in multipart request', 400);
      }

      const folderId = (req.body.folderId as string) || null;
      const fileIdParam = (req.query.fileId as string) || (req.body.fileId as string) || undefined;

      const result = await storageService.directUpload(
        userId,
        {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer
        },
        folderId,
        fileIdParam
      );

      return sendSuccess(res, result, 'File uploaded successfully', 201);
    } catch (err: any) {
      const status = err.message?.includes('quota exceeded') ? 403 : 400;
      return sendError(res, err.message || 'Failed to upload file', status);
    }
  }

  async listFiles(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const query = listFilesQuerySchema.parse(req.query);
      const result = await storageService.listFiles(userId, {
        folderId: query.folderId,
        limit: query.limit,
        offset: query.offset
      });

      return sendSuccess(res, result.files, 'Files retrieved successfully', 200, {
        total: result.total,
        limit: query.limit,
        offset: query.offset
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list files', 400);
    }
  }

  async getFile(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const file = await storageService.getFileById(userId, req.params.id);
      return sendSuccess(res, { file }, 'File details retrieved');
    } catch (err: any) {
      const status = err.message?.includes('permission') ? 403 : 404;
      return sendError(res, err.message || 'File not found', status);
    }
  }

  async getDownloadUrl(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const result = await storageService.getDownloadUrl(userId, req.params.id);
      return sendSuccess(res, result, 'Download URL generated');
    } catch (err: any) {
      const status = err.message?.includes('permission') ? 403 : 404;
      return sendError(res, err.message || 'Failed to get download URL', status);
    }
  }

  async updateFile(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const validatedData = updateFileSchema.parse(req.body);
      const updated = await storageService.updateFile(userId, req.params.id, validatedData);
      return sendSuccess(res, { file: updated }, 'File updated successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update file', 400);
    }
  }

  async deleteFile(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      await storageService.deleteFile(userId, req.params.id);
      return sendSuccess(res, null, 'File deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to delete file', 400);
    }
  }

  async listVersions(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const file = await storageService.getFileById(userId, req.params.id);
      if (!file) return sendError(res, 'File not found', 404);

      const versions = await fileRepository.listVersions(req.params.id);
      return sendSuccess(res, { versions }, 'File versions retrieved');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list file versions', 400);
    }
  }

  async restoreVersion(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const versionNumber = parseInt(req.params.versionNumber, 10);
      if (isNaN(versionNumber)) return sendError(res, 'Invalid version number', 400);

      const updated = await fileRepository.restoreVersion(req.params.id, versionNumber);
      if (!updated) return sendError(res, 'Version not found', 404);

      return sendSuccess(res, { file: updated }, `Restored file to version ${versionNumber}`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to restore file version', 400);
    }
  }
}

export const fileController = new FileController();
