'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';

interface FAQItem {
  question: string;
  answer: string;
}

interface FaqEditorProps {
  faq: FAQItem[];
  onChange: (faq: FAQItem[]) => void;
}

export default function LandingFaqEditor({ faq, onChange }: FaqEditorProps) {
  const handleAdd = () => {
    onChange([...faq, { question: '', answer: '' }]);
  };

  const handleRemove = (index: number) => {
    const updated = faq.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleItemChange = (index: number, field: keyof FAQItem, val: string) => {
    const updated = [...faq];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-semibold !text-dash-text">
          Custom FAQ accordion
        </label>
        <DashButton type="button" variant="ghost" size="sm" onClick={handleAdd} className="h-7 px-2 text-[12px]">
          <Plus size={12} className="mr-1" /> Add FAQ
        </DashButton>
      </div>

      {faq.length === 0 ? (
        <div className="text-xs !text-dash-textMuted italic p-4 bg-dash-surface rounded-xl border border-dash-border text-center">
          No custom FAQs added. Q&A will show standard templates.
        </div>
      ) : (
        <div className="space-y-3">
          {faq.map((item, idx) => (
            <div key={idx} className="bg-dash-surface p-3 rounded-xl border border-dash-border space-y-2 relative">
              <div className="flex items-center gap-2">
                <DashInput
                  type="text"
                  value={item.question}
                  onChange={(e) => handleItemChange(idx, 'question', e.target.value)}
                  placeholder={`Question ${idx + 1}`}
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
              <DashTextarea
                value={item.answer}
                onChange={(e) => handleItemChange(idx, 'answer', e.target.value)}
                placeholder={`Answer ${idx + 1}`}
                rows={2}
                className="min-h-0 text-xs resize-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
