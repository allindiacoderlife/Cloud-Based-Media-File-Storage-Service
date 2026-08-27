import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { env } from '../config/env.js';
import { fileRepository } from '../repositories/file.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { generateStorageKey } from '../utils/storageKey.js';
import { InitUploadInput, CompleteUploadInput } from '../validators/file.validator.js';
import { FileRecord, User } from '../types/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export interface InitUploadResult {
  file: FileRecord;
  uploadUrl: string;
  storageKey: string;
  uploadMethod: 'signed_url' | 'direct_multipart';
  headers?: Record<string, string>;
}

export class StorageService {
  private bucketName = env.SUPABASE_STORAGE_BUCKET;

  /**
   * Validates if a user has sufficient quota for an incoming upload
   */
  async validateQuota(ownerId: string, additionalBytes: number): Promise<User> {
    const user = await userRepository.findById(ownerId);
    if (!user) {
      throw new Error('User account not found');
    }

    const currentUsed = await fileRepository.calculateTotalUserStorage(ownerId);
    const newTotal = currentUsed + additionalBytes;

    if (newTotal > user.storage_quota_bytes) {
      const quotaMb = Math.round(user.storage_quota_bytes / (1024 * 1024));
      const usedMb = Math.round(currentUsed / (1024 * 1024));
      const neededMb = Math.round(additionalBytes / (1024 * 1024));
      throw new Error(
        `Storage quota exceeded. You have ${usedMb}MB used of ${quotaMb}MB. This file requires ${neededMb}MB.`
      );
    }

    return user;
  }

