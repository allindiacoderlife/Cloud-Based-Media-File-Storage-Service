'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Users,
  Link as LinkIcon,
  Copy,
  Check,
  Lock,
  Calendar,
  Trash2,
  Loader2,
  AlertCircle,
  Shield,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    type: 'file' | 'folder';
  } | null;
}

export default function ShareModal({ isOpen, onClose, item }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'collaborators' | 'link'>('collaborators');

  // Collaborators Tab State
  const [granteeEmail, setGranteeEmail] = useState('');
  const [granteeRole, setGranteeRole] = useState<'viewer' | 'editor'>('viewer');
  const [shares, setShares] = useState<any[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [sharingUser, setSharingUser] = useState(false);

  // Public Link Tab State
  const [publicLink, setPublicLink] = useState<any | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setError(null);
      setSuccessMsg(null);
      setGranteeEmail('');
      setGranteeRole('viewer');
      setPassword('');
      setEnablePassword(false);
      setEnableExpiry(false);
      setExpiresAt('');
      loadShareData();
    }
  }, [isOpen, item]);

  const loadShareData = async () => {
    if (!item) return;
    try {
      setLoadingShares(true);
      const res = await apiClient.get(`/shares/${item.type}/${item.id}`);
      if (res.data?.data) {
        setShares(res.data.data.shares || []);
        setPublicLink(res.data.data.publicLink || null);
      }
    } catch (err: any) {
      console.warn('Failed to load share data:', err.message);
    } finally {
      setLoadingShares(false);
    }
  };

  if (!isOpen || !item) return null;

  const handleShareWithUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!granteeEmail.trim()) return;

    setSharingUser(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await apiClient.post('/shares', {
        resourceType: item.type,
        resourceId: item.id,
        granteeEmail: granteeEmail.trim(),
        role: granteeRole
      });

      setSuccessMsg(`Access granted to ${granteeEmail.trim()} as ${granteeRole}`);
      setGranteeEmail('');
      loadShareData();
    } catch (err: any) {
      setError(err.message || 'Failed to share resource');
    } finally {
      setSharingUser(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await apiClient.delete(`/shares/${shareId}`);
      loadShareData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator');
    }
  };

  const handleCreatePublicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingLink(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let isoExpiry: string | null = null;
      if (enableExpiry && expiresAt) {
        isoExpiry = new Date(expiresAt).toISOString();
      }

      const res = await apiClient.post('/link-shares', {
        resourceType: item.type,
        resourceId: item.id,
        role: 'viewer',
        expiresAt: isoExpiry,
        password: enablePassword && password.trim() ? password.trim() : undefined
      });

      setPublicLink(res.data.data.linkShare);
      setSuccessMsg('Public share link generated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to generate public link');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevokePublicLink = async () => {
    if (!publicLink) return;
    try {
      await apiClient.delete(`/link-shares/${publicLink.id}`);
      setPublicLink(null);
      setSuccessMsg('Public link revoked');
    } catch (err: any) {
      setError(err.message || 'Failed to revoke public link');
    }
  };

  const getShareUrl = () => {
    if (!publicLink) return '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/share/${publicLink.token}`;
    }
    return `/share/${publicLink.token}`;
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Share &ldquo;{item.name}&rdquo;</h3>
            <p className="text-xs text-slate-400">Manage collaboration and public access</p>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mt-4 flex items-center space-x-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 flex items-center space-x-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="mt-5 flex border-b border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('collaborators')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 transition-all ${
              activeTab === 'collaborators'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Collaborators ({shares.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 transition-all ${
              activeTab === 'link'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            <span>Public Link {publicLink ? '• Active' : ''}</span>
          </button>
        </div>

        {/* Tab 1: Collaborators */}
        {activeTab === 'collaborators' && (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleShareWithUser} className="flex gap-2">
              <input
                type="email"
                value={granteeEmail}
                onChange={(e) => setGranteeEmail(e.target.value)}
                placeholder="Enter user email (e.g. alex@example.com)"
                required
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <select
                value={granteeRole}
                onChange={(e: any) => setGranteeRole(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                type="submit"
                disabled={!granteeEmail.trim() || sharingUser}
                className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
              >
                {sharingUser ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                <span>Invite</span>
              </button>
            </form>

            {/* Collaborators List */}
            <div className="max-h-48 overflow-y-auto space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-2">
              {loadingShares ? (
                <div className="flex py-6 items-center justify-center text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Loading collaborators...</span>
                </div>
              ) : shares.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No direct collaborators yet. Invite someone using their email above.
                </div>
              ) : (
                shares.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2 border border-slate-800"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs">
                        {s.grantee.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-white truncate">{s.grantee.email}</div>
                        {s.grantee.fullName && (
                          <div className="text-[10px] text-slate-400">{s.grantee.fullName}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          s.role === 'editor'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {s.role}
                      </span>
                      <button
                        onClick={() => handleRevokeShare(s.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Remove access"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Public Link */}
        {activeTab === 'link' && (
          <div className="mt-4 space-y-4">
            {publicLink ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>Public Link is Active</span>
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                      Viewer Access
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={getShareUrl()}
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {publicLink.hasPassword && (
                    <div className="flex items-center space-x-1.5 text-[11px] text-amber-400">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Password protected</span>
                    </div>
                  )}

                  {publicLink.expires_at && (
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Expires: {new Date(publicLink.expires_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleRevokePublicLink}
                    className="flex items-center space-x-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Revoke Public Link</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreatePublicLink} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Anyone with this link will be able to view and download this {item.type}.
                </p>

                {/* Password Option */}
                <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-medium text-slate-300 flex items-center space-x-2">
                      <Lock className="h-3.5 w-3.5 text-blue-400" />
                      <span>Protect with password</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  {enablePassword && (
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter minimum 4-character password"
                      required={enablePassword}
                      minLength={4}
                      className="mt-2 block w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>

                {/* Expiry Option */}
                <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-medium text-slate-300 flex items-center space-x-2">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Set link expiration date</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={enableExpiry}
                      onChange={(e) => setEnableExpiry(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  {enableExpiry && (
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      required={enableExpiry}
                      className="mt-2 block w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={creatingLink}
                    className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-all disabled:opacity-50"
                  >
                    {creatingLink ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-3.5 w-3.5" />
                        <span>Generate Public Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Bottom Close */}
        <div className="mt-6 flex justify-end border-t border-slate-800/80 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
