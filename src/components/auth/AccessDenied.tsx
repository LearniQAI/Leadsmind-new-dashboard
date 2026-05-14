'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Home, ArrowLeft, Lock } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-red/10 border border-red/20 flex items-center justify-center text-red shadow-2xl shadow-red/10">
            <ShieldAlert size={48} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-n900 border border-white/10 flex items-center justify-center text-t1 shadow-lg">
            <Lock size={18} />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-[24px] font-space font-black text-t1 uppercase tracking-tight">
            Neural Access <span className="text-red">Denied</span>
          </h1>
          <p className="text-[14px] text-t3 leading-relaxed">
            Your current authorization level does not include access to this module. Please contact your workspace administrator to upgrade your node permissions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button 
            onClick={() => window.history.back()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-white/5 bg-white/5 text-t1 font-bold hover:bg-white/10 transition-all text-[11px] uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          <Link 
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-accent text-white font-black hover:bg-accent2 transition-all text-[11px] uppercase tracking-widest shadow-lg shadow-accent/20"
          >
            <Home size={16} /> Home Base
          </Link>
        </div>

        <div className="pt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-red animate-pulse"></div>
            <span className="text-[10px] font-black text-t4 uppercase tracking-[0.2em]">Security Protocol 403-LM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
