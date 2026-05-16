import React from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import MetaData from '@/hooks/useMetaData';
import { PremiumInput } from '@/components/ui/premium-inputs';

export default function PortalLoginPage() {
  return (
    <MetaData pageTitle="Client Portal Login">
      <div className="min-h-screen bg-[#04091a] flex items-center justify-center p-6 selection:bg-[var(--accent)]">
        <div className="max-w-md w-full">
           <div className="flex flex-col items-center mb-12">
              <div className="text-2xl font-black tracking-tighter text-[var(--accent2)] mb-4">LEADSMIND</div>
              <h1 className="text-3xl font-bold font-space text-[var(--t1)] uppercase tracking-tight">Access Portal</h1>
              <p className="text-[11px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">Secure authenticated gateway</p>
           </div>

           <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r24)] p-10 shadow-2xl space-y-6">
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Registered Email</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--t4)]" />
                       <PremiumInput placeholder="your@email.com" className="pl-12 h-12" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Secret Key / Password</label>
                    <div className="relative">
                       <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--t4)]" />
                       <PremiumInput type="password" placeholder="••••••••" className="pl-12 h-12" />
                    </div>
                 </div>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group">
                 Authenticate Session <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="pt-6 border-t border-[var(--bdr)] text-center">
                 <p className="text-[10px] text-[var(--t4)] font-medium flex items-center justify-center gap-2">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    Protected by AES-256 bank-grade encryption
                 </p>
              </div>
           </div>

           <div className="mt-8 text-center">
              <p className="text-[10px] text-[var(--t4)] font-medium">
                 Forgotten access credentials? <a href="#" className="text-blue-500 hover:underline">Contact Support</a>
              </p>
           </div>
        </div>
      </div>
    </MetaData>
  );
}
