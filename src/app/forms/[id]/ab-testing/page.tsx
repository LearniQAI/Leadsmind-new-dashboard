'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, SplitSquareHorizontal, CheckCircle2, Copy, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';

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
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white !text-dash-text p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/forms/${params.id}/analytics`)}
              className="p-2 bg-dash-surface hover:bg-dash-border/60 rounded-xl transition-colors motion-reduce:transition-none"
            >
              <ArrowLeft size={18} className="!text-dash-textMuted" />
            </button>
            <div>
              <h1 className="text-2xl font-bold !text-dash-text">
                A/B testing
              </h1>
              <p className="text-sm !text-dash-textMuted">Optimize {form?.name}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <DashButton>
              <SplitSquareHorizontal size={14} /> Create variant
            </DashButton>
          </div>
        </div>

        {/* Variants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {variants.map((v, i) => (
            <DashCard key={i} padding="default" className={cn("flex flex-col", v.winner && "bg-green/5 border-green/30")}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold !text-dash-text">{v.name}</h3>
                    {v.winner && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green/10 text-green rounded text-[9px] font-bold">
                        <CheckCircle2 size={10} /> Winning
                      </span>
                    )}
                  </div>
                  <p className="text-xs !text-dash-textMuted">Traffic allocation: {v.traffic}%</p>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 bg-dash-surface hover:bg-dash-border/60 rounded-lg !text-dash-textMuted transition-colors motion-reduce:transition-none" title="Duplicate Variant">
                    <Copy size={14} />
                  </button>
                  <button className="p-2 bg-dash-surface hover:bg-dash-border/60 rounded-lg !text-dash-textMuted transition-colors motion-reduce:transition-none" title="Variant Analytics">
                    <BarChart3 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-auto">
                <div className="p-4 bg-dash-surface rounded-xl">
                  <span className="text-[10px] font-bold !text-dash-textMuted block mb-1">Views</span>
                  <span className="text-xl font-bold !text-dash-text">{v.views.toLocaleString()}</span>
                </div>
                <div className="p-4 bg-dash-surface rounded-xl">
                  <span className="text-[10px] font-bold !text-dash-textMuted block mb-1">Conversions</span>
                  <span className="text-xl font-bold !text-dash-text">{v.conversions.toLocaleString()}</span>
                </div>
                <div className={cn("p-4 rounded-xl", v.winner ? 'bg-green/10' : 'bg-dash-surface')}>
                  <span className="text-[10px] font-bold !text-dash-textMuted block mb-1">Win rate</span>
                  <span className={cn("text-xl font-bold", v.winner ? 'text-green' : '!text-dash-text')}>{v.cr}</span>
                </div>
              </div>
            </DashCard>
          ))}
        </div>
      </div>
    </div>
  );
}
