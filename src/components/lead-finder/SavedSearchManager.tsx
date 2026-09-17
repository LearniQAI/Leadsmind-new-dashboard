'use client';

import React, { useEffect, useState } from 'react';
import { getSavedSearches, deleteSavedSearch, toggleSearchAlert } from '@/app/actions/lead-finder';
import { Clock, ArrowRight, Loader2, Trash2, Bell, BellOff, Play, CalendarDays, Radar, Users, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DashEmptyState, DashSectionHeader } from '@/components/dashboard-ui';

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
      <div className="flex items-center justify-center p-10 bg-white border border-dash-border rounded-2xl shadow-sm">
        <Loader2 className="w-6 h-6 text-dash-accent animate-spin" />
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="bg-white border border-dash-border rounded-2xl shadow-sm">
        <DashEmptyState
          icon={Clock}
          title="No recent searches"
          description="Your previous lead searches will appear here."
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-dash-border rounded-2xl shadow-sm overflow-hidden">
      <DashSectionHeader icon={<Clock size={14} />} title="Recent Searches" />
      <div className="divide-y divide-dash-border">
        {searches.map((search) => (
          <Link
            key={search.id}
            href={`/lead-finder/results?searchId=${search.id}`}
            className="flex flex-col gap-3 p-4 hover:bg-dash-surface transition-colors motion-reduce:transition-none group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-dash-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Radar className="w-4 h-4 text-dash-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="!text-dash-text font-bold text-[15px] leading-snug flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate">{search.search_type === 'keyword' ? search.keywords : search.business_type}</span>
                  <span className="!text-dash-textMuted font-normal text-sm">in {search.location}</span>
                  {search.alerts_enabled && (
                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full tracking-widest font-black flex items-center gap-1">
                      <Bell size={10} /> Alerts On
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs !text-dash-textMuted">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} /> {new Date(search.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={12} /> {search.radius / 1000}km radius
                  </span>
                  <span className="inline-flex items-center gap-1 bg-dash-accent/10 text-dash-accent px-2 py-0.5 rounded-full font-bold">
                    <Users size={11} /> {search.results_count} leads
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 !text-dash-textMuted group-hover:text-dash-accent group-hover:translate-x-0.5 transition-all motion-reduce:transition-none shrink-0 mt-2" />
            </div>

            <div className="flex items-center gap-1 pl-12">
              <button
                onClick={(e) => handleToggleAlert(e, search.id, search.alerts_enabled)}
                className={`p-2 rounded-lg transition-colors motion-reduce:transition-none ${search.alerts_enabled ? 'text-emerald-500 hover:bg-emerald-500/10' : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'}`}
                title="Toggle Weekly Alerts"
              >
                {search.alerts_enabled ? <Bell size={15} /> : <BellOff size={15} />}
              </button>
              <button
                onClick={(e) => { e.preventDefault(); router.push(`/lead-finder?re=${search.id}`); }}
                className="p-2 !text-dash-textMuted hover:text-dash-accent hover:bg-white rounded-lg transition-colors motion-reduce:transition-none"
                title="Rerun Search"
              >
                <Play size={15} />
              </button>
              <button
                onClick={(e) => handleDelete(e, search.id)}
                className="p-2 !text-dash-textMuted hover:text-red-500 hover:bg-white rounded-lg transition-colors motion-reduce:transition-none"
                title="Delete Search"
              >
                <Trash2 size={15} />
              </button>
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
