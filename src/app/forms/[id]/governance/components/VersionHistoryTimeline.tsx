'use client';

import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, GitCompare, ChevronDown, User, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { VersionManager, FormVersion } from '@/lib/governance/VersionManager';
import { DiffViewer } from './DiffViewer';

interface VersionHistoryTimelineProps {
  formId: string;
  currentDraft: any;
  onRollbackApplied: (snapshot: any) => void;
}

export function VersionHistoryTimeline({
  formId,
  currentDraft,
  onRollbackApplied
}: VersionHistoryTimelineProps) {
  const [history, setHistory] = useState<FormVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareVersion, setCompareVersion] = useState<FormVersion | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    const list = await VersionManager.getVersionHistory(formId);
    setHistory(list);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [formId]);

  const handleRollback = async (version: FormVersion) => {
    const confirm = window.confirm(
      `Are you sure you want to rollback this form to version #${version.version_number}? Unsaved draft changes will be overwritten.`
    );
    if (!confirm) return;

    const res = await VersionManager.rollbackToVersion(formId, version.version_number);
    if (res.success && res.snapshot) {
      toast.success(`Successfully rolled back to version #${version.version_number}!`);
      onRollbackApplied(res.snapshot);
      loadHistory();
    } else {
      toast.error(res.error || 'Failed to rollback version.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-dm-sans text-white">
      
      {/* Compare Panel Overlay if selected */}
      {compareVersion && (
        <div className="bg-[#0b132c] border border-white/10 p-4 rounded-2xl flex flex-col gap-3 relative">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
              Comparing Version #{compareVersion.version_number} vs. Current Draft
            </span>
            <button
              onClick={() => setCompareVersion(null)}
              className="text-[9px] font-black uppercase tracking-wider text-white/50 hover:text-white"
            >
              Close Diff
            </button>
          </div>
          <DiffViewer
            oldSnapshot={compareVersion.snapshot}
            currentDraft={currentDraft}
          />
        </div>
      )}

      {/* Snapshot list */}
      <div className="flex flex-col gap-4">
        {history.length === 0 ? (
          <div className="p-8 text-center text-white/40 border border-white/5 bg-white/2 rounded-2xl text-xs font-bold uppercase tracking-wider">
            No publishing snapshots recorded yet.
          </div>
        ) : (
          history.map((ver) => (
            <div
              key={ver.id}
              className="p-5 bg-[#0c1535] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition-all"
            >
              {/* Left: Info */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black uppercase tracking-wide text-white font-space-grotesk">
                    Snapshot v{ver.version_number}
                  </span>
                  <span className="text-[9px] text-[#4a5a82] font-mono">
                    {new Date(ver.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-white/60">
                  <span className="flex items-center gap-1">
                    <User size={12} className="text-blue-400" /> {ver.created_by || 'system'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} className="text-[#4a5a82]" /> {ver.notes || 'No notes provided.'}
                  </span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCompareVersion(ver)}
                  className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/5"
                >
                  <GitCompare size={12} /> Compare Diff
                </button>
                
                <button
                  onClick={() => handleRollback(ver)}
                  className="h-8 px-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Rollback
                </button>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
