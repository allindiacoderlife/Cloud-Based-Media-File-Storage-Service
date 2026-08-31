# Cloud-Based Media File Storage Service — Complete Implementation Plan

> **Source:** Cloud based Media Files Storage Service – Detailed Project Specification – Web  
> **Goal:** Build a production-ready Google Drive–style cloud storage web application with authentication, folders, file upload/download, sharing, search, trash, versioning, previews, activity logs, and secure object storage.

---

## 1. Project Objective

Build a cloud-based file storage and sharing platform where users can:

- Register and sign in securely.
- Create and manage hierarchical folders.
- Upload files with progress tracking.
- Download files through short-lived signed URLs.
- Rename, move, delete, and restore files/folders.
- Share files/folders with other users as Viewer or Editor.
- Generate public share links with optional password and expiry.
- Search, sort, filter, star, and browse recent files.
- Use Trash with a retention period.
- View file previews and thumbnails.
- Track file versions and activity.
- Operate the application securely with API-level and storage-level authorization.

The MVP should prioritize **reliability, security, clean architecture, and a working end-to-end flow** before advanced features.

The source specification explicitly excludes office editors, real-time document co-editing, complex organization hierarchies, and desktop sync from the MVP.

---

# 2. Recommended Final Stack

The source document presents several frontend/backend alternatives, but its detailed architecture recommends the following implementation.

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- dnd-kit / React DnD
- Uppy or native upload UI
- App Router

## Backend

- Node.js
- Express.js
- TypeScript
- REST API
- Zod validation
- JWT/session authentication
- Multer only where appropriate for small uploads
- Presigned/resumable upload flow for larger files

## Database

- PostgreSQL
- Supabase-managed PostgreSQL

## Object Storage

Recommended:

- Supabase Storage for the first implementation

Alternative:

- AWS S3

## Authentication

Recommended:

- Supabase Auth

Alternative:

- Custom JWT + refresh-token rotation
- Auth.js/NextAuth
- Clerk

## Cache / Background Jobs

- Redis
- BullMQ

Use this for:

- Thumbnail generation
- Preview generation
- Email/invite jobs
- Virus scanning if added
- Trash purge
- Other heavy asynchronous tasks

## Deployment

- Frontend: Vercel
- Backend: Render / Fly.io
- Database: Supabase
- Storage: Supabase Storage
- CI/CD: GitHub Actions
- Monitoring: Sentry + uptime monitoring

---

# 3. Repository Architecture

The source specification requires frontend and backend to be separated.

```text
cloud-storage/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── providers/
│   │   ├── types/
│   │   └── utils/
│   │
│   └── api/
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── repositories/
│       │   ├── validators/
│       │   ├── workers/
│       │   ├── utils/
│       │   └── server.ts
│       └── tests/
│
├── packages/
│   ├── ui/
│   ├── config/
│   └── types/
│
├── infra/
│   ├── docker/
│   ├── migrations/
│   └── compose/
│
├── .github/
│   └── workflows/
│
├── README.md
└── .env.example
```

---

# 4. High-Level Architecture

```text
                    ┌─────────────────────┐
                    │      Next.js        │
                    │       Web App       │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │   Node / Express    │
                    │       REST API      │
                    └──────┬───────┬──────┘
                           │       │
                     SQL   │       │ Jobs
                           │       ▼
                           │   ┌───────────┐
                           │   │   Redis   │
                           │   │  BullMQ   │
                           │   └─────┬─────┘
                           │         │
                           ▼         ▼
                ┌────────────────┐  ┌───────────────┐
                │   PostgreSQL   │  │    Workers    │
                │   Supabase DB  │  │ thumbnails /  │
                └────────────────┘  │ emails / etc. │
                                    └───────┬───────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │ Object Storage  │
                                   │ Supabase / S3   │
                                   └─────────────────┘
```

---

# 5. Core Functional Modules

## Module 1 — Authentication

Features:

- Register
- Login
- Logout
- Current-user session
- Password hashing if custom auth is used
- OAuth optional
- Protected API routes
- Refresh token/session rotation
- Profile

Acceptance criteria:

- Unauthenticated users cannot access private files.
- Sessions remain secure.
- Logout invalidates the active session.
- API routes verify authentication before performing operations.

---

# 6. Module 2 — User Profile

User fields:

```text
id
email
name
image_url
created_at
```

Features:

- View profile
- Update name
- Update avatar
- View account information

---

# 7. Module 3 — Folder Management

Features:

- Create folder
- Rename folder
- Delete folder
- Move folder
- Nested folders
- Folder tree
- Breadcrumb navigation
- Duplicate-name prevention within the same parent
- Trash support

Folder model:

