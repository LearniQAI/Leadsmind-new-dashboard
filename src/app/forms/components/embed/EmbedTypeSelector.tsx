'use client';

import React from 'react';
import { Layout, Code2, MessageSquare, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EmbedType = 'iframe' | 'inline' | 'popup' | 'fullpage';

interface EmbedOption {
  id: EmbedType;
  title: string;
  description: string;
  compatibility: string;
  icon: React.ReactNode;
}

interface EmbedTypeSelectorProps {
  selected: EmbedType;
  onChange: (type: EmbedType) => void;
}

export function EmbedTypeSelector({ selected, onChange }: EmbedTypeSelectorProps) {
  const options: EmbedOption[] = [
    {
      id: 'iframe',
      title: 'iFrame Embed',
      description: 'Fully isolated & secure container. Resolves CSS clashes with the host page.',
      compatibility: 'WordPress, Webflow, HTML',
      icon: <Layout size={16} />,
    },
    {
      id: 'inline',
      title: 'Native JS Embed',
      description: 'Injects directly into host DOM. Optimal for site performance and CSS styling.',
      compatibility: 'Shopify, Custom Apps, HTML',
      icon: <Code2 size={16} />,
    },
    {
      id: 'popup',
      title: 'Popup Embed',
      description: 'Opens form inside a lightbox triggered by clicking a custom button.',
      compatibility: 'Landing Pages, WordPress',
      icon: <MessageSquare size={16} />,
    },
    {
      id: 'fullpage',
      title: 'Full Page Embed',
      description: 'Renders as a standalone action button that redirects users to the form.',
      compatibility: 'Any Site, Email Links',
      icon: <Maximize2 size={16} />,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <label className="text-[11px] font-bold !text-dash-textMuted">
        Select embed &amp; deployment type
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border text-left transition-colors motion-reduce:transition-none relative group overflow-hidden",
                isSelected
                  ? 'bg-dash-accent/5 border-dash-accent'
                  : 'bg-white border-dash-border hover:border-dash-text/20'
              )}
            >
              {isSelected && (
                <div className="absolute right-0 top-0 w-8 h-8 bg-dash-accent/10 rounded-bl-full pointer-events-none flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-dash-accent mr-1.5 mb-1.5 animate-pulse motion-reduce:animate-none" />
                </div>
              )}

              <div
                className={cn(
                  "p-2.5 rounded-xl border transition-colors motion-reduce:transition-none flex-shrink-0",
                  isSelected
                    ? 'bg-dash-accent text-white border-dash-accent/20'
                    : 'bg-dash-surface !text-dash-textMuted border-dash-border group-hover:!text-dash-text'
                )}
              >
                {opt.icon}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-xs font-bold !text-dash-text mb-1">
                  {opt.title}
                </h4>
                <p className="text-[11px] !text-dash-textMuted leading-relaxed mb-3">
                  {opt.description}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-bold !text-dash-textMuted">
                    Compatible:
                  </span>
                  <span className={cn("text-[10px] font-semibold", isSelected ? "text-dash-accent" : "!text-dash-textMuted")}>
                    {opt.compatibility}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
