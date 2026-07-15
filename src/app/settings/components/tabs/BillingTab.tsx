"use client";
import React from 'react';
import { Users, Zap, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface BillingTabProps {
  memberCount: number;
}

export default function BillingTab({ memberCount }: BillingTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">
      <div className="p-8 bg-gradient-to-br from-dash-accent/10 to-dash-surface border border-dash-accent/20 rounded-3xl relative overflow-hidden group shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-dash-accent/10 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-dash-accent text-white font-bold text-[10px] rounded-full shadow-sm">Enterprise pro plan</span>
            <h4 className="text-[28px] font-bold !text-dash-text tracking-tight leading-none">Unlimited capacity</h4>
            <p className="!text-dash-textMuted text-[12px] font-bold flex items-center gap-2">
              Lifetime access <span className="w-1 h-1 rounded-full bg-dash-textMuted"></span> Priority support
            </p>
          </div>
          <button onClick={() => toast.info('You are already on the highest tier.')} className="bg-white text-dash-accent hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 font-bold text-[11px] h-14 px-10 rounded-2xl shadow-sm border border-dash-border transition-all motion-reduce:transition-none">
            Active plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Seats', value: `${memberCount} / ∞`, icon: <Users size={16} /> },
          { label: 'Automation Cycles', value: 'Unlimited', icon: <Zap size={16} /> },
          { label: 'Storage', value: '500 GB', icon: <CreditCard size={16} /> }
        ].map((item, idx) => (
          <div key={idx} className="p-6 bg-white border border-dash-border rounded-2xl space-y-4 hover:border-dash-accent/30 transition-all motion-reduce:transition-none group">
            <div className="w-10 h-10 rounded-xl bg-dash-surface flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent group-hover:bg-dash-accent/10 transition-all motion-reduce:transition-none">
              {item.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold !text-dash-textMuted mb-1">{item.label}</p>
              <p className="text-[18px] font-bold !text-dash-text">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