```text
Folder
├── id
├── name
├── owner_id
├── parent_id
├── is_deleted
├── created_at
└── updated_at
```

Hierarchy strategy:

- Use an adjacency list with `parent_id`.
- Use recursive CTEs for breadcrumb/tree queries where necessary.
- Prevent cycles when moving folders.
- Recommended uniqueness rule:

```text
(owner_id, parent_id, name)
```

for active folders.

---

# 8. Module 4 — File Management

Features:

- Upload
- Download
- Rename
- Move
- Delete
- Restore
- File metadata
- File type detection
- File size
- Storage path
- Current version
- Checksum

File model:

```text
File
├── id
├── name
├── mime_type
├── size_bytes
├── storage_key
├── owner_id
├── folder_id
├── version_id
├── checksum
├── is_deleted
├── created_at
└── updated_at
```

---

# 9. Upload Architecture

Do not send large files through the Express server unnecessarily.

## Upload flow

```text
Client
  │
  │ POST /api/files/init
  ▼
Express API
  │
  ├── Authenticate user
  ├── Check folder permission
  ├── Validate file
  ├── Create DB placeholder
  └── Generate upload information
          │
          ▼
      Object Storage
          │
          │ multipart/resumable upload
          ▼
       Client upload
          │
          │ POST /api/files/complete
          ▼
      Express API
          │
          ├── Verify upload
          ├── Update DB status
          └── Queue preview job
```

## File upload states

Recommended:

```text
uploading
ready
failed
```

## Validation

Allowlist appropriate MIME types such as:

```text
image/*
application/pdf
text/plain
application/vnd.openxmlformats-officedocument.*
```

Also enforce:

- Maximum file size
- Filename sanitization
- No path traversal
- Valid folder access
- User quota if quotas are implemented

---

# 10. Storage Key Design

Use a private object-storage bucket.

Recommended structure:

```text
tenants/{owner_id}/folders/{folder_id}/files/{file_uuid}-{slug}.{ext}
```

For versions:

```text
tenants/{owner_id}/folders/{folder_id}/files/{file_uuid}-{slug}-v{version}.{ext}
```

Never expose raw storage keys directly to users.

---

# 11. Download Architecture

```text
Client
  │
  │ GET /api/files/:id
  ▼
API
  │
  ├── Authenticate
  ├── Check ACL
  ├── Verify file
  └── Generate short-lived signed URL
           │
           ▼
       Storage/CDN
           │
           ▼
         Client
```

The API must verify access before generating the signed URL.

---

# 12. Sharing & Permissions

## Roles

### Owner

- Full access
- Rename
- Move
- Delete
- Share
- Download
- Manage permissions

### Editor

- Upload
- Edit metadata
- Move where permitted
- Delete where permitted

### Viewer

- View
- Download
- No modification

### Public Link Holder

- View-only by default
- Optional password
- Optional expiration

---

# 13. User Share Flow

```text
Owner
  │
  │ POST /api/shares
  ▼
API
  │
  ├── Verify owner/editor permission
  ├── Validate target user
  ├── Create ACL record
  └── Return share information
```

Share table:

```text
id
resource_type
resource_id
grantee_user_id
role
created_by
created_at
```

Constraint:

```text
UNIQUE(resource_type, resource_id, grantee_user_id)
```

---

# 14. Public Share Links

Features:

- Generate link
- Viewer access
- Optional password
- Optional expiry
- Revoke link
- Resolve link

Example:

```text
POST /api/link-shares
```

Request:

```json
{
  "resourceType": "file",
  "resourceId": "uuid",
  "expiresAt": "2026-09-01T00:00:00Z",
  "password": "optional"
}
```

Store:

- Random token
- Password hash only
- Expiration timestamp

Never store public-link passwords as plaintext.

---

# 15. Search

## MVP

Search by:

- File/folder name
- Type
- Owner
- Starred status

## PostgreSQL strategy

Use:

- B-tree indexes
- Full-text search
- `pg_trgm` for fuzzy matching

Important indexes:

```text
files(name, owner_id)
folders(name, owner_id)
activities(created_at DESC)
shares(resource_type, resource_id)
link_shares(token)
```

For fuzzy file-name search:

```text
GIN(name gin_trgm_ops)
```

---

# 16. Starred / Favorites

Table:

```text
stars
├── user_id
├── resource_type
└── resource_id
```

Primary key:

```text
(user_id, resource_type, resource_id)
```

APIs:

```text
POST   /api/stars
DELETE /api/stars
GET    /api/search?starred=true
```

---

# 17. Recent Files

Use activity information and timestamps to identify recently accessed/modified resources.

Recommended UI:

```text
My Drive
Shared
Starred
Recent
Trash
```

---

# 18. Trash System

