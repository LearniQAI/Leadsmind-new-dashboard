'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-3 font-body">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-widest text-t3">
          Custom FAQ Accordion
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          className="h-7 px-2 text-accent2 hover:text-white hover:bg-white/5 text-[9px] uppercase tracking-wider font-bold"
        >
          <Plus size={12} className="mr-1" /> Add FAQ
        </Button>
      </div>

      {faq.length === 0 ? (
        <div className="text-xs text-t3 italic p-4 bg-n900/50 rounded-xl border border-white/5 text-center">
          No custom FAQs added. Q&A will show standard templates.
        </div>
      ) : (
        <div className="space-y-3">
          {faq.map((item, idx) => (
            <div key={idx} className="bg-n900/30 p-3 rounded-xl border border-white/5 space-y-2 relative">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => handleItemChange(idx, 'question', e.target.value)}
                  placeholder={`Question ${idx + 1}`}
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
              <textarea
                value={item.answer}
                onChange={(e) => handleItemChange(idx, 'answer', e.target.value)}
                placeholder={`Answer ${idx + 1}`}
                rows={2}
                className="w-full bg-[#111d47] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-accent transition-all resize-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
