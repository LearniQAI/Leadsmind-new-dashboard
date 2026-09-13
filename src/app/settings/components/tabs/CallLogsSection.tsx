"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PhoneCall, RefreshCw, Voicemail, PhoneMissed, PhoneForwarded } from 'lucide-react';
import { toast } from 'sonner';
import { listCallLogs, type CallLog } from '@/app/actions/ivr';

function formatDuration(seconds: number | null): string {
  if (!seconds && seconds !== 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function outcomeBadge(outcome: string | null) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    forwarded: { label: 'Forwarded', className: 'bg-green-600/10 text-green-700 border-green-600/20', icon: <PhoneForwarded size={10} /> },
    voicemail: { label: 'Voicemail', className: 'bg-blue-600/10 text-blue-700 border-blue-600/20', icon: <Voicemail size={10} /> },
    voicemail_empty: { label: 'No message left', className: 'bg-dash-surface !text-dash-textMuted border-dash-border', icon: <Voicemail size={10} /> },
    hangup: { label: 'Hung up', className: 'bg-dash-surface !text-dash-textMuted border-dash-border', icon: <PhoneMissed size={10} /> },
    max_retries_exceeded: { label: 'Gave up (no valid input)', className: 'bg-amber-100 text-amber-800 border-amber-200', icon: <PhoneMissed size={10} /> },
    ring_group_no_answer: { label: 'No answer', className: 'bg-red-100 text-red-700 border-red-200', icon: <PhoneMissed size={10} /> },
    no_menu_configured: { label: 'No menu configured', className: 'bg-red-100 text-red-700 border-red-200', icon: <PhoneMissed size={10} /> },
  };
  const entry = (outcome && map[outcome]) || { label: outcome || 'In progress', className: 'bg-dash-surface !text-dash-textMuted border-dash-border', icon: <PhoneCall size={10} /> };
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${entry.className}`}>
      {entry.icon} {entry.label}
    </span>
  );
}

export default function CallLogsSection() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await listCallLogs({ limit: 50 });
    if (res.error) toast.error(res.error);
    setLogs(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="bg-white border border-dash-border rounded-2xl p-8 space-y-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h4 className="text-[15px] font-bold !text-dash-text">Call logs</h4>
          <p className="text-[11px] !text-dash-textMuted mt-0.5">Real inbound calls to your provisioned numbers.</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-1.5 text-[11px] font-bold !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
          <RefreshCw size={12} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" /></div>
      ) : logs.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center border border-dashed border-dash-border rounded-xl">
          <PhoneCall size={24} className="!text-dash-textMuted mb-2 opacity-40" />
          <p className="text-[12px] font-semibold !text-dash-textMuted">No calls yet</p>
        </div>
      ) : (
        <div className="border border-dash-border rounded-xl overflow-hidden divide-y divide-dash-border">
          {logs.map((log) => {
            const hasAudio = !!(log.voicemail_url || log.recording_url);
            return (
              <div key={log.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[12px] font-bold !text-dash-text font-mono">{log.from_number} → {log.to_number}</p>
                    <p className="text-[10px] !text-dash-textMuted">{new Date(log.started_at).toLocaleString()} · {formatDuration(log.duration_seconds)}</p>
                  </div>
                  {outcomeBadge(log.outcome)}
                </div>

                {log.menu_path.length > 0 && (
                  <p className="text-[10px] !text-dash-textMuted font-mono">
                    Path: {log.menu_path.map((p) => `${p.menuName} [${p.keypress}]`).join(' → ')}
                  </p>
                )}

                {hasAudio && (
                  <div>
                    {playingId === log.id ? (
                      <audio controls autoPlay className="w-full h-9" onEnded={() => setPlayingId(null)}>
                        <source src={`/api/telephony/recordings/${log.id}`} type="audio/mpeg" />
                      </audio>
                    ) : (
                      <button
                        onClick={() => setPlayingId(log.id)}
                        className="text-[11px] font-bold text-dash-accent hover:text-dash-accent/80 transition-colors motion-reduce:transition-none"
                      >
                        ▶ Listen to {log.voicemail_url ? 'voicemail' : 'recording'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
