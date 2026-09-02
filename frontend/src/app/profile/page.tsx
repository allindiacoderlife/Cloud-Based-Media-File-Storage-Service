'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Cloud,
  PieChart,
  HardDrive,
  Copy,
  Check,
  Calendar,
  LogOut,
  Sparkles,
  Camera
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { apiClient } from '@/lib/api-client';
import { formatBytes, formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const { success, error, info } = useToast();

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; avatarUrl?: string }>({});

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  // Misc state
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      setFullName(user.full_name || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">Loading profile details...</p>
        </div>
      </div>
    );
  }

  const storageUsed = user.storage_used_bytes || 0;
  const storageQuota = user.storage_quota_bytes || 5368709120;
  const usedPercentage = Math.min(Math.round((storageUsed / storageQuota) * 100), 100);

  // Validate Profile Fields
  const validateProfile = () => {
    const errs: { fullName?: string; avatarUrl?: string } = {};
    const trimmedName = fullName.trim();

    if (trimmedName.length > 0 && trimmedName.length < 2) {
      errs.fullName = 'Full name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errs.fullName = 'Full name cannot exceed 100 characters';
    } else if (/^\d+$/.test(trimmedName.replace(/\s+/g, ''))) {
      errs.fullName = 'Full name cannot contain only numbers';
    } else if (trimmedName.length > 0 && !/[a-zA-Z]/.test(trimmedName)) {
      errs.fullName = 'Full name must contain at least one letter';
    }

    if (avatarUrl.trim().length > 0) {
      try {
        new URL(avatarUrl.trim());
      } catch {
        errs.avatarUrl = 'Please enter a valid image URL (e.g., https://...)';
      }
    }

    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfile()) return;

    setIsUpdatingProfile(true);
    try {
      const res = await apiClient.patch('/auth/profile', {
        fullName: fullName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined
      });

      if (res.data?.success) {
        success('Profile Updated', 'Your profile details have been updated successfully');
        await refreshUser();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to update profile';
      error('Update Failed', msg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Password Requirements Checker
  const passwordLengthValid = newPassword.length >= 6;
  const passwordHasLetter = /[a-zA-Z]/.test(newPassword);
  const passwordHasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Validate Password Fields
  const validatePassword = () => {
    const errs: { current?: string; new?: string; confirm?: string } = {};

    if (!currentPassword) {
      errs.current = 'Current password is required';
    }

    if (!newPassword) {
      errs.new = 'New password is required';
    } else if (newPassword.length < 6) {
      errs.new = 'New password must be at least 6 characters long';
    } else if (newPassword === currentPassword) {
      errs.new = 'New password must be different from current password';
    }

    if (!confirmPassword) {
      errs.confirm = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errs.confirm = 'Passwords do not match';
    }

    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsChangingPassword(true);
    try {
      const res = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (res.data?.success) {
        success('Password Changed', 'Your password has been successfully updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordErrors({});
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to change password';
      error('Password Change Failed', msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      info('Copied', 'User ID copied to clipboard');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const initials = (user.full_name || user.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-blue-400" />
              <span>Back to Drive</span>
            </Link>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
                <Cloud className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white hidden sm:inline">
                Cloud<span className="text-blue-500">Vault</span>
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => logout()}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Profile Content */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Header Banner & User Hero Card */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-slate-950 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {/* Background Decorative Glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Avatar + Info */}
              <div className="flex items-center space-x-5">
                <div className="relative group">
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-2xl sm:text-3xl font-bold text-white shadow-xl shadow-blue-500/20 ring-4 ring-slate-800/80 overflow-hidden">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || user.email}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image link breaks
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div
                    onClick={() => setActiveTab('profile')}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg transition-transform hover:scale-110"
                    title="Change Avatar URL"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                      {user.full_name || 'CloudVault User'}
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                      <Sparkles className="h-3 w-3" /> Active
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span>{user.email}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Joined {formatDate(user.created_at || new Date().toISOString())}</span>
                    </span>
                    <span>•</span>
                    <button
                      onClick={copyUserId}
                      className="flex items-center space-x-1 hover:text-slate-300 transition-colors"
                      title="Copy Account ID"
                    >
                      <span className="font-mono text-[10px]">ID: {user.id ? `${user.id.substring(0, 8)}...` : 'N/A'}</span>
                      {copiedId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Storage Meter Summary Box */}
              <div className="w-full md:w-72 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-inner">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center space-x-1.5">
                    <PieChart className="h-3.5 w-3.5 text-blue-400" />
                    <span>Cloud Storage</span>
                  </span>
                  <span className="text-blue-400 font-bold">{usedPercentage}%</span>
                </div>

                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${Math.max(usedPercentage, 4)}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatBytes(storageUsed)} used</span>
                  <span className="text-slate-500">{formatBytes(storageQuota)} total</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-8 flex items-center space-x-2 border-t border-slate-800/80 pt-4">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                <span>Profile Settings</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === 'security'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Security & Password</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Profile Information */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
              {/* Left Column: Form */}
              <div className="md:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <UserIcon className="h-5 w-5 text-blue-400" />
                    <span>Personal Information</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Update your display name and public avatar photo.
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  {/* Email (Read Only) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Email Address</span>
                      <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Verified
                      </span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        disabled
                        value={user.email}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-xs text-slate-400 cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="text-xs font-semibold text-slate-300">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (profileErrors.fullName) setProfileErrors({ ...profileErrors, fullName: undefined });
                        }}
                        placeholder="e.g. Jane Doe"
                        className={`w-full rounded-xl border bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-1 ${
                          profileErrors.fullName
                            ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                            : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    {profileErrors.fullName && (
                      <p className="text-[11px] text-red-400 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{profileErrors.fullName}</span>
                      </p>
                    )}
                  </div>

                  {/* Avatar URL */}
                  <div className="space-y-1.5">
                    <label htmlFor="avatarUrl" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Avatar Image URL</span>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="text-[10px] text-slate-400 hover:text-white"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <Camera className="h-4 w-4" />
                      </div>
                      <input
                        id="avatarUrl"
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => {
                          setAvatarUrl(e.target.value);
                          if (profileErrors.avatarUrl) setProfileErrors({ ...profileErrors, avatarUrl: undefined });
                        }}
                        placeholder="https://images.unsplash.com/... or https://avatar.iran.liara.run/public"
                        className={`w-full rounded-xl border bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-1 ${
                          profileErrors.avatarUrl
                            ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                            : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    {profileErrors.avatarUrl && (
                      <p className="text-[11px] text-red-400 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{profileErrors.avatarUrl}</span>
                      </p>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 focus:outline-none disabled:opacity-50"
                    >
                      {isUpdatingProfile ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Save Profile</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Avatar Preview & Fast Presets */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl text-center space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Avatar Preview</h3>
                  
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-3xl font-bold text-white shadow-xl ring-4 ring-slate-800 overflow-hidden">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    {avatarUrl ? 'Live preview of your avatar link' : 'Using default initials badge'}
                  </p>

                  <div className="border-t border-slate-800 pt-3">
                    <p className="text-[11px] font-medium text-slate-400 mb-2">Try quick sample avatars:</p>
                    <div className="flex items-center justify-center gap-2">
                      {[
                        'https://api.dicebear.com/7.x/bottts/svg?seed=CloudVault',
                        'https://api.dicebear.com/7.x/identicon/svg?seed=StorageMaster',
                        'https://api.dicebear.com/7.x/lorelei/svg?seed=ProCoder'
                      ].map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatarUrl(presetUrl)}
                          className="h-8 w-8 rounded-lg border border-slate-700 bg-slate-800 overflow-hidden hover:scale-105 transition-transform"
                          title="Apply avatar preset"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={presetUrl} alt="Preset" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cloud Vault Storage Info Box */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                    <span>Storage Tier</span>
                  </h3>
                  <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-400">Current Plan</span>
                      <span className="text-emerald-400 font-bold">Standard Free</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-400">Allocated Quota</span>
                      <span className="text-white">5.00 GB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Security & Password */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
              {/* Left Column: Change Password Form */}
              <div className="md:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <KeyRound className="h-5 w-5 text-indigo-400" />
                    <span>Change Password</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Ensure your account is using a long, secure password to protect your files.
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="currentPw" className="text-xs font-semibold text-slate-300">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="currentPw"
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (passwordErrors.current) setPasswordErrors({ ...passwordErrors, current: undefined });
                        }}
                        placeholder="Enter your current password"
                        className={`w-full rounded-xl border bg-slate-950/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-1 ${
                          passwordErrors.current
                            ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                            : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                      >
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordErrors.current && (
                      <p className="text-[11px] text-red-400 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{passwordErrors.current}</span>
                      </p>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="newPw" className="text-xs font-semibold text-slate-300">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        id="newPw"
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (passwordErrors.new) setPasswordErrors({ ...passwordErrors, new: undefined });
                        }}
                        placeholder="Enter at least 6 characters"
                        className={`w-full rounded-xl border bg-slate-950/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-1 ${
                          passwordErrors.new
                            ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                            : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordErrors.new && (
                      <p className="text-[11px] text-red-400 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{passwordErrors.new}</span>
                      </p>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirmPw" className="text-xs font-semibold text-slate-300">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        id="confirmPw"
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (passwordErrors.confirm) setPasswordErrors({ ...passwordErrors, confirm: undefined });
                        }}
                        placeholder="Re-type your new password"
                        className={`w-full rounded-xl border bg-slate-950/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-1 ${
                          passwordErrors.confirm
                            ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                            : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                      >
                        {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordErrors.confirm && (
                      <p className="text-[11px] text-red-400 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{passwordErrors.confirm}</span>
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 focus:outline-none disabled:opacity-50"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-3.5 w-3.5" />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Password Strength & Best Practices */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                    <span>Password Checklist</span>
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                          passwordLengthValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {passwordLengthValid ? <Check className="h-2.5 w-2.5" /> : '•'}
                      </div>
                      <span className={passwordLengthValid ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                        At least 6 characters long
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                          passwordHasLetter ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {passwordHasLetter ? <Check className="h-2.5 w-2.5" /> : '•'}
                      </div>
                      <span className={passwordHasLetter ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                        Contains at least one letter
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                          passwordHasNumber ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {passwordHasNumber ? <Check className="h-2.5 w-2.5" /> : '•'}
                      </div>
                      <span className={passwordHasNumber ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                        Contains numbers (recommended)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                          passwordsMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {passwordsMatch ? <Check className="h-2.5 w-2.5" /> : '•'}
                      </div>
                      <span className={passwordsMatch ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                        Confirmation passwords match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Advice Card */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300">Security Recommendation</h4>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Never share your password or auth tokens with anyone. CloudVault encrypts your files and stores password hashes with secure salted bcrypt hashing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
