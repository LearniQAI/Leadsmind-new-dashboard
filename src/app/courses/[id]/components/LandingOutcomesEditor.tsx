'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-3 font-body">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-widest text-t3">
          Course Outcomes Checklist (Max 8)
        </label>
        {outcomes.length < 8 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            className="h-7 px-2 text-accent2 hover:text-white hover:bg-white/5 text-[9px] uppercase tracking-wider font-bold"
          >
            <Plus size={12} className="mr-1" /> Add Outcome
          </Button>
        )}
      </div>

      {outcomes.length === 0 ? (
        <div className="text-xs text-t3 italic p-4 bg-n900/50 rounded-xl border border-white/5 text-center">
          No outcomes added. Bullet points will use default values.
        </div>
      ) : (
        <div className="space-y-2">
          {outcomes.map((outcome, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={outcome}
                onChange={(e) => handleTextChange(idx, e.target.value)}
                placeholder={`e.g. Understand the fundamentals of SEO`}
                className="flex-1 bg-[#111d47] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-accent transition-all"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-2 text-red hover:bg-red/10 rounded-lg border border-transparent hover:border-red/20 transition-all shrink-0"
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
