'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cloud, Shield, Zap, HardDrive, CheckCircle2, ArrowRight, Folder, File, Share2, Search, LogIn, LayoutDashboard } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';

interface HealthStatus {
  uptime: number;
  timestamp: string;
  status: string;
  services: {
    api: { status: string };
    database: { status: string; details?: string };
    redis: { status: string; details?: string };
  };
}

export default function Home() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/health')
      .then((res) => {
        setHealth(res.data.data);
      })
      .catch((err) => {
        console.warn('API health check pending:', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 h-[400px] w-[600px] rounded-full bg-indigo-600/10 blur-[130px]" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20">
              <Cloud className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Cloud<span className="text-blue-500">Vault</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Go to Drive</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-2 text-xs font-medium text-slate-300 transition-all hover:border-slate-700 hover:text-white"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-600/40"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 pt-16 pb-24 sm:pt-20">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400">
            <Zap className="h-3.5 w-3.5" />
            <span>Next-Gen Cloud File Architecture</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Store, share, and manage <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              media at cloud scale.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            A production-grade Google Drive–style storage system built with Next.js, Express, PostgreSQL, Supabase, and Redis.
          </p>

          {/* Feature Grid */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-card rounded-2xl p-6 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-4">
                <Folder className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Hierarchical Folders</h3>
              <p className="mt-2 text-sm text-slate-400">
                Organize documents and media with nested folders, drag-and-drop, and instant breadcrumb navigation.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-4">
                <File className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Resumable Uploads</h3>
              <p className="mt-2 text-sm text-slate-400">
                Direct-to-storage signed uploads with automatic chunking, progress tracking, and version histories.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
                <Share2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Granular Sharing</h3>
              <p className="mt-2 text-sm text-slate-400">
                Collaborate with Viewer and Editor roles, or create password-protected, expiring public links.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Instant Fuzzy Search</h3>
              <p className="mt-2 text-sm text-slate-400">
                Fast PostgreSQL pg_trgm powered search across all your files, folders, favorites, and trash.
              </p>
            </div>
          </div>

          {/* System Status Dashboard */}
          <div id="status" className="mt-20 glass-panel rounded-2xl p-8 text-left max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-bold text-white">Day 1 Architecture Verification</h2>
                <p className="text-xs text-slate-400 mt-1">Foundation setup & connectivity check</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" /> Day 1 Initialized
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">REST API</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <div className="mt-2 text-lg font-bold text-white">Express 4.x + TS</div>
                <p className="mt-1 text-xs text-slate-500">Security headers, Zod validator & logging</p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database & Storage</span>
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <div className="mt-2 text-lg font-bold text-white">Supabase / Postgres</div>
                <p className="mt-1 text-xs text-slate-500">Full DDL schema & indexes ready</p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Queue & Cache</span>
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                </div>
                <div className="mt-2 text-lg font-bold text-white">Redis / BullMQ</div>
                <p className="mt-1 text-xs text-slate-500">Client adapter with fallback ready</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
