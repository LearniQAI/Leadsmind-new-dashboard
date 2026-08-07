"use client";
import React from 'react';
import { Users, CreditCard, ShieldCheck, Activity, Terminal } from 'lucide-react';

interface SecurityTabProps {
  auditData: any;
}

export default function SecurityTab({ auditData }: SecurityTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Contacts', value: auditData?.leads || 0, icon: <Users size={18} /> },
          { label: 'Orders', value: auditData?.orders || 0, icon: <CreditCard size={18} /> },
          { label: 'Tasks', value: auditData?.tasks || 0, icon: <ShieldCheck size={18} /> },
          { label: 'Chats', value: auditData?.conversations || 0, icon: <Activity size={18} /> },
        ].map((item: any, i: number) => (
          <div key={i} className="p-6 bg-white border border-dash-border rounded-2xl space-y-4 hover:border-dash-accent/20 transition-all motion-reduce:transition-none">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent">{item.icon}</div>
              <span className="px-2 py-0.5 rounded bg-green/10 text-green text-[8px] font-bold border border-green/20">Live</span>
            </div>
            <div>
              <span className="block text-[22px] font-bold !text-dash-text">{item.value}</span>
              <span className="text-[10px] font-bold !text-dash-textMuted">Total {item.label.toLowerCase()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-dash-border rounded-2xl p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-dash-surface flex items-center justify-center !text-dash-textMuted">
            <Terminal size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold !text-dash-text">Audit logs</span>
            <span className="text-[11px] !text-dash-textMuted">System access history isn't available yet</span>
          </div>
        </div>
        <span
          title="Audit log storage isn't built yet — this view currently only surfaces live record counts above"
          className="px-3 py-1.5 rounded-lg bg-dash-surface !text-dash-textMuted text-[11px] font-bold border border-dash-border"
        >
          Coming soon
        </span>
      </div>
    </div>
  );
}
