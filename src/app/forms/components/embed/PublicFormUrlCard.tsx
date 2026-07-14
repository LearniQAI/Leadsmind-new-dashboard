'use client';

import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
    <div className="bg-dash-surface border border-dash-border rounded-2xl p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green"></span>
            </div>
            <span className="text-[11px] font-bold !text-dash-textMuted">
              Production share URL
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-green/10 text-green px-2.5 py-0.5 rounded-full border border-green/20 font-bold">
              Live &amp; ready
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white border border-dash-border hover:border-dash-text/20 rounded-xl overflow-hidden focus-within:border-dash-accent transition-colors motion-reduce:transition-none">
            <Globe size={14} className="text-dash-accent shrink-0" />
            <span className="text-xs font-mono text-dash-accent select-all truncate">
              {publicUrl}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <button
              onClick={handleCopy}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-bold text-xs transition-colors motion-reduce:transition-none",
                copied
                  ? 'bg-green/10 border-green/40 text-green'
                  : 'bg-white hover:bg-dash-surface border-dash-border !text-dash-textMuted hover:!text-dash-text'
              )}
              title="Copy public URL"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span className="tracking-wide uppercase text-[10px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span className="tracking-wide uppercase text-[10px]">Copy URL</span>
                </>
              )}
            </button>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-3 bg-white hover:bg-dash-surface border border-dash-border rounded-xl transition-colors motion-reduce:transition-none !text-dash-textMuted hover:!text-dash-text"
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
