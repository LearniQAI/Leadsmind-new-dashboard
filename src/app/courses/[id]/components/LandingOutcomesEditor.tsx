'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput } from '@/components/dashboard-ui/FormField';

interface OutcomesEditorProps {
  outcomes: string[];
  onChange: (outcomes: string[]) => void;
}

export default function LandingOutcomesEditor({ outcomes, onChange }: OutcomesEditorProps) {
  const handleAdd = () => {
    onChange([...outcomes, '']);
  };

  const handleRemove = (index: number) => {
    const updated = outcomes.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleTextChange = (index: number, val: string) => {
    const updated = [...outcomes];
    updated[index] = val;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-semibold !text-dash-text">
          Course outcomes checklist (max 8)
        </label>
        {outcomes.length < 8 && (
          <DashButton type="button" variant="ghost" size="sm" onClick={handleAdd} className="h-7 px-2 text-[12px]">
            <Plus size={12} className="mr-1" /> Add outcome
          </DashButton>
        )}
      </div>

      {outcomes.length === 0 ? (
        <div className="text-xs !text-dash-textMuted italic p-4 bg-dash-surface rounded-xl border border-dash-border text-center">
          No outcomes added. Bullet points will use default values.
        </div>
      ) : (
        <div className="space-y-2">
          {outcomes.map((outcome, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <DashInput
                type="text"
                value={outcome}
                onChange={(e) => handleTextChange(idx, e.target.value)}
                placeholder="e.g. Understand the fundamentals of SEO"
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
