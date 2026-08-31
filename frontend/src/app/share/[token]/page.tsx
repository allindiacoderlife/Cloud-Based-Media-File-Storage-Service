'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Cloud,
  Lock,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  Folder,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<{
    resourceType: 'file' | 'folder';
    resource: any;
    role: string;
    downloadUrl?: string;
  } | null>(null);

  const fetchPublicResource = async (pwd?: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiClient.post(`/link/${token}/access`, {
        password: pwd || undefined
      });

      setShareData(res.data.data);
      setPasswordRequired(false);
    } catch (err: any) {
      if (err.message?.includes('Password required') || err.message?.includes('Incorrect password')) {
        setPasswordRequired(true);
        if (pwd) setError('Incorrect password. Please try again.');
      } else {
        setError(err.message || 'Failed to access shared resource');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicResource();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    fetchPublicResource(password.trim());
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-10 w-10 text-pink-400" />;
    if (mimeType.startsWith('video/')) return <Video className="h-10 w-10 text-purple-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-10 w-10 text-amber-400" />;
    if (mimeType === 'application/pdf') return <FileText className="h-10 w-10 text-red-400" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed'))
      return <Archive className="h-10 w-10 text-yellow-400" />;
    if (mimeType.includes('json') || mimeType.includes('text'))
      return <Code className="h-10 w-10 text-emerald-400" />;
    return <File className="h-10 w-10 text-blue-400" />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Cloud<span className="text-blue-500">Vault</span>
            </span>
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6">
        {loading ? (
          <div className="flex flex-col items-center space-y-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-xs">Decrypting shared link...</p>
          </div>
        ) : passwordRequired ? (
          /* Password Form Card */
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-4">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Password Protected</h2>
            <p className="mt-1 text-xs text-slate-400">
              This link is secured by the owner. Please enter the password to view and download.
            </p>

            {error && (
              <div className="mt-4 flex items-center space-x-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 text-left">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoFocus
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-all"
              >
                Unlock Content
              </button>
            </form>
          </div>
        ) : error ? (
          /* Error / Expired State */
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
            <p className="mt-2 text-xs text-slate-400">{error}</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        ) : shareData?.resourceType === 'file' ? (
          /* File Preview Card */
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Public Share</span>
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
                v{shareData.resource.current_version}
              </span>
            </div>

            <div className="mt-8 flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-950 border border-slate-800 shadow-inner">
                {getFileIcon(shareData.resource.mime_type)}
              </div>
              <h1 className="mt-5 text-xl font-bold text-white max-w-md truncate" title={shareData.resource.name}>
                {shareData.resource.name}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                {formatBytes(shareData.resource.size_bytes)} • Shared via CloudVault
              </p>

              {shareData.downloadUrl && (
                <a
                  href={shareData.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 flex w-full items-center justify-center space-x-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download File</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          /* Folder Preview Card */
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Folder className="h-5 w-5 fill-amber-400/20" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{shareData?.resource.name}</h1>
                <p className="text-xs text-slate-400">Shared Folder Preview</p>
              </div>
            </div>

            <div className="mt-6 space-y-2 max-h-72 overflow-y-auto">
              {shareData?.resource.files?.length === 0 && shareData?.resource.folders?.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">This folder is empty.</p>
              ) : (
                <>
                  {shareData?.resource.folders?.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center space-x-3 rounded-xl bg-slate-950/60 p-3 border border-slate-800"
                    >
                      <Folder className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-semibold text-white truncate">{f.name}</span>
                    </div>
                  ))}
                  {shareData?.resource.files?.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 border border-slate-800"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <File className="h-4 w-4 text-blue-400" />
                        <span className="text-xs font-medium text-white truncate">{f.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">{formatBytes(f.size_bytes)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        Secured by CloudVault Media Storage Engine
      </footer>
    </div>
  );
}
