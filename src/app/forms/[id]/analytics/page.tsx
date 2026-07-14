'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Users, MousePointerClick, TrendingUp, AlertTriangle, Filter, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';

export default function FormAnalyticsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);

  // Scaffolding mock data for the visual UI (in a real app this comes from API/Supabase)
  const [kpis] = useState({
    views: 12450,
    uniqueVisitors: 9840,
    submissions: 3210,
    conversionRate: 25.8
  });

  const [fieldInsights] = useState([
    { fieldName: 'Company Size', type: 'dropdown', dropoffRate: '12%', avgTime: '4.2s', status: 'warning' },
    { fieldName: 'Phone Number', type: 'phone', dropoffRate: '8%', avgTime: '3.1s', status: 'stable' },
    { fieldName: 'Project Budget', type: 'dropdown', dropoffRate: '18%', avgTime: '6.5s', status: 'critical' },
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
              onClick={() => router.push('/forms')}
              className="p-2 bg-dash-surface hover:bg-dash-border/60 rounded-xl transition-colors motion-reduce:transition-none"
            >
              <ArrowLeft size={18} className="!text-dash-textMuted" />
            </button>
            <div>
              <h1 className="text-2xl font-bold !text-dash-text">
                {form?.name} analytics
              </h1>
              <p className="text-sm !text-dash-textMuted">Real-time conversion intelligence</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-dash-surface hover:bg-dash-border/60 border border-dash-border rounded-xl text-xs font-bold !text-dash-textMuted transition-colors motion-reduce:transition-none">
              <Filter size={14} /> Last 30 days
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total views', value: kpis.views.toLocaleString(), icon: <Users size={18} className="text-dash-accent" /> },
            { label: 'Unique visitors', value: kpis.uniqueVisitors.toLocaleString(), icon: <Target size={18} className="text-purple-600" /> },
            { label: 'Submissions', value: kpis.submissions.toLocaleString(), icon: <MousePointerClick size={18} className="text-green" /> },
            { label: 'Conversion rate', value: `${kpis.conversionRate}%`, icon: <TrendingUp size={18} className="text-red" /> },
          ].map((kpi, i) => (
            <DashCard key={i} padding="default">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-dash-surface rounded-lg">{kpi.icon}</div>
                <span className="text-[10px] font-bold !text-dash-textMuted">{kpi.label}</span>
              </div>
              <p className="text-3xl font-bold !text-dash-text">{kpi.value}</p>
            </DashCard>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Chart Mock Scaffold */}
          <DashCard padding="default" className="lg:col-span-2 h-[400px] flex flex-col">
            <h3 className="text-[11px] font-bold !text-dash-textMuted mb-6">Conversion trend</h3>
            <div className="flex-1 border border-dash-border border-dashed rounded-xl flex items-center justify-center bg-dash-surface">
              <p className="text-xs !text-dash-textMuted">Timeseries chart rendering area</p>
            </div>
          </DashCard>

          {/* Field Level Insights */}
          <DashCard padding="default" className="flex flex-col">
            <h3 className="text-[11px] font-bold !text-dash-textMuted mb-6 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-600" />
              Field drop-off warnings
            </h3>

            <div className="space-y-4">
              {fieldInsights.map((field, i) => (
                <div key={i} className={cn(
                  "p-4 rounded-xl border",
                  field.status === 'critical' ? 'bg-red/5 border-red/20' :
                  field.status === 'warning' ? 'bg-amber-50 border-amber-200' :
                  'bg-dash-surface border-dash-border'
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold !text-dash-text">{field.fieldName}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded",
                      field.status === 'critical' ? 'bg-red/10 text-red' :
                      field.status === 'warning' ? 'bg-amber-100 text-amber-600' :
                      'bg-green/10 text-green'
                    )}>
                      {field.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="!text-dash-textMuted">Drop-off: <strong className="!text-dash-text">{field.dropoffRate}</strong></span>
                    <span className="!text-dash-textMuted">Avg time: <strong className="!text-dash-text">{field.avgTime}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </DashCard>

        </div>
      </div>
    </div>
  );
}
