"use client";

import React, { useRef, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Upload, Loader2, FolderOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveWorkspaceId } from '@/lib/workspace/activeWorkspaceClient';
import { toast } from 'sonner';
import { PropertySelect } from '../inspector/primitives';
import { FIELD_CLS } from '../inspector/panelTheme';
import { SectionHeader, BooleanSelect, type Corners } from '../inspector/panelControls';
import { ShadowSection, BorderSection } from '../inspector/frameSections';
import { MediaVaultModal } from '../MediaVaultModal';
import { ASPECT_OPTIONS } from '@/lib/builder/frameStyle';

const VIDEO_TYPE_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'custom', label: 'Direct link / upload' },
];

export const VideoSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));
  const {
    url, provider, autoPlay, controls, loop, muted,
    aspectRatio, boxShadow, borderRadius, borderRadiusIndividual, borderStyle, borderWidth, borderColor,
  } = props;

  const [isUploading, setIsUploading] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: string, value: any) => setProp((p: any) => { p[key] = value; });
  const del = (...keys: string[]) => setProp((p: any) => keys.forEach((k) => delete p[k]));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
      const filePath = `${getActiveWorkspaceId()}/builder/videos/${fileName}`;
      const { error } = await supabase.storage.from('builder-media').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('builder-media').getPublicUrl(filePath);
      setProp((p: any) => { p.url = publicUrl; p.provider = 'custom'; });
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const radiusMode: 'uniform' | 'individual' = borderRadiusIndividual ? 'individual' : 'uniform';
  const corners: Partial<Corners> = {
    tl: props.borderTopLeftRadius ?? '',
    tr: props.borderTopRightRadius ?? '',
    br: props.borderBottomRightRadius ?? '',
    bl: props.borderBottomLeftRadius ?? '',
  };

  return (
    <div className="space-y-6">
      {/* Video */}
      <div className="space-y-3">
        <SectionHeader
          title="Video"
          onReset={() => setProp((p: any) => { p.provider = 'youtube'; p.aspectRatio = '16:9'; })}
        />

        <PropertySelect
          label="Video type"
          value={provider || 'youtube'}
          options={VIDEO_TYPE_OPTIONS}
          onChange={(v) => set('provider', v)}
        />

        <button
          type="button"
          className="w-full h-9 rounded-lg bg-dash-accent/10 hover:bg-dash-accent/15 border border-dash-accent/25 text-dash-accent text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all duration-150 motion-reduce:transition-none active:scale-[0.99] motion-reduce:active:scale-100"
          onClick={() => setIsVaultOpen(true)}
        >
          <FolderOpen className="w-4 h-4" />
          Media library
        </button>

        {provider === 'custom' ? (
          <div className="space-y-2">
            <input type="file" ref={fileInputRef} onChange={handleUpload} accept="video/*" className="hidden" />
            <button
              type="button"
              className="w-full h-20 rounded-xl border-2 border-dashed border-dash-border bg-dash-surface/40 hover:border-dash-accent/40 hover:bg-dash-accent/5 flex flex-col items-center justify-center gap-2 transition-all duration-150 motion-reduce:transition-none disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none text-dash-accent" />
              ) : (
                <>
                  <Upload className="w-5 h-5 !text-dash-textMuted" />
                  <span className="text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted">Upload MP4</span>
                </>
              )}
            </button>
            <input
              value={url || ''}
              placeholder="Or paste direct video URL (.mp4)"
              onChange={(e) => set('url', e.target.value)}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
        ) : (
          <input
            value={url || ''}
            placeholder={`Paste ${provider} URL...`}
            onChange={(e) => set('url', e.target.value)}
            className={`${FIELD_CLS} font-mono`}
          />
        )}

        <PropertySelect
          label="Aspect ratio"
          value={aspectRatio || '16:9'}
          options={ASPECT_OPTIONS}
          onChange={(v) => set('aspectRatio', v)}
        />
      </div>

      {/* Playback */}
      <div className="space-y-3">
        <SectionHeader
          title="Playback"
          onReset={() => setProp((p: any) => { p.autoPlay = false; p.loop = false; p.muted = false; p.controls = true; })}
        />
        <BooleanSelect label="Auto play" value={!!autoPlay} onChange={(v) => set('autoPlay', v)} />
        <BooleanSelect label="Loop" value={!!loop} onChange={(v) => set('loop', v)} />
        <BooleanSelect label="Muted" value={!!muted} onChange={(v) => set('muted', v)} />
        <BooleanSelect label="Controls" value={controls === undefined ? true : !!controls} onChange={(v) => set('controls', v)} />
      </div>

      <ShadowSection
        value={boxShadow}
        onChange={(v) => (v === 'none' ? del('boxShadow') : set('boxShadow', v))}
        onReset={() => del('boxShadow')}
      />

      <BorderSection
        radiusMode={radiusMode}
        onRadiusModeChange={(m) => set('borderRadiusIndividual', m === 'individual')}
        uniformRadius={borderRadius ?? ''}
        corners={corners}
        onUniformRadius={(v) => set('borderRadius', v === '' ? undefined : Number(v))}
        onCorner={(c, v) => set(
          { tl: 'borderTopLeftRadius', tr: 'borderTopRightRadius', br: 'borderBottomRightRadius', bl: 'borderBottomLeftRadius' }[c],
          v === '' ? undefined : Number(v),
        )}
        style={borderStyle}
        width={borderWidth}
        color={borderColor}
        onStyle={(v) => (v === 'none' ? del('borderStyle') : set('borderStyle', v))}
        onWidth={(v) => set('borderWidth', v)}
        onColor={(v) => set('borderColor', v)}
        onReset={() => {
          setProp((p: any) => { p.borderRadius = 16; });
          del('borderRadiusIndividual', 'borderTopLeftRadius', 'borderTopRightRadius',
            'borderBottomRightRadius', 'borderBottomLeftRadius', 'borderStyle', 'borderWidth', 'borderColor');
        }}
      />

      <MediaVaultModal
        isOpen={isVaultOpen}
        onOpenChange={setIsVaultOpen}
        onSelect={(mediaUrl) => setProp((p: any) => { p.url = mediaUrl; p.provider = 'custom'; })}
      />
    </div>
  );
};
