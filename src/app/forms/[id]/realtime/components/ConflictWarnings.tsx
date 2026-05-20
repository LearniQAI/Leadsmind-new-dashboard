'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { DraftSyncEngine, SyncPayload } from '@/lib/realtime/DraftSyncEngine';
import { ConflictDetector } from '@/lib/realtime/ConflictDetector';

interface ConflictWarningsProps {
  formId: string;
  localLastSaved: Date | null;
  onRefreshTriggered: () => void;
  currentUserEmail: string;
}

export function ConflictWarnings({
  formId,
  localLastSaved,
  onRefreshTriggered,
  currentUserEmail
}: ConflictWarningsProps) {
  const [staleWarning, setStaleWarning] = useState(false);
  const [lastEditorEmail, setLastEditorEmail] = useState('');

  useEffect(() => {
    // Listen to remote changes to detect workspace drift
    const unsub = DraftSyncEngine.onSyncReceived(formId, (payload: SyncPayload) => {
      if (payload.actor !== currentUserEmail) {
        const isStale = ConflictDetector.isWorkspaceStale(
          localLastSaved,
          payload.timestamp
        );

        if (isStale) {
          setLastEditorEmail(payload.actor);
          setStaleWarning(true);
        }
      }
    });

    return () => unsub();
  }, [formId, localLastSaved, currentUserEmail]);

  if (!staleWarning) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between gap-4 font-dm-sans text-white">
      <div className="flex gap-3 items-center">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 text-amber-400 animate-pulse">
          <AlertTriangle size={16} />
        </div>
        
        <div className="flex flex-col gap-0.5">
          <h4 className="text-xs font-bold text-white font-space-grotesk">
            Draft Outdated Warning
          </h4>
          <p className="text-[10px] text-white/70">
            {lastEditorEmail || 'Another user'} has updated this form layout. Refreshes are suggested to prevent overwrites.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setStaleWarning(false)}
          className="h-8 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-white/50 text-[10px] font-black uppercase tracking-wider transition-all"
        >
          Dismiss
        </button>
        
        <button
          onClick={() => {
            setStaleWarning(false);
            onRefreshTriggered();
          }}
          className="h-8 px-4 rounded-lg bg-amber-500 text-black hover:bg-amber-600 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all"
        >
          <RefreshCw size={11} className="animate-spin" /> Reload Draft
        </button>
      </div>

    </div>
  );
}
