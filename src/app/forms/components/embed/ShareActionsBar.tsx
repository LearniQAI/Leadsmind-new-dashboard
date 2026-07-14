'use client';

import React from 'react';
import { Copy, Code, ExternalLink, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      label: 'Copy embed',
      icon: <Code size={13} />,
      onClick: onCopyEmbed,
      primary: false,
    },
    {
      label: 'Open form',
      icon: <ExternalLink size={13} />,
      onClick: onOpenUrl,
      primary: false,
    },
    {
      label: 'Preview live',
      icon: <Play size={13} className="fill-current" />,
      onClick: onPreview,
      primary: true,
    },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-[11px] font-bold !text-dash-textMuted">
        Quick deployment actions
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map((act) => (
          <button
            key={act.label}
            onClick={act.onClick}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-bold tracking-wide transition-colors motion-reduce:transition-none",
              act.primary
                ? 'bg-dash-accent border-dash-accent/20 text-white hover:bg-dash-accent/90'
                : 'bg-white hover:bg-dash-surface border-dash-border !text-dash-textMuted hover:!text-dash-text'
            )}
          >
            <span className="flex-shrink-0">{act.icon}</span>
            <span className="tracking-wide uppercase text-[10px]">{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
