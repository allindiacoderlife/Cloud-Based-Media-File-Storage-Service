'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatBytes } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  folderId?: string | null;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess, folderId }: UploadModalProps) {
  const { refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const startUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      // Step 1: Upload Init
      const initRes = await apiClient.post('/files/init', {
        name: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
        folderId: folderId || null
      });

      const { file, uploadUrl, uploadMethod, headers } = initRes.data.data;
      setProgress(40);

      // Step 2: Upload Payload
      if (uploadMethod === 'signed_url') {
        // Direct to object storage with signed URL
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: headers || { 'Content-Type': selectedFile.type },
          body: selectedFile
        });
        setProgress(85);

        // Step 3: Complete upload
        await apiClient.post('/files/complete', {
          fileId: file.id,
          actualSizeBytes: selectedFile.size
        });
      } else {
        // Direct multipart stream to API
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (folderId) formData.append('folderId', folderId);

        await apiClient.post(`/files/upload-direct?fileId=${file.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 80) / progressEvent.total) + 15;
              setProgress(Math.min(percent, 95));
            }
          }
        });
      }

      setProgress(100);
      setSuccess(true);
      await refreshUser();
      onUploadSuccess();

      setTimeout(() => {
        onClose();
        setSelectedFile(null);
        setProgress(0);
        setSuccess(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={uploading}
          className="absolute top-5 right-5 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold text-white">Upload File</h3>
        <p className="mt-1 text-xs text-slate-400">
          Upload media, documents, and archives up to 500 MB
        </p>

        {error && (
          <div className="mt-4 flex items-center space-x-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`mt-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 mb-3">
            <UploadCloud className="h-7 w-7" />
          </div>

          <p className="text-sm font-semibold text-white">
            {isDragging ? 'Drop file here' : 'Drag & drop or click to browse'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Images, PDFs, audio, videos, archives
          </p>
        </div>

        {/* Selected File Card */}
        {selectedFile && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <File className="h-5 w-5" />
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-xs font-medium text-white truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-slate-400">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>

            {success && (
              <span className="flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Uploaded</span>
              </span>
            )}
          </div>
        )}

        {/* Progress bar */}
        {uploading && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-medium text-slate-400 mb-1.5">
              <span>Uploading to cloud storage...</span>
              <span className="text-blue-400">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={startUpload}
            disabled={!selectedFile || uploading || success}
            className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Done</span>
              </>
            ) : (
              <span>Start Upload</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
