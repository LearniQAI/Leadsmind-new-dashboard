'use client';

import React from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, 
  AlertCircle, Activity, ArrowUpRight 
} from 'lucide-react';

interface InvoicePerformanceDashboardProps {
  metrics: {
    total_collected: number;
    total_overdue: number;
    bad_debt_total: number;
  };
}

const InvoicePerformanceDashboard: React.FC<InvoicePerformanceDashboardProps> = ({
  metrics,
}) => {
  const stats = [
    {
      label: 'Total Collected',
      value: `$${(metrics.total_collected || 0).toLocaleString()}`,
      change: '+12.5%',
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Overdue Revenue',
      value: `$${(metrics.total_overdue || 0).toLocaleString()}`,
      change: '-2.4%',
      icon: AlertCircle,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10'
    },
    {
      label: 'Bad Debt (Write-offs)',
      value: `$${(metrics.bad_debt_total || 0).toLocaleString()}`,
      change: 'Stable',
      icon: TrendingDown,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      label: 'Avg. Collection Time',
      value: '14 Days',
      change: '-3 Days',
      icon: Activity,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[var(--n800)] border border-[var(--bdr)] p-6 rounded-[var(--r24)] shadow-xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
               <stat.icon size={64} />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${stat.bg} ${stat.color}`}>
                {stat.change}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold font-space text-[var(--t1)] tabular-nums">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simplified Chart Placeholder */}
        <div className="lg:col-span-2 bg-[var(--n800)] border border-[var(--bdr)] p-8 rounded-[var(--r24)] h-[400px] flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-sm font-bold text-[var(--t1)] uppercase tracking-wide">Revenue Flow</h3>
                 <p className="text-[10px] text-[var(--t3)] uppercase tracking-widest font-semibold">Monthly collection performance</p>
              </div>
              <select className="bg-[var(--n900)] border border-[var(--bdr)] rounded-[var(--r8)] text-[10px] font-bold uppercase p-2 outline-none">
                 <option>Last 6 Months</option>
                 <option>Last Year</option>
              </select>
           </div>
           
           <div className="flex-1 flex items-end gap-3 pb-4">
              {[65, 45, 75, 55, 90, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-[var(--accentg)] border border-[var(--accent)]/10 rounded-t-lg relative group transition-all hover:bg-[var(--accent)]/20" style={{ height: `${h}%` }}>
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--n900)] border border-[var(--bdr)] px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      ${(h * 100).toLocaleString()}
                   </div>
                </div>
              ))}
           </div>
           
           <div className="flex justify-between text-[10px] font-black text-[var(--t4)] uppercase tracking-widest pt-4 border-t border-[var(--bdr)]">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
           </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
           <div className="bg-blue-600 rounded-[var(--r24)] p-8 text-white relative overflow-hidden group cursor-pointer">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                 <Activity size={120} />
              </div>
              <h4 className="text-xl font-black uppercase tracking-tighter mb-2">Automate Recovery</h4>
              <p className="text-[11px] font-bold opacity-80 mb-6">Enable AI-driven collection cycles for overdue documents.</p>
              <button className="bg-white text-blue-600 h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                 Configure <ArrowUpRight size={14} />
              </button>
           </div>

           <div className="bg-[var(--n800)] border border-[var(--bdr)] p-8 rounded-[var(--r24)]">
              <h4 className="text-xs font-black uppercase tracking-widest text-[var(--t3)] mb-6">Status Composition</h4>
              <div className="space-y-4">
                 {[
                   { label: 'Paid', percent: 72, color: 'bg-emerald-500' },
                   { label: 'Overdue', percent: 18, color: 'bg-rose-500' },
                   { label: 'Draft', percent: 10, color: 'bg-[var(--t4)]' },
                 ].map((item, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                         <span className="text-[var(--t3)]">{item.label}</span>
                         <span className="text-[var(--t1)]">{item.percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--n900)] rounded-full overflow-hidden">
                         <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePerformanceDashboard;
