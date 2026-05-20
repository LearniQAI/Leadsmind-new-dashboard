'use client';

import React from 'react';
import { Copy, Code, ExternalLink, Play } from 'lucide-react';

interface ShareActionsBarProps {
  onCopyUrl: () => void;
  onCopyEmbed: () => void;
  onOpenUrl: () => void;
  onPreview: () => void;
}

export function ShareActionsBar({
  onCopyUrl,
  onCopyEmbed,
  onOpenUrl,
  onPreview,
}: ShareActionsBarProps) {
  const actions = [
    {
      label: 'Copy URL',
      icon: <Copy size={13} />,
      onClick: onCopyUrl,
      primary: false,
    },
    {
      label: 'Copy Embed',
      icon: <Code size={13} />,
      onClick: onCopyEmbed,
      primary: false,
    },
    {
      label: 'Open Form',
      icon: <ExternalLink size={13} />,
      onClick: onOpenUrl,
      primary: false,
    },
    {
      label: 'Preview Live',
      icon: <Play size={13} className="fill-current" />,
      onClick: onPreview,
      primary: true,
    },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-[#94a3c8] font-display">
        Quick Deployment Actions
      </label>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map((act) => (
          <button
            key={act.label}
            onClick={act.onClick}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-bold tracking-wide transition-all duration-300 ${
              act.primary
                ? 'bg-blue-600 border-blue-500/20 text-white hover:bg-blue-700 hover:border-blue-600/30 hover:shadow-[0_0_15px_rgba(37,99,235,0.25)] shadow-md shadow-blue-500/10'
                : 'bg-[#0c1535]/80 hover:bg-[#111d47] border-white/5 hover:border-white/10 text-[#94a3c8] hover:text-white'
            }`}
          >
            <span className="flex-shrink-0">{act.icon}</span>
            <span className="font-display tracking-wide uppercase text-[10px]">{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
