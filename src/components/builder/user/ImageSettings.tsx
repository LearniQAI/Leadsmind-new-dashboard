"use client";

import React, { useRef, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Image as ImageIcon, AlertTriangle, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useBuilderImageUpload } from './useImageUpload';
import { MediaVaultModal } from '../MediaVaultModal';
import { SectionHeader, type Corners } from '../inspector/panelControls';
import { ShadowSection, BorderSection } from '../inspector/frameSections';
import { SEGMENT_WRAP, segmentBtn, FIELD_CLS, MICRO_LABEL } from '../inspector/panelTheme';

export const ImageSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));
  const {
    src, alt, objectFit, width, height, shape, align, decorative,
    boxShadow, borderRadius, borderRadiusIndividual, borderStyle, borderWidth, borderColor,
  } = props;

  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: string, value: any) => setProp((p: any) => { p[key] = value; });
  const del = (...keys: string[]) => setProp((p: any) => keys.forEach((k) => delete p[k]));

  const { upload, isUploading, accept } = useBuilderImageUpload((url) => set('src', url));

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  const missingAlt = !!src && !decorative && !(typeof alt === 'string' && alt.trim());

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
          <Label className={`${MICRO_LABEL} block`}>Image source</Label>
          <div className="flex gap-2">
            <input
              value={src || ''}
              placeholder="https://..."
              onChange={(e) => set('src', e.target.value)}
              className={`${FIELD_CLS} flex-1 font-mono`}
            />
            <input type="file" ref={fileInputRef} onChange={handleUpload} accept={accept} className="hidden" />
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 bg-slate-100 hover:bg-slate-200 border border-transparent text-slate-700 transition-colors motion-reduce:transition-none"
              onClick={() => setIsVaultOpen(true)}
              title="Browse Media Library"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 bg-slate-100 hover:bg-slate-200 border-none transition-colors motion-reduce:transition-none"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Direct File Upload"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-slate-500" /> : <Upload className="w-4 h-4 text-slate-500" />}
            </Button>
          </div>
        </div>

        {/* Alt text is prompted, not silently optional: an image with neither alt text nor the
            explicit "decorative" flag shows a warning here and a badge on the canvas. */}
        <div className="space-y-2">
          <Label htmlFor="image-alt-text" className={`${MICRO_LABEL} block`}>
            Alt text {!decorative && <span className="text-red-500">*</span>}
          </Label>
          <input
            id="image-alt-text"
            value={decorative ? '' : (alt || '')}
            placeholder={decorative ? 'Decorative — hidden from screen readers' : 'Describe what the image shows…'}
            disabled={!!decorative}
            aria-invalid={missingAlt}
            aria-describedby={missingAlt ? 'image-alt-text-hint' : undefined}
            onChange={(e) => set('alt', e.target.value)}
            className={`${FIELD_CLS} disabled:bg-slate-50 disabled:text-slate-400 ${missingAlt ? '!border-amber-400 focus:!ring-amber-100' : ''}`}
          />
          {missingAlt && (
            <p id="image-alt-text-hint" className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              Describe this image for students using screen readers, or mark it as decorative.
            </p>
          )}
          <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={!!decorative}
              onChange={(e) => (e.target.checked ? set('decorative', true) : del('decorative'))}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-900"
            />
            Decorative image (no alt text needed)
          </label>
        </div>

        <div className="space-y-2">
          <Label className={`${MICRO_LABEL} block`}>Alignment</Label>
          <div className={`${SEGMENT_WRAP} grid grid-cols-3`}>
            {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
              <button
                key={a}
                type="button"
                title={`Align ${a}`}
                aria-label={`Align ${a}`}
                onClick={() => set('align', a)}
                className={`${segmentBtn((align || 'left') === a)} flex items-center justify-center`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className={`${MICRO_LABEL} block`}>Size</Label>
          <div className={`${SEGMENT_WRAP} grid grid-cols-4`}>
            {([['100%', 'Full'], ['75%', '75%'], ['50%', '50%'], ['33%', '33%']] as const).map(([w, label]) => (
              <button
                key={w}
                type="button"
                onClick={() => set('width', w)}
                className={segmentBtn((width || '100%') === w)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className={`${MICRO_LABEL} block text-center`}>Width</Label>
            <input
              value={width || '100%'}
              onChange={(e) => set('width', e.target.value)}
              className={`${FIELD_CLS} text-center`}
            />
          </div>
          <div className="space-y-2">
            <Label className={`${MICRO_LABEL} block text-center`}>Height</Label>
            <input
              value={height || 'auto'}
              onChange={(e) => set('height', e.target.value)}
              className={`${FIELD_CLS} text-center`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className={`${MICRO_LABEL} block`}>Shape</Label>
          <div className={`${SEGMENT_WRAP} grid grid-cols-2`}>
            {['square', 'circle'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('shape', s)}
                className={segmentBtn(shape === s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className={`${MICRO_LABEL} block`}>Object fit</Label>
          <div className={`${SEGMENT_WRAP} grid grid-cols-4`}>
            {['cover', 'contain', 'fill', 'none'].map((fit) => (
              <button
                key={fit}
                type="button"
                onClick={() => set('objectFit', fit)}
                className={segmentBtn(objectFit === fit)}
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
