import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { FileRecord, Folder, ResourceType } from '../types/index.js';
import { devFallbackFiles } from './file.repository.js';
import { devFallbackFolders } from './folder.repository.js';
import { logger } from '../utils/logger.js';

export interface TrashListResult {
  folders: Folder[];
  files: FileRecord[];
}

export class TrashRepository {
  async listTrash(userId: string): Promise<TrashListResult> {
    let folders: Folder[] = [];
    let files: FileRecord[] = [];

    if (isSupabaseConfigured) {
      try {
        const [foldersRes, filesRes] = await Promise.all([
          supabaseAdmin
            .from('folders')
            .select('*')
            .eq('owner_id', userId)
            .eq('is_deleted', true)
            .order('deleted_at', { ascending: false }),
          supabaseAdmin
            .from('files')
            .select('*')
            .eq('owner_id', userId)
            .eq('is_deleted', true)
            .order('deleted_at', { ascending: false })
        ]);

        if (!foldersRes.error && foldersRes.data) {
          folders = foldersRes.data as Folder[];
        }
        if (!filesRes.error && filesRes.data) {
          files = filesRes.data as FileRecord[];
        }
      } catch (err: any) {
        logger.warn(`TrashRepository.listTrash exception: ${err.message}`);
      }
    }

    if (folders.length === 0 && files.length === 0) {
      folders = Array.from(devFallbackFolders.values()).filter(
        (f) => f.owner_id === userId && f.is_deleted
      );
      files = Array.from(devFallbackFiles.values()).filter(
        (f) => f.owner_id === userId && f.is_deleted
      );
    }

    return { folders, files };
  }

  async restoreResource(userId: string, resourceType: ResourceType, resourceId: string): Promise<boolean> {
    if (resourceType === 'folder') {
      if (isSupabaseConfigured) {
        await supabaseAdmin
          .from('folders')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', resourceId)
          .eq('owner_id', userId);

        // Also restore child files & folders
        await supabaseAdmin
          .from('files')
          .update({ is_deleted: false, deleted_at: null })
          .eq('folder_id', resourceId)
          .eq('owner_id', userId);
      }

      const folder = devFallbackFolders.get(resourceId);
      if (folder && folder.owner_id === userId) {
        folder.is_deleted = false;
        folder.deleted_at = null;
      }
      return true;
    } else {
      if (isSupabaseConfigured) {
        await supabaseAdmin
          .from('files')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', resourceId)
          .eq('owner_id', userId);
      }

      const file = devFallbackFiles.get(resourceId);
      if (file && file.owner_id === userId) {
        file.is_deleted = false;
        file.deleted_at = null;
      }
      return true;
    }
  }

  async emptyTrash(userId: string): Promise<{ deletedFoldersCount: number; deletedFilesCount: number }> {
    let deletedFoldersCount = 0;
    let deletedFilesCount = 0;

    if (isSupabaseConfigured) {
      try {
        const [delFolders, delFiles] = await Promise.all([
          supabaseAdmin.from('folders').delete().eq('owner_id', userId).eq('is_deleted', true),
          supabaseAdmin.from('files').delete().eq('owner_id', userId).eq('is_deleted', true)
        ]);

        deletedFoldersCount = delFolders.count || 0;
        deletedFilesCount = delFiles.count || 0;
      } catch (err: any) {
        logger.warn(`TrashRepository.emptyTrash exception: ${err.message}`);
      }
    }

    for (const [id, f] of devFallbackFolders.entries()) {
      if (f.owner_id === userId && f.is_deleted) {
        devFallbackFolders.delete(id);
        deletedFoldersCount++;
      }
    }

    for (const [id, file] of devFallbackFiles.entries()) {
      if (file.owner_id === userId && file.is_deleted) {
        devFallbackFiles.delete(id);
        deletedFilesCount++;
      }
    }

    return { deletedFoldersCount, deletedFilesCount };
  }
}

export const trashRepository = new TrashRepository();