Use soft delete.

Instead of physically deleting immediately:

```text
is_deleted = true
```

Trash flow:

```text
Delete
  ↓
is_deleted = true
  ↓
Trash
  ↓
Restore OR automatic purge
```

Retention example:

```text
30 days
```

Scheduled purge:

```text
Find deleted records older than retention period
        ↓
Delete storage objects
        ↓
Delete database records
```

Use a background job/cron rather than doing this during normal API requests.

---

# 19. File Versioning

Version table:

```text
file_versions
├── id
├── file_id
├── version_number
├── storage_key
├── size_bytes
├── checksum
└── created_at
```

Current version:

```text
files.version_id
```

Upload new version:

```text
Existing File
     ↓
Create file_versions row
     ↓
Increment version_number
     ↓
Update files.version_id
```

UI should eventually allow:

- Version list
- Version date
- Version size
- Restore/revert

---

# 20. Activity Log

Use an append-only activity table.

Actions:

```text
upload
rename
delete
restore
move
share
download
```

Example:

```json
{
  "oldName": "old.pdf",
  "newName": "new.pdf"
}
```

Use the activity panel for:

- File history
- User actions
- Sharing activity
- Downloads

---

# 21. Database Plan

## Tables

Implement in this order:

1. `users`
2. `folders`
3. `files`
4. `file_versions`
5. `shares`
6. `link_shares`
7. `stars`
8. `activities`

## Relationships

```text
users
 ├── folders
 ├── files
 ├── shares
 ├── stars
 └── activities

folders
 ├── folders
 └── files

files
 └── file_versions
```

---

# 22. API Architecture

Use:

```text
/api/auth/*
/api/folders/*
/api/files/*
/api/shares/*
/api/link-shares/*
/api/search
/api/stars
/api/trash
```

Response convention:

```json
{
  "data": {}
}
```

Error convention:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource."
  }
}
```

Use correct HTTP status codes.

---

# 23. Complete API Checklist

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Folders

```text
POST   /api/folders
GET    /api/folders/:id
PATCH  /api/folders/:id
DELETE /api/folders/:id
```

## Files

```text
POST   /api/files/init
POST   /api/files/complete
GET    /api/files/:id
PATCH  /api/files/:id
DELETE /api/files/:id
```

## Shares

```text
POST   /api/shares
GET    /api/shares/:resourceType/:resourceId
DELETE /api/shares/:id
```

## Public links

```text
POST   /api/link-shares
GET    /api/link/:token
DELETE /api/link-shares/:id
```

## Search / Stars / Trash

```text
GET    /api/search
POST   /api/stars
DELETE /api/stars
GET    /api/trash
POST   /api/trash/restore
```

---

# 24. Backend Layer Architecture

Use this request flow:

```text
Route
 ↓
Authentication Middleware
 ↓
Validation Middleware
 ↓
Authorization / ACL Middleware
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Database / Storage
```

Example:

```text
files.routes.ts
       ↓
auth.middleware.ts
       ↓
file.validator.ts
       ↓
file.controller.ts
       ↓
file.service.ts
       ↓
file.repository.ts
       ↓
PostgreSQL
```

Keep business logic out of controllers.

---

# 25. Validation

Use Zod for:

- Auth requests
- Folder creation
- Folder updates
- File metadata
- Share requests
- Public link requests
- Search filters

Example validation concepts:

```text
name → required, sanitized
mimeType → allowlisted
sizeBytes → positive + max size
folderId → UUID or null
role → viewer/editor
expiresAt → valid date
```

---

# 26. Authorization Strategy

Every file/folder operation must answer:

```text
Who is the user?
What resource are they accessing?
What relationship do they have with it?
What operation are they attempting?
```

Example:

```text
Can user X download file Y?

1. Authenticate X
2. Find file Y
3. Check owner
4. Check direct share
5. Check inherited folder permission
6. Check public-link flow if applicable
7. Allow or reject
8. Generate signed URL only after authorization
```

Never trust:

- Frontend role values
- Hidden UI buttons
- Client-provided owner IDs
- Client-provided storage keys

---

# 27. Supabase RLS / Storage Security

Private objects by default.

Database/storage policy must ensure:

```text
Owner → read/write
Grantee → access according to role
Unauthenticated → no direct storage access
Public link → resolve through controlled link flow
```

Do not expose the Supabase service-role key to the frontend.

---

# 28. Security Checklist

## Authentication

- [ ] Secure cookies
- [ ] Short-lived access token/session
- [ ] Refresh rotation if custom JWT is used
- [ ] Password hashing
- [ ] OAuth configured securely

## Authorization

- [ ] API ACL checks
- [ ] Database/RLS checks
- [ ] Storage checks
- [ ] Owner verification
- [ ] Share permission verification

## Upload security

- [ ] MIME allowlist
- [ ] File-size limits
- [ ] Filename sanitization
- [ ] Path traversal prevention
- [ ] Optional virus scanning

## Public links

- [ ] Cryptographically random tokens
- [ ] Short-lived signed download URLs
- [ ] Password hashing
- [ ] Expiration enforcement
- [ ] Rate limiting

## API

- [ ] Zod validation
- [ ] Rate limiting
- [ ] CORS restriction
- [ ] CSP
- [ ] X-Content-Type-Options
- [ ] Referrer-Policy
- [ ] Correct Content-Disposition

## Secrets

- [ ] `.env`
- [ ] Secret manager/platform environment variables
- [ ] No secrets committed to Git
- [ ] Rotate exposed secrets

---

# 29. Frontend Information Architecture

```text
/login
/signup
/forgot-password

