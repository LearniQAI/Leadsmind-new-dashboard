'use client';

import React from 'react';
import { Layout, Code2, MessageSquare, Maximize2 } from 'lucide-react';

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
      description: 'Opens form inside a premium lightbox triggered by clicking a custom button.',
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
      <label className="text-[10px] font-bold uppercase tracking-widest text-[#94a3c8] font-display">
        Select Embed &amp; Deployment Type
      </label>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-300 relative group overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-br from-[#2563eb]/10 to-[#3b82f6]/5 border-[#2563eb] shadow-[0_4px_20px_rgba(37,99,235,0.15)]'
                  : 'bg-[#080f28]/60 border-white/5 hover:border-white/15 hover:bg-[#0c1535]'
              }`}
            >
              {/* Highlight background dot for selected option */}
              {isSelected && (
                <div className="absolute right-0 top-0 w-8 h-8 bg-blue-500/20 rounded-bl-full pointer-events-none flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 mb-1.5 animate-pulse" />
                </div>
              )}

              {/* Icon Container */}
              <div
                className={`p-2.5 rounded-xl border transition-all duration-300 flex-shrink-0 ${
                  isSelected
                    ? 'bg-[#2563eb] text-white border-blue-500/20 shadow-md shadow-blue-500/20 scale-105'
                    : 'bg-white/5 text-[#94a3c8] border-white/5 group-hover:text-white group-hover:bg-white/10 group-hover:scale-105'
                }`}
              >
                {opt.icon}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 pr-2">
                <h4 className={`text-xs font-bold font-display tracking-wide mb-1 transition-colors ${
                  isSelected ? 'text-white' : 'text-[#eef2ff]'
                }`}>
                  {opt.title}
                </h4>
                <p className="text-[11px] text-[#94a3c8] leading-relaxed mb-3 font-sans font-normal opacity-85 group-hover:opacity-100 transition-opacity">
                  {opt.description}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-bold tracking-wider text-[#4a5a82] uppercase">
                    Compatible:
                  </span>
                  <span className={`text-[9px] font-semibold tracking-wide font-sans ${
                    isSelected ? 'text-blue-400' : 'text-[#94a3c8]/70'
                  }`}>
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
