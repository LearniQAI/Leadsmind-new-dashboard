'use client';

import React, { useState, useEffect } from 'react';

interface EmbedTabProps {
  workspaceId: string;
}

export default function EmbedTab({ workspaceId }: EmbedTabProps) {
  const [copied, setCopied] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEmbedUrl(`${window.location.origin}/api/lena/embed/${workspaceId}`);
    }
  }, [workspaceId]);

  const scriptTag = `<script src="${embedUrl}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 space-y-6 w-full">
      <div>
        <h3 className="text-[14px] font-semibold text-[#eef2ff] mb-1 font-space-grotesk">
          HTML Code Snippet
        </h3>
        <p className="text-[12px] text-[#94a3c8] font-dm-sans">
          Copy and paste this script tag before the closing <code className="bg-white/5 px-1.5 py-0.5 rounded text-white font-mono">&lt;/body&gt;</code> tag on your website.
        </p>
      </div>

      {/* Code Snippet Box */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/5 font-mono text-[12px] text-white w-full">
        <span className="flex-1 break-all select-all text-[#3b82f6] px-1 font-mono">
          {scriptTag}
        </span>
        <button
          onClick={handleCopy}
          className="bg-white/10 hover:bg-white/20 text-[11.5px] font-semibold rounded-lg px-4 py-2 text-white flex-shrink-0 transition-colors w-full sm:w-auto"
        >
          {copied ? 'Copied Tag!' : 'Copy Code'}
        </button>
      </div>

      <div className="border-t border-white/5 pt-5 space-y-4">
        <h4 className="text-[13px] font-semibold text-[#eef2ff] font-space-grotesk">
          CMS & Platform Instructions
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl space-y-2">
            <span className="text-[12.5px] font-semibold text-white block">WordPress</span>
            <p className="text-[11.5px] text-[#94a3c8] leading-relaxed font-dm-sans">
              Install the <strong>"Insert Headers and Footers"</strong> plugin. Navigate to Settings &rarr; Insert Headers and Footers, and paste the code into the <strong>Scripts in Footer</strong> block. Save changes.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl space-y-2">
            <span className="text-[12.5px] font-semibold text-white block">Shopify</span>
            <p className="text-[11.5px] text-[#94a3c8] leading-relaxed font-dm-sans">
              Go to Online Store &rarr; Themes &rarr; Edit Code. Select <code className="bg-white/5 px-1 rounded font-mono">theme.liquid</code>. Scroll to the bottom, paste the code right above the <code className="bg-white/5 px-1 rounded font-mono">&lt;/body&gt;</code> tag, and click Save.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl space-y-2">
            <span className="text-[12.5px] font-semibold text-white block">Wix / Webflow</span>
            <p className="text-[11.5px] text-[#94a3c8] leading-relaxed font-dm-sans">
              Navigate to custom code settings in Wix Custom Code or Webflow Page Settings. Choose <strong>Add Custom Code</strong>, paste the script snippet, select <strong>Body-End</strong> as position, and hit Apply/Publish.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
