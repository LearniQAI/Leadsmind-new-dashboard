'use client';

import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { toast } from 'sonner';

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
        .replace(/(&lt;!--.*?--&gt;)/gs, '<span class="text-[#4a5a82] font-medium">$1</span>') // HTML Comments
        .replace(/(&lt;\/?[a-zA-Z0-9\-]+)/g, '<span class="text-[#ff79c6]">$1</span>') // Tag names
        .replace(/(\s[a-zA-Z0-9\-]+)=/g, ' <span class="text-[#50fa7b]">$1</span>=') // Attribute keys
        .replace(/(".*?")/g, '<span class="text-[#f1fa8c]">$1</span>') // String values
        .replace(/(&gt;)/g, '<span class="text-[#ff79c6]">$1</span>') // Bracket close
        .replace(/(async|defer)/g, '<span class="text-[#ff79c6] font-italic">$1</span>') // Keywords
        .replace(/(script|iframe|div|button|a)/g, '<span class="text-[#ff79c6]">$1</span>'); // Tag names inside elements
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
          <Terminal size={14} className="text-blue-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3c8] font-display">
            Embed Code Snippet
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Expand/Collapse Trigger */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-[#94a3c8] hover:text-white hover:bg-white/5 transition-all border border-white/5 hover:border-white/10"
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
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${
              copied
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-blue-600 hover:bg-blue-700 border-blue-500/20 text-white shadow-md shadow-blue-500/10'
            }`}
          >
            {copied ? (
              <>
                <Check size={12} className="animate-scale-in" /> Copied!
              </>
            ) : (
              <>
                <Copy size={12} /> Copy Snippet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Container Block */}
      <div className="relative border border-white/10 hover:border-white/15 rounded-2xl overflow-hidden bg-[#020512] shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-colors duration-300 group">
        {/* macOS Style Window Header Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#050b24] border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-[10px] font-mono text-[#4a5a82] font-semibold select-none">
            {code.includes('iframe') ? 'iframe.html' : 'embed.js'}
          </span>
          <div className="w-12" /> {/* Spacer */}
        </div>

        <div className="absolute top-[44px] left-0 right-0 h-[1px] bg-gradient-to-r from-blue-500/20 via-transparent to-blue-500/20 pointer-events-none" />
        
        {/* Highlighted Code Container */}
        <div 
          className={`transition-all duration-300 ${
            expanded ? 'max-h-[350px]' : 'max-h-[130px]'
          } overflow-auto custom-scrollbar`}
        >
          <pre className="p-5 text-[11px] text-[#94a3c8] font-mono leading-relaxed whitespace-pre overflow-x-auto select-all">
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        </div>
      </div>
    </div>
  );
}
