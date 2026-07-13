'use client';

import React, { useState } from 'react';
import { createWatchlist, deleteWatchlist, toggleWatchlistStatus } from '@/app/actions/watchlist-workspace';
import { Eye, Plus, Loader2, Trash2, Pause, Play, MapPin, Building2, Tag, Search } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export function WatchlistManager({ initialWatchlists }: { initialWatchlists: any[] }) {
  const [watchlists, setWatchlists] = useState(initialWatchlists);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('location');
  const [criteria, setCriteria] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let payload = {};
    if (type === 'location') payload = { location: criteria };
    else if (type === 'industry') payload = { business_type: criteria };
    else if (type === 'keyword') payload = { keywords: criteria };

    await createWatchlist(name, type, payload);
    setIsOpen(false);
    setName('');
    setCriteria('');
    window.location.reload();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleWatchlistStatus(id, !current);
    window.location.reload();
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Watchlist?',
      description: 'Are you sure you want to delete this watchlist?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteWatchlist(id);
        window.location.reload();
      }
    });
  };

  const getTypeIcon = (t: string) => {
    switch(t) {
      case 'location': return <MapPin size={14} className="text-blue-400" />;
      case 'industry': return <Building2 size={14} className="text-amber-400" />;
      case 'keyword': return <Tag size={14} className="text-emerald-400" />;
      default: return <Search size={14} className="!text-dash-textMuted" />;
    }
  };

  return (
    <div className="bg-white border border-dash-border rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold !text-dash-text flex items-center gap-2">
          <Eye className="text-dash-accent" /> Active Watchlists
        </h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-xs font-bold tracking-wider transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> New Watchlist
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-white border border-dash-border rounded-2xl space-y-4">
          <div>
            <label className="block text-xs font-bold !text-dash-textMuted tracking-wider mb-2">Watchlist Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dentists in New York"
              className="w-full bg-white border border-dash-border rounded-xl py-2 px-3 text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold !text-dash-textMuted tracking-wider mb-2">Monitor By</label>
              <select 
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-white border border-dash-border rounded-xl py-2 px-3 text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
              >
                <option value="location">Location</option>
                <option value="industry">Industry / Category</option>
                <option value="keyword">Specific Keyword</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold !text-dash-textMuted tracking-wider mb-2">Value</label>
              <input 
                type="text" 
                required
                value={criteria}
                onChange={e => setCriteria(e.target.value)}
                placeholder="e.g. New York, NY"
                className="w-full bg-white border border-dash-border rounded-xl py-2 px-3 text-sm !text-dash-text focus:outline-none focus:border-dash-accent"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-dash-border/60 hover:bg-dash-border !text-dash-text rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Create Watchlist'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {watchlists.length === 0 ? (
          <div className="text-center p-8 bg-dash-surface rounded-2xl border border-dash-border border-dashed">
            <Eye size={32} className="!text-dash-textMuted mx-auto mb-3 opacity-50" />
            <p className="text-sm !text-dash-textMuted">You have no active watchlists.</p>
          </div>
        ) : (
          watchlists.map(w => (
            <div key={w.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${w.is_active ? 'bg-dash-surface border-dash-border' : 'bg-white border-dash-border opacity-70'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="!text-dash-text font-bold">{w.name}</h4>
                  {!w.is_active && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold tracking-widest">Paused</span>}
                </div>
                <div className="flex items-center gap-3 text-xs !text-dash-textMuted">
                  <span className="flex items-center gap-1 bg-dash-surface px-2 py-1 rounded">
                    {getTypeIcon(w.monitoring_type)} 
                    {w.monitoring_type}
                  </span>
                  <span>{JSON.stringify(w.criteria)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(w.id, w.is_active)}
                  className={`p-2 rounded-lg transition-colors ${w.is_active ? 'text-amber-400 hover:bg-amber-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
                  title={w.is_active ? "Pause Monitoring" : "Resume Monitoring"}
                >
                  {w.is_active ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(w.id)}
                  className="p-2 !text-dash-textMuted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Delete Watchlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant="danger"
        />
      )}
    </div>
  );
}
