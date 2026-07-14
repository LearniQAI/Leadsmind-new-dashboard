'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Play, CheckCircle, AlertTriangle, Clock, ArrowRight } from 'lucide-react';

interface ExecutionLogsProps {
  formId: string;
}

export function ExecutionLogs({ formId }: ExecutionLogsProps) {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadLogs = async () => {
    setLoading(true);
    try {
      // 1. Fetch workflow executions for active form
      const { data: wfIds } = await supabase
        .from('workflows')
        .select('id')
        .eq('form_id', formId);

      const workflowIds = (wfIds || []).map(w => w.id);

      if (workflowIds.length === 0) {
        setExecutions([]);
        setLoading(false);
        return;
      }

      const { data: runs } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          workflows ( name, trigger_type )
        `)
        .in('workflow_id', workflowIds)
        .order('started_at', { ascending: false })
        .limit(30);

      setExecutions(runs || []);
    } catch (e) {
      console.error('[ExecutionLogs] Failed to query logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [formId]);

  return (
    <div className="flex-1 bg-white border border-dash-border rounded-2xl flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-dash-border flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold !text-dash-text">Execution History</h3>
          <p className="text-[10px] !text-dash-textMuted">Real-time automation logs & trigger logs</p>
        </div>
        <button
          onClick={loadLogs}
          className="p-2 bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text rounded-lg transition-colors motion-reduce:transition-none flex items-center justify-center"
          title="Refresh Logs"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center p-12 !text-dash-textMuted">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading execution feeds...
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center p-12 !text-dash-textMuted">
            <Clock size={32} className="mx-auto opacity-35 mb-2" />
            <h4 className="text-[11px] font-bold !text-dash-text">No executions logged</h4>
            <p className="text-[10px] mt-1">Submit the form or trigger workflows to inspect running actions.</p>
          </div>
        ) : (
          executions.map((run) => {
            const isSuccess = run.status === 'completed';
            const isRunning = run.status === 'running';
            const isFailed = run.status === 'failed';
            const duration = run.completed_at
              ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 10) / 100}s`
              : '--';

            return (
              <div
                key={run.id}
                className="p-4 bg-dash-surface border border-dash-border hover:border-dash-text/20 rounded-xl flex flex-col gap-3 transition-colors motion-reduce:transition-none"
              >
                
                {/* Meta details */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {isSuccess && <CheckCircle size={14} className="text-green" />}
                    {isRunning && <RefreshCw size={14} className="text-dash-accent animate-spin" />}
                    {isFailed && <AlertTriangle size={14} className="text-red" />}
                    <div>
                      <span className="text-[11px] font-bold !text-dash-text">
                        {run.workflows?.name || 'Automation Run'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] !text-dash-textMuted font-bold mt-0.5">
                        <span className="text-dash-accent">{run.workflows?.trigger_type?.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{duration} duration</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    isSuccess ? 'bg-green/10 text-green' :
                    isRunning ? 'bg-dash-accent/10 text-dash-accent' : 'bg-red/10 text-red'
                  }`}>
                    {run.status}
                  </span>
                </div>

                {/* Logs message if failed */}
                {run.error_message && (
                  <div className="p-3 bg-red/5 border border-red/10 rounded-lg text-[10px] text-red  leading-relaxed">
                    <strong>Error:</strong> {run.error_message}
                  </div>
                )}

                {/* Sub-details */}
                <div className="text-[10px] !text-dash-textMuted  flex items-center justify-between border-t border-dash-border pt-2.5">
                  <span>
                    Started: {new Date(run.started_at).toLocaleString()}
                  </span>
                  {run.context && Object.keys(run.context).length > 0 && (
                    <span className="text-[9px] bg-dash-surface px-2 py-0.5 rounded !text-dash-text select-none">
                      Context payload logged
                    </span>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
