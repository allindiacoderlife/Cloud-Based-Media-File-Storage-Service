<div align="center">
  <img src="https://img.icons8.com/isometric/120/cloud-storage.png" alt="CloudVault Logo" width="80" height="80" />
  <h1>CloudVault</h1>
  <p><strong>Enterprise-Grade Cloud Media & File Storage Platform</strong></p>
  <p>A production-ready, high-performance Google Drive alternative built with Next.js 15, TypeScript, Node.js/Express, Supabase PostgreSQL & Storage, and Upstash Redis.</p>

  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#api-reference">API Reference</a> •
    <a href="#deployment">Deployment</a>
  </p>
</div>

---

## 🌟 Key Features

### 📁 **Hierarchical File & Folder System**
- **Infinite Nesting**: Full adjacency list hierarchy with cycle prevention algorithms (blocking moving a parent into its own descendant).
- **Interactive Breadcrumbs**: Instant parent-level navigation with path resolution.
- **Cascading Soft-Deletes**: Deleting a folder safely moves all nested child folders and files into Trash.

### ⚡ **Dual Upload Engine (Stream & Presigned)**
- **Direct Multipart Streams**: Zero-latency binary uploads directly into storage.
- **Presigned URLs**: Direct-to-storage client uploads with checksum integrity (`MD5`/`SHA256`) and quota verification.
- **Drag-and-Drop Dropzone**: Screen-wide drag-and-drop overlay with instant multi-file batch uploads.
- **Real-Time Upload Drawer**: Floating multi-file queue with percentage progress meters.

### 👥 **Granular Collaboration & Sharing**
- **Role-Based Access Control**:
  - **Viewer**: Read metadata & download stream.
  - **Editor**: Upload new versions, edit metadata, and modify items.
  - **Owner**: Full administrative control (deletions, moving, sharing management).
- **Password-Protected Public Links**: Hashed with `bcryptjs` and configurable expiration time limits.
- **Public Share Preview**: Dedicated landing page (`/share/[token]`) with password challenges and 1-click downloads.

### 🔍 **Multi-Parameter Search & Favorites**
- **Instant Search**: Substring and keyword text search across names and extensions.
- **Category Filters**: 1-click filtering by `Documents`, `Images`, `Videos`, `Audio`, `Archives`, and `Code`.
- **Sorting**: Multi-attribute sorting by Date (Newest/Oldest), Name (A-Z/Z-A), and Size (Largest/Smallest).
- **Starred Items**: Toggle favorite status on any file or folder with dedicated Starred workspace.

### 👁️ **In-Browser Rich Media Previews**
- **Image Lightbox**: High-resolution image preview modal.
- **Video & Audio Player**: Custom HTML5 media players with full playback controls.
- **PDF & Document Embedder**: Interactive PDF document reader.
- **Code Viewer**: Monospace text format renderer for JSON, JS, TS, HTML, and Markdown.

### ♻️ **Trash Recovery & File Version History**
- **Safe Soft Deletes**: Recycle bin with 1-click file and folder restoration.
- **Empty Trash**: Permanent bulk deletion of trashed items.
- **Version History**: Inspection drawer listing prior revisions with instant version rollbacks.

---

## 📐 Architecture

