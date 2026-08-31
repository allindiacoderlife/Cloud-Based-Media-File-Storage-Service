import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { FileRecord, FileVersion, FileStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// In-memory fallback map for offline development/tests
export const devFallbackFiles = new Map<string, FileRecord>();
export const devFallbackVersions = new Map<string, FileVersion[]>();

export class FileRepository {
  async createPlaceholder(file: {
    id?: string;
    name: string;
    mime_type: string;
    size_bytes: number;
    storage_key: string;
    owner_id: string;
    folder_id?: string | null;
  }): Promise<FileRecord> {
    const fileId = file.id || crypto.randomUUID();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('files')
          .insert({
            id: fileId,
            name: file.name,
            mime_type: file.mime_type,
            size_bytes: file.size_bytes,
            storage_key: file.storage_key,
            owner_id: file.owner_id,
            folder_id: file.folder_id || null,
            status: 'uploading' as FileStatus,
            current_version: 1,
            is_deleted: false
          })
          .select()
          .single();

        if (error) {
          logger.error(`Error inserting file placeholder: ${error.message}`);
          throw new Error(error.message);
        }

        return data as FileRecord;
      } catch (err: any) {
        logger.warn(`Supabase file insert failed, using fallback store: ${err.message}`);
      }
    }

    const fallbackRecord: FileRecord = {
      id: fileId,
      name: file.name,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      storage_key: file.storage_key,
      thumbnail_key: null,
      owner_id: file.owner_id,
      folder_id: file.folder_id || null,
      status: 'uploading',
      is_deleted: false,
      deleted_at: null,
      checksum: null,
      current_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    devFallbackFiles.set(fileId, fallbackRecord);
    return fallbackRecord;
  }

  async markReady(
    fileId: string,
    updates?: { actualSizeBytes?: number; checksum?: string; thumbnailKey?: string }
  ): Promise<FileRecord | null> {
    if (isSupabaseConfigured) {
      try {
        const updatePayload: any = {
          status: 'ready',
          updated_at: new Date().toISOString()
        };
        if (updates?.actualSizeBytes) updatePayload.size_bytes = updates.actualSizeBytes;
        if (updates?.checksum) updatePayload.checksum = updates.checksum;
        if (updates?.thumbnailKey) updatePayload.thumbnail_key = updates.thumbnailKey;

        const { data, error } = await supabaseAdmin
          .from('files')
          .update(updatePayload)
          .eq('id', fileId)
          .select()
          .single();

        if (error) {
          logger.error(`Error marking file ready: ${error.message}`);
          throw new Error(error.message);
        }

        return data as FileRecord;
      } catch (err: any) {
        logger.warn(`Supabase markReady failed: ${err.message}`);
      }
    }

    const existing = devFallbackFiles.get(fileId);
    if (existing) {
      existing.status = 'ready';
      if (updates?.actualSizeBytes) existing.size_bytes = updates.actualSizeBytes;
      if (updates?.checksum) existing.checksum = updates.checksum;
      if (updates?.thumbnailKey) existing.thumbnail_key = updates.thumbnailKey;
      existing.updated_at = new Date().toISOString();
      return existing;
    }

    return null;
  }

  async markFailed(fileId: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin
          .from('files')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', fileId);
        return;
      } catch (err: any) {
        logger.warn(`Supabase markFailed error: ${err.message}`);
      }
    }

    const existing = devFallbackFiles.get(fileId);
    if (existing) {
      existing.status = 'failed';
      existing.updated_at = new Date().toISOString();
    }
  }

  async findById(fileId: string): Promise<FileRecord | null> {
    if (devFallbackFiles.has(fileId)) {
      return devFallbackFiles.get(fileId)!;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('files')
          .select('*')
          .eq('id', fileId)
          .maybeSingle();

        if (!error && data) {
          return data as FileRecord;
        }
      } catch (err: any) {
        logger.warn(`Supabase findById failed: ${err.message}`);
      }
    }

    return devFallbackFiles.get(fileId) || null;
  }

  async listByOwner(
    ownerId: string,
    options?: { folderId?: string | null; status?: FileStatus; limit?: number; offset?: number }
  ): Promise<{ files: FileRecord[]; total: number }> {
    const status = options?.status || 'ready';

    if (isSupabaseConfigured) {
      try {
        let query = supabaseAdmin
          .from('files')
          .select('*', { count: 'exact' })
          .eq('owner_id', ownerId)
          .eq('is_deleted', false)
          .eq('status', status)
          .order('created_at', { ascending: false });

        if (options?.folderId !== undefined) {
          if (options.folderId === null || options.folderId === 'root') {
            query = query.is('folder_id', null);
          } else {
            query = query.eq('folder_id', options.folderId);
          }
        }

        if (options?.limit) query = query.limit(options.limit);
        if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

        const { data, count, error } = await query;

        if (!error && data) {
          return { files: (data as FileRecord[]) || [], total: count || 0 };
        }
        logger.warn(`Supabase listByOwner failed, using fallback: ${error?.message}`);
      } catch (err: any) {
        logger.warn(`Supabase listByOwner exception: ${err.message}`);
      }
    }

    const all = Array.from(devFallbackFiles.values()).filter((f) => {
      if (f.owner_id !== ownerId || f.is_deleted) return false;
      if (status && f.status !== status) return false;
      if (options?.folderId !== undefined) {
        const targetFolder = options.folderId === 'root' ? null : options.folderId;
        if (f.folder_id !== targetFolder) return false;
      }
      return true;
    });

    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const paginated = all.slice(offset, offset + limit);

    return { files: paginated, total: all.length };
  }

  async createVersion(version: {
    file_id: string;
    version_number: number;
    storage_key: string;
    size_bytes: number;
    checksum?: string | null;
    created_by: string;
  }): Promise<FileVersion> {
    const versionId = crypto.randomUUID();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('file_versions')
          .insert({
            id: versionId,
            file_id: version.file_id,
            version_number: version.version_number,
            storage_key: version.storage_key,
            size_bytes: version.size_bytes,
            checksum: version.checksum || null,
            created_by: version.created_by
          })
          .select()
          .single();

        if (error) {
          logger.error(`Error creating file version: ${error.message}`);
          throw new Error(error.message);
        }

        return data as FileVersion;
      } catch (err: any) {
        logger.warn(`Supabase createVersion failed: ${err.message}`);
      }
    }

    const versionRecord: FileVersion = {
      id: versionId,
      file_id: version.file_id,
      version_number: version.version_number,
      storage_key: version.storage_key,
      size_bytes: version.size_bytes,
      checksum: version.checksum || null,
      created_by: version.created_by,
      created_at: new Date().toISOString()
    };

    const versions = devFallbackVersions.get(version.file_id) || [];
    versions.push(versionRecord);
    devFallbackVersions.set(version.file_id, versions);

    return versionRecord;
  }

  async update(
    fileId: string,
    updates: {
      name?: string;
      folder_id?: string | null;
      current_version?: number;
      storage_key?: string;
      size_bytes?: number;
    }
  ): Promise<FileRecord | null> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        const updatePayload: any = { updated_at: now };
        if (updates.name !== undefined) updatePayload.name = updates.name.trim();
        if (updates.folder_id !== undefined) updatePayload.folder_id = updates.folder_id;
        if (updates.current_version !== undefined) updatePayload.current_version = updates.current_version;
        if (updates.storage_key !== undefined) updatePayload.storage_key = updates.storage_key;
        if (updates.size_bytes !== undefined) updatePayload.size_bytes = updates.size_bytes;

        const { data, error } = await supabaseAdmin
          .from('files')
          .update(updatePayload)
          .eq('id', fileId)
          .select()
          .single();

        if (!error && data) {
          return data as FileRecord;
        }
      } catch (err: any) {
        logger.warn(`FileRepository.update exception: ${err.message}`);
      }
    }

    const existing = devFallbackFiles.get(fileId);
    if (existing) {
      if (updates.name !== undefined) existing.name = updates.name.trim();
      if (updates.folder_id !== undefined) existing.folder_id = updates.folder_id;
      if (updates.current_version !== undefined) existing.current_version = updates.current_version;
      if (updates.storage_key !== undefined) existing.storage_key = updates.storage_key;
      if (updates.size_bytes !== undefined) existing.size_bytes = updates.size_bytes;
      existing.updated_at = now;
      return existing;
    }

    return null;
  }

  async softDelete(fileId: string): Promise<void> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin
          .from('files')
          .update({ is_deleted: true, deleted_at: now, updated_at: now })
          .eq('id', fileId);
      } catch (err: any) {
        logger.warn(`FileRepository.softDelete exception: ${err.message}`);
      }
    }

    const existing = devFallbackFiles.get(fileId);
    if (existing) {
      existing.is_deleted = true;
      existing.deleted_at = now;
      existing.updated_at = now;
    }
  }

  async softDeleteByFolderIds(folderIds: string[]): Promise<void> {
    if (folderIds.length === 0) return;
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin
          .from('files')
          .update({ is_deleted: true, deleted_at: now, updated_at: now })
          .in('folder_id', folderIds);
      } catch (err: any) {
        logger.warn(`FileRepository.softDeleteByFolderIds exception: ${err.message}`);
      }
    }

    for (const file of devFallbackFiles.values()) {
      if (file.folder_id && folderIds.includes(file.folder_id)) {
        file.is_deleted = true;
        file.deleted_at = now;
        file.updated_at = now;
      }
    }
  }

  async calculateTotalUserStorage(ownerId: string): Promise<number> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('files')
          .select('size_bytes')
          .eq('owner_id', ownerId)
          .eq('is_deleted', false)
          .eq('status', 'ready');

        if (!error && data) {
          return data.reduce((acc, curr) => acc + Number(curr.size_bytes || 0), 0);
        }
      } catch (err: any) {
        logger.warn(`Supabase calculateTotalUserStorage failed: ${err.message}`);
      }
    }

    return Array.from(devFallbackFiles.values())
      .filter((f) => f.owner_id === ownerId && !f.is_deleted && f.status === 'ready')
      .reduce((acc, curr) => acc + Number(curr.size_bytes || 0), 0);
  }

  async listVersions(fileId: string): Promise<FileVersion[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('file_versions')
          .select('*')
          .eq('file_id', fileId)
          .order('version_number', { ascending: false });

        if (!error && data) {
          return data as FileVersion[];
        }
      } catch (err: any) {
        logger.warn(`FileRepository.listVersions exception: ${err.message}`);
      }
    }

    return devFallbackVersions.get(fileId) || [];
  }

  async restoreVersion(fileId: string, versionNumber: number): Promise<FileRecord | null> {
    const versions = await this.listVersions(fileId);
    const targetVersion = versions.find((v) => v.version_number === versionNumber);
    if (!targetVersion) return null;

    return this.update(fileId, {
      current_version: targetVersion.version_number,
      storage_key: targetVersion.storage_key,
      size_bytes: targetVersion.size_bytes
    });
  }
}

export const fileRepository = new FileRepository();
