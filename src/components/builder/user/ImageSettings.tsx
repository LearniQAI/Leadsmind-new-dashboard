"use client";

import React, { useRef, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveWorkspaceId } from '@/lib/workspace/activeWorkspaceClient';
import { toast } from 'sonner';
import { MediaVaultModal } from '../MediaVaultModal';
import { SectionHeader, type Corners } from '../inspector/panelControls';
import { ShadowSection, BorderSection } from '../inspector/frameSections';

export const ImageSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));
  const {
    src, alt, objectFit, width, height, shape,
    boxShadow, borderRadius, borderRadiusIndividual, borderStyle, borderWidth, borderColor,
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
      const filePath = `${getActiveWorkspaceId()}/builder/${fileName}`;
      const { error } = await supabase.storage.from('builder-media').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('builder-media').getPublicUrl(filePath);
      set('src', publicUrl);
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Failed to upload image. Please try again.');
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
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block">Image source</Label>
          <div className="flex gap-2">
            <Input
              value={src || ''}
              placeholder="https://..."
              onChange={(e) => set('src', e.target.value)}
              className="h-9 text-xs bg-white border-dash-border !text-dash-text flex-1"
            />
            <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
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
            onChange={(e) => set('alt', e.target.value)}
            className="h-8 text-xs bg-white border-dash-border !text-dash-text"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold !text-dash-textMuted block text-center">Width</Label>
            <Input
              value={width || '100%'}
              onChange={(e) => set('width', e.target.value)}
              className="h-8 text-xs text-center bg-white border-dash-border !text-dash-text"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold !text-dash-textMuted block text-center">Height</Label>
            <Input
              value={height || 'auto'}
              onChange={(e) => set('height', e.target.value)}
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
                onClick={() => set('shape', s)}
                className={`text-[10px] py-1.5 rounded capitalize font-bold transition-colors motion-reduce:transition-none ${
                  shape === s ? 'bg-primary text-white shadow' : '!text-dash-textMuted hover:!text-dash-text'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted">Object fit</Label>
          <div className="grid grid-cols-4 bg-dash-surface p-1 rounded-md border border-dash-border">
            {['cover', 'contain', 'fill', 'none'].map((fit) => (
              <button
                key={fit}
                onClick={() => set('objectFit', fit)}
                className={`text-[9px] py-1 rounded capitalize transition-colors motion-reduce:transition-none ${
                  objectFit === fit ? 'bg-purple-600 text-white font-bold shadow' : '!text-dash-textMuted hover:!text-dash-text'
                }`}
              >
                {fit}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ShadowSection
        value={boxShadow}
        onChange={(v) => (v === 'none' ? del('boxShadow') : set('boxShadow', v))}
        onReset={() => del('boxShadow')}
      />

      {shape !== 'circle' && (
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
      )}

      <MediaVaultModal isOpen={isVaultOpen} onOpenChange={setIsVaultOpen} onSelect={(u) => set('src', u)} />
    </div>
  );
};
