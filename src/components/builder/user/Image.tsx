"use client";

import React, { useRef, useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { ImagePlus, Loader2, AlertTriangle } from 'lucide-react';

import { ImageSettings } from './ImageSettings';
import { useBuilderImageUpload } from './useImageUpload';
import { frameClassName, frameBorderStyle, stripFrameKeys } from '@/lib/builder/frameStyle';

export interface ImageProps {
 src: string;
 alt: string;
 borderRadius: number;
 objectFit: 'cover' | 'contain' | 'fill' | 'none';
 width?: string;
 height?: string;
 shape?: 'square' | 'circle';
 /** Horizontal placement when narrower than its parent. Unset = legacy (left) behaviour. */
 align?: 'left' | 'center' | 'right';
 /** Purely decorative image: rendered with alt="" so screen readers skip it. */
 decorative?: boolean;
 /** Part 4 — shared Shadow / Border frame. */
 boxShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
 borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
 borderWidth?: number;
 borderColor?: string;
 borderRadiusIndividual?: boolean;
}

export const alignMargins = (align?: string): React.CSSProperties =>
 align === 'center' ? { marginLeft: 'auto', marginRight: 'auto' }
 : align === 'right' ? { marginLeft: 'auto', marginRight: 0 }
 : align === 'left' ? { marginLeft: 0, marginRight: 'auto' }
 : {};

// Empty state (no src yet) — editor only. Click the button or drop an image file onto it.
// OS file drops are only intercepted when the drag actually carries Files, so Craft.js's own
// node drag/reorder over this box is untouched.
const ImagePlaceholder = () => {
 const { actions: { setProp } } = useNode();
 const { upload, isUploading, accept } = useBuilderImageUpload((url) => setProp((p: any) => { p.src = url; }));
 const inputRef = useRef<HTMLInputElement>(null);
 const [isDragOver, setIsDragOver] = useState(false);

 const carriesFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');

 return (
  <div
   onDragOver={(e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
   }}
   onDragLeave={() => setIsDragOver(false)}
   onDrop={(e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
   }}
   className={`w-full min-h-[180px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors motion-reduce:transition-none ${
    isDragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'
   }`}
  >
   {isUploading ? (
    <Loader2 className="w-7 h-7 text-slate-400 animate-spin motion-reduce:animate-none" />
   ) : (
    <ImagePlus className="w-7 h-7 text-slate-400" />
   )}
   <p className="text-[13px] font-medium text-slate-600">
    {isUploading ? 'Uploading…' : 'Click or drag an image here'}
   </p>
   {!isUploading && (
    <button
     type="button"
     onClick={() => inputRef.current?.click()}
     className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors motion-reduce:transition-none"
    >
     Upload image
    </button>
   )}
   <input
    ref={inputRef}
    type="file"
    accept={accept}
    className="hidden"
    onChange={(e) => {
     const file = e.target.files?.[0];
     if (file) upload(file);
     e.target.value = '';
    }}
   />
  </div>
 );
};

export const Image = (allProps: ImageProps & any) => {
 const {
  src,
  alt,
  borderRadius,
  objectFit,
  width,
  height,
  shape = 'square',
  align,
  decorative,
  dragRef,
  ...props
 } = allProps;
 const { connectors: { connect, drag } } = useNode();
 const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

 // Part 4 — shadow class on the wrapper, border + corner radius on the <img> (kept there to
 // match the element's existing behaviour). Circle shape still overrides both.
 const frameCls = frameClassName(allProps);
 const imgFrameStyle = shape === 'circle'
  ? { borderRadius: '50%', objectFit: 'cover' as const }
  : { ...frameBorderStyle(allProps), objectFit };
 stripFrameKeys(props);

 const hasSrc = typeof src === 'string' && src.trim() !== '';
 // A published page never shows the upload placeholder — an image with no source renders nothing.
 if (!hasSrc && !enabled) return null;
 const missingAlt = enabled && hasSrc && !decorative && !(typeof alt === 'string' && alt.trim());

 const refFn = (ref: HTMLDivElement | null) => {
  if (ref) {
    connect(ref);
    drag(ref);
    if (dragRef) {
      if (typeof dragRef === 'function') dragRef(ref);
      else dragRef.current = ref;
    }
  }
 };

 if (!hasSrc) {
  return (
   <div
    {...props}
    ref={refFn}
    className={`relative outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all ${props.className || ''}`}
    style={{ width: width || '100%', maxWidth: '100%', ...alignMargins(align) }}
   >
    <ImagePlaceholder />
   </div>
  );
 }

 return (
  <div
   {...props}
   ref={refFn}
   className={`relative justify-center flex outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all ${frameCls} ${shape === 'circle' ? 'rounded-full aspect-square overflow-hidden' : ''} ${props.className || ''}`}
   style={{ width: width || '100%', maxWidth: '100%', height: shape === 'circle' ? (width || '100%') : (height || 'auto'), ...alignMargins(align) }}
  >
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img
    src={src}
    alt={decorative ? '' : alt}
    style={{
     width: '100%',
     height: '100%',
     ...imgFrameStyle,
    }}
    className="block"
   />
   {missingAlt && (
    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 shadow-sm pointer-events-none">
     <AlertTriangle className="w-3 h-3" /> Missing alt text
    </span>
   )}
  </div>
 );
};

Image.craft = {
 displayName: 'Image',
 props: {
  src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
  alt: 'Placeholder Image',
  borderRadius: 16,
  objectFit: 'cover',
  shape: 'square',
 },
 related: {
  settings: ImageSettings,
 },
 rules: {
  canDrag: () => true,
 },
};
