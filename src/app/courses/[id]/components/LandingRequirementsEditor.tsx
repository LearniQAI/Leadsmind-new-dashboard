'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput } from '@/components/dashboard-ui/FormField';

// Same simple string-list shape/UI as LandingOutcomesEditor — "Requirements" has no
// pre-existing landing_page_settings field to reuse, so this mirrors that editor's real,
// already-shipped pattern instead of inventing a new one.
interface RequirementsEditorProps {
  requirements: string[];
  onChange: (requirements: string[]) => void;
}

export default function LandingRequirementsEditor({ requirements, onChange }: RequirementsEditorProps) {
  const handleAdd = () => {
    onChange([...requirements, '']);
  };

  const handleRemove = (index: number) => {
    onChange(requirements.filter((_, i) => i !== index));
  };

  const handleTextChange = (index: number, val: string) => {
    const updated = [...requirements];
    updated[index] = val;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-semibold !text-dash-text">
          Requirements (max 8)
        </label>
        {requirements.length < 8 && (
          <DashButton type="button" variant="ghost" size="sm" onClick={handleAdd} className="h-7 px-2 text-[12px]">
            <Plus size={12} className="mr-1" /> Add requirement
          </DashButton>
        )}
      </div>

      {requirements.length === 0 ? (
        <div className="text-xs !text-dash-textMuted italic p-4 bg-dash-surface rounded-xl border border-dash-border text-center">
          No requirements added. The section is hidden on the live page until you add one.
        </div>
      ) : (
        <div className="space-y-2">
          {requirements.map((req, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <DashInput
                type="text"
                value={req}
                onChange={(e) => handleTextChange(idx, e.target.value)}
                placeholder="e.g. No prior experience needed"
                className="flex-1 h-10 text-xs"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-2 text-red hover:bg-red/10 rounded-lg border border-transparent hover:border-red/20 transition-all motion-reduce:transition-none shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
