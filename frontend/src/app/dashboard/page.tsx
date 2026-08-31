'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Cloud,
  Folder,
  FolderPlus,
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
  FolderOpen,
  ChevronRight,
  Edit3,
  FolderSymlink,
  Users,
  Filter,
  ArrowUpDown,
  X,
  Activity,
  LayoutGrid,
  List as ListIcon,
  RotateCcw,
  CheckSquare,
  Square,
  History,
  Eye,
  Sparkles,
  PieChart
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatBytes, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { FileItem, Folder as FolderType } from '@/types';
import { useToast } from '@/context/ToastContext';
import UploadModal from '@/components/UploadModal';
import CreateFolderModal from '@/components/CreateFolderModal';
import RenameModal from '@/components/RenameModal';
import MoveModal from '@/components/MoveModal';
import ShareModal from '@/components/ShareModal';
import PreviewModal from '@/components/PreviewModal';
import VersionHistoryModal from '@/components/VersionHistoryModal';

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

type ViewMode = 'my-drive' | 'shared-with-me' | 'starred' | 'recent' | 'trash' | 'search';
type LayoutMode = 'grid' | 'list';
type CategoryFilter = 'all' | 'document' | 'image' | 'video' | 'audio' | 'archive' | 'code';
type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
  const { success, error, info } = useToast();

  // Navigation & View States
  const [viewMode, setViewMode] = useState<ViewMode>('my-drive');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'My Drive' }]);

  // Data states
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sharedItems, setSharedItems] = useState<{ folders: any[]; files: any[] }>({ folders: [], files: [] });
  const [starredItems, setStarredItems] = useState<{ folders: FolderType[]; files: FileItem[] }>({ folders: [], files: [] });
  const [recentData, setRecentData] = useState<{ recentFiles: FileItem[]; activities: any[] }>({ recentFiles: [], activities: [] });
  const [trashItems, setTrashItems] = useState<{ folders: FolderType[]; files: FileItem[] }>({ folders: [], files: [] });
  const [searchResults, setSearchResults] = useState<{ folders: FolderType[]; files: FileItem[]; total: number }>({
    folders: [],
    files: [],
    total: 0
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [isSearchingDropdown, setIsSearchingDropdown] = useState(false);
  const [quickSearchResults, setQuickSearchResults] = useState<{ folders: FolderType[]; files: FileItem[] }>({
    folders: [],
    files: []
  });

  // Multi-Selection State
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Drag and Drop Upload State
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<
    Array<{ id: string; name: string; size: number; progress: number; status: 'uploading' | 'done' | 'error' }>
  >([]);

  const [loadingContents, setLoadingContents] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [versionFile, setVersionFile] = useState<FileItem | null>(null);
  const [renameItem, setRenameItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [moveItem, setMoveItem] = useState<{
    id: string;
    name: string;
    type: 'file' | 'folder';
    currentParentId?: string | null;
  } | null>(null);
  const [shareItem, setShareItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);

  // Active action menu states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const fetchContents = useCallback(async () => {
    try {
      setLoadingContents(true);
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());

      if (viewMode === 'shared-with-me') {
        const res = await apiClient.get('/shares/shared-with-me');
        setSharedItems(res.data?.data || { folders: [], files: [] });
      } else if (viewMode === 'starred') {
        const res = await apiClient.get('/stars');
        const data = res.data?.data || { folders: [], files: [] };
        setStarredItems(data);
        const newSet = new Set<string>();
        data.folders.forEach((f: any) => newSet.add(f.id));
        data.files.forEach((f: any) => newSet.add(f.id));
        setStarredIds(newSet);
      } else if (viewMode === 'recent') {
        const res = await apiClient.get('/activity/recent');
        setRecentData(res.data?.data || { recentFiles: [], activities: [] });
      } else if (viewMode === 'trash') {
        const res = await apiClient.get('/trash');
        setTrashItems(res.data?.data || { folders: [], files: [] });
      } else if (viewMode === 'search') {
        const [field, order] = sortOption.split('-');
        const sortBy = field === 'date' ? 'updated_at' : field === 'size' ? 'size_bytes' : 'name';

        const res = await apiClient.get(
          `/search?q=${encodeURIComponent(searchQuery)}&category=${categoryFilter}&sortBy=${sortBy}&sortOrder=${order}`
        );
        setSearchResults(res.data?.data || { folders: [], files: [], total: 0 });
      } else if (currentFolderId) {
        const res = await apiClient.get(`/folders/${currentFolderId}`);
        const { breadcrumbs: bc, folders: subFolders, files: subFiles } = res.data.data;
        setBreadcrumbs(bc || [{ id: null, name: 'My Drive' }]);
        setFolders(subFolders || []);
        setFiles(subFiles || []);
      } else {
        const [foldersRes, filesRes] = await Promise.all([
          apiClient.get('/folders'),
          apiClient.get('/files?folderId=root')
        ]);
        setBreadcrumbs([{ id: null, name: 'My Drive' }]);
        setFolders(foldersRes.data?.data?.folders || []);
        setFiles(filesRes.data?.data || []);
      }
    } catch (err: any) {
      console.warn('Failed to load drive contents:', err.message);
    } finally {
      setLoadingContents(false);
    }
  }, [viewMode, currentFolderId, searchQuery, categoryFilter, sortOption]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchContents();
    }
  }, [user, loading, router, fetchContents]);

  // Load Starred status cache
  useEffect(() => {
    if (user) {
      apiClient.get('/stars').then((res) => {
        const data = res.data?.data;
        if (data) {
          const newSet = new Set<string>();
          data.folders?.forEach((f: any) => newSet.add(f.id));
          data.files?.forEach((f: any) => newSet.add(f.id));
          setStarredIds(newSet);
        }
      });
    }
  }, [user]);

  // Live Debounced Header Search Preview
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearchingDropdown(false);
      setQuickSearchResults({ folders: [], files: [] });
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/search?q=${encodeURIComponent(searchQuery)}&limit=6`);
        if (res.data?.data) {
          setQuickSearchResults({
            folders: res.data.data.folders || [],
            files: res.data.data.files || []
          });
          setIsSearchingDropdown(true);
        }
      } catch (err) {
        console.warn('Live search error:', err);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
      setIsSearchingDropdown(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Drag and drop multi-file handler
  const handleDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    for (const file of droppedFiles) {
      const queueId = Math.random().toString(36).substring(2, 9);
      setUploadQueue((prev) => [
        ...prev,
        { id: queueId, name: file.name, size: file.size, progress: 20, status: 'uploading' }
      ]);

      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) formData.append('folderId', currentFolderId);

      try {
        setUploadQueue((prev) =>
          prev.map((item) => (item.id === queueId ? { ...item, progress: 65 } : item))
        );

        await apiClient.post('/files/upload-direct', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setUploadQueue((prev) =>
          prev.map((item) => (item.id === queueId ? { ...item, progress: 100, status: 'done' } : item))
        );
        success('Upload Complete', `"${file.name}" uploaded successfully`);
      } catch (err: any) {
        setUploadQueue((prev) =>
          prev.map((item) => (item.id === queueId ? { ...item, status: 'error' } : item))
        );
        error('Upload Failed', `Could not upload "${file.name}": ${err.message}`);
      }
    }

    await refreshUser();
    fetchContents();
  };

  const handleToggleStar = async (id: string, type: 'file' | 'folder', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const nextSet = new Set(starredIds);
      const willBeStarred = !nextSet.has(id);
      if (willBeStarred) {
        nextSet.add(id);
      } else {
        nextSet.delete(id);
      }
      setStarredIds(nextSet);

      await apiClient.post('/stars/toggle', { resourceType: type, resourceId: id });
      success(willBeStarred ? 'Added to Starred' : 'Removed from Starred');

      if (viewMode === 'starred') fetchContents();
    } catch (err: any) {
      error('Favorite Failed', err.message);
      fetchContents();
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const res = await apiClient.get(`/files/${file.id}/download`);
      const { downloadUrl } = res.data.data;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        info('Download Started', `Downloading "${file.name}"`);
      }
    } catch (err: any) {
      error('Download Error', err.message);
    }
  };

  const handleDeleteItem = async (id: string, type: 'file' | 'folder', name: string) => {
    if (!confirm(`Are you sure you want to move "${name}" to trash?`)) return;

    try {
      if (type === 'folder') {
        await apiClient.delete(`/folders/${id}`);
      } else {
        await apiClient.delete(`/files/${id}`);
      }
      success('Moved to Trash', `"${name}" was moved to Trash`);
      await refreshUser();
      fetchContents();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleRestoreItem = async (id: string, type: 'file' | 'folder', name: string) => {
    try {
      await apiClient.post(`/trash/restore/${type}/${id}`);
      success('Restored', `"${name}" restored from Trash`);
      fetchContents();
    } catch (err: any) {
      error('Restore Failed', err.message);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to permanently delete all items in Trash? This cannot be undone.')) return;

    try {
      await apiClient.delete('/trash/empty');
      success('Trash Emptied', 'All trash items have been permanently deleted');
      await refreshUser();
      fetchContents();
    } catch (err: any) {
      error('Empty Trash Failed', err.message);
    }
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedFileIds.size + selectedFolderIds.size} selected items?`)) return;

    try {
      for (const id of selectedFolderIds) {
        await apiClient.delete(`/folders/${id}`);
      }
      for (const id of selectedFileIds) {
        await apiClient.delete(`/files/${id}`);
      }
      success('Bulk Delete', `Selected items moved to Trash`);
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
      await refreshUser();
      fetchContents();
    } catch (err: any) {
      error('Bulk Action Failed', err.message);
    }
  };

  const handleSelectAll = (filteredFiles: FileItem[], filteredFolders: FolderType[]) => {
    if (selectedFileIds.size === filteredFiles.length && selectedFolderIds.size === filteredFolders.length) {
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map((f) => f.id)));
      setSelectedFolderIds(new Set(filteredFolders.map((f) => f.id)));
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingDropdown(false);
    setViewMode('search');
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

  const applySort = (items: any[]) => {
    const sorted = [...items];
    const [field, order] = sortOption.split('-');

    sorted.sort((a, b) => {
      let valA = a[field === 'date' ? 'updated_at' : field === 'size' ? 'size_bytes' : 'name'];
      let valB = b[field === 'date' ? 'updated_at' : field === 'size' ? 'size_bytes' : 'name'];

      if (field === 'name') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (field === 'size') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
        return order === 'asc' ? valA - valB : valB - valA;
      }
      const timeA = new Date(valA || 0).getTime();
      const timeB = new Date(valB || 0).getTime();
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return sorted;
  };

  const filterByCategory = (fileList: FileItem[]) => {
    if (categoryFilter === 'all') return fileList;
    return fileList.filter((f) => {
      const mime = f.mime_type.toLowerCase();
      if (categoryFilter === 'image') return mime.startsWith('image/');
      if (categoryFilter === 'video') return mime.startsWith('video/');
      if (categoryFilter === 'audio') return mime.startsWith('audio/');
      if (categoryFilter === 'document')
        return mime.includes('pdf') || mime.includes('document') || mime.includes('word') || mime.includes('text');
      if (categoryFilter === 'archive')
        return mime.includes('zip') || mime.includes('compressed') || mime.includes('tar');
      if (categoryFilter === 'code')
        return mime.includes('json') || mime.includes('javascript') || mime.includes('typescript') || mime.includes('html');
      return true;
    });
  };

  const currentFolderList =
    viewMode === 'starred'
      ? starredItems.folders
      : viewMode === 'trash'
      ? trashItems.folders
      : folders;

  const currentFileList =
    viewMode === 'starred'
      ? starredItems.files
      : viewMode === 'trash'
      ? trashItems.files
      : files;

  const displayedFolders = applySort(categoryFilter === 'all' ? currentFolderList : []);
  const displayedFiles = applySort(filterByCategory(currentFileList));

  const totalSelected = selectedFileIds.size + selectedFolderIds.size;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDraggingOver(false);
      }}
      onDrop={handleDropFiles}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative"
    >
      {/* Full-Screen Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/80 backdrop-blur-md border-4 border-dashed border-blue-500 pointer-events-none animate-in fade-in">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-600/30 text-blue-400 shadow-2xl animate-bounce">
              <Upload className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold text-white">Drop files here to upload</h2>
            <p className="text-sm text-blue-300">Files will be uploaded directly into this folder</p>
          </div>
        </div>
      )}

      {/* Floating Multi-File Upload Queue Drawer */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-6 left-6 z-40 w-80 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <h4 className="text-xs font-bold text-white flex items-center space-x-2">
              <Upload className="h-3.5 w-3.5 text-blue-400" />
              <span>Uploading {uploadQueue.filter((q) => q.status === 'uploading').length} files</span>
            </h4>
            <button onClick={() => setUploadQueue([])} className="text-slate-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto">
            {uploadQueue.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-white truncate max-w-[170px]">{item.name}</span>
                  <span className="text-[10px] text-slate-400">{formatBytes(item.size)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.status === 'error'
                        ? 'bg-rose-500'
                        : item.status === 'done'
                        ? 'bg-emerald-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchContents}
        folderId={currentFolderId}
      />
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onSuccess={fetchContents}
        parentId={currentFolderId}
      />
      <RenameModal
        isOpen={renameItem !== null}
        onClose={() => setRenameItem(null)}
        onSuccess={fetchContents}
        item={renameItem}
      />
      <MoveModal
        isOpen={moveItem !== null}
        onClose={() => setMoveItem(null)}
        onSuccess={fetchContents}
        item={moveItem}
      />
      <ShareModal
        isOpen={shareItem !== null}
        onClose={() => setShareItem(null)}
        item={shareItem}
      />
      <PreviewModal
        file={previewFile}
        isOpen={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        onShare={(f) => setShareItem({ id: f.id, name: f.name, type: 'file' })}
      />
      <VersionHistoryModal
        file={versionFile}
        isOpen={versionFile !== null}
        onClose={() => setVersionFile(null)}
        onRestoreSuccess={fetchContents}
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3.5">
          {/* Logo & Search */}
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              onClick={() => {
                setViewMode('my-drive');
                setCurrentFolderId(null);
              }}
              className="flex items-center space-x-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
                <Cloud className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Cloud<span className="text-blue-500">Vault</span>
              </span>
            </Link>

            {/* Header Search Bar */}
            <div className="relative hidden md:block w-96" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleSearchSubmit}>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files, folders & documents..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {/* Live Search Results Dropdown */}
              {isSearchingDropdown && (quickSearchResults.folders.length > 0 || quickSearchResults.files.length > 0) && (
                <div className="absolute left-0 right-0 top-11 z-50 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Quick Results
                  </div>

                  {quickSearchResults.folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setViewMode('my-drive');
                        setCurrentFolderId(f.id);
                        setIsSearchingDropdown(false);
                      }}
                      className="flex w-full items-center space-x-2.5 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <Folder className="h-4 w-4 text-amber-400" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}

                  {quickSearchResults.files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        setPreviewFile(file);
                        setIsSearchingDropdown(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        {getFileIcon(file.mime_type)}
                        <span className="truncate">{file.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{formatBytes(file.size_bytes)}</span>
                    </button>
                  ))}

                  <button
                    onClick={handleSearchSubmit}
                    className="mt-1 flex w-full items-center justify-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-950 py-1.5 text-[11px] font-medium text-blue-400 hover:bg-blue-600/10"
                  >
                    <Search className="h-3 w-3" />
                    <span>See all results for &ldquo;{searchQuery}&rdquo;</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* User Profile */}
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
        <aside className="hidden md:flex w-64 border-r border-slate-800/80 bg-slate-950/50 p-4 flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-1">
              <button
                onClick={() => {
                  setViewMode('my-drive');
                  setCurrentFolderId(null);
                }}
                className={`flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  viewMode === 'my-drive'
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <HardDrive className="h-4 w-4" />
                <span>My Drive</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('shared-with-me');
                  setCurrentFolderId(null);
                }}
                className={`flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  viewMode === 'shared-with-me'
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Share2 className="h-4 w-4" />
                <span>Shared with me</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('recent');
                  setCurrentFolderId(null);
                }}
                className={`flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  viewMode === 'recent'
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Recent</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('starred');
                  setCurrentFolderId(null);
                }}
                className={`flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  viewMode === 'starred'
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Star className="h-4 w-4" />
                <span>Starred</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('trash');
                  setCurrentFolderId(null);
                }}
                className={`flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  viewMode === 'trash'
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Trash2 className="h-4 w-4" />
                <span>Trash</span>
              </button>
            </div>
          </div>

          {/* Storage Meter Box */}
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center space-x-1.5">
                <PieChart className="h-3.5 w-3.5 text-blue-400" />
                <span>Storage</span>
              </span>
              <span className="text-blue-400 font-bold">{usedPercentage}%</span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${Math.max(usedPercentage, 3)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {formatBytes(storageUsed)} of {formatBytes(storageQuota)} used
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Controls Bar: Category Filters, Sort Options & View Toggle */}
          {(viewMode === 'my-drive' || viewMode === 'starred' || viewMode === 'search' || viewMode === 'trash') && (
            <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex items-center flex-wrap gap-1.5 text-xs font-medium">
                {(['all', 'document', 'image', 'video', 'audio', 'archive', 'code'] as CategoryFilter[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-xl px-3 py-1.5 capitalize transition-all ${
                      categoryFilter === cat
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                        : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'All Files' : cat + 's'}
                  </button>
                ))}
              </div>

              {/* Layout Toggle & Sort */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                  <select
                    value={sortOption}
                    onChange={(e: any) => setSortOption(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="date-desc">Date modified (Newest)</option>
                    <option value="date-asc">Date modified (Oldest)</option>
                    <option value="name-asc">Name (A to Z)</option>
                    <option value="name-desc">Name (Z to A)</option>
                    <option value="size-desc">Size (Largest)</option>
                    <option value="size-asc">Size (Smallest)</option>
                  </select>
                </div>

                {/* Grid / List Switcher */}
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 p-1">
                  <button
                    onClick={() => setLayoutMode('grid')}
                    className={`rounded-lg p-1.5 transition-colors ${
                      layoutMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setLayoutMode('list')}
                    className={`rounded-lg p-1.5 transition-colors ${
                      layoutMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                    title="List view"
                  >
                    <ListIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Bulk Action Bar */}
          {totalSelected > 0 && (
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-blue-500/30 bg-blue-950/80 p-3.5 backdrop-blur-md animate-in slide-in-from-top-2">
              <div className="flex items-center space-x-3 text-xs font-semibold text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 font-bold">
                  {totalSelected}
                </span>
                <span>items selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-1.5 rounded-xl bg-rose-600/20 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Selected</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedFileIds(new Set());
                    setSelectedFolderIds(new Set());
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* VIEW: Trash */}
          {viewMode === 'trash' ? (
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                    <Trash2 className="h-5 w-5 text-rose-400" />
                    <span>Trash</span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">Items here are soft-deleted and can be restored or permanently removed</p>
                </div>
                {(trashItems.folders.length > 0 || trashItems.files.length > 0) && (
                  <button
                    onClick={handleEmptyTrash}
                    className="flex items-center space-x-2 rounded-xl bg-rose-600/20 border border-rose-500/30 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Empty Trash</span>
                  </button>
                )}
              </div>

              <div className="mt-8 space-y-8">
                {displayedFolders.length === 0 && displayedFiles.length === 0 ? (
                  <div className="py-20 text-center text-slate-500">
                    <Trash2 className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-sm">Trash is empty</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayedFolders.map((f) => (
                      <div key={f.id} className="glass-card flex items-center justify-between rounded-2xl p-4">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <Folder className="h-5 w-5 text-amber-400" />
                          <span className="text-xs font-semibold text-white truncate">{f.name}</span>
                        </div>
                        <button
                          onClick={() => handleRestoreItem(f.id, 'folder', f.name)}
                          className="flex items-center space-x-1 rounded-xl bg-blue-600/10 border border-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </button>
                      </div>
                    ))}

                    {displayedFiles.map((file) => (
                      <div key={file.id} className="glass-card flex flex-col justify-between rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800">
                            {getFileIcon(file.mime_type)}
                          </div>
                          <button
                            onClick={() => handleRestoreItem(file.id, 'file', file.name)}
                            className="flex items-center space-x-1 rounded-xl bg-blue-600/10 border border-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restore</span>
                          </button>
                        </div>
                        <div className="mt-3">
                          <h4 className="text-sm font-semibold text-white truncate">{file.name}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">{formatBytes(file.size_bytes)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === 'recent' ? (
            /* VIEW: Recent Activity */
            <div>
              <div className="border-b border-slate-800 pb-6">
                <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <span>Recent Files & Activity</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">Timeline of recently modified files and activities</p>
              </div>

              <div className="mt-8 space-y-8">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Recently Updated Files</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {recentData.recentFiles.slice(0, 8).map((file) => (
                      <div
                        key={file.id}
                        onClick={() => setPreviewFile(file)}
                        className="glass-card flex flex-col justify-between rounded-2xl p-4 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800">
                            {getFileIcon(file.mime_type)}
                          </div>
                          <button onClick={(e) => handleToggleStar(file.id, 'file', e)} className="p-1 text-slate-500 hover:text-amber-400">
                            <Star className={`h-4 w-4 ${starredIds.has(file.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                        </div>
                        <div className="mt-3">
                          <h4 className="text-sm font-semibold text-white truncate">{file.name}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(file.updated_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {recentData.activities.length > 0 && (
                  <div className="pt-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Audit Activity Log</h2>
                    <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
                      {recentData.activities.map((act) => (
                        <div key={act.id} className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3.5 py-2.5 border border-slate-800 text-xs">
                          <div className="flex items-center space-x-3">
                            <Activity className="h-4 w-4 text-blue-400" />
                            <span className="text-white font-medium capitalize">{act.action} operation</span>
                            <span className="text-[11px] text-slate-400">{act.resource_type}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{formatDate(act.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* VIEW: My Drive, Starred, Shared & Search */
            <>
              {/* Header Actions & Breadcrumb Path */}
              <div className="flex flex-col sm:flex-row items-start sm:sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div className="flex items-center flex-wrap gap-1.5 text-sm">
                  {viewMode === 'starred' ? (
                    <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                      <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                      <span>Starred Items</span>
                    </h1>
                  ) : viewMode === 'shared-with-me' ? (
                    <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                      <Share2 className="h-5 w-5 text-blue-400" />
                      <span>Shared with me</span>
                    </h1>
                  ) : viewMode === 'search' ? (
                    <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                      <Search className="h-5 w-5 text-blue-400" />
                      <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                    </h1>
                  ) : (
                    breadcrumbs.map((bc, idx) => {
                      const isLast = idx === breadcrumbs.length - 1;
                      return (
                        <React.Fragment key={bc.id || 'root'}>
                          <button
                            onClick={() => setCurrentFolderId(bc.id)}
                            className={`font-semibold transition-colors hover:text-blue-400 ${
                              isLast ? 'text-white text-lg font-bold' : 'text-slate-400'
                            }`}
                          >
                            {bc.name}
                          </button>
                          {!isLast && <ChevronRight className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                        </React.Fragment>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {viewMode === 'my-drive' && (
                    <>
                      <button
                        onClick={() => setIsCreateFolderOpen(true)}
                        className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-200 transition-all hover:bg-slate-800 hover:text-white"
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
                    </>
                  )}
                </div>
              </div>

              {/* Drive Content Area */}
              <div className="mt-8 space-y-8">
                {loadingContents ? (
                  <div className="flex py-20 items-center justify-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-500" />
                    <span className="text-xs">Loading items...</span>
                  </div>
                ) : displayedFolders.length === 0 && displayedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 py-20 px-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 mb-4">
                      <FolderOpen className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-semibold text-white">No items found</h3>
                    <p className="mt-1 max-w-sm text-xs text-slate-400">
                      Drop files anywhere on the screen or click upload to add items.
                    </p>
                  </div>
                ) : layoutMode === 'list' ? (
                  /* LIST VIEW */
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 border-b border-slate-800 px-4 py-3 text-xs font-semibold text-slate-400">
                      <div className="col-span-6 flex items-center space-x-3">
                        <button
                          onClick={() => handleSelectAll(displayedFiles, displayedFolders)}
                          className="text-slate-400 hover:text-white"
                        >
                          {totalSelected > 0 ? <CheckSquare className="h-4 w-4 text-blue-400" /> : <Square className="h-4 w-4" />}
                        </button>
                        <span>Name</span>
                      </div>
                      <div className="col-span-2 hidden md:block">Type</div>
                      <div className="col-span-2 hidden sm:block">Size</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {/* Folders List */}
                    {displayedFolders.map((f) => {
                      const isSelected = selectedFolderIds.has(f.id);
                      return (
                        <div
                          key={f.id}
                          onDoubleClick={() => setCurrentFolderId(f.id)}
                          className={`grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-blue-600/10' : ''
                          }`}
                        >
                          <div className="col-span-6 flex items-center space-x-3 overflow-hidden cursor-pointer">
                            <button
                              onClick={() => {
                                const s = new Set(selectedFolderIds);
                                if (s.has(f.id)) s.delete(f.id);
                                else s.add(f.id);
                                setSelectedFolderIds(s);
                              }}
                              className="text-slate-400 hover:text-white"
                            >
                              {isSelected ? <CheckSquare className="h-4 w-4 text-blue-400" /> : <Square className="h-4 w-4" />}
                            </button>
                            <Folder className="h-4 w-4 text-amber-400 flex-shrink-0" />
                            <span onClick={() => setCurrentFolderId(f.id)} className="text-xs font-semibold text-white truncate">
                              {f.name}
                            </span>
                          </div>
                          <div className="col-span-2 hidden md:block text-xs text-slate-400">Folder</div>
                          <div className="col-span-2 hidden sm:block text-xs text-slate-400">—</div>
                          <div className="col-span-2 flex items-center justify-end space-x-2">
                            <button onClick={(e) => handleToggleStar(f.id, 'folder', e)} className="p-1 text-slate-500 hover:text-amber-400">
                              <Star className={`h-4 w-4 ${starredIds.has(f.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Files List */}
                    {displayedFiles.map((file) => {
                      const isSelected = selectedFileIds.has(file.id);
                      return (
                        <div
                          key={file.id}
                          className={`grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-blue-600/10' : ''
                          }`}
                        >
                          <div className="col-span-6 flex items-center space-x-3 overflow-hidden cursor-pointer" onClick={() => setPreviewFile(file)}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const s = new Set(selectedFileIds);
                                if (s.has(file.id)) s.delete(file.id);
                                else s.add(file.id);
                                setSelectedFileIds(s);
                              }}
                              className="text-slate-400 hover:text-white"
                            >
                              {isSelected ? <CheckSquare className="h-4 w-4 text-blue-400" /> : <Square className="h-4 w-4" />}
                            </button>
                            {getFileIcon(file.mime_type)}
                            <span className="text-xs font-semibold text-white truncate">{file.name}</span>
                          </div>
                          <div className="col-span-2 hidden md:block text-[11px] text-slate-400 truncate">{file.mime_type}</div>
                          <div className="col-span-2 hidden sm:block text-xs text-slate-400">{formatBytes(file.size_bytes)}</div>
                          <div className="col-span-2 flex items-center justify-end space-x-2">
                            <button onClick={() => setPreviewFile(file)} className="p-1 text-slate-400 hover:text-white" title="Preview">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button onClick={() => setVersionFile(file)} className="p-1 text-slate-400 hover:text-indigo-400" title="Version History">
                              <History className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDownload(file)} className="p-1 text-slate-400 hover:text-blue-400" title="Download">
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* GRID VIEW */
                  <>
                    {/* Folders Grid */}
                    {displayedFolders.length > 0 && (
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                          Folders ({displayedFolders.length})
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                          {displayedFolders.map((f) => {
                            const isSelected = selectedFolderIds.has(f.id);
                            return (
                              <div
                                key={f.id}
                                onDoubleClick={() => setCurrentFolderId(f.id)}
                                className={`glass-card group relative flex items-center justify-between rounded-2xl p-3.5 cursor-pointer select-none transition-all ${
                                  isSelected ? 'ring-2 ring-blue-500 bg-blue-600/10' : ''
                                }`}
                              >
                                <div onClick={() => setCurrentFolderId(f.id)} className="flex items-center space-x-3 overflow-hidden flex-1">
                                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                                    <Folder className="h-5 w-5 fill-amber-400/20" />
                                  </div>
                                  <span className="text-xs font-semibold text-white truncate" title={f.name}>
                                    {f.name}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => handleToggleStar(f.id, 'folder', e)}
                                    className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors"
                                  >
                                    <Star className={`h-4 w-4 ${starredIds.has(f.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                                  </button>

                                  <div className="relative">
                                    <button
                                      onClick={() => setActiveMenuId(activeMenuId === f.id ? null : f.id)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>

                                    {activeMenuId === f.id && (
                                      <div className="absolute right-0 top-8 z-30 w-36 rounded-xl border border-slate-800 bg-slate-900 p-1 shadow-2xl animate-in fade-in">
                                        <button
                                          onClick={() => {
                                            setCurrentFolderId(f.id);
                                            setActiveMenuId(null);
                                          }}
                                          className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                        >
                                          <FolderOpen className="h-3.5 w-3.5 text-blue-400" />
                                          <span>Open</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setShareItem({ id: f.id, name: f.name, type: 'folder' });
                                            setActiveMenuId(null);
                                          }}
                                          className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                        >
                                          <Share2 className="h-3.5 w-3.5 text-blue-400" />
                                          <span>Share</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setRenameItem({ id: f.id, name: f.name, type: 'folder' });
                                            setActiveMenuId(null);
                                          }}
                                          className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                        >
                                          <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                                          <span>Rename</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setMoveItem({ id: f.id, name: f.name, type: 'folder', currentParentId: f.parent_id });
                                            setActiveMenuId(null);
                                          }}
                                          className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                        >
                                          <FolderSymlink className="h-3.5 w-3.5 text-indigo-400" />
                                          <span>Move</span>
                                        </button>
                                        <div className="my-1 border-t border-slate-800" />
                                        <button
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            handleDeleteItem(f.id, 'folder', f.name);
                                          }}
                                          className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Files Grid */}
                    {displayedFiles.length > 0 && (
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                          Files ({displayedFiles.length})
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {displayedFiles.map((file) => {
                            const isSelected = selectedFileIds.has(file.id);
                            return (
                              <div
                                key={file.id}
                                onClick={() => setPreviewFile(file)}
                                className={`glass-card group relative flex flex-col justify-between rounded-2xl p-4 transition-all cursor-pointer ${
                                  isSelected ? 'ring-2 ring-blue-500 bg-blue-600/10' : ''
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800">
                                      {getFileIcon(file.mime_type)}
                                    </div>

                                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={(e) => handleToggleStar(file.id, 'file', e)}
                                        className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors"
                                      >
                                        <Star className={`h-4 w-4 ${starredIds.has(file.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                                      </button>

                                      <div className="relative">
                                        <button
                                          onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </button>

                                        {activeMenuId === file.id && (
                                          <div className="absolute right-0 top-8 z-30 w-36 rounded-xl border border-slate-800 bg-slate-900 p-1 shadow-2xl animate-in fade-in">
                                            <button
                                              onClick={() => {
                                                setActiveMenuId(null);
                                                setPreviewFile(file);
                                              }}
                                              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                            >
                                              <Eye className="h-3.5 w-3.5 text-blue-400" />
                                              <span>Preview</span>
                                            </button>
                                            <button
                                              onClick={() => {
                                                setActiveMenuId(null);
                                                setVersionFile(file);
                                              }}
                                              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                            >
                                              <History className="h-3.5 w-3.5 text-indigo-400" />
                                              <span>Versions</span>
                                            </button>
                                            <button
                                              onClick={() => {
                                                setActiveMenuId(null);
                                                handleDownload(file);
                                              }}
                                              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                            >
                                              <Download className="h-3.5 w-3.5 text-emerald-400" />
                                              <span>Download</span>
                                            </button>
                                            <button
                                              onClick={() => {
                                                setShareItem({ id: file.id, name: file.name, type: 'file' });
                                                setActiveMenuId(null);
                                              }}
                                              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                            >
                                              <Share2 className="h-3.5 w-3.5 text-blue-400" />
                                              <span>Share</span>
                                            </button>
                                            <button
                                              onClick={() => {
                                                setRenameItem({ id: file.id, name: file.name, type: 'file' });
                                                setActiveMenuId(null);
                                              }}
                                              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                            >
                                              <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                                              <span>Rename</span>
                                            </button>
                                            <button
                                              onClick={() => {
                                                setMoveItem({ id: file.id, name: file.name, type: 'file', currentParentId: file.folder_id });
                                                setActiveMenuId(null);
                                              }}
                                              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                            >
                                              <FolderSymlink className="h-3.5 w-3.5 text-indigo-400" />
                                              <span>Move</span>
                                            </button>
                                            <div className="my-1 border-t border-slate-800" />
                                            <button
                                              onClick={() => {
                                                setActiveMenuId(null);
                                                handleDeleteItem(file.id, 'file', file.name);
                                              }}
                                              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                              <span>Delete</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
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
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
