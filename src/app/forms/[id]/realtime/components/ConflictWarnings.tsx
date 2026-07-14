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
    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-4 !text-dash-text">
      <div className="flex gap-3 items-center">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200 text-amber-600 animate-pulse motion-reduce:animate-none">
          <AlertTriangle size={16} />
        </div>

        <div className="flex flex-col gap-0.5">
          <h4 className="text-xs font-bold !text-dash-text">
            Draft outdated warning
          </h4>
          <p className="text-[11px] !text-dash-textMuted">
            {lastEditorEmail || 'Another user'} has updated this form layout. Refreshes are suggested to prevent overwrites.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setStaleWarning(false)}
          className="h-8 px-3 rounded-lg border border-dash-border hover:bg-white !text-dash-textMuted text-[10px] font-bold transition-colors motion-reduce:transition-none"
        >
          Dismiss
        </button>

        <button
          onClick={() => {
            setStaleWarning(false);
            onRefreshTriggered();
          }}
          className="h-8 px-4 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-bold text-[10px] flex items-center gap-1 transition-colors motion-reduce:transition-none"
        >
          <RefreshCw size={11} className="animate-spin motion-reduce:animate-none" /> Reload draft
        </button>
      </div>

    </div>
  );
}
