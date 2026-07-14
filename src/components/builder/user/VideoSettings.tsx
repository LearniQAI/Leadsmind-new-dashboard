"use client";

import React, { useRef, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Video as VideoIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export const VideoSettings = () => {
  const { actions: { setProp }, url, provider, autoPlay, controls, loop, muted, borderRadius } = useNode((node) => ({
    url: node.data.props.url,
    provider: node.data.props.provider,
    autoPlay: node.data.props.autoPlay,
    controls: node.data.props.controls,
    loop: node.data.props.loop,
    muted: node.data.props.muted,
    borderRadius: node.data.props.borderRadius,
  }));

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const supabase = createClient();

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
      const filePath = `builder/videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('builder-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('builder-media')
        .getPublicUrl(filePath);

      setProp((props: any) => {
        props.url = publicUrl;
        props.provider = 'custom';
      });
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Failed to upload video. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-xs font-bold !text-dash-textMuted block">Video source</Label>

        <div className="grid grid-cols-3 bg-dash-surface p-1 rounded-md border border-dash-border mb-3">
          {['youtube', 'vimeo', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => setProp((props: any) => props.provider = p)}
              className={`text-[9px] py-1.5 rounded capitalize transition-colors motion-reduce:transition-none ${provider === p ? 'bg-primary text-white font-bold shadow' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {p === 'custom' ? 'Upload' : p}
            </button>
          ))}
        </div>

        {provider === 'custom' ? (
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              accept="video/*"
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full h-20 border-dashed border-2 bg-white hover:bg-dash-surface flex flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none text-dash-accent" />
              ) : (
                <>
                  <Upload className="w-5 h-5 !text-dash-textMuted" />
                  <span className="text-xs font-medium !text-dash-textMuted">Click to upload MP4</span>
                </>
              )}
            </Button>
            <Input
              value={url || ''}
              placeholder="Or paste direct video URL (.mp4)"
              onChange={(e) => setProp((props: any) => props.url = e.target.value)}
              className="h-8 text-xs bg-white border-dash-border mt-2"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              value={url || ''}
              placeholder={`Paste ${provider} URL...`}
              onChange={(e) => setProp((props: any) => props.url = e.target.value)}
              className="h-9 text-xs bg-white border-dash-border"
            />
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2 border-t border-dash-border">
        <Label className="text-xs font-bold !text-dash-textMuted block">Playback controls</Label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-dash-border bg-white hover:bg-dash-surface transition-colors motion-reduce:transition-none">
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setProp((props: any) => props.autoPlay = e.target.checked)}
              className="w-3 h-3 rounded-sm bg-white border-dash-border text-primary accent-primary"
            />
            <span className="text-[10px] font-bold !text-dash-textMuted">Autoplay</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-dash-border bg-white hover:bg-dash-surface transition-colors motion-reduce:transition-none">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setProp((props: any) => props.loop = e.target.checked)}
              className="w-3 h-3 rounded-sm bg-white border-dash-border text-primary accent-primary"
            />
            <span className="text-[10px] font-bold !text-dash-textMuted">Loop</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-dash-border bg-white hover:bg-dash-surface transition-colors motion-reduce:transition-none">
            <input
              type="checkbox"
              checked={muted}
              onChange={(e) => setProp((props: any) => props.muted = e.target.checked)}
              className="w-3 h-3 rounded-sm bg-white border-dash-border text-primary accent-primary"
            />
            <span className="text-[10px] font-bold !text-dash-textMuted">Muted</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-dash-border bg-white hover:bg-dash-surface transition-colors motion-reduce:transition-none">
            <input
              type="checkbox"
              checked={controls}
              onChange={(e) => setProp((props: any) => props.controls = e.target.checked)}
              className="w-3 h-3 rounded-sm bg-white border-dash-border text-primary accent-primary"
            />
            <span className="text-[10px] font-bold !text-dash-textMuted">Controls</span>
          </label>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-dash-border">
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
    </div>
  );
};
