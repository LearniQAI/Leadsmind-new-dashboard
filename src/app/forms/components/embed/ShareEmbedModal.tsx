'use client';

import React, { useState } from 'react';
import { DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalDescription } from '@/components/dashboard-ui/Modal';
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

const platformRecommendations: Record<string, { mode: EmbedType; tip: string }> = {
  'WordPress': {
    mode: 'iframe',
    tip: 'WordPress setup: Add a "Custom HTML" block in the Block Editor (Gutenberg) or Elementor, then paste the iframe snippet below.',
  },
  'Webflow': {
    mode: 'iframe',
    tip: 'Webflow setup: Drag an "Embed" component from the Webflow Add panel, and paste the iframe snippet below.',
  },
  'Shopify': {
    mode: 'inline',
    tip: 'Shopify setup: In your Theme Editor, add a "Custom Liquid" or "Custom HTML" section and paste the inline script block below.',
  },
  'Wix': {
    mode: 'iframe',
    tip: 'Wix setup: Add an "HTML iframe" element from the Wix Embeds menu, click "Enter Code", and paste the iframe snippet below.',
  },
  'Squarespace': {
    mode: 'iframe',
    tip: 'Squarespace setup: Add a "Code" block to your page section, set the dropdown mode to "HTML", and paste the iframe snippet below.',
  },
  'Plain HTML': {
    mode: 'inline',
    tip: 'Static HTML setup: Paste the script block below into your HTML document where you want the form element to appear.',
  },
};

export function ShareEmbedModal({ form, open, onClose }: ShareEmbedModalProps) {
  const [embedMode, setEmbedMode] = useState<EmbedType>('iframe');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const isPublished = form.status === 'published';
  const publicUrl = `${APP_URL}/public/forms/${form.id}`;
  const workspaceId = form.workspace_id || '';

  // Generate clean, robust, IIFE-scoped scripts to avoid variable leaks and breaks
  const getEmbedSnippet = (): string => {
    switch (embedMode) {
      case 'iframe':
        return `<!-- LeadsMind Form: ${form.name} -->
<iframe
  src="${publicUrl}"
  style="width: 100%; height: 600px; border: none; background: transparent;"
  title="${form.name}"
  scrolling="no"
  allow="payment; camera; microphone"
></iframe>`;

      case 'inline':
        return `<!-- LeadsMind Form: ${form.name} -->
<div id="leadsmind-form-${form.id}"></div>
<script>
  (function() {
    var d = document, s = d.createElement('script');
    s.src = "${APP_URL}/embed/form.js";
    s.async = true;
    s.setAttribute('data-form-id', "${form.id}");
    s.setAttribute('data-workspace', "${workspaceId}");
    s.setAttribute('data-mode', "inline");
    d.body.appendChild(s);
  })();
</script>`;

      case 'popup':
        return `<!-- LeadsMind Form Trigger Button -->
<button id="leadsmind-popup-btn-${form.id}" style="background: #1359FF; color: #ffffff; padding: 12px 24px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: sans-serif; transition: background 0.2s;" onmouseover="this.style.background='#0f4bdb'" onmouseout="this.style.background='#1359FF'">
  Open Form
</button>

<!-- LeadsMind Form Script -->
<script>
  (function() {
    var d = document, s = d.createElement('script');
    s.src = "${APP_URL}/embed/form.js";
    s.async = true;
    s.setAttribute('data-form-id', "${form.id}");
    s.setAttribute('data-workspace', "${workspaceId}");
    s.setAttribute('data-mode', "popup");
    s.setAttribute('data-trigger', "leadsmind-popup-btn-${form.id}");
    d.body.appendChild(s);
  })();
</script>`;

      case 'fullpage':
        return `<!-- LeadsMind Form: ${form.name} Link Button -->
<a href="${publicUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #1359FF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: sans-serif; transition: background 0.2s;" onmouseover="this.style.background='#0f4bdb'" onmouseout="this.style.background='#1359FF'">
  Fill Out Form
</a>`;

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

  const handlePreview = () => {
    window.open(`${APP_URL}/forms/builder/${form.id}?mode=preview`, '_blank', 'noopener,noreferrer');
  };

  const handleSelectPlatform = (platform: string) => {
    setSelectedPlatform(platform);
    const recommendation = platformRecommendations[platform];
    if (recommendation) {
      setEmbedMode(recommendation.mode);
      toast.info(`Switched to recommended mode for ${platform}!`);
    }
  };

  return (
    <DashModal open={open} onOpenChange={onClose}>
      <DashModalContent className="!max-w-2xl w-[95vw] sm:w-full overflow-hidden flex flex-col gap-0 max-h-[92vh] p-6 sm:p-8">

        {/* Modal Header */}
        <DashModalHeader className="mb-6 border-b border-dash-border pb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-dash-accent/10 text-dash-accent">
              <Share2 size={16} />
            </div>
            <DashModalTitle>
              Share &amp; <span className="text-dash-accent">embed</span>
            </DashModalTitle>
          </div>
          <DashModalDescription>
            Form deployment: {form.name}
          </DashModalDescription>
        </DashModalHeader>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-3 flex flex-col gap-6 custom-scrollbar">

          {/* Publish gate warning */}
          {!isPublished && (
            <div className="flex items-start gap-3.5 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-amber-600 mb-0.5">
                  Form is not published
                </p>
                <p className="text-[11px] !text-dash-textMuted leading-relaxed">
                  Publish this form to activate live sharing. The links and embed codes below will render a temporary placeholder until the status is changed to Published.
                </p>
              </div>
            </div>
          )}

          {/* Group 1: Direct Share Link */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold !text-dash-textMuted">
              Step 1: Direct share
            </span>
            <PublicFormUrlCard publicUrl={publicUrl} />
          </div>

          {/* Group 2: Segmented Embed Options & Code Block */}
          <div className="flex flex-col gap-4 p-5 bg-dash-surface border border-dash-border rounded-2xl">
            <div className="flex flex-col gap-1 mb-1">
              <span className="text-[11px] font-bold !text-dash-textMuted">
                Step 2: Embed options
              </span>
              <p className="text-[11px] !text-dash-textMuted">
                Copy the code block below to embed this form directly on your page.
              </p>
            </div>

            <EmbedTypeSelector selected={embedMode} onChange={(mode) => {
              setEmbedMode(mode);
              setSelectedPlatform(null); // Clear active platform indicator if mode changed manually
            }} />

            {/* Custom Setup Instruction Tip */}
            {selectedPlatform && platformRecommendations[selectedPlatform] && (
              <div className="p-3.5 bg-dash-accent/5 border border-dash-accent/20 rounded-xl text-[11px] !text-dash-textMuted flex items-start gap-2 animate-in fade-in duration-200 motion-reduce:animate-none">
                <span className="font-bold text-dash-accent">Setup tip:</span>
                <span>{platformRecommendations[selectedPlatform].tip}</span>
              </div>
            )}

            <EmbedCodeBlock code={activeSnippet} />
          </div>

          {/* Group 3: Compatibility & Quick Deployment Actions */}
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-bold !text-dash-textMuted">
              Step 3: Deploy &amp; test
            </span>
            <PlatformCompatibilityGrid
              selectedPlatform={selectedPlatform}
              onSelectPlatform={handleSelectPlatform}
            />
            <ShareActionsBar
              onCopyUrl={handleCopyUrl}
              onCopyEmbed={handleCopyEmbed}
              onOpenUrl={handleOpenUrl}
              onPreview={handlePreview}
            />
          </div>
        </div>
      </DashModalContent>
    </DashModal>
  );
}
