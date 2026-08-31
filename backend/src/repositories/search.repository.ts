import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { fileRepository, devFallbackFiles } from './file.repository.js';
import { folderRepository, devFallbackFolders } from './folder.repository.js';
import { FileRecord, Folder } from '../types/index.js';
import { SearchQueryInput } from '../validators/search.validator.js';
import { logger } from '../utils/logger.js';

export interface SearchResults {
  folders: Folder[];
  files: FileRecord[];
  total: number;
}

export class SearchRepository {
  private matchesCategory(mimeType: string, category: string): boolean {
    if (category === 'all') return true;
    const mime = (mimeType || '').toLowerCase();

    switch (category) {
      case 'image':
        return mime.startsWith('image/');
      case 'video':
        return mime.startsWith('video/');
      case 'audio':
        return mime.startsWith('audio/');
      case 'document':
        return (
          mime === 'application/pdf' ||
          mime.includes('document') ||
          mime.includes('word') ||
          mime.includes('sheet') ||
          mime.includes('text/plain') ||
          mime.includes('text/markdown')
        );
      case 'archive':
        return (
          mime.includes('zip') ||
          mime.includes('compressed') ||
          mime.includes('tar') ||
          mime.includes('rar') ||
          mime.includes('7z') ||
          mime.includes('gzip')
        );
      case 'code':
        return (
          mime.includes('json') ||
          mime.includes('javascript') ||
          mime.includes('typescript') ||
          mime.includes('xml') ||
          mime.includes('html') ||
          mime.includes('css')
        );
      default:
        return true;
    }
  }

  async search(userId: string, input: SearchQueryInput): Promise<SearchResults> {
    const q = (input.q || '').trim().toLowerCase();
    const type = input.type || 'all';
    const category = input.category || 'all';
    const minSize = input.minSize;
    const maxSize = input.maxSize;
    const sortBy = input.sortBy || 'updated_at';
    const sortOrder = input.sortOrder || 'desc';
    const limit = input.limit || 50;
    const offset = input.offset || 0;

    let matchedFolders: Folder[] = [];
    let matchedFiles: FileRecord[] = [];

    // 1. Search Folders (if type is 'all' or 'folder' and category is 'all')
    if (type !== 'file' && category === 'all') {
      if (isSupabaseConfigured) {
        try {
          let folderQuery = supabaseAdmin
            .from('folders')
            .select('*')
            .eq('owner_id', userId)
            .eq('is_deleted', false);

          if (q) {
            folderQuery = folderQuery.ilike('name', `%${q}%`);
          }

          const { data, error } = await folderQuery;
          if (!error && data) {
            matchedFolders = data as Folder[];
          }
        } catch (err: any) {
          logger.warn(`SearchRepository folder query exception: ${err.message}`);
        }
      }

      if (matchedFolders.length === 0) {
        matchedFolders = Array.from(devFallbackFolders.values()).filter(
          (f) =>
            f.owner_id === userId &&
            !f.is_deleted &&
            (!q || f.name.toLowerCase().includes(q))
        );
      }
    }

    // 2. Search Files (if type is 'all' or 'file')
    if (type !== 'folder') {
      if (isSupabaseConfigured) {
        try {
          let fileQuery = supabaseAdmin
            .from('files')
            .select('*')
            .eq('owner_id', userId)
            .eq('is_deleted', false)
            .eq('status', 'ready');

          if (q) {
            fileQuery = fileQuery.ilike('name', `%${q}%`);
          }

          if (minSize !== undefined) {
            fileQuery = fileQuery.gte('size_bytes', minSize);
          }

          if (maxSize !== undefined) {
            fileQuery = fileQuery.lte('size_bytes', maxSize);
          }

          const { data, error } = await fileQuery;
          if (!error && data) {
            matchedFiles = (data as FileRecord[]).filter((f) =>
              this.matchesCategory(f.mime_type, category)
            );
          }
        } catch (err: any) {
          logger.warn(`SearchRepository file query exception: ${err.message}`);
        }
      }

      if (matchedFiles.length === 0) {
        matchedFiles = Array.from(devFallbackFiles.values()).filter(
          (f) =>
            f.owner_id === userId &&
            !f.is_deleted &&
            f.status === 'ready' &&
            (!q || f.name.toLowerCase().includes(q)) &&
            (minSize === undefined || f.size_bytes >= minSize) &&
            (maxSize === undefined || f.size_bytes <= maxSize) &&
            this.matchesCategory(f.mime_type, category)
        );
      }
    }

    // 3. Sorting
    const sortFn = (a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'name') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (sortBy === 'size_bytes') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      // Date comparison
      const timeA = new Date(valA || 0).getTime();
      const timeB = new Date(valB || 0).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    };

    matchedFolders.sort(sortFn);
    matchedFiles.sort(sortFn);

    const total = matchedFolders.length + matchedFiles.length;

    // Apply pagination slice
    const paginatedFolders = matchedFolders.slice(offset, offset + limit);
    const paginatedFiles = matchedFiles.slice(
      Math.max(0, offset - matchedFolders.length),
      Math.max(0, offset - matchedFolders.length + limit)
    );

    return {
      folders: paginatedFolders,
      files: paginatedFiles,
      total
    };
  }
}

export const searchRepository = new SearchRepository();
