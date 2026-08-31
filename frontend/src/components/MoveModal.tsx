'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderSymlink, Folder, HardDrive, Loader2, AlertCircle, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Folder as FolderType } from '@/types';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: {
    id: string;
    name: string;
    type: 'file' | 'folder';
    currentParentId?: string | null;
  } | null;
}

export default function MoveModal({ isOpen, onClose, onSuccess, item }: MoveModalProps) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSelectedTargetId(item?.currentParentId || null);
      fetchFolders();
    }
  }, [isOpen, item]);

  const fetchFolders = async () => {
    try {
      setLoadingFolders(true);
      const res = await apiClient.get('/folders?all=true');
      if (res.data?.data?.folders) {
        setFolders(res.data.data.folders);
      }
    } catch (err: any) {
      setError('Failed to load folders');
    } finally {
      setLoadingFolders(false);
    }
  };

  if (!isOpen || !item) return null;

  const handleMove = async () => {
    setMoving(true);
    setError(null);

    try {
      if (item.type === 'folder') {
        await apiClient.patch(`/folders/${item.id}`, { parentId: selectedTargetId });
      } else {
        await apiClient.patch(`/files/${item.id}`, { folderId: selectedTargetId });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move item');
    } finally {
      setMoving(false);
    }
  };

  // If moving a folder, disable selecting itself
  const availableFolders = folders.filter((f) => {
    if (item.type === 'folder' && f.id === item.id) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <button
          onClick={onClose}
          disabled={moving}
          className="absolute top-5 right-5 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <FolderSymlink className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Move &ldquo;{item.name}&rdquo;</h3>
            <p className="text-xs text-slate-400">Select a destination folder</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center space-x-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Folder Selection List */}
        <div className="mt-5 max-h-60 overflow-y-auto space-y-1.5 rounded-2xl border border-slate-800 bg-slate-900/40 p-2">
          {/* Root Option */}
          <button
            type="button"
            onClick={() => setSelectedTargetId(null)}
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
              selectedTargetId === null
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <HardDrive className="h-4 w-4 text-blue-400" />
              <span>My Drive (Root)</span>
            </div>
            {selectedTargetId === null && <Check className="h-4 w-4 text-blue-400" />}
          </button>

          {loadingFolders ? (
            <div className="flex py-6 items-center justify-center text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Loading folders...</span>
            </div>
          ) : (
            availableFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedTargetId(folder.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                  selectedTargetId === folder.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Folder className="h-4 w-4 text-amber-400" />
                  <span className="truncate">{folder.name}</span>
                </div>
                {selectedTargetId === folder.id && <Check className="h-4 w-4 text-blue-400" />}
              </button>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={moving}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={moving || selectedTargetId === item.currentParentId}
            className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 disabled:opacity-50"
          >
            {moving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Moving...</span>
              </>
            ) : (
              <span>Move Here</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
