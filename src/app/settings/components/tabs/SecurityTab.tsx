"use client";
import React from 'react';
import { Users, CreditCard, ShieldCheck, Activity, Check, Terminal, ArrowRight } from 'lucide-react';

interface SecurityTabProps {
  auditData: any;
}

export default function SecurityTab({ auditData }: SecurityTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Contacts', value: auditData?.leads || 0, icon: <Users size={18} /> },
          { label: 'Orders', value: auditData?.orders || 0, icon: <CreditCard size={18} /> },
          { label: 'Tasks', value: auditData?.tasks || 0, icon: <ShieldCheck size={18} /> },
          { label: 'Chats', value: auditData?.conversations || 0, icon: <Activity size={18} /> },
        ].map((item: any, i: number) => (
          <div key={i} className="p-6 bg-n800 border border-white/5 rounded-2xl space-y-4 hover:border-accent/20 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">{item.icon}</div>
              <span className="px-2 py-0.5 rounded bg-green/10 text-green text-[8px] font-black uppercase tracking-widest border border-green/20">Live</span>
            </div>
            <div>
              <span className="block text-[22px] font-space font-black text-t1">{item.value}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-t3">{item.label} Verified</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 bg-green/5 border border-green/10 rounded-3xl flex items-center gap-6 group">
        <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center text-green border border-green/20">
          <Check size={32} />
        </div>
        <div>
          <h4 className="text-[18px] font-space font-black text-t1 uppercase">Integrity Verified</h4>
          <p className="text-[12px] text-t3 leading-relaxed max-w-lg">
            All neural data migrations and workspace protocols have been verified. System integrity is currently at 100%.
          </p>
        </div>
      </div>

      <div className="bg-n800 border border-white/5 rounded-2xl p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-t4">
            <Terminal size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-t1 uppercase font-space">Audit Logs</span>
            <span className="text-[11px] text-t3">View full system access history</span>
          </div>
        </div>
        <button className="flex items-center gap-2 text-accent text-[11px] font-black uppercase tracking-widest hover:text-accent2 transition-all group">
          Open Logs <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