/dashboard
/dashboard/files/:folderId
/dashboard/shared
/dashboard/starred
/dashboard/recent
/dashboard/trash
```

Possible dashboard layout:

```text
┌───────────────────────────────────────────────┐
│ Search                         Profile         │
├───────────────┬───────────────────────────────┤
│ My Drive       │ Breadcrumb                   │
│ Shared         │ Toolbar                      │
│ Starred        │                               │
│ Recent         │ File / Folder Grid            │
│ Trash          │                               │
│               │                               │
└───────────────┴───────────────────────────────┘
```

---

# 30. Frontend Components

Build reusable components:

```text
AppShell
Sidebar
Topbar
SearchBar
Breadcrumbs
FileGrid
FileList
FileRow
FolderCard
FileCard
UploadDropzone
UploadProgress
ContextMenu
CreateFolderModal
RenameModal
ShareModal
PublicLinkModal
DeleteConfirmModal
RestoreConfirmModal
DetailsPanel
PreviewModal
VersionHistory
ActivityPanel
Pagination / InfiniteScroll
```

---

# 31. Frontend State Strategy

Use TanStack Query for server state.

Use local React state for:

- Modal visibility
- Selected item
- Context menu
- Upload UI state

Use optimistic updates for:

- Rename
- Move
- Star/unstar

If the API fails:

```text
Optimistic update
      ↓
API failure
      ↓
Rollback UI state
      ↓
Show error
```

---

# 32. File Explorer UX

Required behaviors:

- Folders shown before files
- Breadcrumb navigation
- Grid/list toggle
- Sort by:
  - Name
  - Date
  - Size
- Context menu
- Drag/drop
- Upload progress
- Empty states
- Loading skeletons
- Error states

---

# 33. Accessibility

Implement:

- Keyboard navigation
- Focus rings
- ARIA labels
- Accessible menus
- Accessible modals
- Sufficient color contrast
- Keyboard shortcuts where appropriate

---

# 34. Responsive Design

Desktop:

- Sidebar
- Toolbar
- Grid/list
- Details panel

Tablet:

- Collapsible sidebar
- Responsive grid

Mobile:

- Bottom/compact navigation
- Single-column file list
- Full-screen dialogs
- Touch-friendly actions

---

# 35. Preview System

Phase 2/4 feature.

Support:

```text
Images
PDF
Basic text
```

Background flow:

```text
Upload complete
      ↓
Queue preview job
      ↓
Worker
      ↓
Generate thumbnail/preview
      ↓
Store preview
      ↓
Update metadata
```

Tools can include ImageMagick/PDFium as specified by the source.

---

# 36. Background Jobs

Use BullMQ + Redis.

Queues:

```text
preview
thumbnail
email
virus-scan
trash-purge
```

Example:

```text
POST /files/complete
        ↓
DB ready
        ↓
Queue preview job
        ↓
Worker picks job
        ↓
Generate preview
        ↓
Upload preview
        ↓
Update DB
```

Do not block the upload-complete API while generating previews.

---

# 37. Pagination

Use cursor-based pagination rather than loading everything.

Example:

```text
GET /api/search?limit=50&cursor=abc
```

Response:

```json
{
  "items": [],
  "nextCursor": "xyz"
}
```

Use infinite scrolling in the frontend.

---

# 38. Caching

Use TanStack Query for:

- Folder contents
- Search
- Recent files
- Starred
- Trash
- Shares

Invalidate related queries after mutations.

Example:

```text
Create folder
   ↓
Invalidate folder contents
   ↓
