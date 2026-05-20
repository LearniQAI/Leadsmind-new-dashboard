'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Code2, Globe, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EmbedModalProps {
  form: {
    id: string;
    name: string;
    status: string;
    workspace_id?: string;
  };
  open: boolean;
  onClose: () => void;
}

type EmbedMode = 'inline' | 'iframe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadsmind.io';

export function EmbedModal({ form, open, onClose }: EmbedModalProps) {
  const [embedMode, setEmbedMode] = useState<EmbedMode>('iframe');
  const [copied, setCopied] = useState(false);

  const isPublished = form.status === 'published';
  const publicUrl = `${APP_URL}/public/forms/${form.id}`;
  const workspaceId = form.workspace_id || '';

  const inlineSnippet = `<!-- LeadsMind Form: ${form.name} -->
<div id="leadsmind-form-${form.id}"></div>
<script src="${APP_URL}/embed/form.js" data-form-id="${form.id}" data-workspace="${workspaceId}" data-mode="inline" async></script>`;

  const iframeSnippet = `<!-- LeadsMind Form: ${form.name} -->
<iframe src="${publicUrl}" style="width: 100%; height: 600px; border: none; background: transparent;" title="${form.name}"></iframe>`;

  const activeSnippet = embedMode === 'inline' ? inlineSnippet : iframeSnippet;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#080f28] border border-white/10 rounded-3xl max-w-xl p-8 shadow-2xl">
        <DialogHeader className="mb-6 border-b border-white/5 pb-4">
          <DialogTitle className="text-xl font-black uppercase text-white tracking-widest font-space-grotesk">
            Share &amp; <span className="text-[#2563eb]">Embed</span>
          </DialogTitle>
          <p className="text-[10px] uppercase tracking-widest text-[#4a5a82] font-dm-sans mt-1">
            {form.name}
          </p>
        </DialogHeader>

        {/* Publish gate warning */}
        {!isPublished && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl mb-6">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-500 mb-1">Form is not published</p>
              <p className="text-[11px] text-amber-500/70 font-dm-sans">Publish this form first to make the embed snippet work publicly. The snippet below will work once the form is set to Published.</p>
            </div>
          </div>
        )}

        {/* Public URL */}
        <div className="mb-6">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3c8] mb-2 block">
            Public Form URL
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white/3 border border-white/8 rounded-xl overflow-hidden">
              <Globe size={12} className="text-[#4a5a82] flex-shrink-0" />
              <span className="text-[11px] text-[#94a3c8] font-dm-sans truncate">{publicUrl}</span>
            </div>
            <button
              onClick={() => handleCopy(publicUrl)}
              className="px-3 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
              title="Copy URL"
            >
              <Copy size={13} />
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
              title="Open in new tab"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Embed Type Selector */}
        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3c8] mb-3 block">
            Embed Type
          </label>
          <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              onClick={() => setEmbedMode('iframe')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                embedMode === 'iframe'
                  ? 'bg-[#2563eb] text-white shadow-md shadow-blue-600/20'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Globe size={11} /> iFrame (Recommended)
            </button>
            <button
              onClick={() => setEmbedMode('inline')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                embedMode === 'inline'
                  ? 'bg-[#2563eb] text-white shadow-md shadow-blue-600/20'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Code2 size={11} /> Inline Script
            </button>
          </div>

          <p className="text-[11px] text-[#4a5a82] font-dm-sans mt-3 leading-relaxed">
            {embedMode === 'iframe'
              ? 'iFrame is the safest option — fully isolated from host styles, works on any platform including Webflow, Shopify, and WordPress.'
              : 'Inline rendering merges into the host page DOM — best for style consistency, but can conflict with host CSS on some platforms.'}
          </p>
        </div>

        {/* Embed Code Snippet */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3c8]">
              Embed Code Snippet
            </label>
            <button
              onClick={() => handleCopy(activeSnippet)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                copied
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy Code</>}
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 bg-[#04081a] border border-white/8 rounded-2xl text-[11px] text-[#94a3c8] font-mono overflow-x-auto leading-relaxed custom-scrollbar whitespace-pre">
              {activeSnippet}
            </pre>
          </div>
        </div>

        {/* Platform Hints */}
        <div className="mt-5 p-4 bg-white/2 border border-white/5 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82] mb-2">Compatible Platforms</p>
          <div className="flex flex-wrap gap-2">
            {['WordPress', 'Webflow', 'Shopify', 'Wix', 'Squarespace', 'Plain HTML'].map(p => (
              <span key={p} className="px-2 py-1 bg-white/3 border border-white/5 rounded-lg text-[9px] font-bold text-white/40 uppercase tracking-wider">
                {p}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
