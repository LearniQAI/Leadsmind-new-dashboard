"use client";

import React, { useRef, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { MediaVaultModal } from '../MediaVaultModal';

export const ImageSettings = () => {
  const { actions: { setProp }, src, alt, borderRadius, objectFit, width, height, shape } = useNode((node) => ({
    src: node.data.props.src,
    alt: node.data.props.alt,
    borderRadius: node.data.props.borderRadius,
    objectFit: node.data.props.objectFit,
    width: node.data.props.width,
    height: node.data.props.height,
    shape: node.data.props.shape,
  }));

  const [isUploading, setIsUploading] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const supabase = createClient();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
      const filePath = `builder/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('builder-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('builder-media')
        .getPublicUrl(filePath);

      setProp((props: any) => props.src = publicUrl);
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Image source</Label>

        <div className="flex gap-2">
          <Input
            value={src || ''}
            placeholder="https://..."
            onChange={(e) => setProp((props: any) => props.src = e.target.value)}
            className="h-9 text-xs bg-white border-dash-border !text-dash-text flex-1"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 shrink-0 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 text-purple-600 transition-colors motion-reduce:transition-none"
            onClick={() => setIsVaultOpen(true)}
            title="Browse Media Library"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 shrink-0 bg-dash-surface hover:bg-dash-border border-none transition-colors motion-reduce:transition-none"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Direct File Upload"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none !text-dash-textMuted" /> : <Upload className="w-4 h-4 !text-dash-textMuted" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted">Alt text (SEO)</Label>
        <Input
          value={alt || ''}
          placeholder="Describe image..."
          onChange={(e) => setProp((props: any) => props.alt = e.target.value)}
          className="h-8 text-xs bg-white border-dash-border !text-dash-text"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block text-center">Width</Label>
          <Input
            value={width || '100%'}
            onChange={(e) => setProp((props: any) => props.width = e.target.value)}
            className="h-8 text-xs text-center bg-white border-dash-border !text-dash-text"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block text-center">Height</Label>
          <Input
            value={height || 'auto'}
            onChange={(e) => setProp((props: any) => props.height = e.target.value)}
            className="h-8 text-xs text-center bg-white border-dash-border !text-dash-text"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted">Shape</Label>
        <div className="grid grid-cols-2 bg-dash-surface p-1 rounded-md border border-dash-border">
          {['square', 'circle'].map((s) => (
            <button
              key={s}
              onClick={() => setProp((props: any) => props.shape = s)}
              className={`text-[10px] py-1.5 rounded capitalize font-bold transition-colors motion-reduce:transition-none ${shape === s ? 'bg-primary text-white shadow' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {shape !== 'circle' && (
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-bold !text-dash-textMuted">Border radius ({borderRadius}px)</Label>
          <input
            type="range"
            min="0"
            max="100"
            value={borderRadius || 0}
            onChange={(e) => setProp((props: any) => props.borderRadius = Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      )}

      <div className="space-y-2 pt-2">
        <Label className="text-xs font-bold !text-dash-textMuted">Object fit</Label>
        <div className="grid grid-cols-4 bg-dash-surface p-1 rounded-md border border-dash-border">
          {['cover', 'contain', 'fill', 'none'].map((fit) => (
            <button
              key={fit}
              onClick={() => setProp((props: any) => props.objectFit = fit)}
              className={`text-[9px] py-1 rounded capitalize transition-colors motion-reduce:transition-none ${objectFit === fit ? 'bg-purple-600 text-white font-bold shadow' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {fit}
            </button>
          ))}
        </div>
      </div>
      <MediaVaultModal 
        isOpen={isVaultOpen}
        onOpenChange={setIsVaultOpen}
        onSelect={(url) => setProp((props: any) => props.src = url)}
      />
    </div>
  );
};