Refetch
```

---

# 39. Testing Strategy

## Backend unit tests

Test:

- Auth service
- Folder service
- File service
- Share service
- Search service
- Permission service

## API integration tests

Test:

```text
register
login
logout
folder CRUD
file init
file complete
file download
share
revoke
public link
search
star
trash
restore
```

## Security tests

Test:

- Unauthorized access
- Cross-user file access
- Viewer attempting editor operation
- Expired public links
- Wrong link password
- Invalid storage key
- Path traversal
- Rate-limit behavior

## Frontend tests

Test:

- Login form
- Upload flow
- Folder navigation
- Rename
- Move
- Share dialog
- Search
- Trash restore

---

# 40. Postman Test Collection

Create environments:

```text
local
staging
production
```

Variables:

```text
baseUrl
accessToken
userId
folderId
fileId
shareId
linkToken
```

Run API tests after every major backend module.

---

# 41. Environment Variables

Example:

```env
# API
PORT=8080
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/drive

# Authentication
JWT_SECRET=
REFRESH_SECRET=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=drive

# Redis
REDIS_URL=

# Optional AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET=
```

Never commit `.env`.

Commit only:

```text
.env.example
```

---

# 42. Local Development Setup

## Prerequisites

Install:

```text
Node.js
Git
PostgreSQL/Supabase account
Redis
VS Code
Postman
```

## Initial setup

```bash
git clone <repository>
cd cloud-storage
```

Install frontend:

```bash
cd apps/web
npm install
```

Install backend:

```bash
cd ../api
npm install
```

Configure:

```text
.env
```

Run migrations.

Start API:

```bash
npm run dev
```

Start frontend:

```bash
npm run dev
```

---

# 43. Git Branching Strategy

Recommended:

```text
main
develop
feature/auth
feature/folders
feature/files
feature/sharing
feature/search
feature/trash
feature/versioning
feature/previews
feature/devops
```

Commit examples:

```text
feat: add authentication
feat: add folder CRUD
feat: implement multipart upload
feat: add sharing permissions
fix: prevent folder hierarchy cycles
test: add file permission tests
docs: update API documentation
```

---

# 44. Development Phases

## Phase 0 — Project Foundation

Goal:

Set up architecture before feature development.

Tasks:

- [ ] Create Git repository
- [ ] Create frontend repo/app
- [ ] Create backend repo/app
- [ ] Configure TypeScript
- [ ] Configure ESLint
- [ ] Configure Prettier
- [ ] Configure environment variables
- [ ] Configure CI skeleton
- [ ] Create Supabase project
- [ ] Create storage bucket
- [ ] Configure Redis
- [ ] Create database migration system

Deliverable:

```text
Frontend boots
Backend boots
Database connects
Storage connects
Redis connects
CI passes
```

---

# 45. Phase 1 — Database & Authentication

Goal:

Create secure identity and database foundation.

Tasks:

- [ ] Create users table
- [ ] Create database connection
- [ ] Configure authentication
- [ ] Implement register
- [ ] Implement login
- [ ] Implement logout
- [ ] Implement current user
- [ ] Protect API routes
- [ ] Create profile UI
- [ ] Add authentication tests

Deliverable:

```text
User can register → login → access dashboard → logout
```

---

# 46. Phase 2 — Folder System

Tasks:

- [ ] Create folders table
- [ ] Folder CRUD API
- [ ] Parent/child hierarchy
- [ ] Duplicate-name prevention
- [ ] Cycle prevention
- [ ] Folder tree
- [ ] Breadcrumbs
- [ ] Create folder modal
- [ ] Rename folder
- [ ] Delete folder
- [ ] Move folder
- [ ] Folder tests

Deliverable:

```text
User can create and navigate a Google Drive-style folder hierarchy.
```

---

# 47. Phase 3 — File Upload

Tasks:

- [ ] Create files table
- [ ] Configure private storage bucket
- [ ] Implement upload-init
- [ ] Implement multipart/resumable upload
- [ ] Upload progress UI
- [ ] Implement upload-complete
- [ ] Verify upload
- [ ] Store metadata
- [ ] Implement file listing
- [ ] Handle upload failures
- [ ] Validate MIME type
- [ ] Validate file size

Deliverable:

```text
User can reliably upload files into a selected folder.
```

---

# 48. Phase 4 — File Operations

Tasks:

- [ ] Download
- [ ] Signed URL generation
- [ ] Rename
- [ ] Move
- [ ] Delete
- [ ] Restore
- [ ] File details
- [ ] File/folder context menu
- [ ] Grid view
- [ ] List view
- [ ] Sort

Deliverable:

```text
Complete file-management experience.
```

---

# 49. Phase 5 — Sharing

Tasks:

- [ ] shares table
- [ ] Viewer role
- [ ] Editor role
- [ ] Share API
- [ ] Revoke API
- [ ] Share listing
- [ ] Share modal
- [ ] Public link generation
- [ ] Link expiry
- [ ] Link password
- [ ] Public link resolution
- [ ] Rate-limit public links

Deliverable:

```text
Users can securely collaborate through ACLs and public links.
```

---

# 50. Phase 6 — Search, Stars & Recent

Tasks:

- [ ] Search API
- [ ] Name search
- [ ] Type filter
- [ ] Owner filter
- [ ] Sorting
- [ ] Pagination
- [ ] PostgreSQL indexes
- [ ] pg_trgm
- [ ] Star/unstar
- [ ] Starred page
- [ ] Recent page
- [ ] Search UI

Deliverable:

```text
Fast file discovery across the user's accessible resources.
```

---

# 51. Phase 7 — Trash

Tasks:

- [ ] Soft delete
- [ ] Trash API
- [ ] Trash UI
- [ ] Restore
- [ ] Permanent deletion
- [ ] Retention policy
- [ ] Scheduled purge
- [ ] Storage cleanup
- [ ] Tests

Deliverable:

```text
Deleted files remain recoverable for the configured retention period.
```

---

# 52. Phase 8 — Versioning

Tasks:

- [ ] file_versions table
- [ ] Current-version pointer
- [ ] New-version upload
- [ ] Version list
- [ ] Version metadata
- [ ] Revert version
- [ ] Storage cleanup rules

Deliverable:

```text
Users can see and restore previous versions.
```

---

# 53. Phase 9 — Previews & Activity

Tasks:

- [ ] BullMQ setup
- [ ] Redis connection
- [ ] Thumbnail worker
- [ ] Image preview
- [ ] PDF preview
- [ ] Text preview
- [ ] activities table
- [ ] Activity recording
- [ ] Activity panel

Deliverable:

```text
File previews and useful audit history.
```

---

# 54. Phase 10 — Security Hardening

Tasks:

- [ ] Rate limiting
- [ ] CORS restriction
- [ ] CSP
- [ ] Security headers
- [ ] Input validation
- [ ] Filename sanitization
- [ ] Authorization audit
- [ ] Storage access audit
- [ ] Public-link security audit
- [ ] Secret audit
- [ ] Dependency audit
- [ ] Logging
- [ ] Error monitoring

Deliverable:

```text
Production-ready security baseline.
```

---

# 55. Phase 11 — Deployment

## Environments

Create:

```text
development
staging
production
```

Keep separate:

- Database
- Storage bucket
- Environment variables
- Redis where applicable

## Deployment

Frontend:

```text
Vercel
```

Backend:

```text
Render / Fly.io
```

Database:

```text
Supabase PostgreSQL
```

Storage:

```text
Supabase Storage
```

CI/CD:

```text
GitHub Actions
```

---

# 56. CI/CD Pipeline

```text
Pull Request
    ↓
