'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  popupType?: 'center' | 'fullscreen' | 'minimal';
}

export function PopupRenderer({ children, isOpen, onClose, popupType = 'center' }: Props) {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!render) return null;

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  const overlayOpacity = isOpen ? 1 : 0;
  const transform = isOpen ? 'scale(1)' : 'scale(0.95)';
  const translateY = isOpen ? 'translateY(0)' : 'translateY(10px)';
  const opacity = isOpen ? 1 : 0;

  const isFullscreen = popupType === 'fullscreen';
  const isMinimal = popupType === 'minimal';

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isMinimal ? 'transparent' : 'rgba(0,0,0,0.5)',
        backdropFilter: isMinimal ? 'none' : 'blur(4px)',
        opacity: overlayOpacity,
        transition: 'opacity 0.3s ease',
        padding: isFullscreen ? 0 : '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMinimal) onClose();
      }}
      onTransitionEnd={handleAnimationEnd}
    >
      <div
        style={{
          position: 'relative',
          width: isFullscreen ? '100%' : '100%',
          height: isFullscreen ? '100%' : 'auto',
          maxWidth: isFullscreen ? 'none' : (isMinimal ? 400 : 600),
          transform: isFullscreen ? translateY : transform,
          opacity: opacity,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
          boxSizing: 'border-box'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isFullscreen ? 16 : -40,
            right: isFullscreen ? 16 : 0,
            width: 32,
            height: 32,
            background: isFullscreen ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            zIndex: 10
          }}
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
