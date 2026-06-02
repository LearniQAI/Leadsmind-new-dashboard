'use client';

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  platform: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  review_url?: string;
  verified: boolean;
  published_at?: string;
  created_at: string;
}

interface ReviewsWidgetProps {
  workspaceId: string;
}

export default function ReviewsWidget({ workspaceId }: ReviewsWidgetProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    const fetchReviews = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/reputation/reviews?workspaceId=${workspaceId}`);
        if (!res.ok) throw new Error('Failed to fetch reviews');
        const data = await res.json();
        setReviews(data);
      } catch (err) {
        console.error('[ReviewsWidget] Error fetching:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="animate-pulse bg-[rgba(12,21,53,0.4)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 h-44 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5" />
                  <div className="space-y-1">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-2 w-12 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="h-4 w-12 bg-white/5 rounded-full" />
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="w-3.5 h-3.5 bg-white/5 rounded-full" />
                ))}
              </div>
              <div className="h-3 w-full bg-white/5 rounded" />
            </div>
            <div className="h-2 w-16 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="col-span-full py-20 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
          <Star className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          No Reviews Yet
        </h3>
        <p className="text-slate-500 text-[11px] font-bold mt-2 uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Send review requests to start collecting feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.13)] rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl relative group text-slate-200"
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs select-none">
                  {review.reviewer_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {review.reviewer_name}
                  </h4>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {review.published_at ? new Date(review.published_at).toLocaleDateString() : new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <span className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border shrink-0",
                review.platform === 'google' 
                  ? "bg-red-500/5 text-red-400 border-red-500/10" 
                  : review.platform === 'facebook' 
                  ? "bg-blue-500/5 text-blue-400 border-blue-500/10" 
                  : "bg-amber-500/5 text-amber-400 border-amber-500/10"
              )} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {review.platform}
              </span>
            </div>

            <div className="flex items-center gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-3.5 h-3.5",
                    i <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-700"
                  )}
                />
              ))}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed italic" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              "{review.review_text || 'No review message left.'}"
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