Install
    ↓
Lint
    ↓
Type Check
    ↓
Unit Tests
    ↓
Build
    ↓
Preview Deployment
```

Production:

```text
Merge to main
    ↓
CI
    ↓
Build
    ↓
Database migrations
    ↓
Deploy backend
    ↓
Deploy frontend
    ↓
Health check
```

---

# 57. Monitoring

Track:

- API errors
- Frontend errors
- Upload failures
- Slow API requests
- Database performance
- Queue failures
- Storage errors
- Authentication failures
- Rate-limit violations

Use:

```text
Sentry
Uptime monitoring
Centralized logs
```

---

# 58. Backup Strategy

Database:

- Daily automated backups
- Periodic restore drills

Storage:

- Lifecycle rules
- Retention policy
- Version/backup strategy as required

Before production:

- Test restore process
- Document recovery process
- Verify backup availability

---

# 59. Two-Week Execution Schedule

## Week 1 — Backend + Core Foundation

### Day 1 — Setup

- [x] Repository setup
- [x] Frontend setup
- [x] Backend setup
- [x] TypeScript
- [x] ESLint/Prettier
- [x] Supabase setup
- [x] Redis setup
- [x] Database schema design
- [x] CI skeleton

### Day 2 — Authentication

- [x] Register
- [x] Login
- [x] Logout
- [x] Current user
- [x] Protected routes
- [x] OAuth if time permits
- [x] Auth tests

### Day 3 — Storage

- [x] Storage bucket
- [x] Storage policies
- [x] File model
- [x] Upload init
- [x] Multipart/resumable upload
- [x] Metadata persistence

### Day 4 — Files & Folders

- [x] Folder CRUD
- [x] File CRUD
- [x] Move
- [x] Rename
- [x] Delete
- [x] Soft delete

### Day 5 — Sharing

- [x] Viewer
- [x] Editor
- [x] Share API
- [x] Revoke
- [x] Public links
- [x] Signed URLs

### Day 6 — Search

- [x] Search API
- [x] Filters
- [x] Sorting
- [x] Pagination
- [x] PostgreSQL indexes
- [x] Starred
- [x] Recent

### Day 7 — Backend Testing & Deployment

- [x] Postman collection
- [x] Jest tests
- [x] Supertest
- [x] Permission tests
- [x] Security tests
- [x] Deploy backend
- [x] Configure staging

---

# 60. Week 2 — Frontend + Product Polish

## Day 8 — Frontend Foundation
- [x] Next.js setup
- [x] Tailwind
- [x] Authentication pages
- [x] Protected dashboard
- [x] Layout
- [x] Sidebar
- [x] Topbar

## Day 9 — File Explorer

- [x] Folder listing
- [x] File listing
- [x] Grid view
- [x] List view
- [x] Breadcrumbs
- [x] Sorting
- [x] Context menu

## Day 10 — Upload & File Management

- [x] Drag/drop
- [x] Upload progress
- [x] Upload status
- [x] Download
- [x] Rename
- [x] Move
- [x] Delete
- [x] Notifications

## Day 11 — Sharing UI

- [x] Share modal
- [x] User search
- [x] Viewer/editor selection
- [x] Existing shares
- [x] Revoke
- [x] Public link modal
- [x] Password
- [x] Expiry

## Day 12 — Search & Performance

- [x] Search bar
- [x] Filters
- [x] Sorting
- [x] TanStack Query caching
- [x] Infinite scroll
- [x] Skeleton loading
- [x] Empty states

## Day 13 — Trash & Versioning

- [x] Trash
- [x] Restore
- [x] Permanent delete
- [x] Version history
- [x] Revert
- [x] Final integration testing

## Day 14 — Production Polish

- [x] Responsive UI
- [x] Accessibility
- [x] Security review
- [x] Error handling
- [x] Performance review
- [x] Frontend deployment
- [x] Final bug fixes
- [x] README
- [x] Demo preparation

---

# 61. MVP Definition

The MVP is complete when all of the following work end-to-end:

- [x] Register/login/logout
- [x] Protected dashboard
- [x] Create folders
- [x] Nested folders
- [x] Upload files
- [x] Upload progress
- [x] List files
- [x] Download files
- [x] Rename
- [x] Move
- [x] Delete
- [x] Trash
- [x] Restore
- [x] Viewer sharing
- [x] Editor sharing
- [x] Public links
- [x] Expiry
- [x] Search
- [x] Sorting
- [x] Stars
- [x] Recent
- [x] Secure signed URLs
- [x] API authorization
- [x] Storage authorization
- [x] Basic tests
- [x] Production deployment

---

# 62. Post-MVP Roadmap

After MVP:

## Version 1.1

- [ ] Better previews
- [ ] Thumbnails
- [ ] Activity logs
- [ ] Version history
- [ ] Bulk operations
- [ ] Keyboard shortcuts
- [ ] Tags

## Version 1.2

- [ ] Storage quotas
- [ ] Usage dashboard
- [ ] Advanced search
- [ ] Fuzzy search
- [ ] Better sharing management
- [ ] Email invitations

## Version 2

- [ ] Shared drives
- [ ] Team workspaces
- [ ] Organization hierarchy
- [ ] Content indexing
- [ ] Virus scanning
- [ ] Billing/subscriptions

## Explicitly outside current MVP

- Office document editor
- Real-time co-editing
- Desktop sync client
- Complex enterprise organization hierarchy

---

# 63. Optional Premium Features

The source schedule mentions payment integration as a bonus.

Potential plan:

```text
Free
├── Limited storage
├── Basic sharing
└── Basic file operations

