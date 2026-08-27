import crypto from 'crypto';
import path from 'path';

export interface StorageKeyParams {
  ownerId: string;
  folderId?: string | null;
  fileId?: string;
  filename: string;
  version?: number;
}

/**
 * Sanitizes a filename to a safe slug
 */
export function sanitizeFilename(filename: string): { slug: string; ext: string } {
  const parsed = path.parse(filename);
  const ext = parsed.ext.replace(/^\./, '').toLowerCase() || 'bin';
  const slug = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80) || 'file';

  return { slug, ext };
}

/**
 * Generates structured private object storage keys
 * Pattern: tenants/{owner_id}/folders/{folder_id}/files/{file_uuid}-{slug}.{ext}
 * Version Pattern: tenants/{owner_id}/folders/{folder_id}/files/{file_uuid}-{slug}-v{version}.{ext}
 */
export function generateStorageKey(params: StorageKeyParams): string {
  const { ownerId, folderId, filename, version } = params;
  const fileId = params.fileId || crypto.randomUUID();
  const folderSegment = folderId || 'root';
  const { slug, ext } = sanitizeFilename(filename);

  if (version && version > 1) {
    return `tenants/${ownerId}/folders/${folderSegment}/files/${fileId}-${slug}-v${version}.${ext}`;
  }

  return `tenants/${ownerId}/folders/${folderSegment}/files/${fileId}-${slug}.${ext}`;
}
