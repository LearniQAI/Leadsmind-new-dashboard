'use client';

import React from 'react';
import { SaveState } from './PersistenceEngine';
import { Cloud, CloudLightning, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SaveStateIndicatorProps {
  state: SaveState;
}

export function SaveStateIndicator({ state }: SaveStateIndicatorProps) {
  if (state === 'idle') return null;

  const config = {
    saving: {
      text: 'Saving progress...',
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />,
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    saved: {
      text: 'Progress saved',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    error: {
      text: 'Auto-save failed',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  }[state] || {
    text: '',
    icon: null,
    className: '',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider font-space-grotesk shadow-lg backdrop-blur-md transition-all duration-300 ${config.className}`}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}
