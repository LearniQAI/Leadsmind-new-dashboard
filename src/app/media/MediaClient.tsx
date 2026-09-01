'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  File as FileIcon,
  Image as ImageIcon,
  Video,
  Download,
  Trash2,
  Upload,
  Search,
  LayoutGrid,
  List as ListIcon,
  FolderOpen,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';

type MediaFile = {
  id: string;
  name: string;
  path: string;
  mime_type?: string | null;
  size?: number | null;
  metadata?: { uploaded_via?: string; content?: string; isDraft?: boolean } | null;
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'document', label: 'Documents' },
] as const;

export default function MediaClient({
  initialFiles,
  workspaceId,
}: {
  initialFiles: MediaFile[];
  workspaceId: string;
}) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="text-sky-500" />;
    if (type.includes('video')) return <Video className="text-violet-500" />;
    return <FileIcon className="text-dash-textMuted" />;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const publicUrl = (path: string) =>
    path.startsWith('http') ? path : supabase.storage.from('media').getPublicUrl(path).data.publicUrl;

  const uploadFile = async (file: File) => {
    if (!file || !workspaceId) return;

    const filePath = `${workspaceId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    toast.promise(
      async () => {
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: dbData, error: dbError } = await supabase
          .from('media_files')
          .insert({
            workspace_id: workspaceId,
            name: file.name,
            path: filePath,
            type: 'file',
            mime_type: file.type || 'application/octet-stream',
            size: file.size,
            metadata: {
              uploaded_via: 'Media Center — direct upload',
              source_feature: 'media_center',
            },
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setFiles((prev) => [dbData as MediaFile, ...prev]);
        return dbData;
      },
      {
        loading: 'Uploading…',
        success: 'File uploaded',
        error: (err) => `Upload failed: ${err.message}`,
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    dropped.forEach((f) => uploadFile(f));
  };

  const handleDelete = async (fileId: string, path: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    toast.promise(
      async () => {
        if (!path.startsWith('http') && !path.startsWith('draft://')) {
          await supabase.storage.from('media').remove([path]);
        }
        await supabase.from('media_files').delete().eq('id', fileId).eq('workspace_id', workspaceId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      },
      {
        loading: 'Deleting file…',
        success: 'File deleted',
        error: 'Failed to delete file',
      }
    );
  };

  const handleDownload = async (file: MediaFile) => {
    try {
      if (file.path.startsWith('draft://')) {
        const content = file.metadata?.content || '';
        const blob = new Blob([content], { type: 'text/plain' });
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = file.name.endsWith('.txt') ? file.name : `${file.name}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
        return;
      }

      const url = publicUrl(file.path);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  const copyLink = (file: MediaFile) => {
    if (file.path.startsWith('draft://')) {
      toast.error('Drafts do not have a public link');
      return;
    }
    navigator.clipboard.writeText(publicUrl(file.path));
    toast.success('Link copied');
  };

  const visibleFiles = useMemo(() => {
    return files.filter((f) => {
      const mime = (f.mime_type || '').toLowerCase();
      const matchesFilter =
        filter === 'all' ||
        (filter === 'image' && mime.includes('image')) ||
        (filter === 'video' && mime.includes('video')) ||
        (filter === 'document' && !mime.includes('image') && !mime.includes('video'));
      const matchesQuery =
        !query.trim() ||
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        (f.metadata?.uploaded_via || '').toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [files, filter, query]);

  return (
    <div
      className="mx-auto max-w-6xl space-y-6"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={handleInputChange} />

      {/* Page header */}
      <div className="flex flex-col gap-4 border-b border-dash-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
            <span className="h-1 w-1 rounded-full bg-sky-500" />
            Workspace
          </div>
          <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-dash-text md:text-[30px]">
            Media Center
          </h1>
          <p className="max-w-2xl text-[13px] leading-relaxed text-dash-textMuted">
            All files uploaded across your workspace, in one place.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-dash-border bg-white p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4 ${
                view === 'grid' ? 'bg-sky-50 text-sky-600' : 'text-dash-textMuted hover:text-dash-text'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid />
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4 ${
                view === 'list' ? 'bg-sky-50 text-sky-600' : 'text-dash-textMuted hover:text-dash-text'
              }`}
              aria-label="List view"
            >
              <ListIcon />
            </button>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/25 [&_svg]:size-4"
          >
            <Upload /> Upload file
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dash-textMuted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="h-10 w-full rounded-lg border border-dash-border bg-white pl-9 pr-3 text-[13px] text-dash-text placeholder:text-dash-textMuted outline-none transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20'
                  : 'text-dash-textMuted hover:bg-dash-surface hover:text-dash-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dropzone / content */}
      {files.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-20 text-center transition-colors ${
            isDragging ? 'border-sky-400 bg-sky-50/60' : 'border-dash-border bg-dash-surface/40 hover:border-slate-300'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dash-border bg-white text-dash-textMuted [&_svg]:size-5">
            <FolderOpen />
          </div>
          <h3 className="mt-4 text-[14px] font-semibold text-dash-text">No files yet</h3>
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-dash-textMuted">
            Drag a file here, or click to upload. Files added from anywhere else in your
            workspace &mdash; course content, cover images, branding &mdash; also show up here.
          </p>
        </button>
      ) : (
        <>
          {/* Compact drop bar above populated content */}
          <button
            onClick={() => inputRef.current?.click()}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-[12px] font-semibold transition-colors [&_svg]:size-4 ${
              isDragging
                ? 'border-sky-400 bg-sky-50/60 text-sky-700'
                : 'border-dash-border bg-dash-surface/40 text-dash-textMuted hover:border-slate-300 hover:text-dash-text'
            }`}
          >
            <Upload /> {isDragging ? 'Drop to upload' : 'Drag files here or click to upload'}
          </button>

          {visibleFiles.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-dash-textMuted">No files match your search.</p>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleFiles.map((file) => (
                <div
                  key={file.id}
                  className="group overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.03)] transition-colors hover:border-slate-300"
                >
                  <div className="relative flex aspect-[4/3] items-center justify-center bg-dash-surface">
                    {(file.mime_type || '').includes('image') && !file.path.startsWith('draft://') ? (
                      <img
                        src={publicUrl(file.path)}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="[&_svg]:size-8">{fileIcon(file.mime_type || '')}</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-900/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => copyLink(file)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-dash-text transition-colors hover:bg-white [&_svg]:size-4"
                        title="Copy link"
                      >
                        <Link2 />
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-dash-text transition-colors hover:bg-white [&_svg]:size-4"
                        title="Download"
                      >
                        <Download />
                      </button>
                      <button
                        onClick={() => handleDelete(file.id, file.path)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-rose-600 transition-colors hover:bg-white [&_svg]:size-4"
                        title="Delete"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h4 className="truncate text-[13px] font-semibold text-dash-text" title={file.name}>
                      {file.name}
                    </h4>
                    {file.metadata?.uploaded_via && (
                      <p className="mt-0.5 truncate text-[11px] font-medium text-sky-600" title={file.metadata.uploaded_via}>
                        {file.metadata.uploaded_via}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-dash-textMuted">{formatFileSize(file.size || 0)}</span>
                      <span className="rounded bg-dash-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dash-textMuted">
                        {(file.mime_type || '').split('/')[1] || 'file'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.03)]">
              {visibleFiles.map((file, i) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-dash-surface/60 ${
                    i > 0 ? 'border-t border-dash-border' : ''
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dash-border bg-dash-surface [&_svg]:size-4">
                    {fileIcon(file.mime_type || '')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[13px] font-semibold text-dash-text" title={file.name}>
                      {file.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-dash-textMuted">
                      <span>{formatFileSize(file.size || 0)}</span>
                      {file.metadata?.uploaded_via && (
                        <>
                          <span className="text-dash-border">•</span>
                          <span className="truncate font-medium text-sky-600">{file.metadata.uploaded_via}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => copyLink(file)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-white hover:text-dash-text [&_svg]:size-4"
                      title="Copy link"
                    >
                      <Link2 />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-white hover:text-dash-text [&_svg]:size-4"
                      title="Download"
                    >
                      <Download />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id, file.path)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-white hover:text-rose-600 [&_svg]:size-4"
                      title="Delete"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
