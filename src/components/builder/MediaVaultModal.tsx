"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getMediaAssets, saveMediaAsset, deleteMediaAsset } from '@/app/actions/builder';
import { createClient } from '@/lib/supabase/client';
import { getActiveWorkspaceId } from '@/lib/workspace/activeWorkspaceClient';
import { toast } from 'sonner';
import { checkImageFile, IMAGE_ACCEPT, IMAGE_HINT } from '@/lib/builder/imageUpload';

interface MediaVaultModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

export const MediaVaultModal = ({
  isOpen,
  onOpenChange,
  onSelect
}: MediaVaultModalProps) => {
  const [activeTab, setActiveTab] = useState<'library' | 'unsplash' | 'upload'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Unsplash search state
  const [unsplashPhotos, setUnsplashPhotos] = useState<any[]>([]);
  const [isSearchingUnsplash, setIsSearchingUnsplash] = useState(false);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const res = await getMediaAssets();
      if (res.success && res.assets) {
        setAssets(res.assets);
      }
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // A stale error from the last attempt shouldn't greet the next time the vault opens.
  useEffect(() => {
    if (!isOpen) { setUploadError(null); setIsDragging(false); }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      fetchLibrary();
    }
  }, [isOpen, activeTab]);

  // Curated fallback stock photos
  const CURATED_STOCK_PHOTOS = [
    { id: '1', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600', name: 'Abstract Gradient' },
    { id: '2', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600', name: 'Neural Code' },
    { id: '3', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600', name: 'Marketing Chart' },
    { id: '4', url: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?q=80&w=600', name: 'Work Desk' },
    { id: '5', url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=600', name: 'AI Interface' },
    { id: '6', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600', name: 'Modern Building' }
  ];

  const handleSearchUnsplash = async () => {
    if (!searchQuery) {
      setUnsplashPhotos(CURATED_STOCK_PHOTOS);
      return;
    }
    setIsSearchingUnsplash(true);
    try {
      // Direct request using public access key
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=12&client_id=vD8LhH57oK_v2U868u8JskqI_E6-R-wB63X6x9e-56g`);
      if (!res.ok) throw new Error('Unsplash rate limit or key error');
      const data = await res.json();
      if (data?.results) {
        setUnsplashPhotos(data.results.map((p: any) => ({
          id: p.id,
          url: p.urls.regular,
          name: p.alt_description || 'Unsplash Photo'
        })));
      } else {
        throw new Error('No results');
      }
    } catch (err) {
      console.warn('Unsplash API error, falling back to curated registry:', err);
      // Fallback matching query text
      const filtered = CURATED_STOCK_PHOTOS.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setUnsplashPhotos(filtered.length > 0 ? filtered : CURATED_STOCK_PHOTOS);
    } finally {
      setIsSearchingUnsplash(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'unsplash') {
      handleSearchUnsplash();
    }
  }, [activeTab]);

  // Storage's JS client has no upload progress, so the object is POSTed to the Storage REST
  // endpoint directly (same auth, same RLS) to get real byte-level progress for larger files.
  const putWithProgress = (path: string, file: File, contentType: string, token: string) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/builder-media/${path}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.setRequestHeader('cache-control', 'max-age=3600');
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100)); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        let msg = '';
        try { msg = JSON.parse(xhr.responseText)?.message || ''; } catch { /* non-JSON body */ }
        if (xhr.status === 401 || xhr.status === 403) reject(new Error("You don't have permission to upload to this workspace. Sign in again and retry."));
        else if (xhr.status === 413) reject(new Error('The server rejected the file as too large.'));
        else if (xhr.status === 507 || /quota|storage.*(full|limit)/i.test(msg)) reject(new Error('Your workspace storage is full.'));
        else reject(new Error(msg || `The server rejected the upload (HTTP ${xhr.status}).`));
      };
      xhr.onerror = () => reject(new Error('Network error — check your connection and try again.'));
      xhr.ontimeout = () => reject(new Error('The upload timed out — try again.'));
      xhr.send(file);
    });

  // Shared by click-to-browse and drag-and-drop so both behave identically.
  const uploadFile = async (file: File) => {
    if (isUploading) return;
    setUploadError(null);
    const check = await checkImageFile(file);
    if (!check.ok) {
      setUploadError(check.error);
      toast.error(check.error);
      return;
    }
    setIsUploading(true);
    setProgress(0);
    let filePath = '';
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session has expired. Sign in again and retry.');
      // Extension comes from the verified bytes, never from the user-supplied name.
      filePath = `${getActiveWorkspaceId()}/vault/${Date.now()}-${Math.floor(Math.random() * 10000)}.${check.kind.ext}`;
      await putWithProgress(filePath, file, check.kind.mime, session.access_token);

      const { data: { publicUrl } } = supabase.storage.from('builder-media').getPublicUrl(filePath);
      const saved = await saveMediaAsset(publicUrl, file.name, file.size, check.kind.mime, 'Uploaded');
      if (!saved?.success) {
        // Don't leave an orphaned object that the library can never show.
        await supabase.storage.from('builder-media').remove([filePath]).catch(() => {});
        throw new Error(saved?.error || 'The image uploaded but could not be added to your library.');
      }
      toast.success('Image uploaded.');
      // Apply it right away (the caller sets it as the element's source) — no second click, no refresh.
      onSelect(publicUrl);
      onOpenChange(false);
      setActiveTab('library');
    } catch (err: any) {
      const message = err?.message || 'Upload failed. Please try again.';
      setUploadError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so choosing the same file again (e.g. after fixing a failure) still fires onChange.
    e.target.value = '';
    if (file) await uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    if (files.length > 1) toast.info('Only one image at a time — uploading the first.');
    void uploadFile(files[0]);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this file from your workspace library?')) {
      const res = await deleteMediaAsset(id);
      if (res.success) {
        toast.success('Asset removed');
        fetchLibrary();
      } else {
        toast.error('Failed to remove asset');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white border-slate-200 text-slate-900 rounded-3xl p-0 overflow-hidden shadow-2xl z-[9999]">
        <div className="flex flex-col h-[70vh]">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                  <ImageIcon className="w-5 h-5 text-slate-500" />
                  Media library vault
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500 font-medium mt-1">
                  Manage workspace uploads and search stock photography assets
                </DialogDescription>
              </div>
            </div>

            {/* Tab Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
                {(['library', 'unsplash', 'upload'] as const).map((tab) => (
                  <Button
                    key={tab}
                    variant="ghost"
                    onClick={() => setActiveTab(tab)}
                    className={`h-9 px-4 text-[12px] font-medium rounded-full transition-all motion-reduce:transition-none ${
                      activeTab === tab
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab === 'library' ? 'Workspace library' : tab === 'unsplash' ? 'Stock photos' : 'Upload asset'}
                  </Button>
                ))}
              </div>

              {activeTab === 'unsplash' && (
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder="Search Unsplash..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 bg-white border-slate-200 text-xs placeholder:text-slate-400 text-slate-700 rounded-xl focus-visible:border-slate-300"
                  />
                  <Button onClick={handleSearchUnsplash} className="h-9 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-xl px-4">
                    Search
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {activeTab === 'library' && (
              isLoading ? (
                <div className="h-full flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none text-slate-400" />
                </div>
              ) : assets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                  <Upload className="w-10 h-10 mb-4" />
                  <p className="text-xs font-bold">No uploaded assets inside workspace yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => { onSelect(asset.url); onOpenChange(false); }}
                      className="group relative aspect-square bg-slate-100 border border-transparent hover:border-slate-300 rounded-xl overflow-hidden cursor-pointer transition-all motion-reduce:transition-none"
                    >
                      <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none flex items-center justify-center">
                        <button
                          onClick={(e) => handleDelete(asset.id, e)}
                          className="p-2 bg-red/25 border border-red/30 text-red hover:text-red/80 rounded-lg transition-colors motion-reduce:transition-none absolute top-2 right-2"
                        >
                          <Trash2 size={12} />
                        </button>
                        <span className="text-[8px] font-bold text-white px-3 py-1.5 bg-slate-900/80 rounded-full">Select</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'unsplash' && (
              isSearchingUnsplash ? (
                <div className="h-full flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none text-slate-400" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {unsplashPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => { onSelect(photo.url); onOpenChange(false); }}
                      className="group relative aspect-square bg-slate-100 border border-transparent hover:border-slate-300 rounded-xl overflow-hidden cursor-pointer transition-all motion-reduce:transition-none"
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white px-3 py-1.5 bg-slate-900/80 rounded-full">Use image</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'upload' && (
              <div className="h-full flex flex-col items-center justify-center">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload an image: click to browse or drop a file here"
                  aria-busy={isUploading}
                  onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isUploading) { e.preventDefault(); fileInputRef.current?.click(); } }}
                  onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
                  onDragEnter={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
                  onDrop={handleDrop}
                  className={`w-full max-w-md p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all motion-reduce:transition-none gap-4 outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                    isDragging ? 'border-slate-900 bg-slate-200' : 'border-slate-200 hover:border-slate-300 bg-slate-100 hover:bg-slate-200'
                  } ${isUploading ? 'cursor-wait' : 'cursor-pointer'}`}
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none text-slate-400" />
                  ) : (
                    <Upload className="w-8 h-8 text-slate-500" />
                  )}
                  <div className="text-center w-full">
                    <p className="text-xs font-bold text-slate-700">
                      {isUploading ? `Uploading… ${progress}%` : isDragging ? 'Drop to upload' : 'Click or drag image to upload'}
                    </p>
                    {isUploading ? (
                      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-300 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full bg-slate-900 transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-1">{IMAGE_HINT}</p>
                    )}
                  </div>
                </div>
                {uploadError && (
                  <p role="alert" className="mt-4 w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                    {uploadError}
                  </p>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUpload}
                  accept={IMAGE_ACCEPT}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
