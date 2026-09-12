'use client';

import React from 'react';
import { Play, Activity, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function WorkflowHistoryPanel({ executions, failures }: { executions: any[], failures: any[] }) {
  return (
    <div className="bg-dash-surface border border-dash-border rounded-3xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-space font-bold text-dash-text flex items-center gap-2">
          <Activity className="text-dash-accent" /> Recent Executions
        </h3>
        <Link href="/automation/history" className="text-xs font-bold text-dash-textMuted hover:text-dash-text uppercase tracking-wider transition-colors flex items-center gap-1">
          View Logs <ArrowRight size={14} />
        </Link>
      </div>

      {failures.length > 0 && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <h4 className="text-rose-600 font-bold text-sm mb-2 flex items-center gap-2">
            <XCircle size={16} /> {failures.length} Unresolved Failures
          </h4>
          <p className="text-xs text-rose-600/80">
            Some workflows failed to execute correctly. Please review the execution history to resolve them.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {executions.length === 0 ? (
          <div className="text-center p-8 bg-dash-bg border border-dash-border rounded-2xl">
            <Clock size={32} className="text-dash-textMuted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-dash-textMuted">No workflows have executed yet.</p>
          </div>
        ) : (
          executions.map((log) => (
            <div key={log.id} className="p-4 bg-dash-bg border border-dash-border rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-full shrink-0 ${
                  log.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                  log.status === 'failed' ? 'bg-rose-100 text-rose-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {log.status === 'completed' ? <CheckCircle2 size={16} /> :
                   log.status === 'failed' ? <XCircle size={16} /> :
                   <Play size={16} />}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-dash-text text-sm truncate">{log.workflows?.name || 'Deleted Workflow'}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-dash-textMuted uppercase font-bold tracking-widest mt-1">
                    <span>{(log.workflows?.trigger_type || 'unknown').replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span>{new Date(log.started_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded shrink-0 ${
                log.status === 'completed' ? 'text-emerald-600' :
                log.status === 'failed' ? 'text-rose-600' :
                'text-amber-600'
              }`}>
                {log.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
