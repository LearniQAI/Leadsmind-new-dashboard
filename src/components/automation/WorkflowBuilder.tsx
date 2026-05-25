'use client';

import React, { useState } from 'react';
import { Settings, Plus, Zap, ArrowDown, Trash2, Power, Play } from 'lucide-react';
import { toggleWorkflowActive, deleteWorkflow } from '@/app/actions/automation-workspace';

export function WorkflowBuilder({ workflows }: { workflows: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (id: string, currentState: boolean) => {
    setLoadingId(id);
    await toggleWorkflowActive(id, currentState);
    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    setLoadingId(id);
    await deleteWorkflow(id);
    setLoadingId(null);
  };

  return (
    <div className="space-y-6">
      {workflows.length === 0 ? (
        <div className="text-center p-12 bg-n800 border border-white/10 rounded-3xl">
          <Settings size={48} className="text-t4 mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-space font-bold text-white mb-2">No active workflows</h3>
          <p className="text-t3 mb-6">Create deterministic operational flows to automate your pipeline.</p>
          <button className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors inline-flex items-center gap-2 shadow-lg shadow-accent/20">
            <Plus size={18} /> Build First Workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((workflow) => (
            <div key={workflow.id} className={`bg-n800 border rounded-3xl p-6 transition-all ${
              workflow.is_active ? 'border-accent/30 shadow-lg shadow-accent/5' : 'border-white/10 opacity-70'
            }`}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-space font-bold text-white flex items-center gap-2">
                    {workflow.name}
                    {!workflow.is_active && <span className="text-[10px] bg-white/10 text-t4 px-2 py-0.5 rounded uppercase tracking-widest font-bold">Paused</span>}
                  </h3>
                  <p className="text-sm text-t4 mt-1">{workflow.description || 'Operational Workflow'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleToggle(workflow.id, workflow.is_active)}
                    disabled={loadingId === workflow.id}
                    className={`p-2 rounded-xl transition-colors ${workflow.is_active ? 'text-amber-400 hover:bg-amber-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
                    title={workflow.is_active ? 'Pause Workflow' : 'Activate Workflow'}
                  >
                    <Power size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(workflow.id)}
                    disabled={loadingId === workflow.id}
                    className="p-2 text-t4 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Linear Flow Representation */}
              <div className="bg-n900 border border-white/5 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0">
                    <Zap size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-t4 uppercase tracking-widest mb-1">When Triggered By</p>
                    <p className="text-sm text-white font-semibold">
                      {workflow.workflow_triggers?.[0]?.event_type?.replace(/_/g, ' ') || 'Manual Execution'}
                    </p>
                  </div>
                </div>

                <div className="ml-[15px] my-2 w-px h-6 bg-white/10" />

                <div className="space-y-4">
                  {(workflow.workflow_actions || []).map((action: any, i: number) => (
                    <div key={action.id} className="flex items-start gap-4 relative">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center shrink-0 z-10">
                        <Play size={14} />
                      </div>
                      {i !== (workflow.workflow_actions || []).length - 1 && (
                        <div className="absolute top-8 left-[15px] w-px h-8 bg-white/10" />
                      )}
                      <div>
                        <p className="text-[10px] font-bold text-t4 uppercase tracking-widest mb-1">Then Perform</p>
                        <p className="text-sm text-white font-semibold capitalize">
                          {action.action_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-t4 font-bold uppercase tracking-wider">
                <span>{workflow.execution_count} Executions</span>
                <span>ID: {workflow.id.split('-')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
