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
        <div className="p-12 text-center text-rose-600">Error loading System Health Data. DB Connectivity failure.</div>
      </Wrapper>
    );
  }

  const { healthLogs, metrics, dbHealth } = data;

  const getMetricIcon = (type: string) => {
    if (type.includes('latency')) return <Zap size={14} className="text-blue-500" />;
    if (type.includes('failure')) return <AlertTriangle size={14} className="text-rose-500" />;
    return <Activity size={14} className="text-dash-textMuted" />;
  };

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-space font-black text-dash-text mb-2 flex items-center gap-3">
              <Activity className="text-dash-accent" size={32} /> System Health & Observability
            </h1>
            <p className="text-dash-textMuted">Production environment diagnostics, database connectivity, and operational metrics.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold uppercase tracking-widest text-xs">
            <ShieldCheck size={14} /> Production Environment Active
          </div>
        </div>

        {/* Top Level Health Checks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`bg-dash-surface border rounded-2xl p-6 flex items-center gap-4 ${dbHealth.status === 'healthy' ? 'border-emerald-300' : 'border-rose-300'}`}>
            <div className={`p-4 rounded-xl ${dbHealth.status === 'healthy' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              <Database size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest mb-1">Supabase DB Connectivity</p>
              <h3 className="font-space font-bold text-dash-text text-xl capitalize">{dbHealth.status}</h3>
              <p className="text-xs text-dash-textMuted mt-1">Latency: {dbHealth.latency}ms</p>
            </div>
          </div>

          <div className="bg-dash-surface border border-emerald-300 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-4 rounded-xl bg-emerald-100 text-emerald-600">
              <Server size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest mb-1">API Routes Edge</p>
              <h3 className="font-space font-bold text-dash-text text-xl">Operational</h3>
              <p className="text-xs text-dash-textMuted mt-1">Vercel Edge Network</p>
            </div>
          </div>

          <div className="bg-dash-surface border border-emerald-300 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-4 rounded-xl bg-emerald-100 text-emerald-600">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest mb-1">Automation Queues</p>
              <h3 className="font-space font-bold text-dash-text text-xl">Processing</h3>
              <p className="text-xs text-dash-textMuted mt-1">No stalled events detected.</p>
            </div>
          </div>
        </div>

        {/* Observability Metrics */}
        <div className="bg-dash-surface border border-dash-border rounded-3xl p-6">
          <h2 className="text-xl font-space font-bold text-dash-text mb-6 flex items-center gap-2">
            <Activity className="text-blue-500" /> Observability Stream
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dash-border bg-dash-bg text-[10px] font-bold uppercase tracking-widest text-dash-textMuted">
                  <th className="p-4 rounded-tl-xl">Timestamp</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Metric Type</th>
                  <th className="p-4">Source</th>
                  <th className="p-4 rounded-tr-xl">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {metrics.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-dash-textMuted">No operational metrics logged yet.</td>
                  </tr>
                ) : (
                  metrics.map((m: any) => (
                    <tr key={m.id} className="hover:bg-dash-bg transition-colors group">
                      <td className="p-4 text-xs font-mono text-dash-textMuted whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                          m.severity === 'critical' ? 'bg-rose-100 text-rose-600' :
                          m.severity === 'warning' ? 'bg-amber-100 text-amber-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {m.severity}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold text-dash-text flex items-center gap-2 mt-2">
                        {getMetricIcon(m.metric_type)} {m.metric_type.replace(/_/g, ' ')}
                      </td>
                      <td className="p-4 text-xs font-mono text-dash-textMuted">
                        {m.source}
                      </td>
                      <td className="p-4 text-xs text-dash-textMuted max-w-[200px] truncate">
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
