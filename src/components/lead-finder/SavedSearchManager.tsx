'use client';

import React, { useEffect, useState } from 'react';
import { getSavedSearches, deleteSavedSearch, toggleSearchAlert } from '@/app/actions/lead-finder';
import { Clock, ArrowRight, Loader2, Trash2, Bell, BellOff, Play } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DashEmptyState } from '@/components/dashboard-ui';

export function SavedSearchManager() {
  const [searches, setSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const router = useRouter();

  const fetchSearches = async () => {
    const { success, data } = await getSavedSearches();
    if (success && data) {
      setSearches(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSearches();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Saved Search?',
      description: 'Are you sure you want to delete this saved search?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteSavedSearch(id);
        await fetchSearches();
      }
    });
  };

  const handleToggleAlert = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.preventDefault();
    await toggleSearchAlert(id, !current);
    await fetchSearches();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white border border-dash-border rounded-2xl">
        <Loader2 className="w-6 h-6 text-dash-accent animate-spin" />
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="bg-white border border-dash-border rounded-2xl">
        <DashEmptyState
          icon={Clock}
          title="No recent searches"
          description="Your previous lead searches will appear here."
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-dash-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-dash-border bg-dash-surface">
        <h3 className="text-sm font-bold !text-dash-text tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-dash-accent" /> Recent Searches
        </h3>
      </div>
      <div className="divide-y divide-dash-border">
        {searches.map((search) => (
          <Link
            key={search.id}
            href={`/lead-finder/results?searchId=${search.id}`}
            className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-dash-surface transition-colors group gap-4"
          >
            <div>
              <p className="!text-dash-text font-semibold text-lg flex items-center gap-2">
                {search.search_type === 'keyword' ? search.keywords : search.business_type}
                <span className="!text-dash-textMuted font-normal text-sm">in {search.location}</span>
                {search.alerts_enabled && (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full tracking-widest font-black flex items-center gap-1">
                    <Bell size={10} /> Alerts On
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs !text-dash-textMuted">
                <span>Created: {new Date(search.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>Radius: {search.radius / 1000}km</span>
                <span>•</span>
                <span className="bg-dash-accent/10 text-dash-accent px-2 py-0.5 rounded-full font-bold">
                  {search.results_count} total leads
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => handleToggleAlert(e, search.id, search.alerts_enabled)}
                className={`p-2 rounded-lg transition-colors ${search.alerts_enabled ? 'text-emerald-400 hover:bg-emerald-400/10' : '!text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface'}`}
                title="Toggle Weekly Alerts"
              >
                {search.alerts_enabled ? <Bell size={16} /> : <BellOff size={16} />}
              </button>
              <button 
                onClick={(e) => { e.preventDefault(); router.push(`/lead-finder?re=${search.id}`); }}
                className="p-2 !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/10 rounded-lg transition-colors"
                title="Rerun Search"
              >
                <Play size={16} />
              </button>
              <button 
                onClick={(e) => handleDelete(e, search.id)}
                className="p-2 !text-dash-textMuted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                title="Delete Search"
              >
                <Trash2 size={16} />
              </button>
              <div className="w-px h-6 bg-dash-border/60 mx-1"></div>
              <ArrowRight className="w-4 h-4 !text-dash-textMuted group-hover:text-dash-accent transition-colors ml-1" />
            </div>
          </Link>
        ))}
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
