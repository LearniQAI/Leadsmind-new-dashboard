import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { Zap, LayoutDashboard, CheckCircle2, XCircle, Play, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { ResolveExecutionButton } from '@/components/automation/ResolveExecutionButton';

export default async function ExecutionHistoryPage() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return <Wrapper><div className="p-12 text-center !text-dash-textMuted">Unauthorized</div></Wrapper>;
  }

  // Fetch full execution history
  const { data: executions } = await supabase
    .from('workflow_executions')
    .select('*, workflows(name, trigger_type)')
    .eq('workspace_id', workspaceId)
    .order('started_at', { ascending: false })
    .limit(100);

  // Fetch failed executions for the dead letter queue view
  const { data: failures } = await supabase
    .from('workflow_executions')
    .select('*, workflows!inner(name, workspace_id)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'failed')
    .order('started_at', { ascending: false });

  return (
    <Wrapper>
      <div className="p-6 max-w-5xl mx-auto min-h-[calc(100vh-80px)] space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/automation" className="inline-flex items-center gap-2 text-sm font-bold !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none mb-4">
              <LayoutDashboard size={16} /> Back to automation engine
            </Link>
            <h1 className="text-3xl font-bold !text-dash-text mb-2 flex items-center gap-3">
              <Zap className="text-dash-accent" size={32} /> Execution history
            </h1>
            <p className="!text-dash-textMuted">Detailed audit log of all workflow executions and routing failures.</p>
          </div>
        </div>

        {/* Dead Letter Queue (Failures) */}
        {failures && failures.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
            <h2 className="text-xl font-bold text-red mb-6 flex items-center gap-2">
              <AlertTriangle /> Dead letter queue
            </h2>
            <div className="space-y-4">
              {failures.map((failure: any) => (
                <div key={failure.id} className="bg-white border border-red-200 rounded-2xl p-4 flex items-start justify-between shadow-sm">
                  <div>
                    <h4 className="font-bold !text-dash-text text-sm">Failed: {failure.workflows?.name || 'Deleted workflow'}</h4>
                    <p className="text-xs text-red mt-1 font-mono bg-dash-surface p-2 rounded inline-block">
                      Error: {failure.error_message}
                    </p>
                  </div>
                  <ResolveExecutionButton executionId={failure.id} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execution Log */}
        <div className="bg-white border border-dash-border rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-bold !text-dash-text mb-6 flex items-center gap-2">
            <CheckCircle2 className="text-green" /> Full execution audit
          </h2>
          <div className="space-y-4">
            {!executions || executions.length === 0 ? (
              <p className="!text-dash-textMuted text-center p-8">No executions recorded.</p>
            ) : (
              executions.map((log: any) => (
                <div key={log.id} className="p-4 bg-dash-surface border border-dash-border rounded-2xl flex items-center justify-between hover:border-dash-text/20 transition-colors motion-reduce:transition-none">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${
                      log.status === 'completed' ? 'bg-green/10 text-green' :
                      log.status === 'failed' ? 'bg-red/10 text-red' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {log.status === 'completed' ? <CheckCircle2 size={18} /> :
                       log.status === 'failed' ? <XCircle size={18} /> :
                       <Play size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold !text-dash-text text-sm">
                        {log.workflows?.name || 'Deleted workflow'}
                      </h4>
                      <div className="flex items-center gap-3 text-xs !text-dash-textMuted mt-1 font-bold">
                        <span className="!text-dash-text">{(log.workflows?.trigger_type || 'unknown').replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>contact {log.contact_id?.split('-')[0]}</span>
                        <span>•</span>
                        <span>{new Date(log.started_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                      log.status === 'completed' ? 'bg-green/10 text-green' :
                      log.status === 'failed' ? 'bg-red/10 text-red' :
                      'bg-amber-100 text-amber-600'
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