  /**
   * Initializes a new file upload, creates a placeholder, and generates upload credentials
   */
  async initiateUpload(ownerId: string, input: InitUploadInput): Promise<InitUploadResult> {
    // 1. Quota check
    await this.validateQuota(ownerId, input.sizeBytes);

    const fileId = crypto.randomUUID();
    const storageKey = generateStorageKey({
      ownerId,
      folderId: input.folderId,
      fileId,
      filename: input.name
    });

    // 2. Create placeholder in database
    const placeholder = await fileRepository.createPlaceholder({
      id: fileId,
      name: input.name,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      storage_key: storageKey,
      owner_id: ownerId,
      folder_id: input.folderId
    });

    // 3. Generate upload URL
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(this.bucketName)
          .createSignedUploadUrl(storageKey);

        if (!error && data?.signedUrl) {
          return {
            file: placeholder,
            uploadUrl: data.signedUrl,
            storageKey,
            uploadMethod: 'signed_url',
            headers: {
              'Content-Type': input.mimeType
            }
          };
        }
        logger.warn(`Failed to create signed upload URL: ${error?.message}`);
      } catch (err: any) {
        logger.warn(`Supabase Storage signed URL exception: ${err.message}`);
      }
    }

    // Fallback: Use direct multipart endpoint
    return {
      file: placeholder,
      uploadUrl: `${env.API_PREFIX}/files/upload-direct?fileId=${fileId}`,
      storageKey,
      uploadMethod: 'direct_multipart'
    };
  }

  /**
   * Completes an upload, transitions status to ready, records version 1, and updates quota
   */
  async completeUpload(
    ownerId: string,
    input: CompleteUploadInput
  ): Promise<{ file: FileRecord; storageUsedBytes: number }> {
    const file = await fileRepository.findById(input.fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (file.owner_id !== ownerId) {
      throw new Error('Unauthorized to modify this file');
    }

    // Mark file ready
    const updatedFile = await fileRepository.markReady(input.fileId, {
      actualSizeBytes: input.actualSizeBytes,
      checksum: input.checksum
    });

    if (!updatedFile) {
      throw new Error('Failed to update file status');
    }

    // Create File Version 1
    await fileRepository.createVersion({
      file_id: updatedFile.id,
      version_number: 1,
      storage_key: updatedFile.storage_key,
      size_bytes: updatedFile.size_bytes,
      checksum: input.checksum || null,
      created_by: ownerId
    });

    // Recalculate and update user's total storage usage
    const totalStorage = await fileRepository.calculateTotalUserStorage(ownerId);
    await userRepository.updateStorageUsage(ownerId, totalStorage);

    return {
      file: updatedFile,
      storageUsedBytes: totalStorage
    };
  }

  /**
   * Direct multipart upload handler (for testing, small files, and local fallback)
   */
  async directUpload(
    ownerId: string,
    fileObj: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    folderId?: string | null,
    fileIdParam?: string
  ): Promise<{ file: FileRecord; storageUsedBytes: number }> {
    await this.validateQuota(ownerId, fileObj.size);

    const fileId = fileIdParam || crypto.randomUUID();
    const storageKey = generateStorageKey({
      ownerId,
      folderId,
      fileId,
      filename: fileObj.originalname
    });

    // If Supabase Storage is configured, upload the binary buffer
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabaseAdmin.storage
          .from(this.bucketName)
          .upload(storageKey, fileObj.buffer, {
            contentType: fileObj.mimetype,
            upsert: true
          });

        if (error) {
          logger.error(`Error uploading to Supabase Storage: ${error.message}`);
        }
      } catch (err: any) {
        logger.error(`Supabase upload exception: ${err.message}`);
      }
    }

    // Check if placeholder already exists
    let existingFile = await fileRepository.findById(fileId);
    if (!existingFile) {
      existingFile = await fileRepository.createPlaceholder({
        id: fileId,
        name: fileObj.originalname,
        mime_type: fileObj.mimetype,
        size_bytes: fileObj.size,
        storage_key: storageKey,
        owner_id: ownerId,
        folder_id: folderId
      });
    }

    // Mark ready
    const updatedFile = await fileRepository.markReady(fileId, {
      actualSizeBytes: fileObj.size
    });

    if (!updatedFile) {
      throw new Error('Failed to finalize direct upload');
    }

    // Create version
    await fileRepository.createVersion({
      file_id: updatedFile.id,
      version_number: 1,
      storage_key: updatedFile.storage_key,
      size_bytes: fileObj.size,
      created_by: ownerId
    });

    // Update user quota
    const totalStorage = await fileRepository.calculateTotalUserStorage(ownerId);
    await userRepository.updateStorageUsage(ownerId, totalStorage);

    return {
      file: updatedFile,
      storageUsedBytes: totalStorage
    };
  }

  /**
   * Generates a secure, short-lived signed download URL
   */
  async getDownloadUrl(
    userId: string,
    fileId: string
  ): Promise<{ downloadUrl: string; filename: string; mimeType: string; sizeBytes: number }> {
    const file = await fileRepository.findById(fileId);
    if (!file || file.is_deleted) {
      throw new Error('File not found');
    }

    if (file.owner_id !== userId) {
      // In Day 5 Sharing, we will also check shares table
      throw new Error('You do not have permission to download this file');
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(this.bucketName)
          .createSignedUrl(file.storage_key, 3600); // 1 hour signed URL

        if (!error && data?.signedUrl) {
          return {
            downloadUrl: data.signedUrl,
            filename: file.name,
            mimeType: file.mime_type,
            sizeBytes: file.size_bytes
          };
        }
      } catch (err: any) {
        logger.warn(`Supabase getDownloadUrl failed: ${err.message}`);
      }
    }

    // Direct download mock/fallback URL
    const fallbackDownloadUrl = `${env.API_PREFIX}/files/${file.id}/download-stream`;
    return {
      downloadUrl: fallbackDownloadUrl,
      filename: file.name,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes
    };
  }

  async listFiles(
    userId: string,
    options?: { folderId?: string | null; limit?: number; offset?: number }
  ): Promise<{ files: FileRecord[]; total: number }> {
    return fileRepository.listByOwner(userId, options);
  }

  async getFileById(userId: string, fileId: string): Promise<FileRecord> {
    const file = await fileRepository.findById(fileId);
    if (!file || file.is_deleted) {
      throw new Error('File not found');
    }

    if (file.owner_id !== userId) {
      throw new Error('You do not have permission to view this file');
    }

    return file;
  }
}

export const storageService = new StorageService();
