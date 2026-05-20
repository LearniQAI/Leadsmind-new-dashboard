'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

export function StickyBarRenderer({ children, isOpen, onClose, position = 'bottom' }: Props) {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  if (!render) return null;

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  const isTop = position === 'top';
  
  const transform = isOpen ? 'translateY(0)' : `translateY(${isTop ? '-100%' : '100%'})`;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 2147483647,
        left: 0,
        right: 0,
        top: isTop ? 0 : 'auto',
        bottom: !isTop ? 0 : 'auto',
        transform,
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        background: 'rgba(12, 21, 53, 0.98)',
        borderBottom: isTop ? '1px solid rgba(255,255,255,0.1)' : 'none',
        borderTop: !isTop ? '1px solid rgba(255,255,255,0.1)' : 'none',
        backdropFilter: 'blur(10px)',
        boxShadow: isTop ? '0 10px 30px -10px rgba(0,0,0,0.5)' : '0 -10px 30px -10px rgba(0,0,0,0.5)',
      }}
      onTransitionEnd={handleAnimationEnd}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94a3c8', cursor: 'pointer', padding: 8, marginLeft: 16 }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