```mermaid
graph TD
    Client[Next.js 15 App / React 19] -->|HTTPS REST| API[Express.js / Node Server]
    API -->|JWT & Session Auth| Auth[Auth & ACL Middleware]
    API -->|Rate Limiting & Cache| Redis[(Upstash Redis TLS)]
    API -->|Metadata, Hierarchy & Shares| DB[(Supabase PostgreSQL)]
    API -->|File Binary Streams| S3[(Supabase S3 Storage Bucket)]
```

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling & Icons** | Tailwind CSS, Lucide Icons, Glassmorphism design tokens |
| **State & Data Fetching** | TanStack Query v5, Axios |
| **Backend Framework** | Express.js 4, Node.js 22+ ESM, TypeScript |
| **Database** | PostgreSQL via `@supabase/supabase-js` |
| **Object Storage** | Supabase Storage (S3-compatible bucket) |
| **Caching & Rate Limiting** | Upstash Redis (`ioredis` with TLS) |
| **Security & Validation** | Zod schemas, JWT tokens, bcryptjs, Helmet, CORS |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `v20+` or `v22+`
- A free [Supabase](https://supabase.com) project
- A free [Upstash Redis](https://upstash.com) database

### 2. Clone Repository
```bash
git clone https://github.com/allindiacoderlife/Cloud-Based-Media-File-Storage-Service.git
cd Cloud-Based-Media-File-Storage-Service
```

### 3. Backend Setup
```bash
cd backend
npm install
```

Configure `backend/.env`:
```env
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1
CLIENT_ORIGIN=http://localhost:3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=cloud-media-storage

# Redis
REDIS_URL=rediss://default:password@your-endpoint.upstash.io:6379

# JWT
JWT_SECRET=super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
```

### 4. Database Schema
Execute [`backend/src/database/schema.sql`](file:///d:/PROGRAMMING/REACT_JS/Cloud-Based-Storage-Service-NodeJS/backend/src/database/schema.sql) in your Supabase SQL Editor to generate all tables, indexes, and constraints.

### 5. Frontend Setup
```bash
cd ../frontend
npm install
```

Configure `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 6. Run Locally
```bash
# In backend terminal
npm run dev

# In frontend terminal
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing

The backend includes a comprehensive **48-test automated integration test suite**:

```bash
cd backend
npm test
```

Test coverage includes:
- `test:auth` — Password hashing, JWT issuance, token refresh, and profiles (8 tests)
- `test:storage` — Direct uploads, presigned flows, downloads, quota rejection (6 tests)
- `test:folders` — Nested hierarchies, cycle prevention, cascading soft deletes (10 tests)
- `test:sharing` — User roles (Viewer/Editor/Owner), password-protected public links (10 tests)
- `test:search` — Substring search, category filters, star favorites, activity audit logs (8 tests)
- `test:trash` — Soft deletes, trash queries, restores, version rollbacks (6 tests)

---

## 📡 API Reference & Postman

Import [`docs/cloud-storage-postman-collection.json`](file:///d:/PROGRAMMING/REACT_JS/Cloud-Based-Storage-Service-NodeJS/docs/cloud-storage-postman-collection.json) directly into Postman for instant testing of all endpoints:

| Module | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/v1/auth/register` | `POST` | Create new account |
| **Auth** | `/api/v1/auth/login` | `POST` | Authenticate user & issue tokens |
| **Auth** | `/api/v1/auth/me` | `GET` | Get current user & storage stats |
| **Folders** | `/api/v1/folders` | `POST` | Create folder |
| **Folders** | `/api/v1/folders/:id` | `GET` | Get folder with breadcrumb path |
| **Folders** | `/api/v1/folders/:id` | `PATCH` | Rename or move folder (cycle-safe) |
| **Folders** | `/api/v1/folders/:id` | `DELETE` | Soft-delete folder & subtree |
| **Files** | `/api/v1/files/upload-direct`| `POST` | Upload file via multipart stream |
| **Files** | `/api/v1/files/init` | `POST` | Initiate presigned upload |
| **Files** | `/api/v1/files/:id/download` | `GET` | Get signed download URL |
| **Files** | `/api/v1/files/:id/versions` | `GET` | Inspect file version history |
| **Files** | `/api/v1/files/:id/versions/:ver/restore` | `POST` | Restore previous version |
| **Shares** | `/api/v1/shares` | `POST` | Share resource with user |
| **Shares** | `/api/v1/shares/shared-with-me` | `GET` | List items shared with current user |
| **Links** | `/api/v1/link-shares` | `POST` | Generate password/expiring public link |
| **Links** | `/api/v1/link/:token/access` | `POST` | Access & unlock public link |
| **Search** | `/api/v1/search` | `GET` | Search with category & size filters |
| **Stars** | `/api/v1/stars/toggle` | `POST` | Toggle star favorite |
| **Trash** | `/api/v1/trash` | `GET` | List soft-deleted items |
| **Trash** | `/api/v1/trash/restore/:type/:id` | `POST` | Restore item from Trash |
| **Trash** | `/api/v1/trash/empty` | `DELETE` | Permanently empty Trash |

---

## 🌐 Deployment to Vercel

The repository includes a ready-to-deploy [`vercel.json`](file:///d:/PROGRAMMING/REACT_JS/Cloud-Based-Storage-Service-NodeJS/vercel.json):

1. Import the repository in [Vercel](https://vercel.com).
2. Set the Environment Variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `JWT_SECRET`).
3. Click **Deploy**. Both the frontend Next.js application and the Express API serverless functions will be deployed seamlessly under one domain.

---

## 📄 License
This project is licensed under the MIT License.
