export type UserRole = 'owner' | 'editor' | 'viewer';
export type ResourceType = 'file' | 'folder';
export type FileStatus = 'uploading' | 'ready' | 'failed';

export interface User {
  id: string;
  email: string;
  password_hash?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface UserPublicProfile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  type?: 'access' | 'refresh';
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

export interface FileRecord {
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
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_key: string;
  size_bytes: number;
  checksum?: string | null;
  created_by: string;
  created_at: string;
}

export interface Share {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  grantee_user_id: string;
  role: UserRole;
  created_by: string;
  created_at: string;
}

export interface LinkShare {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  token: string;
  password_hash?: string | null;
  role: 'viewer' | 'editor';
  expires_at?: string | null;
  created_by: string;
  created_at: string;
}

export interface Star {
  user_id: string;
  resource_type: ResourceType;
  resource_id: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type?: ResourceType | null;
  resource_id?: string | null;
  details?: Record<string, any> | null;
  metadata?: Record<string, any>;
  ip_address?: string | null;
  created_at: string;
}
