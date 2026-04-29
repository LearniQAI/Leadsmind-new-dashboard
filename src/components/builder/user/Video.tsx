"use client";

import React from 'react';
import { useNode } from '@craftjs/core';

import { VideoSettings } from './VideoSettings';

export interface VideoProps {
  url: string;
  provider: 'youtube' | 'vimeo' | 'custom';
  autoPlay: boolean;
  controls: boolean;
  loop: boolean;
  muted: boolean;
  borderRadius: number;
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
        dragRef,
        ...props 
    } = allProps;
  const { connectors: { connect, drag } } = useNode();
  
  const getEmbedUrl = () => {
    if (provider === 'youtube') {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&controls=${controls ? 1 : 0}&loop=${loop ? 1 : 0}&mute=${muted ? 1 : 0}`;
    }
    if (provider === 'vimeo') {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}?autoplay=${autoPlay ? 1 : 0}&loop=${loop ? 1 : 0}&muted=${muted ? 1 : 0}`;
    }
    return url;
  };

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
      className={`w-full relative pt-[56.25%] overflow-hidden outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all ${props.className || ''}`}
      style={{
        borderRadius: `${borderRadius}px`,
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
        <iframe
          src={getEmbedUrl()}
          className="absolute top-0 left-0 w-full h-full border-none pointer-events-none" // pointer-events-none allows dragging
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
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
  },
  related: {
    settings: VideoSettings,
  },
  rules: {
    canDrag: () => true,
  },
};