Pro
├── More storage
├── Version history
├── Larger files
├── Advanced search
└── More sharing controls
```

Possible later integration:

```text
Stripe
```

Do not implement payments before the core storage system is stable.

---

# 64. Performance Targets

Focus on:

- Cursor pagination
- Indexed database queries
- Avoid N+1 queries
- CDN-based downloads
- Signed URLs
- Direct-to-storage uploads
- Background processing
- Cached folder/search data
- Lazy loading
- Optimistic UI updates

Most importantly:

```text
Large file
     ↓
Client
     ↓
Object Storage
```

rather than:

```text
Large file
     ↓
Client
     ↓
Express server
     ↓
Storage
```

---

# 65. Final End-to-End User Flow

```text
SIGN UP
   ↓
LOGIN
   ↓
DASHBOARD
   ↓
CREATE FOLDER
   ↓
OPEN FOLDER
   ↓
UPLOAD FILE
   ↓
UPLOAD TO STORAGE
   ↓
SAVE METADATA
   ↓
FILE READY
   ↓
┌──────────────┬───────────────┬──────────────┐
│ DOWNLOAD     │ SHARE         │ ORGANIZE     │
│              │               │              │
│ Signed URL   │ Viewer/Editor │ Rename       │
│              │ Public Link   │ Move         │
│              │ Expiry        │ Star         │
└──────────────┴───────────────┴──────────────┘
   ↓
