'use client';

import React from 'react';
import { Plus, Power, ToggleLeft, ToggleRight, Trash2, Zap } from 'lucide-react';

interface WorkflowListProps {
  workflows: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}

export function WorkflowList({
  workflows,
  selectedId,
  onSelect,
  onCreate,
  onToggleActive,
  onDelete
}: WorkflowListProps) {
  return (
    <div className="w-80 bg-[#0c1535] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-white font-space-grotesk">Form Workflows</h3>
          <p className="text-[10px] text-[#4a5a82] font-dm-sans">Automations attached to this form</p>
        </div>
        <button
          onClick={onCreate}
          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
          title="Create Workflow"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
        {workflows.length === 0 ? (
          <div className="text-center p-8 text-[#4a5a82]">
            <Zap size={24} className="mx-auto opacity-30 mb-2" />
            <p className="text-[11px] font-bold uppercase tracking-wider">No Workflows Configured</p>
            <p className="text-[10px] mt-1">Create your first trigger-action workflow.</p>
          </div>
        ) : (
          workflows.map((wf) => {
            const isSelected = wf.id === selectedId;
            return (
              <div
                key={wf.id}
                onClick={() => onSelect(wf.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500/30'
                    : 'bg-white/2 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold text-white font-space-grotesk truncate pr-4">
                    {wf.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleActive(wf.id, wf.is_active);
                      }}
                      className="p-1 text-[#4a5a82] hover:text-white transition-colors"
                      title={wf.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {wf.is_active ? (
                        <ToggleRight className="text-emerald-400" size={16} />
                      ) : (
                        <ToggleLeft size={16} />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(wf.id);
                      }}
                      className="p-1 text-[#4a5a82] hover:text-rose-400 transition-colors"
                      title="Delete Workflow"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-[#4a5a82]">
                  <span className="px-1.5 py-0.5 bg-white/5 rounded text-white/70">
                    {wf.trigger_type.replace(/_/g, ' ')}
                  </span>
                  <span>•</span>
                  <span>{wf.steps_count || 0} Action steps</span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
