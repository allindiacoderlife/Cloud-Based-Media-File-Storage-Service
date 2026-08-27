'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Cloud,
  Folder,
  File,
  HardDrive,
  Upload,
  Plus,
  LogOut,
  User as UserIcon,
  Search,
  Star,
  Trash2,
  Share2,
  Clock,
  Sparkles,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatBytes } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm">Loading your CloudVault...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const storageUsed = user.storage_used_bytes || 0;
  const storageQuota = user.storage_quota_bytes || 5368709120;
  const usedPercentage = Math.min(Math.round((storageUsed / storageQuota) * 100), 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3.5">
          {/* Logo & Search */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
                <Cloud className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Cloud<span className="text-blue-500">Vault</span>
              </span>
            </Link>

            <div className="relative hidden md:block w-96">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Search files, folders & documents..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* User actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 rounded-full border border-slate-800/80 bg-slate-900/60 px-3.5 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-semibold text-xs border border-blue-500/30">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium text-white line-clamp-1">{user.full_name || user.email}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1">{user.email}</div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-950/50 p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-6">
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center space-x-3 rounded-xl bg-blue-600/10 px-3.5 py-2.5 text-sm font-semibold text-blue-400 border border-blue-500/20"
              >
                <HardDrive className="h-4 w-4" />
                <span>My Drive</span>
              </Link>

              <button className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-white">
                <Share2 className="h-4 w-4" />
                <span>Shared with me</span>
              </button>

              <button className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-white">
                <Clock className="h-4 w-4" />
                <span>Recent</span>
              </button>

              <button className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-white">
                <Star className="h-4 w-4" />
                <span>Starred</span>
              </button>

              <button className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-white">
                <Trash2 className="h-4 w-4" />
                <span>Trash</span>
              </button>
            </div>
          </div>

          {/* Storage Meter Box */}
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Storage Usage</span>
              <span className="text-blue-400">{usedPercentage}%</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${Math.max(usedPercentage, 2)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {formatBytes(storageUsed)} of {formatBytes(storageQuota)} used
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">My Drive</h1>
              <p className="text-xs text-slate-400 mt-1">Manage, upload, and organize your files</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                disabled
                className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-400 opacity-60 cursor-not-allowed"
                title="Coming in Day 4: Files & Folders"
              >
                <Plus className="h-4 w-4" />
                <span>New Folder</span>
              </button>

              <button
                disabled
                className="flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 opacity-60 cursor-not-allowed"
                title="Coming in Day 3: Object Storage"
              >
                <Upload className="h-4 w-4" />
                <span>Upload File</span>
              </button>
            </div>
          </div>

          {/* Day 2 Active Status Card */}
          <div className="mt-8 glass-panel rounded-3xl p-8 max-w-3xl">
            <div className="flex items-center space-x-3 text-emerald-400 mb-3">
              <ShieldCheck className="h-6 w-6" />
              <span className="text-base font-semibold">Authentication & Session Live</span>
            </div>
            <p className="text-sm text-slate-300">
              You are logged in as <span className="font-semibold text-white">{user.email}</span>.
              Your account is authenticated with JWT tokens and protected with role authorization.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Account ID</span>
                <p className="mt-1 text-xs text-slate-300 font-mono break-all">{user.id}</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Storage Tier</span>
                <p className="mt-1 text-xs text-slate-300 font-semibold">{formatBytes(storageQuota)} Standard Tier</p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-800 pt-5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span>Next Milestone: Day 3 — Storage Buckets & Resumable Uploads</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
