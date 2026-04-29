"use client";

import React from 'react';
import { useNode } from '@craftjs/core';

import { ImageSettings } from './ImageSettings';

export interface ImageProps {
  src: string;
  alt: string;
  borderRadius: number;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
  width?: string;
  height?: string;
  shape?: 'square' | 'circle';
}

export const Image = (allProps: ImageProps & any) => {
  const { 
    src, 
    alt, 
    borderRadius, 
    objectFit, 
    width, 
    height, 
    shape = 'square', 
    dragRef, 
    ...props 
  } = allProps;
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
            connect(ref);
            drag(ref);
            if (dragRef) {
                if (typeof dragRef === 'function') dragRef(ref);
                else dragRef.current = ref;
            }
        }
      }}
      className={`relative justify-center flex outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all ${shape === 'circle' ? 'rounded-full aspect-square overflow-hidden' : ''} ${props.className || ''}`}
      style={{ width: width || '100%', height: shape === 'circle' ? (width || '100%') : (height || 'auto') }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: shape === 'circle' ? '50%' : `${borderRadius}px`,
          objectFit: shape === 'circle' ? 'cover' : objectFit,
        }}
        className="block"
      />
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
