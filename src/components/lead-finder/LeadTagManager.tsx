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
    <div className="bg-n800 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Tag size={16} className="text-accent" /> Smart Tags
        </h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map(tag => (
          <span 
            key={tag}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white group"
          >
            #{tag}
            <button 
              onClick={() => handleRemove(tag)}
              disabled={loading}
              className="text-t4 group-hover:text-red-400 transition-colors disabled:opacity-50 ml-1"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-sm text-t4 italic">No tags assigned.</span>}
      </div>

      <form onSubmit={handleAdd} className="relative">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add tag (e.g. high-value)"
          className="w-full bg-n900 border border-white/10 rounded-xl py-2 pl-3 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || !newTag.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-t3 hover:text-accent disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        </button>
      </form>
    </div>
  );
}
