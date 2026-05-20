'use client';

import React from 'react';
import { Check, X, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export interface SuggestionItem {
  id: string;
  type: 'copy' | 'workflow' | 'analytics' | 'recovery';
  title: string;
  subtitle?: string;
  meta?: Record<string, any>;
  description: string;
  recommendation: string;
}

interface SuggestionRendererProps {
  suggestions: SuggestionItem[];
  onApply: (item: SuggestionItem) => void;
  onDismiss: (id: string) => void;
}

export function SuggestionRenderer({
  suggestions,
  onApply,
  onDismiss
}: SuggestionRendererProps) {
  if (suggestions.length === 0) {
    return (
      <div className="p-6 bg-white/2 border border-white/5 rounded-2xl text-center text-[#4a5a82]">
        <Sparkles size={20} className="mx-auto opacity-30 mb-2" />
        <p className="text-[11px] font-bold uppercase tracking-wider">No Pending Suggestions</p>
        <p className="text-[9px] mt-0.5">Select a category or ask the assistant to generate optimizations.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 font-dm-sans">
      {suggestions.map((item) => {
        return (
          <div
            key={item.id}
            className="p-4 bg-[#0c1535] border border-white/5 rounded-2xl flex flex-col gap-3 relative overflow-hidden transition-all hover:border-white/10"
          >
            
            {/* Header badges */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-blue-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82]">
                  {item.type} recommendation
                </span>
              </div>
              
              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                Needs Approval
              </span>
            </div>

            {/* Content description */}
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-black uppercase tracking-wide text-white font-space-grotesk">
                {item.title}
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Actionable recommendation details */}
            <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#4a5a82] flex items-center gap-1">
                <AlertCircle size={10} className="text-blue-400" /> Optimization Change
              </span>
              <p className="text-[11px] text-[#60a5fa] font-mono leading-relaxed">
                {item.recommendation}
              </p>
            </div>

            {/* Action controls */}
            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-2.5 mt-1">
              <button
                onClick={() => onDismiss(item.id)}
                className="h-8 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
              >
                <X size={12} /> Dismiss
              </button>
              <button
                onClick={() => onApply(item)}
                className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
              >
                <Check size={12} /> Approve &amp; Apply
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );
}
