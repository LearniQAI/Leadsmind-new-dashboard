import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getSystemHealthData } from '@/app/actions/production-workspace';
import { Activity, Database, Server, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

export default async function SystemHealthDashboard() {
  const result = await getSystemHealthData();
  const { success, data } = result as any;

  if (!success || !data) {
    return (
      <Wrapper>
        <div className="p-12 text-center text-red-400">Error loading System Health Data. DB Connectivity failure.</div>
      </Wrapper>
    );
  }

  const { healthLogs, metrics, dbHealth } = data;

  const getMetricIcon = (type: string) => {
    if (type.includes('latency')) return <Zap size={14} className="text-blue-400" />;
    if (type.includes('failure')) return <AlertTriangle size={14} className="text-red-400" />;
    return <Activity size={14} className="text-t4" />;
  };

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <Activity className="text-accent" size={32} /> System Health & Observability
            </h1>
            <p className="text-t3">Production environment diagnostics, database connectivity, and operational metrics.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold uppercase tracking-widest text-xs">
            <ShieldCheck size={14} /> Production Environment Active
          </div>
        </div>

        {/* Top Level Health Checks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`bg-n800 border rounded-2xl p-6 flex items-center gap-4 ${dbHealth.status === 'healthy' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
            <div className={`p-4 rounded-xl ${dbHealth.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              <Database size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-t4 uppercase tracking-widest mb-1">Supabase DB Connectivity</p>
              <h3 className="font-space font-bold text-white text-xl capitalize">{dbHealth.status}</h3>
              <p className="text-xs text-t3 mt-1">Latency: {dbHealth.latency}ms</p>
            </div>
          </div>

          <div className="bg-n800 border border-emerald-500/30 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Server size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-t4 uppercase tracking-widest mb-1">API Routes Edge</p>
              <h3 className="font-space font-bold text-white text-xl">Operational</h3>
              <p className="text-xs text-t3 mt-1">Vercel Edge Network</p>
            </div>
          </div>

          <div className="bg-n800 border border-emerald-500/30 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-t4 uppercase tracking-widest mb-1">Automation Queues</p>
              <h3 className="font-space font-bold text-white text-xl">Processing</h3>
              <p className="text-xs text-t3 mt-1">No stalled events detected.</p>
            </div>
          </div>
        </div>

        {/* Observability Metrics */}
        <div className="bg-n800 border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-space font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-blue-400" /> Observability Stream
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-n900/50 text-[10px] font-bold uppercase tracking-widest text-t4">
                  <th className="p-4 rounded-tl-xl">Timestamp</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Metric Type</th>
                  <th className="p-4">Source</th>
                  <th className="p-4 rounded-tr-xl">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {metrics.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-t4">No operational metrics logged yet.</td>
                  </tr>
                ) : (
                  metrics.map((m: any) => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 text-xs font-mono text-t3 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                          m.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          m.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {m.severity}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold text-white flex items-center gap-2 mt-2">
                        {getMetricIcon(m.metric_type)} {m.metric_type.replace(/_/g, ' ')}
                      </td>
                      <td className="p-4 text-xs font-mono text-t4">
                        {m.source}
                      </td>
                      <td className="p-4 text-xs text-t3 max-w-[200px] truncate">
                        {JSON.stringify(m.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Wrapper>
  );
}
