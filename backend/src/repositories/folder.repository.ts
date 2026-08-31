import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { Folder } from '../types/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

// In-memory fallback map for offline dev & tests
export const devFallbackFolders = new Map<string, Folder>();

export class FolderRepository {
  async create(folder: {
    id?: string;
    name: string;
    owner_id: string;
    parent_id?: string | null;
  }): Promise<Folder> {
    const folderId = folder.id || crypto.randomUUID();
    const parentId = folder.parent_id || null;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('folders')
          .insert({
            id: folderId,
            name: folder.name.trim(),
            owner_id: folder.owner_id,
            parent_id: parentId,
            is_deleted: false
          })
          .select()
          .single();

        if (!error && data) {
          return data as Folder;
        }
        logger.warn(`Supabase folder insert failed, using fallback store: ${error?.message}`);
      } catch (err: any) {
        logger.warn(`FolderRepository.create exception: ${err.message}`);
      }
    }

    const fallbackFolder: Folder = {
      id: folderId,
      name: folder.name.trim(),
      owner_id: folder.owner_id,
      parent_id: parentId,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    devFallbackFolders.set(folderId, fallbackFolder);
    return fallbackFolder;
  }

  async findById(folderId: string): Promise<Folder | null> {
    if (devFallbackFolders.has(folderId)) {
      const f = devFallbackFolders.get(folderId)!;
      return f.is_deleted ? null : f;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('folders')
          .select('*')
          .eq('id', folderId)
          .eq('is_deleted', false)
          .maybeSingle();

        if (!error && data) {
          return data as Folder;
        }
      } catch (err: any) {
        logger.warn(`FolderRepository.findById exception: ${err.message}`);
      }
    }

    return null;
  }

  async findByNameAndParent(
    ownerId: string,
    parentId: string | null,
    name: string
  ): Promise<Folder | null> {
    const normalizedName = name.trim().toLowerCase();

    if (isSupabaseConfigured) {
      try {
        let query = supabaseAdmin
          .from('folders')
          .select('*')
          .eq('owner_id', ownerId)
          .eq('is_deleted', false)
          .ilike('name', normalizedName);

        if (parentId === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', parentId);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          return data as Folder;
        }
      } catch (err: any) {
        logger.warn(`FolderRepository.findByNameAndParent exception: ${err.message}`);
      }
    }

    const match = Array.from(devFallbackFolders.values()).find(
      (f) =>
        f.owner_id === ownerId &&
        !f.is_deleted &&
        f.parent_id === parentId &&
        f.name.toLowerCase() === normalizedName
    );

    return match || null;
  }

  async listByParent(ownerId: string, parentId?: string | null): Promise<Folder[]> {
    const targetParent = parentId || null;

    if (isSupabaseConfigured) {
      try {
        let query = supabaseAdmin
          .from('folders')
          .select('*')
          .eq('owner_id', ownerId)
          .eq('is_deleted', false)
          .order('name', { ascending: true });

        if (targetParent === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', targetParent);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as Folder[];
        }
      } catch (err: any) {
        logger.warn(`FolderRepository.listByParent exception: ${err.message}`);
      }
    }

    return Array.from(devFallbackFolders.values()).filter(
      (f) => f.owner_id === ownerId && !f.is_deleted && f.parent_id === targetParent
    );
  }

  async listAllByOwner(ownerId: string): Promise<Folder[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('folders')
          .select('*')
          .eq('owner_id', ownerId)
          .eq('is_deleted', false)
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as Folder[];
        }
      } catch (err: any) {
        logger.warn(`FolderRepository.listAllByOwner exception: ${err.message}`);
      }
    }

    return Array.from(devFallbackFolders.values()).filter(
      (f) => f.owner_id === ownerId && !f.is_deleted
    );
  }

  /**
   * Resolves recursive breadcrumbs from root down to current folder
   */
  async getBreadcrumbs(ownerId: string, folderId: string | null): Promise<BreadcrumbItem[]> {
    const breadcrumbs: BreadcrumbItem[] = [{ id: null, name: 'My Drive' }];
    if (!folderId) return breadcrumbs;

    const trail: BreadcrumbItem[] = [];
    let currentId: string | null = folderId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const folder = await this.findById(currentId);
      if (!folder || folder.owner_id !== ownerId) break;

      trail.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parent_id;
    }

    return [...breadcrumbs, ...trail];
  }

  /**
   * Recursively finds all descendant subfolder IDs
   */
  async getDescendantIds(ownerId: string, folderId: string): Promise<string[]> {
    const allFolders = await this.listAllByOwner(ownerId);
    const descendantIds: string[] = [];

    const findChildren = (parent: string) => {
      const children = allFolders.filter((f) => f.parent_id === parent);
      for (const child of children) {
        descendantIds.push(child.id);
        findChildren(child.id);
      }
    };

    findChildren(folderId);
    return descendantIds;
  }

  async update(
    folderId: string,
    updates: { name?: string; parent_id?: string | null }
  ): Promise<Folder | null> {
    if (isSupabaseConfigured) {
      try {
        const updatePayload: any = {
          updated_at: new Date().toISOString()
        };
        if (updates.name !== undefined) updatePayload.name = updates.name.trim();
        if (updates.parent_id !== undefined) updatePayload.parent_id = updates.parent_id;

        const { data, error } = await supabaseAdmin
          .from('folders')
          .update(updatePayload)
          .eq('id', folderId)
          .select()
          .single();

        if (!error && data) {
          return data as Folder;
        }
      } catch (err: any) {
        logger.warn(`FolderRepository.update exception: ${err.message}`);
      }
    }

    const existing = devFallbackFolders.get(folderId);
    if (existing) {
      if (updates.name !== undefined) existing.name = updates.name.trim();
      if (updates.parent_id !== undefined) existing.parent_id = updates.parent_id;
      existing.updated_at = new Date().toISOString();
      return existing;
    }

    return null;
  }

  async softDelete(folderId: string): Promise<void> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin
          .from('folders')
          .update({ is_deleted: true, deleted_at: now, updated_at: now })
          .eq('id', folderId);
      } catch (err: any) {
        logger.warn(`FolderRepository.softDelete exception: ${err.message}`);
      }
    }

    const existing = devFallbackFolders.get(folderId);
    if (existing) {
      existing.is_deleted = true;
      existing.deleted_at = now;
      existing.updated_at = now;
    }
  }

  async softDeleteMany(folderIds: string[]): Promise<void> {
    if (folderIds.length === 0) return;
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin
          .from('folders')
          .update({ is_deleted: true, deleted_at: now, updated_at: now })
          .in('id', folderIds);
      } catch (err: any) {
        logger.warn(`FolderRepository.softDeleteMany exception: ${err.message}`);
      }
    }

    for (const id of folderIds) {
      const existing = devFallbackFolders.get(id);
      if (existing) {
        existing.is_deleted = true;
        existing.deleted_at = now;
        existing.updated_at = now;
      }
    }
  }
}

export const folderRepository = new FolderRepository();
