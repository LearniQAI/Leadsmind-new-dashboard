'use client';

import React from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-3 font-body">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-widest text-t3">
          Student Reviews List (Mock Testimonials)
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          className="h-7 px-2 text-accent2 hover:text-white hover:bg-white/5 text-[9px] uppercase tracking-wider font-bold"
        >
          <Plus size={12} className="mr-1" /> Add Review
        </Button>
      </div>

      {reviews.length === 0 ? (
        <div className="text-xs text-t3 italic p-4 bg-n900/50 rounded-xl border border-white/5 text-center">
          No reviews added. Landing page will fall back to general defaults.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((item, idx) => (
            <div key={idx} className="bg-n900/30 p-3 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  placeholder="Student Name"
                  className="flex-1 bg-[#111d47] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-accent transition-all"
                />
                
                {/* Rating Select */}
                <div className="flex items-center gap-1 bg-[#111d47] border border-white/10 rounded-xl px-2 py-1 select-none">
                  <Star size={11} className="text-amber fill-amber shrink-0" />
                  <select
                    value={item.rating}
                    onChange={(e) => handleItemChange(idx, 'rating', parseFloat(e.target.value))}
                    className="bg-transparent border-none text-xs text-white outline-none cursor-pointer pr-1"
                  >
                    {[5, 4.5, 4, 3.5, 3].map((val) => (
                      <option key={val} value={val} className="bg-n800 text-white">
                        {val}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-2 text-red hover:bg-red/10 rounded-lg border border-transparent hover:border-red/20 transition-all shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              
              <textarea
                value={item.text}
                onChange={(e) => handleItemChange(idx, 'text', e.target.value)}
                placeholder="Review details / feedback quote..."
                rows={2}
                className="w-full bg-[#111d47] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-accent transition-all resize-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
