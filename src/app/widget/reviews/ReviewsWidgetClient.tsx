'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewsWidgetClientProps {
  reviews: any[];
}

export default function ReviewsWidgetClient({ reviews }: ReviewsWidgetClientProps) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoPlay = () => {
    stopAutoPlay();
    if (reviews.length > 1) {
      timerRef.current = setInterval(() => {
        setIndex((prev) => (prev + 1) % reviews.length);
      }, 5000); // 5 seconds autoplay duration
    }
  };

  const stopAutoPlay = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, [reviews]);

  const handlePrev = () => {
    stopAutoPlay();
    setIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
    startAutoPlay();
  };

  const handleNext = () => {
    stopAutoPlay();
    setIndex((prev) => (prev + 1) % reviews.length);
    startAutoPlay();
  };

  if (reviews.length === 0) {
    return (
      <div className="w-full h-[180px] bg-slate-900/50 border border-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center text-center p-4">
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">No positive reviews to showcase yet</p>
      </div>
    );
  }

  const review = reviews[index];

  return (
    <div className="w-full h-full min-h-[160px] bg-slate-950/40 border border-white/5 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between relative group select-none overflow-hidden text-slate-200">
      {/* Background radial glow */}
      <div className="absolute top-[-50%] left-[-20%] w-[250px] h-[250px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Quote decoration */}
      <Quote className="absolute right-6 top-6 w-12 h-12 text-white/[0.03] pointer-events-none transform rotate-180" />

      {/* Slide Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center min-h-0">
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "w-3.5 h-3.5",
                star <= review.rating ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.2)]" : "text-slate-700"
              )}
            />
          ))}
        </div>

        <p className="text-xs italic text-slate-300 leading-relaxed line-clamp-3 mb-4 pr-8">
          "{review.body}"
        </p>
      </div>

      {/* Slide Footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/5 pt-3 mt-1 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400">
            {review.reviewer_name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-tight text-white">{review.reviewer_name}</h4>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
              {review.platform === 'google' ? 'Google Customer' : review.platform === 'facebook' ? 'Facebook Customer' : 'Verified Buyer'}
            </span>
          </div>
        </div>

        {/* Carousel controls */}
        {reviews.length > 1 && (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handlePrev}
              className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
            >
              <ChevronLeft size={12} className="text-slate-300" />
            </button>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">
              {index + 1} / {reviews.length}
            </span>
            <button
              onClick={handleNext}
              className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
            >
              <ChevronRight size={12} className="text-slate-300" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
