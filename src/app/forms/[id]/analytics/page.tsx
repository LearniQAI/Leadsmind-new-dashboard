'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Users, MousePointerClick, TrendingUp, AlertTriangle, Filter, Target, Activity } from 'lucide-react';

import { AIAssistantSidebar } from '../ai/components/AIAssistantSidebar';

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
              onClick={() => router.push('/forms')}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ArrowLeft size={18} className="text-[#4a5a82]" />
            </button>
            <div>
              <h1 className="text-2xl font-space-grotesk font-black uppercase tracking-tight">
                {form?.name} Analytics
              </h1>
              <p className="text-sm text-[#4a5a82] font-dm-sans">Real-time conversion intelligence</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-[#94a3c8] transition-colors">
              <Filter size={14} /> Last 30 Days
            </button>
            <button 
              onClick={() => router.push(`/forms/${params.id}/ab-testing`)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl text-xs font-black uppercase tracking-wider text-white transition-colors"
            >
              <Activity size={14} /> A/B Testing
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Views', value: kpis.views.toLocaleString(), icon: <Users size={18} className="text-blue-500" /> },
            { label: 'Unique Visitors', value: kpis.uniqueVisitors.toLocaleString(), icon: <Target size={18} className="text-indigo-500" /> },
            { label: 'Submissions', value: kpis.submissions.toLocaleString(), icon: <MousePointerClick size={18} className="text-emerald-500" /> },
            { label: 'Conversion Rate', value: `${kpis.conversionRate}%`, icon: <TrendingUp size={18} className="text-rose-500" /> },
          ].map((kpi, i) => (
            <div key={i} className="p-6 bg-[#0c1535] border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/5 rounded-lg">{kpi.icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">{kpi.label}</span>
              </div>
              <p className="text-3xl font-space-grotesk font-black">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Mock Scaffold */}
          <div className="lg:col-span-2 p-6 bg-[#0c1535] border border-white/5 rounded-2xl h-[400px] flex flex-col">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#94a3c8] mb-6">Conversion Trend</h3>
            <div className="flex-1 border border-white/5 border-dashed rounded-xl flex items-center justify-center bg-white/[0.02]">
              <p className="text-xs text-[#4a5a82] font-dm-sans">Timeseries chart rendering area</p>
            </div>
          </div>

          {/* Field Level Insights */}
          <div className="p-6 bg-[#0c1535] border border-white/5 rounded-2xl flex flex-col">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#94a3c8] mb-6 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              Field Drop-off Warnings
            </h3>
            
            <div className="space-y-4">
              {fieldInsights.map((field, i) => (
                <div key={i} className={`p-4 rounded-xl border ${
                  field.status === 'critical' ? 'bg-rose-500/5 border-rose-500/20' :
                  field.status === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-white/5 border-white/5'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-white">{field.fieldName}</span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${
                      field.status === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                      field.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {field.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-dm-sans">
                    <span className="text-[#94a3c8]">Drop-off: <strong className="text-white">{field.dropoffRate}</strong></span>
                    <span className="text-[#94a3c8]">Avg Time: <strong className="text-white">{field.avgTime}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
      <AIAssistantSidebar formId={params.id} />
    </div>
  );
}
