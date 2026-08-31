'use client';

import React, { useState, useEffect } from 'react';
import { History, RotateCcw, Download, X, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { FileItem } from '@/types';
import { formatBytes, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';

interface VersionHistoryModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export default function VersionHistoryModal({
  file,
  isOpen,
  onClose,
  onRestoreSuccess
}: VersionHistoryModalProps) {
  const { success, error } = useToast();
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  useEffect(() => {
    if (file && isOpen) {
      setLoading(true);
      apiClient
        .get(`/files/${file.id}/versions`)
        .then((res) => {
          setVersions(res.data?.data?.versions || []);
        })
        .catch((err) => {
          console.warn('Failed to load version history:', err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const handleRestore = async (versionNumber: number) => {
    if (!confirm(`Restore "${file.name}" to version ${versionNumber}?`)) return;

    try {
      setRestoringVersion(versionNumber);
      await apiClient.post(`/files/${file.id}/versions/${versionNumber}/restore`);
      success('Version Restored', `Restored "${file.name}" to version ${versionNumber}`);
      onRestoreSuccess();
      onClose();
    } catch (err: any) {
      error('Restore Failed', err.message || 'Could not restore previous version');
    } finally {
      setRestoringVersion(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Version History</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex py-12 items-center justify-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-500" />
              <span className="text-xs">Loading version timeline...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <div className="flex items-center justify-center space-x-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Current Version (v{file.current_version}) is Active</span>
              </div>
              <p className="text-xs text-slate-500">
                Previous versions will automatically appear here when new revisions are uploaded.
              </p>
            </div>
          ) : (
            versions.map((ver) => {
              const isCurrent = ver.version_number === file.current_version;
              return (
                <div
                  key={ver.id || ver.version_number}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all ${
                    isCurrent
                      ? 'border-blue-500/30 bg-blue-600/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 font-bold text-xs text-blue-400 border border-slate-800">
                      v{ver.version_number}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">
                          Version {ver.version_number}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/30">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(ver.created_at)}</span>
                        <span>•</span>
                        <span>{formatBytes(ver.size_bytes)}</span>
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      disabled={restoringVersion === ver.version_number}
                      onClick={() => handleRestore(ver.version_number)}
                      className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                    >
                      {restoringVersion === ver.version_number ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
