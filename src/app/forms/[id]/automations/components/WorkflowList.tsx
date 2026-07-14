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
    <div className="w-80 bg-white border border-dash-border rounded-2xl flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-dash-border flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold !text-dash-text">Form workflows</h3>
          <p className="text-[10px] !text-dash-textMuted">Automations attached to this form</p>
        </div>
        <button
          onClick={onCreate}
          className="p-2 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-lg transition-colors motion-reduce:transition-none flex items-center justify-center"
          title="Create Workflow"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
        {workflows.length === 0 ? (
          <div className="text-center p-8 !text-dash-textMuted">
            <Zap size={24} className="mx-auto opacity-30 mb-2" />
            <p className="text-[11px] font-bold">No workflows configured</p>
            <p className="text-[10px] mt-1">Create your first trigger-action workflow.</p>
          </div>
        ) : (
          workflows.map((wf) => {
            const isSelected = wf.id === selectedId;
            return (
              <div
                key={wf.id}
                onClick={() => onSelect(wf.id)}
                className={`p-3 rounded-xl border transition-colors motion-reduce:transition-none cursor-pointer flex flex-col gap-2 relative ${
                  isSelected
                    ? 'bg-dash-accent/10 border-dash-accent/30'
                    : 'bg-dash-surface border-dash-border hover:border-dash-text/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold !text-dash-text truncate pr-4">
                    {wf.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleActive(wf.id, wf.is_active);
                      }}
                      className="p-1 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
                      title={wf.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {wf.is_active ? (
                        <ToggleRight className="text-green" size={16} />
                      ) : (
                        <ToggleLeft size={16} />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(wf.id);
                      }}
                      className="p-1 !text-dash-textMuted hover:text-red transition-colors motion-reduce:transition-none"
                      title="Delete Workflow"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[9px] font-bold !text-dash-textMuted">
                  <span className="px-1.5 py-0.5 bg-dash-surface rounded !text-dash-textMuted">
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
