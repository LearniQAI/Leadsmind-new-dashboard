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
    <div className="bg-white border border-dash-border rounded-xl p-6 space-y-6 w-full">
      <div>
        <h3 className="text-[14px] font-semibold !text-dash-text mb-1">
          HTML code snippet
        </h3>
        <p className="text-[12px] !text-dash-textMuted">
          Copy and paste this script tag before the closing <code className="bg-dash-surface px-1.5 py-0.5 rounded !text-dash-text font-mono">&lt;/body&gt;</code> tag on your website.
        </p>
      </div>

      {/* Code Snippet Box */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-dash-surface p-3 rounded-lg border border-dash-border font-mono text-[12px] !text-dash-text w-full">
        <span className="flex-1 break-all select-all text-dash-accent px-1 font-mono">
          {scriptTag}
        </span>
        <button
          onClick={handleCopy}
          className="bg-dash-border/60 hover:bg-dash-border text-[11.5px] font-semibold rounded-lg px-4 py-2 !text-dash-text flex-shrink-0 transition-colors motion-reduce:transition-none w-full sm:w-auto"
        >
          {copied ? 'Copied tag' : 'Copy code'}
        </button>
      </div>

      <div className="border-t border-dash-border pt-5 space-y-4">
        <h4 className="text-[13px] font-semibold !text-dash-text">
          CMS & platform instructions
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-dash-surface border border-dash-border p-4 rounded-xl space-y-2">
            <span className="text-[12.5px] font-semibold !text-dash-text block">WordPress</span>
            <p className="text-[11.5px] !text-dash-textMuted leading-relaxed">
              Install the <strong>"Insert Headers and Footers"</strong> plugin. Navigate to Settings &rarr; Insert Headers and Footers, and paste the code into the <strong>Scripts in Footer</strong> block. Save changes.
            </p>
          </div>

          <div className="bg-dash-surface border border-dash-border p-4 rounded-xl space-y-2">
            <span className="text-[12.5px] font-semibold !text-dash-text block">Shopify</span>
            <p className="text-[11.5px] !text-dash-textMuted leading-relaxed">
              Go to Online Store &rarr; Themes &rarr; Edit Code. Select <code className="bg-dash-border/40 px-1 rounded font-mono">theme.liquid</code>. Scroll to the bottom, paste the code right above the <code className="bg-dash-border/40 px-1 rounded font-mono">&lt;/body&gt;</code> tag, and click Save.
            </p>
          </div>

          <div className="bg-dash-surface border border-dash-border p-4 rounded-xl space-y-2">
            <span className="text-[12.5px] font-semibold !text-dash-text block">Wix / Webflow</span>
            <p className="text-[11.5px] !text-dash-textMuted leading-relaxed">
              Navigate to custom code settings in Wix Custom Code or Webflow Page Settings. Choose <strong>Add Custom Code</strong>, paste the script snippet, select <strong>Body-End</strong> as position, and hit Apply/Publish.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
