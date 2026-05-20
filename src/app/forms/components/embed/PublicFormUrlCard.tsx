'use client';

import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface PublicFormUrlCardProps {
  publicUrl: string;
}

export function PublicFormUrlCard({ publicUrl }: PublicFormUrlCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      toast.success('Public URL copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group overflow-hidden bg-gradient-to-br from-[#0c1535] to-[#080f28] border border-white/10 hover:border-blue-500/40 rounded-2xl p-5 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
      {/* Decorative premium corner glow */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/20 via-blue-500/60 to-blue-500/20 opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3c8] font-display">
              Production Share URL
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold tracking-wider font-sans">
              Live &amp; Ready
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Monospace URL Card Styling */}
          <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-black/40 border border-white/5 hover:border-white/10 rounded-xl overflow-hidden focus-within:border-blue-500/50 transition-all shadow-inner group/url">
            <Globe size={14} className="text-blue-400 flex-shrink-0 group-hover/url:scale-110 transition-transform" />
            <span className="text-xs font-mono text-blue-300 select-all truncate tracking-tight selection:bg-blue-500/30">
              {publicUrl}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:flex-shrink-0">
            {/* Copy Button with success feedback */}
            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-bold text-xs transition-all duration-300 ${
                copied
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-[#94a3c8] hover:text-white shadow-sm'
              }`}
              title="Copy public URL"
            >
              {copied ? (
                <>
                  <Check size={14} className="animate-scale-in" />
                  <span className="font-display tracking-wide uppercase text-[10px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span className="font-display tracking-wide uppercase text-[10px]">Copy URL</span>
                </>
              )}
            </button>
            
            {/* Open in New Tab Button */}
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all text-[#94a3c8] hover:text-white shadow-sm"
              title="Open URL in new tab"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
