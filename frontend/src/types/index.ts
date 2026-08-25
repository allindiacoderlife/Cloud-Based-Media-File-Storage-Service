export type UserRole = 'owner' | 'editor' | 'viewer';
export type ResourceType = 'file' | 'folder';
export type FileStatus = 'uploading' | 'ready' | 'failed';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  owner_id: string;
  parent_id: string | null;
  is_deleted: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileItem {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  thumbnail_key?: string | null;
  owner_id: string;
  folder_id: string | null;
  status: FileStatus;
  is_deleted: boolean;
  deleted_at?: string | null;
  checksum?: string | null;
  current_version: number;
  created_at: string;
  updated_at: string;
  is_starred?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | null;
  meta?: Record<string, any>;
}
