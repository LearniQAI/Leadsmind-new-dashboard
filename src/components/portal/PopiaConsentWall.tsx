'use client';

import React, { useState, useTransition } from 'react';
import { ShieldAlert, FileText, Check, Lock, ShieldCheck } from 'lucide-react';
import { acceptPopiaConsent } from '@/app/actions/portal';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PopiaConsentWallProps {
  ipAddress: string;
}

export default function PopiaConsentWall({ ipAddress }: PopiaConsentWallProps) {
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      toast.error('You must read and accept the privacy terms to continue.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await acceptPopiaConsent(ipAddress);
        if (res.success) {
          toast.success('POPIA Privacy Agreement successfully logged.');
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to save consent.');
        }
      } catch (err: any) {
        toast.error('An error occurred: ' + err.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-[#04091a]/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl relative my-8 text-left animate-in zoom-in-95 duration-300">
        
        {/* Decorative background blurs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header Section */}
        <div className="p-6 border-b border-white/5 bg-[#0b1329]/50 flex items-center gap-3.5 relative z-10">
          <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-md font-bold uppercase tracking-wider text-white font-space">
              POPIA Privacy Compliance
            </h3>
            <p className="text-[9.5px] text-[var(--t3)] uppercase tracking-[0.15em] mt-0.5">
              Protection of Personal Information Act (South Africa)
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8 space-y-6 relative z-10 text-xs md:text-sm text-[#94a3c8] leading-relaxed max-h-[60vh] overflow-y-auto pr-3 scrollbar-thin">
          <p className="text-white/80 font-sans font-medium text-xs">
            To provide services through the LeadsMind Client Portal, we are legally required under the Protection of Personal Information Act, 4 of 2013 (POPIA), to obtain your explicit consent for processing your personal identifiers.
          </p>

          <div className="space-y-4">
            <div className="bg-[#0b1329]/30 border border-white/5 rounded-2xl p-4 md:p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a82] font-mono flex items-center gap-1.5">
                <FileText size={12} className="text-blue-400" /> 1. Information We Collect
              </span>
              <p className="text-xs font-sans">
                We collect and store your name, email address, telephone contact number, company details, language preferences, transaction records (invoices, receipts, payments), learning history (course progress, enrollments), and support ticket dialogue logs.
              </p>
            </div>

            <div className="bg-[#0b1329]/30 border border-white/5 rounded-2xl p-4 md:p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a82] font-mono flex items-center gap-1.5">
                <Lock size={12} className="text-purple-400" /> 2. Processing Purpose & Safety
              </span>
              <p className="text-xs font-sans">
                Your data is processed strictly for the purposes of multi-tenant service delivery, LMS class tracking, secure financial auditing, and technical communication. We enforce advanced Row-Level Security (RLS) policies to prevent cross-client leaks.
              </p>
            </div>

            <div className="bg-[#0b1329]/30 border border-white/5 rounded-2xl p-4 md:p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a82] font-mono flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" /> 3. Your POPIA Rights
              </span>
              <p className="text-xs font-sans">
                You maintain the legal right to request a complete subject access report (copy of data) or request account deletion/erasure. Financial invoice records will be preserved for SARS auditing compliance, while personal details will be anonymized.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex gap-3 text-[10px] md:text-[11px] text-[#4a5a82] leading-relaxed">
            <ShieldAlert size={14} className="shrink-0 text-amber-500 mt-0.5 animate-pulse" />
            <span>
              By checking the box below and submitting, you acknowledge that you are registering consent from IP Address: <strong className="text-white font-mono">{ipAddress}</strong> on <strong className="text-white">{new Date().toLocaleDateString('en-ZA')}</strong>.
            </span>
          </div>
        </div>

        {/* Footer Actions Form */}
        <form onSubmit={handleSubmit} className="p-6 bg-[#0b1329]/50 border-t border-white/5 relative z-10 space-y-5">
          <label className="flex items-start gap-3.5 cursor-pointer group text-left">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 rounded border-white/10 bg-[#04091a]/80 text-blue-600 focus:ring-blue-500 w-4.5 h-4.5 shrink-0 transition-all cursor-pointer"
            />
            <span className="text-[11.5px] font-medium text-[#eef2ff] leading-normal group-hover:text-white select-none">
              I explicitly consent to the collection, processing, and retention of my personal information as outlined under the POPIA privacy terms above.
            </span>
          </label>

          <button
            type="submit"
            disabled={!accepted || isPending}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-[#111d47] disabled:text-[#4a5a82] text-white rounded-xl uppercase tracking-wider text-[10px] font-black shadow-lg shadow-blue-500/10 transition-colors active:scale-[0.99]"
          >
            {isPending ? 'Processing Agreement...' : 'Accept Privacy Policy & Enter Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
