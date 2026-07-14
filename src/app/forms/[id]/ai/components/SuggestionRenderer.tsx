'use client';

import React from 'react';
import { Check, X, Sparkles, AlertCircle } from 'lucide-react';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';

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
      <div className="bg-dash-surface border border-dash-border rounded-2xl">
        <DashEmptyState
          icon={Sparkles}
          title="No pending suggestions"
          description="Select a category or ask the assistant to generate optimizations."
          compact
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {suggestions.map((item) => {
        return (
          <div
            key={item.id}
            className="p-4 bg-white border border-dash-border rounded-2xl flex flex-col gap-3 relative overflow-hidden transition-colors motion-reduce:transition-none hover:border-dash-text/20"
          >

            {/* Header badges */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-dash-accent" />
                <span className="text-[10px] font-bold !text-dash-textMuted capitalize">
                  {item.type} recommendation
                </span>
              </div>

              <span className="text-[10px] bg-dash-accent/10 text-dash-accent border border-dash-accent/20 px-2 py-0.5 rounded font-bold">
                Needs approval
              </span>
            </div>

            {/* Content description */}
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-bold !text-dash-text">
                {item.title}
              </h4>
              <p className="text-[11px] !text-dash-textMuted leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Actionable recommendation details */}
            <div className="p-3 bg-dash-surface border border-dash-border rounded-xl flex flex-col gap-1.5">
              <span className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-1">
                <AlertCircle size={10} className="text-dash-accent" /> Optimization change
              </span>
              <p className="text-[11px] text-dash-accent font-mono leading-relaxed">
                {item.recommendation}
              </p>
            </div>

            {/* Action controls */}
            <div className="flex items-center justify-end gap-2 border-t border-dash-border pt-2.5 mt-1">
              <button
                onClick={() => onDismiss(item.id)}
                className="h-8 px-3 rounded-lg border border-dash-border hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none text-[10px] font-bold flex items-center gap-1"
              >
                <X size={12} /> Dismiss
              </button>
              <button
                onClick={() => onApply(item)}
                className="h-8 px-4 rounded-lg bg-dash-accent hover:bg-dash-accent/90 text-white transition-colors motion-reduce:transition-none text-[10px] font-bold flex items-center gap-1"
              >
                <Check size={12} /> Approve &amp; apply
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );
}