DELETE
   ↓
TRASH
   ↓
RESTORE / PURGE
```

---

# 66. Final Development Checklist

## Foundation

- [ ] Git repository
- [ ] Frontend repository/app
- [ ] Backend repository/app
- [ ] Environment setup
- [ ] Database
- [ ] Storage
- [ ] Redis
- [ ] CI/CD

## Authentication

- [ ] Register
- [ ] Login
- [ ] Logout
- [ ] Session
- [ ] Protected routes
- [ ] OAuth optional

## Files

- [ ] Upload
- [ ] Multipart/resumable
- [ ] Progress
- [ ] Download
- [ ] Rename
- [ ] Move
- [ ] Delete
- [ ] Restore
- [ ] Metadata
- [ ] Checksum

## Folders

- [ ] Create
- [ ] Rename
- [ ] Move
- [ ] Delete
- [ ] Nested folders
- [ ] Breadcrumbs
- [ ] Cycle prevention

## Sharing

- [ ] Viewer
- [ ] Editor
- [ ] Revoke
- [ ] Public link
- [ ] Password
- [ ] Expiry
- [ ] Signed URL

## Discovery

- [ ] Search
- [ ] Filters
- [ ] Sort
- [ ] Pagination
- [ ] Starred
- [ ] Recent

## Advanced

- [ ] Versioning
- [ ] Previews
- [ ] Thumbnails
- [ ] Activity logs
- [ ] Background workers

## Security

- [ ] API ACL
- [ ] Storage policy
- [ ] RLS
- [ ] Rate limiting
- [ ] Validation
- [ ] CORS
- [ ] CSP
- [ ] Security headers
- [ ] Secret management

## Testing

- [ ] Unit tests
- [ ] Integration tests
- [ ] API tests
- [ ] Permission tests
- [ ] Upload tests
- [ ] Sharing tests
- [ ] Security tests
- [ ] Frontend tests

## Deployment

- [ ] Staging
- [ ] Production
- [ ] CI/CD
- [ ] Migrations
- [ ] Monitoring
- [ ] Backups
- [ ] Health checks
- [ ] Documentation

---

# 67. Recommended Implementation Order

If building this project solo, follow this exact order:

```text
1. Project setup
        ↓
2. Supabase database + storage
        ↓
3. Authentication
        ↓
4. Users
        ↓
5. Folders
        ↓
6. File metadata
        ↓
7. Upload flow
        ↓
8. Download flow
        ↓
9. Rename/move/delete
        ↓
10. Trash/restore
        ↓
11. Sharing ACL
        ↓
12. Public links
        ↓
13. Search
        ↓
14. Starred/recent
        ↓
15. Frontend polish
        ↓
16. Versioning
        ↓
17. Previews
        ↓
18. Activity logs
        ↓
19. Security hardening
        ↓
20. Testing
        ↓
21. CI/CD
        ↓
22. Production deployment
```

This order minimizes rework because authentication, ownership, folder hierarchy, storage, and ACLs are foundational to almost every later feature.

---

# 68. Definition of Done

The project should be considered production-ready only when:

1. Every private resource is protected by server-side authorization.
2. Storage objects are private by default.
3. Files are uploaded directly/resumably to object storage.
4. Downloads use short-lived signed URLs.
5. Folder hierarchy cannot create cycles.
6. Viewer/editor permissions are enforced by the backend.
7. Public links respect expiry/password rules.
8. Deleted resources follow the retention policy.
9. Search uses proper indexes and pagination.
10. Background work does not block normal API requests.
11. Automated tests cover critical flows.
12. Secrets are never committed.
13. Staging and production are separated.
14. Monitoring and backups are configured.
15. The complete user journey works from registration through upload, sharing, download, deletion, and restoration.

---

# 69. Source Notes

This plan is derived from the uploaded project specification. The specification describes a Google Drive–style cloud storage application, its MVP/non-goals, recommended architecture, database model, REST API, security model, frontend UX, deployment approach, four-sprint milestone plan, and a separate two-week implementation schedule.

The source contains some stack alternatives (React/Vite/Astro vs Next.js; Flask/FastAPI/Node/Express/Spring Boot; Supabase/Firebase/S3). For a concrete implementation plan, this document follows the **detailed recommended architecture** of Next.js + Node/Express + PostgreSQL/Supabase + Supabase Storage/S3, while treating alternatives as optional rather than mixing them into the core implementation.
