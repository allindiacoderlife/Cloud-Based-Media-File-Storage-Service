'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  Code,
  Archive,
  File,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { FileItem } from '@/types';
import { formatBytes, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

interface PreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShare?: (file: FileItem) => void;
}

export default function PreviewModal({ file, isOpen, onClose, onShare }: PreviewModalProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (file && isOpen) {
      setLoadingUrl(true);
      setTextContent(null);
      apiClient
        .get(`/files/${file.id}/download`)
        .then((res) => {
          const url = res.data?.data?.downloadUrl;
          setDownloadUrl(url);

          // If text or json or code, fetch text content
          if (
            file.mime_type.includes('text') ||
            file.mime_type.includes('json') ||
            file.mime_type.includes('javascript') ||
            file.mime_type.includes('typescript')
          ) {
            fetch(url)
              .then((r) => r.text())
              .then((text) => setTextContent(text))
              .catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('Failed to get download URL for preview:', err);
        })
        .finally(() => {
          setLoadingUrl(false);
        });
    } else {
      setDownloadUrl(null);
      setTextContent(null);
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';
  const isTextOrCode =
    textContent !== null ||
    file.mime_type.includes('text') ||
    file.mime_type.includes('json') ||
    file.mime_type.includes('javascript') ||
    file.mime_type.includes('typescript');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[85vh] rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              {isImage && <ImageIcon className="h-5 w-5 text-pink-400" />}
              {isVideo && <Video className="h-5 w-5 text-purple-400" />}
              {isAudio && <Music className="h-5 w-5 text-amber-400" />}
              {isPdf && <FileText className="h-5 w-5 text-red-400" />}
              {isTextOrCode && <Code className="h-5 w-5 text-emerald-400" />}
              {!isImage && !isVideo && !isAudio && !isPdf && !isTextOrCode && <File className="h-5 w-5 text-blue-400" />}
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-white truncate">{file.name}</h3>
              <p className="text-[11px] text-slate-400">
                {formatBytes(file.size_bytes)} • {formatDate(file.updated_at || file.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onShare && (
              <button
                onClick={() => onShare(file)}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={file.name}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-500 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-6 bg-slate-950/60">
          {loadingUrl ? (
            <div className="flex flex-col items-center space-y-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-xs">Preparing preview stream...</p>
            </div>
          ) : !downloadUrl ? (
            <div className="text-center text-slate-500">
              <File className="mx-auto h-12 w-12 mb-2 text-slate-600" />
              <p className="text-sm">Preview currently unavailable</p>
            </div>
          ) : isImage ? (
            <div className="relative max-h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={downloadUrl}
                alt={file.name}
                className="max-h-[68vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </div>
          ) : isVideo ? (
            <video
              controls
              autoPlay
              playsInline
              src={downloadUrl}
              className="max-h-[68vh] max-w-full rounded-2xl shadow-2xl bg-black"
            />
          ) : isAudio ? (
            <div className="flex flex-col items-center space-y-6 p-8 rounded-3xl bg-slate-900/60 border border-slate-800 w-full max-w-md">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Music className="h-12 w-12" />
              </div>
              <audio controls src={downloadUrl} className="w-full" autoPlay />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${downloadUrl}#toolbar=0`}
              className="w-full h-full rounded-2xl border border-slate-800 bg-white"
              title={file.name}
            />
          ) : isTextOrCode && textContent !== null ? (
            <div className="w-full h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
              <pre>{textContent}</pre>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400">
                <File className="h-10 w-10" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  This file format cannot be directly previewed in the browser.
                </p>
              </div>
              <a
                href={downloadUrl}
                download={file.name}
                className="flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500"
              >
                <Download className="h-4 w-4" />
                <span>Download to View</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
