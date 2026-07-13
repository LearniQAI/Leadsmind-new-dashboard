'use client';

import React, { useState } from 'react';
import { addLeadTag, removeLeadTag } from '@/app/actions/lead-workspace';
import { Tag, Plus, X, Loader2 } from 'lucide-react';

export function LeadTagManager({ leadId, tags }: { leadId: string, tags: string[] }) {
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    setLoading(true);
    await addLeadTag(leadId, newTag.trim().toLowerCase().replace(/\s+/g, '-'));
    setNewTag('');
    setLoading(false);
  };

  const handleRemove = async (tag: string) => {
    setLoading(true);
    await removeLeadTag(leadId, tag);
    setLoading(false);
  };

  return (
    <div className="bg-white border border-dash-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold !text-dash-text tracking-wider flex items-center gap-2">
          <Tag size={16} className="text-dash-accent" /> Smart Tags
        </h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map(tag => (
          <span 
            key={tag}
            className="flex items-center gap-1.5 px-3 py-1 bg-dash-surface border border-dash-border rounded-full text-xs font-semibold !text-dash-text group"
          >
            #{tag}
            <button 
              onClick={() => handleRemove(tag)}
              disabled={loading}
              className="!text-dash-textMuted group-hover:text-red-400 transition-colors disabled:opacity-50 ml-1"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-sm !text-dash-textMuted italic">No tags assigned.</span>}
      </div>

      <form onSubmit={handleAdd} className="relative">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add tag (e.g. high-value)"
          className="w-full bg-white border border-dash-border rounded-xl py-2 pl-3 pr-10 text-sm !text-dash-text placeholder-dash-textMuted/70 focus:outline-none focus:border-dash-accent"
        />
        <button
          type="submit"
          disabled={loading || !newTag.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 !text-dash-textMuted hover:text-dash-accent disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        </button>
      </form>
    </div>
  );
}
