# Cloud-Based Media File Storage Service

A production-ready Google Drive–style cloud storage web application with authentication, hierarchical folders, resumable uploads, sharing, search, trash, versioning, and secure object storage.

## Architecture

- **Frontend**: Next.js (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, TanStack Query
- **Backend**: Node.js, Express, TypeScript, Zod, Winston, Helmet, CORS
- **Database & Storage**: PostgreSQL (Supabase), Supabase Storage
- **Cache / Queues**: Redis, BullMQ

---

## Directory Structure

```text
├── backend/                  # Express REST API (TypeScript)
│   ├── src/
│   │   ├── config/          # Environment, Supabase, Redis configuration
│   │   ├── database/        # PostgreSQL / Supabase SQL schema DDL
│   │   ├── middlewares/     # Error handler, request logger
│   │   ├── routes/          # API route definitions
│   │   ├── types/           # Core domain interfaces
│   │   ├── utils/           # Winston logger, response helper
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server entrypoint
├── frontend/                 # Next.js Web App
│   ├── src/
│   │   ├── app/             # App Router pages & layout
│   │   ├── lib/             # API client, Supabase browser client, utils
│   │   ├── providers/       # React Query provider
│   │   └── types/           # Frontend types
├── docs/                     # Specifications and detailed implementation plan
├── .github/workflows/        # CI workflows
├── package.json              # Monorepo orchestrator scripts
└── .env.example              # Environment variables template
```

---

## Getting Started

### 1. Install Dependencies
```bash
# In backend/
cd backend
npm install

# In frontend/
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in `backend/` and `.env.local` in `frontend/`.

### 3. Run Development Servers
From root directory:
```bash
# Run both frontend & backend concurrently:
npm run dev

# Or run separately:
npm run dev:backend
npm run dev:frontend
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000/api/v1`
- **Health Check**: `http://localhost:5000/api/v1/health`
