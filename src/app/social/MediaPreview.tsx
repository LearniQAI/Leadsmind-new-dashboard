'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const VIDEO_RE = /\.(mp4|mov|webm)(\?|#|$)/i;

interface MediaPreviewProps {
 url: string;
 uploading?: boolean;
}

// Preview of the media attached to the composer, with explicit loading and error states — an
// attached URL that 404s, is private, or isn't an image used to show nothing at all.
export default function MediaPreview({ url, uploading = false }: MediaPreviewProps) {
 const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

 useEffect(() => { setState('loading'); }, [url]);

 if (uploading) {
  return (
   <div className="flex items-center gap-2 rounded-xl border border-dash-border px-3 py-6 text-[12px] !text-dash-textMuted">
    <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Uploading media…
   </div>
  );
 }
 if (!url.trim()) return null;

 const isVideo = VIDEO_RE.test(url);

 return (
  <div className="relative overflow-hidden rounded-xl border border-dash-border bg-dash-surface">
   {state === 'loading' && (
    <div className="absolute inset-0 flex items-center justify-center gap-2 text-[12px] !text-dash-textMuted">
     <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Loading preview…
    </div>
   )}
   {state === 'error' ? (
    <p role="alert" className="px-3 py-6 text-[12px] font-semibold !text-red-500">
     Couldn&apos;t load a preview for this media. Check the URL is public and points to an image or video.
    </p>
   ) : isVideo ? (
    <video
     key={url}
     src={url}
     controls
     preload="metadata"
     onLoadedMetadata={() => setState('ready')}
     onError={() => setState('error')}
     className="max-h-64 w-full object-contain"
    />
   ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
     key={url}
     src={url}
     alt="Attached media preview"
     onLoad={() => setState('ready')}
     onError={() => setState('error')}
     className="max-h-64 w-full object-contain min-h-[60px]"
    />
   )}
  </div>
 );
}
