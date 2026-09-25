"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';

import { VideoSettings } from './VideoSettings';
import {
  frameClassName, frameBorderStyle, stripFrameKeys, ASPECT_PADDING,
} from '@/lib/builder/frameStyle';
import { videoEmbedUrl } from '@/lib/video/embedUrl';

export interface VideoProps {
 url: string;
 provider: 'youtube' | 'vimeo' | 'custom';
 autoPlay: boolean;
 controls: boolean;
 loop: boolean;
 muted: boolean;
 borderRadius: number;
 /** Part 3 — '16:9' | '4:3' | '1:1' | '9:16' | '21:9' (default 16:9). */
 aspectRatio?: string;
 boxShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
 borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
 borderWidth?: number;
 borderColor?: string;
 borderRadiusIndividual?: boolean;
}

export const Video = (allProps: VideoProps & any) => {
  const {
    url,
    provider,
    autoPlay,
    controls,
    loop,
    muted,
    borderRadius,
    aspectRatio,
    dragRef,
    ...props
  } = allProps;
 const { connectors: { connect, drag } } = useNode();
 const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

 // Part 3 — Shadow / Border / Aspect-ratio frame. Compute from allProps, then strip the
 // frame keys so they don't land on the DOM node.
 const frameCls = frameClassName(allProps);
 const frameStyle = frameBorderStyle(allProps);
 const padTop = ASPECT_PADDING[aspectRatio as string] || '56.25%';
 stripFrameKeys(props);
 
 // YouTube/Vimeo: the link is parsed down to the video id (lib/video/embedUrl) and the embed URL
 // rebuilt from it, so share-link extras (`youtu.be/ID?si=...`) can't corrupt it; Loop sends the
 // playlist param YouTube needs, and Vimeo now receives Controls. null = not a video link.
 const embedUrl = provider === 'custom' ? null : videoEmbedUrl(provider === 'vimeo' ? 'vimeo' : 'youtube', url || '', { autoPlay, controls, loop, muted });
 if (provider !== 'custom' && !embedUrl && !enabled) return null; // live page: no broken empty frame

 return (
  <div
   {...props}
   ref={(ref) => {
    if (ref) {
      connect(drag(ref));
      if (dragRef) {
        if (typeof dragRef === 'function') dragRef(ref);
        else dragRef.current = ref;
      }
    }
   }}
   className={`w-full relative overflow-hidden outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all ${frameCls} ${props.className || ''}`}
   style={{
    paddingTop: padTop,
    ...frameStyle,
   }}
  >
   {provider === 'custom' ? (
    <video
     src={url}
     autoPlay={autoPlay}
     controls={controls}
     loop={loop}
     muted={muted}
     style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
   ) : (
    embedUrl ? (
     <iframe
      src={embedUrl}
      title={provider === 'vimeo' ? 'Vimeo video' : 'YouTube video'}
      // Editor only: the iframe would swallow the click/drag that selects and moves the block
      // (and start playback). On live pages it must receive clicks, or visitors can't press play.
      className={`absolute top-0 left-0 w-full h-full border-none ${enabled ? 'pointer-events-none' : ''}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
     />
    ) : (
     <div className="absolute inset-0 flex items-center justify-center bg-slate-100 px-4 text-center text-[12px] font-medium text-slate-500">
      Paste a valid {provider === 'vimeo' ? 'Vimeo' : 'YouTube'} video link in the settings panel.
     </div>
    )
   )}
  </div>
 );
};

Video.craft = {
 displayName: 'Video',
 props: {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  provider: 'youtube',
  autoPlay: false,
  controls: true,
  loop: false,
  muted: false,
  borderRadius: 16,
  aspectRatio: '16:9',
 },
 related: {
  settings: VideoSettings,
 },
 rules: {
  canDrag: () => true,
 },
};
