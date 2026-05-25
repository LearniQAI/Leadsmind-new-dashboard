import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { Zap, LayoutDashboard, CheckCircle2, XCircle, Play, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function ExecutionHistoryPage() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  
  if (!workspaceId) {
    return <Wrapper><div className="p-12 text-center text-white">Unauthorized</div></Wrapper>;
  }

  // Fetch full execution history
  const { data: executions } = await supabase
    .from('workflow_execution_logs')
    .select('*, automation_workflows(name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  // Fetch unresolved failures for the dead letter queue view
  const { data: failures } = await supabase
    .from('workflow_failures')
    .select('*, automation_workflows!inner(name, workspace_id), workflow_execution_logs!inner(trigger_event)')
    .eq('automation_workflows.workspace_id', workspaceId)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false });

  return (
    <Wrapper>
      <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/automation" className="inline-flex items-center gap-2 text-sm font-bold text-t3 hover:text-white transition-colors mb-4">
              <LayoutDashboard size={16} /> Back to Automation Engine
            </Link>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <Zap className="text-accent" size={32} /> Execution History
            </h1>
            <p className="text-t3">Detailed audit log of all workflow executions and routing failures.</p>
          </div>
        </div>

        {/* Dead Letter Queue (Failures) */}
        {failures && failures.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6">
            <h2 className="text-xl font-space font-bold text-red-400 mb-6 flex items-center gap-2">
              <AlertTriangle /> Dead Letter Queue
            </h2>
            <div className="space-y-4">
              {failures.map((failure: any) => (
                <div key={failure.id} className="bg-n900 border border-red-500/30 rounded-2xl p-4 flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Failed: {failure.automation_workflows?.name}</h4>
                    <p className="text-xs text-red-400 mt-1 font-mono bg-black/50 p-2 rounded inline-block">
                      Error: {failure.error_message}
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
                    Resolve Manually
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execution Log */}
        <div className="bg-n800 border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-space font-bold text-white mb-6 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" /> Full Execution Audit
          </h2>
          <div className="space-y-4">
            {!executions || executions.length === 0 ? (
              <p className="text-t4 text-center p-8">No executions recorded.</p>
            ) : (
              executions.map((log: any) => (
                <div key={log.id} className="p-4 bg-n900 border border-white/5 rounded-2xl flex items-center justify-between hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${
                      log.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                      log.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {log.status === 'success' ? <CheckCircle2 size={18} /> :
                       log.status === 'failed' ? <XCircle size={18} /> :
                       <Play size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {log.automation_workflows?.name || 'Deleted Workflow'}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-t4 mt-1 font-bold uppercase tracking-widest">
                        <span className="text-white">{log.trigger_event.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{log.entity_type} {log.entity_id.split('-')[0]}</span>
                        <span>•</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                      log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                      log.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </Wrapper>
  );
}
