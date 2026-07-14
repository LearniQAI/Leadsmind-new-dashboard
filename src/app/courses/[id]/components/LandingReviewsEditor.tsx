'use client';

import React from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';

interface ReviewItem {
  name: string;
  rating: number;
  text: string;
}

interface ReviewsEditorProps {
  reviews: ReviewItem[];
  onChange: (reviews: ReviewItem[]) => void;
}

export default function LandingReviewsEditor({ reviews, onChange }: ReviewsEditorProps) {
  const handleAdd = () => {
    onChange([...reviews, { name: '', rating: 5, text: '' }]);
  };

  const handleRemove = (index: number) => {
    const updated = reviews.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleItemChange = (index: number, field: keyof ReviewItem, val: any) => {
    const updated = [...reviews];
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
          Student reviews (sample testimonials)
        </label>
        <DashButton type="button" variant="ghost" size="sm" onClick={handleAdd} className="h-7 px-2 text-[12px]">
          <Plus size={12} className="mr-1" /> Add review
        </DashButton>
      </div>

      {reviews.length === 0 ? (
        <div className="text-xs !text-dash-textMuted italic p-4 bg-dash-surface rounded-xl border border-dash-border text-center">
          No reviews added. Landing page will fall back to general defaults.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((item, idx) => (
            <div key={idx} className="bg-dash-surface p-3 rounded-xl border border-dash-border space-y-2">
              <div className="flex items-center gap-3">
                <DashInput
                  type="text"
                  value={item.name}
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  placeholder="Student name"
                  className="flex-1 h-10 text-xs"
                />

                {/* Rating select */}
                <div className="flex items-center gap-1 bg-white border border-dash-border rounded-xl px-2 py-1 select-none">
                  <Star size={11} className="text-amber-600 fill-amber-600 shrink-0" />
                  <select
                    value={item.rating}
                    onChange={(e) => handleItemChange(idx, 'rating', parseFloat(e.target.value))}
                    className="bg-transparent border-none text-xs !text-dash-text outline-none cursor-pointer pr-1"
                  >
                    {[5, 4.5, 4, 3.5, 3].map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-2 text-red hover:bg-red/10 rounded-lg border border-transparent hover:border-red/20 transition-all motion-reduce:transition-none shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <DashTextarea
                value={item.text}
                onChange={(e) => handleItemChange(idx, 'text', e.target.value)}
                placeholder="Review details / feedback quote..."
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
