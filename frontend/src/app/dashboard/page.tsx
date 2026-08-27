'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Cloud,
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  HardDrive,
  Upload,
  Plus,
  LogOut,
  Search,
  Star,
  Trash2,
  Share2,
  Clock,
  Download,
  MoreVertical,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatBytes, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { FileItem } from '@/types';
import UploadModal from '@/components/UploadModal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoadingFiles(true);
      const res = await apiClient.get('/files');
      if (res.data?.data) {
        setFiles(res.data.data);
      }
    } catch (err: any) {
      console.warn('Failed to load files:', err.message);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchFiles();
    }
  }, [user, loading, router, fetchFiles]);

  const handleDownload = async (file: FileItem) => {
    try {
      setDownloadingId(file.id);
      const res = await apiClient.get(`/files/${file.id}/download`);
      const { downloadUrl } = res.data.data;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      }
    } catch (err: any) {
      alert(`Download error: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-pink-400" />;
    if (mimeType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-amber-400" />;
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-400" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('compressed'))
      return <Archive className="h-5 w-5 text-yellow-400" />;
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('text'))
      return <Code className="h-5 w-5 text-emerald-400" />;
    return <File className="h-5 w-5 text-blue-400" />;
  };

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
      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchFiles}
      />

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
          {/* Header Actions */}
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
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500"
              >
                <Upload className="h-4 w-4" />
                <span>Upload File</span>
              </button>
            </div>
          </div>

          {/* Files Content Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Files {files.length > 0 && `(${files.length})`}
              </h2>
            </div>

            {loadingFiles ? (
              <div className="flex py-16 items-center justify-center text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-500" />
                <span className="text-xs">Fetching storage files...</span>
              </div>
            ) : files.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 py-20 px-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 mb-4">
                  <FolderOpen className="h-8 w-8" />
                </div>
                <h3 className="text-base font-semibold text-white">No files in your drive yet</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  Upload images, documents, videos, and archives to store them securely.
                </p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-5 flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-500"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Your First File</span>
                </button>
              </div>
            ) : (
              /* File Grid */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="glass-card group relative flex flex-col justify-between rounded-2xl p-4 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800">
                          {getFileIcon(file.mime_type)}
                        </div>
                        <button
                          onClick={() => handleDownload(file)}
                          disabled={downloadingId === file.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-600/20 hover:text-blue-400 transition-colors"
                          title="Download file"
                        >
                          {downloadingId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <div className="mt-3">
                        <h4 className="text-sm font-semibold text-white truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatBytes(file.size_bytes)} • {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[150px]">{file.mime_type}</span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400 font-medium text-[10px] border border-emerald-500/20">
                        v{file.current_version}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
