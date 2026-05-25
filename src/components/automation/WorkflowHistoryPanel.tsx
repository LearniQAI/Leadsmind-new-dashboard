'use client';

import React from 'react';
import { Play, Activity, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function WorkflowHistoryPanel({ executions, failures }: { executions: any[], failures: any[] }) {
  return (
    <div className="bg-n800 border border-white/10 rounded-3xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-space font-bold text-white flex items-center gap-2">
          <Activity className="text-accent" /> Recent Executions
        </h3>
        <Link href="/automation/history" className="text-xs font-bold text-t4 hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1">
          View Logs <ArrowRight size={14} />
        </Link>
      </div>

      {failures.length > 0 && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <h4 className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2">
            <XCircle size={16} /> {failures.length} Unresolved Failures
          </h4>
          <p className="text-xs text-red-400/80">
            Some workflows failed to execute correctly. Please review the execution history to resolve them.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {executions.length === 0 ? (
          <div className="text-center p-8 bg-n900 border border-white/5 rounded-2xl">
            <Clock size={32} className="text-t4 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-t3">No workflows have executed yet.</p>
          </div>
        ) : (
          executions.map((log) => (
            <div key={log.id} className="p-4 bg-n900 border border-white/5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  log.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                  log.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {log.status === 'success' ? <CheckCircle2 size={16} /> :
                   log.status === 'failed' ? <XCircle size={16} /> :
                   <Play size={16} />}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{log.automation_workflows?.name || 'Deleted Workflow'}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-t4 uppercase font-bold tracking-widest mt-1">
                    <span>{log.trigger_event.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                log.status === 'success' ? 'text-emerald-400' :
                log.status === 'failed' ? 'text-red-400' :
                'text-amber-400'
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
