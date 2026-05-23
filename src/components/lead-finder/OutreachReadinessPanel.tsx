'use client';

import React from 'react';
import { Target, MessageSquare, Briefcase, Zap, AlertCircle, ShieldCheck } from 'lucide-react';

export function OutreachReadinessPanel({ contact }: { contact: any }) {
  const isHighConfidence = contact.confidence_level === 'High';
  const hasEmail = !!contact.email;
  const hasLinkedIn = !!contact.linkedin_url;

  return (
    <div className="bg-n800 border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-space font-bold text-white mb-6 flex items-center gap-2">
        <Target className="text-accent" /> Outreach Intelligence
      </h3>

      <div className="space-y-4">
        <div className="bg-n900 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-bold text-t4 uppercase tracking-wider mb-2">Recommended Channel</p>
          <div className="flex items-center gap-3">
            {hasEmail ? (
              <>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><MessageSquare size={16} /></div>
                <div>
                  <p className="text-sm font-bold text-white">Direct Email</p>
                  <p className="text-xs text-t3">Email is available and verified.</p>
                </div>
              </>
            ) : hasLinkedIn ? (
              <>
                <div className="p-2 bg-[#0A66C2]/10 text-[#0A66C2] rounded-lg"><Briefcase size={16} /></div>
                <div>
                  <p className="text-sm font-bold text-white">LinkedIn InMail</p>
                  <p className="text-xs text-t3">Direct email missing, use social outreach.</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><AlertCircle size={16} /></div>
                <div>
                  <p className="text-sm font-bold text-white">Cold Calling</p>
                  <p className="text-xs text-t3">Digital footprint is low. Direct call recommended.</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-n900 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-bold text-t4 uppercase tracking-wider mb-2">Contact Authority</p>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 text-accent rounded-lg"><Zap size={16} /></div>
            <div>
              <p className="text-sm font-bold text-white">
                {contact.department === 'Executive' ? 'Decision Maker' : 'Key Influencer'}
              </p>
              <p className="text-xs text-t3">Based on title and department hierarchy.</p>
            </div>
          </div>
        </div>

        <div className={`border rounded-xl p-4 flex items-start gap-3 ${isHighConfidence ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
          <ShieldCheck size={18} className={isHighConfidence ? "text-emerald-400 shrink-0" : "text-t4 shrink-0"} />
          <p className="text-sm text-t2 leading-relaxed">
            {isHighConfidence 
              ? "High confidence profile. Cross-referenced across multiple data providers. Safe for immediate outreach."
              : "Medium/Low confidence profile. Suggest manual verification on LinkedIn before launching automated sequences."}
          </p>
        </div>
      </div>
    </div>
  );
}
