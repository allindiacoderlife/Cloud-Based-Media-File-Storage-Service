-- ==============================================================================
-- Cloud-Based Media File Storage Service - Database Schema (PostgreSQL / Supabase)
-- ==============================================================================

-- Enable UUID extension & pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Users Profile Table (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    storage_quota_bytes BIGINT NOT NULL DEFAULT 5368709120, -- 5 GB Default Quota
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Folders Table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique folder name constraint per parent folder for active folders
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_folder_name 
ON public.folders (owner_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name) 
WHERE is_deleted = FALSE;

-- 3. Files Table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    storage_key TEXT NOT NULL,
    thumbnail_key TEXT,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'uploading', -- 'uploading', 'ready', 'failed'
    current_version INT NOT NULL DEFAULT 1,
    checksum VARCHAR(64),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. File Versions Table
CREATE TABLE IF NOT EXISTS public.file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_key TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(64),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(file_id, version_number)
);

-- 5. User-to-User Shares Table (ACL)
CREATE TABLE IF NOT EXISTS public.shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(16) NOT NULL CHECK (resource_type IN ('file', 'folder')),
    resource_id UUID NOT NULL,
    grantee_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL CHECK (role IN ('viewer', 'editor')),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (resource_type, resource_id, grantee_user_id)
);

-- 6. Public Link Shares Table
CREATE TABLE IF NOT EXISTS public.link_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(16) NOT NULL CHECK (resource_type IN ('file', 'folder')),
    resource_id UUID NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(16) NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    expires_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Favorites / Starred Items Table
CREATE TABLE IF NOT EXISTS public.stars (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(16) NOT NULL CHECK (resource_type IN ('file', 'folder')),
    resource_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, resource_type, resource_id)
);

-- 8. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL, -- 'upload', 'download', 'rename', 'move', 'delete', 'share', 'restore'
    resource_type VARCHAR(16) NOT NULL,
    resource_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_folders_owner_parent ON public.folders(owner_id, parent_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_files_owner_folder ON public.files(owner_id, folder_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_files_status ON public.files(status);
CREATE INDEX IF NOT EXISTS idx_shares_grantee ON public.shares(grantee_user_id);
CREATE INDEX IF NOT EXISTS idx_link_shares_token ON public.link_shares(token);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_name_trgm ON public.files USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_folders_name_trgm ON public.folders USING gin (name gin_trgm_ops);

-- ==============================================================================
-- Triggers for Automatic updated_at Timestamps
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_folders_updated_at ON public.folders;
CREATE TRIGGER trg_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_files_updated_at ON public.files;
CREATE TRIGGER trg_files_updated_at BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
