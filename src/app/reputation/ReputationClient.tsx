'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare, ExternalLink, Globe, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ReputationClient({ initialReviews }: { initialReviews: any[] }) {
  const avgRating = initialReviews.length > 0 
    ? (initialReviews.reduce((acc, r) => acc + r.rating, 0) / initialReviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic leading-none">Neural <span className="text-primary">Reputation</span></h1>
          <p className="text-white/40 text-sm font-medium mt-2 italic">Monitor and dominate your industry's public perception.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-[#0b0b1a] border border-white/10 rounded-2xl px-6 py-2 flex items-center gap-4 shadow-lg shadow-black/40">
             <div className="flex items-center gap-1">
               {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= Number(avgRating) ? 'fill-warning text-warning' : 'text-white/10'}`} />)}
             </div>
             <span className="text-xl font-black text-white italic">{avgRating}</span>
             <span className="text-[10px] font-black text-white/20 uppercase tracking-widest border-l border-white/10 pl-4">{initialReviews.length} Reviews</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xxl:grid-cols-3 gap-6">
        {initialReviews.length === 0 ? (
          <div className="col-span-full py-20 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
              <Star className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-lg font-black uppercase text-white/40 tracking-widest">No Public Reviews</h3>
            <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-widest">Connect Google or Facebook to sync reputation data</p>
          </div>
        ) : (
          initialReviews.map(review => (
            <div key={review.id} className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 group hover:border-primary/50 transition-all duration-500 shadow-xl shadow-black/40">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold">
                    {review.reviewer_name?.[0] || 'A'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{review.reviewer_name}</h4>
                    <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{new Date(review.review_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30">
                  {review.platform === 'google' ? <Globe className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>
              </div>

              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-warning text-warning' : 'text-white/10'}`} />)}
              </div>

              <p className="text-sm text-white/60 leading-relaxed italic line-clamp-4 mb-6">"{review.body}"</p>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <Badge className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none bg-primary/10 text-primary">
                  Verified
                </Badge>
                <Button variant="ghost" className="h-10 px-4 text-white/30 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  View Source <ExternalLink size={12} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
