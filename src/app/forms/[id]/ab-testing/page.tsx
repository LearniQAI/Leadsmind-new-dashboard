'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, SplitSquareHorizontal, CheckCircle2, Copy, BarChart3 } from 'lucide-react';

export default function ABTestingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);

  // Scaffolding mock data for A/B testing setup
  const [variants] = useState([
    { id: 'original', name: 'Original Form (Control)', traffic: 50, views: 6200, conversions: 1200, cr: '19.3%' },
    { id: 'variant_b', name: 'Variant B (Minimalist)', traffic: 50, views: 6250, conversions: 2010, cr: '32.1%', winner: true },
  ]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('forms').select('name, id').eq('id', params.id).single();
      setForm(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04081a] p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04081a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push(`/forms/${params.id}/analytics`)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ArrowLeft size={18} className="text-[#4a5a82]" />
            </button>
            <div>
              <h1 className="text-2xl font-space-grotesk font-black uppercase tracking-tight">
                A/B Testing
              </h1>
              <p className="text-sm text-[#4a5a82] font-dm-sans">Optimize {form?.name}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl text-[11px] font-black uppercase tracking-wider text-white transition-colors">
              <SplitSquareHorizontal size={14} /> Create Variant
            </button>
          </div>
        </div>

        {/* Variants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {variants.map((v, i) => (
            <div key={i} className={`p-6 rounded-2xl border ${v.winner ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[#0c1535] border-white/5'} flex flex-col`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-space-grotesk font-bold">{v.name}</h3>
                    {v.winner && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-black uppercase tracking-wider">
                        <CheckCircle2 size={10} /> Winning
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4a5a82] font-dm-sans">Traffic Allocation: {v.traffic}%</p>
                </div>
                
                <div className="flex gap-2">
                  <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#94a3c8] transition-colors" title="Duplicate Variant">
                    <Copy size={14} />
                  </button>
                  <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#94a3c8] transition-colors" title="Variant Analytics">
                    <BarChart3 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-auto">
                <div className="p-4 bg-white/5 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] block mb-1">Views</span>
                  <span className="text-xl font-space-grotesk font-black">{v.views.toLocaleString()}</span>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] block mb-1">Conversions</span>
                  <span className="text-xl font-space-grotesk font-black">{v.conversions.toLocaleString()}</span>
                </div>
                <div className={`p-4 rounded-xl ${v.winner ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] block mb-1">Win Rate</span>
                  <span className={`text-xl font-space-grotesk font-black ${v.winner ? 'text-emerald-400' : 'text-white'}`}>{v.cr}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
