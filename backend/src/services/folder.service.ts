import { folderRepository, BreadcrumbItem } from '../repositories/folder.repository.js';
import { fileRepository } from '../repositories/file.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { CreateFolderInput, UpdateFolderInput } from '../validators/folder.validator.js';
import { Folder, FileRecord } from '../types/index.js';

export interface FolderContentsResult {
  folder: Folder | null;
  breadcrumbs: BreadcrumbItem[];
  folders: Folder[];
  files: FileRecord[];
}

export class FolderService {
  async createFolder(ownerId: string, input: CreateFolderInput): Promise<Folder> {
    const parentId = input.parentId || null;

    // 1. Verify parent folder if specified
    if (parentId) {
      const parent = await folderRepository.findById(parentId);
      if (!parent || parent.owner_id !== ownerId) {
        throw new Error('Parent folder not found');
      }
    }

    // 2. Check for duplicate folder name in same parent
    const existing = await folderRepository.findByNameAndParent(ownerId, parentId, input.name);
    if (existing) {
      throw new Error(`A folder named "${input.name.trim()}" already exists in this location.`);
    }

    return folderRepository.create({
      name: input.name,
      owner_id: ownerId,
      parent_id: parentId
    });
  }

  async getFolderContents(
    ownerId: string,
    folderId?: string | null
  ): Promise<FolderContentsResult> {
    const targetFolderId = folderId || null;
    let folder: Folder | null = null;

    if (targetFolderId) {
      folder = await folderRepository.findById(targetFolderId);
      if (!folder || folder.owner_id !== ownerId) {
        throw new Error('Folder not found');
      }
    }

    const [breadcrumbs, folders, filesResult] = await Promise.all([
      folderRepository.getBreadcrumbs(ownerId, targetFolderId),
      folderRepository.listByParent(ownerId, targetFolderId),
      fileRepository.listByOwner(ownerId, { folderId: targetFolderId, status: 'ready' })
    ]);

    return {
      folder,
      breadcrumbs,
      folders,
      files: filesResult.files
    };
  }

  async listFolders(ownerId: string, parentId?: string | null): Promise<Folder[]> {
    return folderRepository.listByParent(ownerId, parentId);
  }

  async listAllFolders(ownerId: string): Promise<Folder[]> {
    return folderRepository.listAllByOwner(ownerId);
  }

  async updateFolder(
    ownerId: string,
    folderId: string,
    input: UpdateFolderInput
  ): Promise<Folder> {
    const folder = await folderRepository.findById(folderId);
    if (!folder || folder.owner_id !== ownerId) {
      throw new Error('Folder not found');
    }

    const newName = input.name ? input.name.trim() : folder.name;
    const newParentId = input.parentId !== undefined ? input.parentId : folder.parent_id;

    // Cycle Prevention Check if parentId changed
    if (input.parentId !== undefined && input.parentId !== folder.parent_id) {
      if (input.parentId === folderId) {
        throw new Error('Cannot move a folder into itself.');
      }

      if (input.parentId !== null) {
        const targetParent = await folderRepository.findById(input.parentId);
        if (!targetParent || targetParent.owner_id !== ownerId) {
          throw new Error('Target destination folder not found');
        }

        const descendantIds = await folderRepository.getDescendantIds(ownerId, folderId);
        if (descendantIds.includes(input.parentId)) {
          throw new Error('Cannot move a folder into one of its subfolders.');
        }
      }
    }

    // Check duplicate name in target parent
    if (newName !== folder.name || newParentId !== folder.parent_id) {
      const existing = await folderRepository.findByNameAndParent(ownerId, newParentId, newName);
      if (existing && existing.id !== folderId) {
        throw new Error(`A folder named "${newName}" already exists in the destination.`);
      }
    }

    const updated = await folderRepository.update(folderId, {
      name: newName,
      parent_id: newParentId
    });

    if (!updated) {
      throw new Error('Failed to update folder');
    }

    return updated;
  }

  async deleteFolder(ownerId: string, folderId: string): Promise<void> {
    const folder = await folderRepository.findById(folderId);
    if (!folder || folder.owner_id !== ownerId) {
      throw new Error('Folder not found');
    }

    // Get all descendant folders to cascade soft-delete
    const descendantIds = await folderRepository.getDescendantIds(ownerId, folderId);
    const allFolderIds = [folderId, ...descendantIds];

    await folderRepository.softDeleteMany(allFolderIds);
    await fileRepository.softDeleteByFolderIds(allFolderIds);

    // Recalculate user storage usage
    const totalStorage = await fileRepository.calculateTotalUserStorage(ownerId);
    await userRepository.updateStorageUsage(ownerId, totalStorage);
  }
}

export const folderService = new FolderService();
