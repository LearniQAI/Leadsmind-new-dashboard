'use client';

import React, { useState, useEffect } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { PresenceManager, PresenceUser } from '@/lib/realtime/PresenceManager';

interface CollabPresenceListProps {
  formId: string;
  currentUserEmail: string;
  currentClientId: string;
  isEditor?: boolean;
  editingSection?: string | null;
}

export function CollabPresenceList({
  formId,
  currentUserEmail,
  currentClientId,
  isEditor = false,
  editingSection = null
}: CollabPresenceListProps) {
  const [sessions, setSessions] = useState<PresenceUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll database roster and heartbeat coordinates
  const syncPresence = async () => {
    // 1. Submit heartbeat update
    await PresenceManager.heartbeat(
      formId,
      currentUserEmail,
      currentClientId,
      isEditor,
      editingSection
    );

    // 2. Load active roster
    const active = await PresenceManager.getActiveSessions(formId);
    setSessions(active);
    setLoading(false);
  };

  useEffect(() => {
    syncPresence();
    const interval = setInterval(syncPresence, 10000); // 10s Heartbeat loop

    // Exit cleanup on tab close
    const handleExit = () => {
      PresenceManager.exitSession(formId, currentUserEmail);
    };

    window.addEventListener('beforeunload', handleExit);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleExit);
      handleExit();
    };
  }, [formId, currentUserEmail, editingSection]);

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (isEd: boolean) => {
    return isEd ? 'bg-dash-accent border-dash-accent/60' : 'bg-purple-500 border-purple-300';
  };

  return (
    <div className="flex items-center gap-3 bg-dash-surface border border-dash-border px-3 py-1.5 rounded-xl !text-dash-text">

      {/* Sessions avatars */}
      <div className="flex items-center -space-x-1.5">
        {sessions.map((ses) => (
          <div
            key={ses.client_id}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border text-white cursor-pointer relative group ${getAvatarColor(
              ses.is_editor
            )}`}
            title={ses.email}
          >
            {getInitials(ses.email)}

            {/* Pulsing indicator */}
            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-green border border-white animate-pulse motion-reduce:animate-none" />

            {/* Tooltip detail card */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-dash-text text-white border border-dash-border text-[9px] font-bold py-1 px-2 rounded shadow-lg z-50 whitespace-nowrap">
              {ses.email} {ses.is_editor ? ' (Editing)' : ' (Viewing)'}
              {ses.editing_section && ` • Section: ${ses.editing_section}`}
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="w-6 h-6 rounded-full bg-white border border-dash-border flex items-center justify-center">
            <Users size={12} className="!text-dash-textMuted" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 border-l border-dash-border pl-2">
        <span className="text-[9px] font-bold !text-dash-textMuted">
          Session presence
        </span>
        <span className="text-[9px] font-bold !text-dash-textMuted">
          {sessions.length} active {sessions.length === 1 ? 'user' : 'users'}
        </span>
      </div>

    </div>
  );
}
