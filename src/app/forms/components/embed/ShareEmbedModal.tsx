'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { PublicFormUrlCard } from './PublicFormUrlCard';
import { EmbedTypeSelector, EmbedType } from './EmbedTypeSelector';
import { EmbedCodeBlock } from './EmbedCodeBlock';
import { PlatformCompatibilityGrid } from './PlatformCompatibilityGrid';
import { ShareActionsBar } from './ShareActionsBar';

interface ShareEmbedModalProps {
  form: {
    id: string;
    name: string;
    status: string;
    workspace_id?: string;
  };
  open: boolean;
  onClose: () => void;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadsmind.io';

export function ShareEmbedModal({ form, open, onClose }: ShareEmbedModalProps) {
  const [embedMode, setEmbedMode] = useState<EmbedType>('iframe');

  const isPublished = form.status === 'published';
  const publicUrl = `${APP_URL}/public/forms/${form.id}`;
  const workspaceId = form.workspace_id || '';

  // Generate appropriate embed code snippet based on selected mode
  const getEmbedSnippet = (): string => {
    switch (embedMode) {
      case 'iframe':
        return `<!-- LeadsMind Form: ${form.name} -->
<iframe src="${publicUrl}" style="width: 100%; height: 600px; border: none; background: transparent;" title="${form.name}"></iframe>`;
      
      case 'inline':
        return `<!-- LeadsMind Form: ${form.name} -->
<div id="leadsmind-form-${form.id}"></div>
<script src="${APP_URL}/embed/form.js" data-form-id="${form.id}" data-workspace="${workspaceId}" data-mode="inline" async></script>`;

      case 'popup':
        return `<!-- LeadsMind Form: ${form.name} Trigger Button -->
<button id="leadsmind-popup-btn-${form.id}" style="background: #2563eb; color: #ffffff; padding: 10px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Open Form</button>

<!-- LeadsMind Form Script -->
<script src="${APP_URL}/embed/form.js" data-form-id="${form.id}" data-workspace="${workspaceId}" data-mode="popup" data-trigger="leadsmind-popup-btn-${form.id}" async></script>`;

      case 'fullpage':
        return `<!-- LeadsMind Form: ${form.name} Link Button -->
<a href="${publicUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Fill Out Form</a>`;
      
      default:
        return '';
    }
  };

  const activeSnippet = getEmbedSnippet();

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      toast.success('Public URL copied to clipboard!');
    });
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(activeSnippet).then(() => {
      toast.success('Embed code snippet copied to clipboard!');
    });
  };

  const handleOpenUrl = () => {
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#080f28] border border-white/10 rounded-[20px] !max-w-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[95vw] sm:w-full overflow-hidden flex flex-col gap-0 max-h-[92vh] focus-visible:outline-none">
        
        {/* Modal Header */}
        <DialogHeader className="mb-6 border-b border-white/5 pb-4 relative">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Share2 size={16} />
            </div>
            <DialogTitle className="text-xl font-bold uppercase text-white tracking-wider font-display">
              Share &amp; <span className="text-[#3b82f6]">Embed</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] uppercase tracking-widest text-[#4a5a82] font-sans font-bold">
            Form Deployment: {form.name}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Container with cleaner spacing rhythm */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-3 flex flex-col gap-6 custom-scrollbar">
          
          {/* Publish gate warning - Re-styled to match premium alert standards */}
          {!isPublished && (
            <div className="flex items-start gap-3.5 p-4 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-2xl bg-gradient-to-r from-amber-500/5 to-transparent shadow-[0_4px_20px_rgba(245,158,11,0.05)] transition-all">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-0.5 font-display">
                  Form is not published
                </p>
                <p className="text-[10.5px] text-[#94a3c8] font-sans leading-relaxed">
                  Publish this form to activate live sharing. The links and embed codes below will render a temporary placeholder until the status is changed to Published.
                </p>
              </div>
            </div>
          )}

          {/* Group 1: Direct Share Link */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-sans">
              Step 1: Direct Share
            </span>
            <PublicFormUrlCard publicUrl={publicUrl} />
          </div>

          {/* Group 2: Segmented Embed Options & Code Block (Developer Integration Suite) */}
          <div className="flex flex-col gap-4 p-5 bg-white/[0.01] border border-white/5 rounded-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="flex flex-col gap-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-sans">
                Step 2: Embed Options
              </span>
              <p className="text-[10px] text-[#4a5a82] font-sans">
                Copy the code block below to embed this form directly on your page.
              </p>
            </div>
            
            <EmbedTypeSelector selected={embedMode} onChange={setEmbedMode} />
            <EmbedCodeBlock code={activeSnippet} />
          </div>

          {/* Group 3: Compatibility & Quick Deployment Actions */}
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-sans">
              Step 3: Deploy &amp; Test
            </span>
            <PlatformCompatibilityGrid />
            <ShareActionsBar
              onCopyUrl={handleCopyUrl}
              onCopyEmbed={handleCopyEmbed}
              onOpenUrl={handleOpenUrl}
              onPreview={handleOpenUrl}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
