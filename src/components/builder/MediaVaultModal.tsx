"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getMediaAssets, saveMediaAsset, deleteMediaAsset } from '@/app/actions/builder';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
      const filePath = `vault/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('builder-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('builder-media')
        .getPublicUrl(filePath);

      // Save to database
      await saveMediaAsset(publicUrl, file.name, file.size, file.type, 'Uploaded');
      toast.success('File added to workspace media vault.');
      setActiveTab('library');
      fetchLibrary();
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
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
      <DialogContent className="max-w-4xl bg-[#0b0b14] border-white/5 text-white rounded-3xl p-0 overflow-hidden shadow-2xl z-[9999]">
        <div className="flex flex-col h-[70vh]">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Media <span className="text-primary">Library Vault</span>
                </DialogTitle>
                <DialogDescription className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                  Manage workspace uploads and search stock photography assets
                </DialogDescription>
              </div>
            </div>

            {/* Tab Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {(['library', 'unsplash', 'upload'] as const).map((tab) => (
                  <Button
                    key={tab}
                    variant="ghost"
                    onClick={() => setActiveTab(tab)}
                    className={`h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      activeTab === tab
                        ? 'bg-primary text-white shadow'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {tab === 'library' ? 'Workspace Library' : tab === 'unsplash' ? 'Stock Photos' : 'Upload Asset'}
                  </Button>
                ))}
              </div>

              {activeTab === 'unsplash' && (
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder="Search Unsplash..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 bg-white/5 border-white/10 text-xs placeholder:text-white/30 rounded-xl"
                  />
                  <Button onClick={handleSearchUnsplash} className="h-9 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-4">
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
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : assets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                  <Upload className="w-10 h-10 mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">No uploaded assets inside workspace yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => { onSelect(asset.url); onOpenChange(false); }}
                      className="group relative aspect-square bg-white/5 border border-white/5 hover:border-primary/50 rounded-xl overflow-hidden cursor-pointer transition-all"
                    >
                      <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={(e) => handleDelete(asset.id, e)}
                          className="p-2 bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-500 rounded-lg transition-colors absolute top-2 right-2"
                        >
                          <Trash2 size={12} />
                        </button>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white px-3 py-1.5 bg-primary/80 rounded-full">Select</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'unsplash' && (
              isSearchingUnsplash ? (
                <div className="h-full flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {unsplashPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => { onSelect(photo.url); onOpenChange(false); }}
                      className="group relative aspect-square bg-white/5 border border-white/5 hover:border-primary/50 rounded-xl overflow-hidden cursor-pointer transition-all"
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white px-3 py-1.5 bg-primary/80 rounded-full">Use Image</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'upload' && (
              <div className="h-full flex flex-col items-center justify-center">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-md p-10 border-2 border-dashed border-white/10 hover:border-primary/50 bg-white/[0.01] hover:bg-primary/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all gap-4"
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-8 h-8 text-white/30" />
                  )}
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/70">Click or Drag Image to Upload</p>
                    <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest">JPG, PNG, GIF up to 5MB</p>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUpload}
                  accept="image/*"
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
