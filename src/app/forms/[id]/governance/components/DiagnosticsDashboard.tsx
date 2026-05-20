'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Activity, ShieldAlert, Cpu, Heart, CheckCircle2 } from 'lucide-react';
import { DiagnosticsService, DiagnosticsLog } from '@/lib/optimization/DiagnosticsService';

export function DiagnosticsDashboard({ formId }: { formId: string }) {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<DiagnosticsLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDiagnostics = async () => {
    const counts = await DiagnosticsService.getErrorMetrics(formId);
    const recent = await DiagnosticsService.getRecentLogs(formId);
    setMetrics(counts);
    setLogs(recent);
    setLoading(false);
  };

  useEffect(() => {
    loadDiagnostics();
    const interval = setInterval(loadDiagnostics, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [formId]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'runtime': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'payment': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'automation': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6 font-dm-sans text-white">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {Object.entries(metrics).map(([key, value]) => (
          <div
            key={key}
            className="p-4 bg-[#0c1535] border border-white/5 rounded-2xl flex flex-col gap-2 relative overflow-hidden"
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82]">
              {key} errors
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black font-space-grotesk">{value}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider ${
                value > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {value > 0 ? 'alert' : 'healthy'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main logs list */}
      <div className="bg-[#0c1535] border border-white/5 p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-rose-400" /> Diagnostics Telemetry Stream
          </span>
          
          <button
            onClick={loadDiagnostics}
            className="text-[9px] font-black uppercase tracking-wider text-blue-400 hover:underline flex items-center gap-1"
          >
            <Activity size={10} /> Force Sync
          </button>
        </div>

        <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3 bg-white/2 border border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border self-start ${getSeverityColor(log.error_type)}`}>
                  {log.error_type}
                </span>
                
                <div className="flex flex-col gap-0.5">
                  <p className="font-bold text-white/95">{log.message}</p>
                  <span className="text-[9px] text-[#4a5a82]">Source: {log.source}</span>
                </div>
              </div>

              <span className="text-[8px] text-[#4a5a82] font-mono self-end md:self-auto">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="py-8 flex flex-col items-center justify-center text-center text-white/30 gap-2">
              <CheckCircle2 size={24} className="text-emerald-400/60" />
              <p className="text-[10px] font-black uppercase tracking-wider">No Anomalies Logged</p>
              <p className="text-[8px] text-[#4a5a82] max-w-[200px]">All platform layers are currently operating within nominal latency thresholds.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
