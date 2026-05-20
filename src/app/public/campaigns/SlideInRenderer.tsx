'use client';

import React, { useEffect, useState } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'side-panel';
}

export function SlideInRenderer({ children, isOpen, onClose, position = 'bottom-right' }: Props) {
  const [render, setRender] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  if (!render) return null;

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  const isLeft = position === 'bottom-left';
  const isSide = position === 'side-panel';

  let transform = 'translateY(120%)';
  if (isOpen) {
    transform = minimized ? 'translateY(calc(100% - 48px))' : 'translateY(0)';
  }
  if (isSide && isOpen) {
    transform = minimized ? 'translateX(calc(100% - 48px))' : 'translateX(0)';
  } else if (isSide) {
    transform = 'translateX(100%)';
  }

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 2147483647,
    transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    transform,
    boxSizing: 'border-box'
  };

  if (isSide) {
    Object.assign(baseStyle, {
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: 400,
      background: '#0a1024',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
    });
  } else {
    Object.assign(baseStyle, {
      bottom: 24,
      right: isLeft ? 'auto' : 24,
      left: isLeft ? 24 : 'auto',
      width: '100%',
      maxWidth: 400,
      borderRadius: 16,
      overflow: 'hidden'
    });
  }

  return (
    <div style={baseStyle} onTransitionEnd={handleAnimationEnd}>
      {/* Header for controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(12, 21, 53, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#eef2ff', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Space Grotesk, sans-serif' }}>
          Form
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setMinimized(!minimized)} style={iconBtnStyle}>
            {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button onClick={onClose} style={iconBtnStyle}>
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ padding: 0, opacity: minimized ? 0 : 1, transition: 'opacity 0.2s ease', pointerEvents: minimized ? 'none' : 'auto', maxHeight: isSide ? 'calc(100vh - 48px)' : '80vh', overflowY: 'auto' }} className="custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#94a3c8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center'
};
