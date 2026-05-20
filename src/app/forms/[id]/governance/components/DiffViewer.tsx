'use client';

import React from 'react';
import { GitCompare, Plus, Minus, Edit2, ArrowRight } from 'lucide-react';

interface DiffField {
  id: string;
  label: string;
  type: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  oldVal?: string;
  newVal?: string;
}

interface DiffViewerProps {
  oldSnapshot: any;
  currentDraft: any;
}

export function DiffViewer({ oldSnapshot, currentDraft }: DiffViewerProps) {
  // Compute comparison diff on render
  const oldFields = oldSnapshot?.fields || [];
  const newFields = currentDraft?.fields || [];

  const diffFields: DiffField[] = [];

  // Match fields by ID
  const allFieldIds = Array.from(
    new Set([
      ...oldFields.map((f: any) => f.id),
      ...newFields.map((f: any) => f.id)
    ])
  );

  allFieldIds.forEach((id: string) => {
    const oldF = oldFields.find((f: any) => f.id === id);
    const newF = newFields.find((f: any) => f.id === id);

    if (!oldF && newF) {
      diffFields.push({ id, label: newF.label, type: newF.type, changeType: 'added' });
    } else if (oldF && !newF) {
      diffFields.push({ id, label: oldF.label, type: oldF.type, changeType: 'removed' });
    } else if (oldF && newF) {
      const isModified =
        oldF.label !== newF.label ||
        oldF.type !== newF.type ||
        oldF.required !== newF.required;

      if (isModified) {
        diffFields.push({
          id,
          label: newF.label,
          type: newF.type,
          changeType: 'modified',
          oldVal: `${oldF.label} (${oldF.type}${oldF.required ? ', Required' : ''})`,
          newVal: `${newF.label} (${newF.type}${newF.required ? ', Required' : ''})`
        });
      } else {
        diffFields.push({ id, label: newF.label, type: newF.type, changeType: 'unchanged' });
      }
    }
  });

  return (
    <div className="bg-[#0c1535] border border-white/5 p-4 rounded-xl font-dm-sans flex flex-col gap-4 text-white">
      
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <GitCompare size={14} className="text-blue-400" />
        <h4 className="text-xs font-black uppercase tracking-wider font-space-grotesk">
          Form Layout Differences
        </h4>
      </div>

      {/* Difference grid list */}
      <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
        {diffFields.map((field) => {
          return (
            <div
              key={field.id}
              className={`p-3 rounded-lg border flex items-center justify-between gap-4 text-xs ${
                field.changeType === 'added' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' :
                field.changeType === 'removed' ? 'bg-rose-500/5 border-rose-500/10 text-rose-400' :
                field.changeType === 'modified' ? 'bg-amber-500/5 border-amber-500/10 text-amber-400' :
                'bg-white/2 border-white/5 text-white/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {field.changeType === 'added' && <Plus size={14} />}
                {field.changeType === 'removed' && <Minus size={14} />}
                {field.changeType === 'modified' && <Edit2 size={12} />}
                
                <div className="flex flex-col">
                  <span className="font-bold">{field.label}</span>
                  <span className="text-[9px] opacity-75">ID: {field.id}</span>
                </div>
              </div>

              {/* Old vs new values preview */}
              {field.changeType === 'modified' && (
                <div className="flex items-center gap-2 text-[10px] bg-white/5 px-2.5 py-1 rounded border border-white/5">
                  <span className="line-through text-white/40">{field.oldVal}</span>
                  <ArrowRight size={10} className="text-[#4a5a82]" />
                  <span className="text-amber-400 font-bold">{field.newVal}</span>
                </div>
              )}

              {/* Badges */}
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5">
                {field.changeType}
              </span>
            </div>
          );
        })}

        {diffFields.length === 0 && (
          <div className="py-6 text-center text-white/40 text-[10px] font-bold uppercase tracking-wider">
            No changes detected between these versions.
          </div>
        )}
      </div>

    </div>
  );
}
