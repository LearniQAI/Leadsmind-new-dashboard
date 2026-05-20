'use client';

import React, { useState, useEffect } from 'react';
import { History, ShieldAlert, Sparkles, User, FileText, Settings } from 'lucide-react';
import { AuditLogger, FormAuditLog } from '@/lib/governance/AuditLogger';

export function AuditLogsViewer({ formId }: { formId: string }) {
  const [logs, setLogs] = useState<FormAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    const list = await AuditLogger.getTimeline(formId);
    setLogs(list);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
    
    // Add real-time subscription
    const supabase = (async () => (await import('@/lib/supabase/client')).createClient())();
    let channel: any;
    
    supabase.then(client => {
      channel = client
        .channel(`audit_logs_${formId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'form_audit_logs', filter: `form_id=eq.${formId}` }, (payload) => {
          setLogs(current => [payload.new as FormAuditLog, ...current]);
        })
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.then(client => client.removeChannel(channel));
      }
    };
  }, [formId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'publish': return <ShieldAlert size={14} className="text-emerald-400" />;
      case 'unpublish': return <ShieldAlert size={14} className="text-rose-400" />;
      case 'rollback': return <History size={14} className="text-blue-400" />;
      case 'ai_approval': return <Sparkles size={14} className="text-purple-400" />;
      default: return <Settings size={14} className="text-[#4a5a82]" />;
    }
  };

  return (
    <div className="bg-[#0c1535] border border-white/5 p-6 rounded-2xl font-dm-sans text-white flex flex-col gap-6">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <History size={18} className="text-blue-400" />
          <h3 className="text-sm font-black uppercase tracking-wider font-space-grotesk">Operational Audit Logs</h3>
        </div>
        <button
          onClick={loadLogs}
          className="text-[9px] font-black uppercase tracking-wider text-blue-400 hover:underline"
        >
          Refresh Feed
        </button>
      </div>

      {/* Logs feed timeline list */}
      <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="py-8 text-center text-white/40 text-xs font-bold uppercase tracking-wider">
            No audit logs captured for this form.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex gap-4 p-3 bg-white/2 border border-white/5 rounded-xl hover:border-white/10 transition-all items-start"
            >
              {/* Icon circle */}
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                {getActionIcon(log.action)}
              </div>

              {/* Log context details */}
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-white leading-relaxed">
                    {log.summary}
                  </span>
                  <span className="text-[9px] text-[#4a5a82] font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[9px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                  <span className="flex items-center gap-1">
                    <User size={10} className="text-blue-400" /> {log.actor}
                  </span>
                  <span>•</span>
                  <span>{log.action}</span>
                  <span>•</span>
                  <span>{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
