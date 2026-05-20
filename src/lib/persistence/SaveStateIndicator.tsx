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
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />,
      className: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    },
    saved: {
      text: 'Progress saved',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    },
    error: {
      text: 'Auto-save failed',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
      className: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
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
