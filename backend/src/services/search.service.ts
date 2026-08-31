import { searchRepository, SearchResults } from '../repositories/search.repository.js';
import { starRepository } from '../repositories/star.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { fileRepository } from '../repositories/file.repository.js';
import { folderRepository } from '../repositories/folder.repository.js';
import { SearchQueryInput, ToggleStarInput } from '../validators/search.validator.js';
import { FileRecord, Folder, ActivityLog } from '../types/index.js';

export interface StarredResourcesResult {
  folders: Folder[];
  files: FileRecord[];
}

export interface RecentActivityResult {
  recentFiles: FileRecord[];
  activities: ActivityLog[];
}

export class SearchService {
  async search(
    userId: string,
    input: SearchQueryInput
  ): Promise<{ folders: Array<Folder & { is_starred: boolean }>; files: Array<FileRecord & { is_starred: boolean }>; total: number }> {
    const [results, starredFolderIds, starredFileIds] = await Promise.all([
      searchRepository.search(userId, input),
      starRepository.getStarredIds(userId, 'folder'),
      starRepository.getStarredIds(userId, 'file')
    ]);

    const foldersWithStars = results.folders.map((f) => ({
      ...f,
      is_starred: starredFolderIds.has(f.id)
    }));

    const filesWithStars = results.files.map((file) => ({
      ...file,
      is_starred: starredFileIds.has(file.id)
    }));

    return {
      folders: foldersWithStars,
      files: filesWithStars,
      total: results.total
    };
  }

  async toggleStar(userId: string, input: ToggleStarInput): Promise<{ isStarred: boolean }> {
    // 1. Verify resource exists
    if (input.resourceType === 'file') {
      const file = await fileRepository.findById(input.resourceId);
      if (!file || file.is_deleted) throw new Error('File not found');
    } else {
      const folder = await folderRepository.findById(input.resourceId);
      if (!folder || folder.is_deleted) throw new Error('Folder not found');
    }

    const { isStarred } = await starRepository.toggleStar(
      userId,
      input.resourceType,
      input.resourceId
    );

    // 2. Log activity
    await activityRepository.logActivity({
      user_id: userId,
      action: isStarred ? 'star' : 'unstar',
      resource_type: input.resourceType,
      resource_id: input.resourceId
    });

    return { isStarred };
  }

  async listStarred(userId: string): Promise<StarredResourcesResult> {
    const stars = await starRepository.listStarredByUser(userId);

    const folderIds = stars.filter((s) => s.resource_type === 'folder').map((s) => s.resource_id);
    const fileIds = stars.filter((s) => s.resource_type === 'file').map((s) => s.resource_id);

    const [folders, files] = await Promise.all([
      Promise.all(folderIds.map((id) => folderRepository.findById(id))),
      Promise.all(fileIds.map((id) => fileRepository.findById(id)))
    ]);

    return {
      folders: (folders.filter(Boolean) as Folder[]).filter((f) => !f.is_deleted),
      files: (files.filter(Boolean) as FileRecord[]).filter((f) => !f.is_deleted)
    };
  }

  async listRecent(userId: string, limit = 20): Promise<RecentActivityResult> {
    const [rawFiles, activities, starredFileIds] = await Promise.all([
      fileRepository.listByOwner(userId, { limit, offset: 0 }),
      activityRepository.listRecentActivity(userId, limit),
      starRepository.getStarredIds(userId, 'file')
    ]);

    const recentFilesWithStars = rawFiles.files.map((file) => ({
      ...file,
      is_starred: starredFileIds.has(file.id)
    }));

    return {
      recentFiles: recentFilesWithStars,
      activities
    };
  }
}

export const searchService = new SearchService();
