// @ts-nocheck
'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Filter
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const data = [
  { name: 'Mon', leads: 40, sales: 24, conversion: 2.4 },
  { name: 'Tue', leads: 30, sales: 13, conversion: 2.1 },
  { name: 'Wed', leads: 20, sales: 98, conversion: 2.9 },
  { name: 'Thu', leads: 27, sales: 39, conversion: 2.0 },
  { name: 'Fri', leads: 18, sales: 48, conversion: 2.8 },
  { name: 'Sat', leads: 23, sales: 38, conversion: 2.5 },
  { name: 'Sun', leads: 34, sales: 43, conversion: 2.7 },
];

const COLORS = ['#1359FF', '#6c47ff', '#3b82f6', '#0ea5e9'];

export default function AnalyticsClient({ stats }: { stats: any }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Neural Reporting</h2>
          <p className="text-white/40 text-sm font-medium">Real-time performance metrics across your business ecosystem.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => toast.info("Opening Neural Data Filter...")}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all"
          >
            <Filter size={14} />
            Filter Data
          </button>
          <button 
            onClick={() => toast.success("Generating Neural PDF Report...")}
            className="bg-primary text-white rounded-xl px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Leads" 
          value={stats.leads} 
          change="+12.5%" 
          trend="up" 
          icon={<Users className="text-primary" />} 
        />
        <MetricCard 
          title="Neural Orders" 
          value={stats.orders} 
          change="+18.2%" 
          trend="up" 
          icon={<DollarSign className="text-primary" />} 
        />
        <MetricCard 
          title="Conversations" 
          value={stats.conversations} 
          change="-4.1%" 
          trend="down" 
          icon={<Zap className="text-primary" />} 
        />
        <MetricCard 
          title="Active Tasks" 
          value={stats.tasks} 
          change="+2.4%" 
          trend="up" 
          icon={<Activity className="text-primary" />} 
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-[#0b0b1a] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-lg font-black text-white uppercase tracking-tighter">Conversion Velocity</h4>
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">7-Day Neural Performance</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Target</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1359FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1359FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#ffffff30', fontSize: 10, fontWeight: 900}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#ffffff30', fontSize: 10, fontWeight: 900}} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#050510', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#1359FF" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#0b0b1a] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="flex flex-col h-full">
            <div className="mb-8">
              <h4 className="text-lg font-black text-white uppercase tracking-tighter">Task Allocation</h4>
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Subsystem Resource Distribution</p>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'CRM', value: 400 },
                      { name: 'Funnels', value: 300 },
                      { name: 'Email', value: 300 },
                      { name: 'AI', value: 200 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 mt-8">
              <ResourceItem label="CRM Operations" value="40%" color="#1359FF" />
              <ResourceItem label="Funnel Traffic" value="30%" color="#6c47ff" />
              <ResourceItem label="Neural Processing" value="30%" color="#3b82f6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, trend, icon }: any) {
  return (
    <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 shadow-xl hover:border-primary/30 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <Badge className={`text-[9px] font-black uppercase tracking-widest border-none ${trend === 'up' ? 'bg-success/10 text-success' : 'bg-rose-500/10 text-rose-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={10} className="mr-1" /> : <ArrowDownRight size={10} className="mr-1" />}
          {change}
        </Badge>
      </div>
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">{title}</span>
        <span className="text-3xl font-black text-white">{value}</span>
      </div>
    </div>
  );
}

function ResourceItem({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-[10px] font-black text-white uppercase tracking-widest">{value}</span>
    </div>
  );
}
