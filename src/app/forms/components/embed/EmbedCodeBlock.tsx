'use client';

import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EmbedCodeBlockProps {
  code: string;
}

export function EmbedCodeBlock({ code }: EmbedCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast.success('Embed code snippet copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Syntax highlighter for rendering HTML and JS
  const getHighlightedCode = (rawCode: string) => {
    try {
      const escaped = rawCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return escaped
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-slate-500 font-medium">$1</span>') // HTML Comments
        .replace(/(&lt;\/?[a-zA-Z0-9\-]+)/g, '<span class="text-pink-400">$1</span>') // Tag names
        .replace(/(\s[a-zA-Z0-9\-]+)=/g, ' <span class="text-green-400">$1</span>=') // Attribute keys
        .replace(/(".*?")/g, '<span class="text-yellow-300">$1</span>') // String values
        .replace(/(&gt;)/g, '<span class="text-pink-400">$1</span>') // Bracket close
        .replace(/(async|defer)/g, '<span class="text-pink-400 font-italic">$1</span>') // Keywords
        .replace(/(script|iframe|div|button|a)/g, '<span class="text-pink-400">$1</span>'); // Tag names inside elements
    } catch {
      return rawCode;
    }
  };

  const highlighted = getHighlightedCode(code);

  return (
    <div className="flex flex-col gap-3">
      {/* Top Bar with Labels and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-dash-accent" />
          <span className="text-[11px] font-bold !text-dash-textMuted">
            Embed code snippet
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Expand/Collapse Trigger */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface transition-colors motion-reduce:transition-none border border-dash-border"
          >
            {expanded ? (
              <>
                Collapse <ChevronUp size={12} />
              </>
            ) : (
              <>
                Expand <ChevronDown size={12} />
              </>
            )}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors motion-reduce:transition-none border",
              copied
                ? 'bg-green/10 border-green/40 text-green'
                : 'bg-dash-accent hover:bg-dash-accent/90 border-dash-accent/20 text-white'
            )}
          >
            {copied ? (
              <>
                <Check size={12} /> Copied!
              </>
            ) : (
              <>
                <Copy size={12} /> Copy snippet
              </>
            )}
          </button>
        </div>
      </div>

      {/*
        Terminal/code-viewer block: intentionally kept dark regardless of
        dashboard theme, matching the standard code-editor convention (VS
        Code, GitHub, Stripe docs) — this is a code display, not dashboard
        chrome, and dark syntax highlighting is how code blocks are read.
      */}
      <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-[#0b1120] shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-semibold select-none">
            {code.includes('iframe') ? 'iframe.html' : 'embed.js'}
          </span>
          <div className="w-12" /> {/* Spacer */}
        </div>

        <div
          className={cn(
            "transition-all duration-300 motion-reduce:transition-none overflow-auto custom-scrollbar",
            expanded ? 'max-h-[350px]' : 'max-h-[130px]'
          )}
        >
          <pre className="p-5 text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre overflow-x-auto select-all">
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        </div>
      </div>
    </div>
  );
}
