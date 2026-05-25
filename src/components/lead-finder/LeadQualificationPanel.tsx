'use client';

import React, { useState } from 'react';
import { updateLeadStatus } from '@/app/actions/lead-workspace';
import { ShieldCheck, Target, Loader2, ChevronDown, Check } from 'lucide-react';

const STATUS_OPTIONS = ['New', 'Qualified', 'Contacted', 'Interested', 'Unqualified'];

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Qualified': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Contacted': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Interested': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Unqualified': 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function LeadQualificationPanel({ leadId, currentStatus }: { leadId: string, currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = async (status: string) => {
    if (status === currentStatus) return;
    setLoading(true);
    setIsOpen(false);
    await updateLeadStatus(leadId, status);
    setLoading(false);
  };

  const statusColor = STATUS_COLORS[currentStatus] || STATUS_COLORS['New'];

  return (
    <div className="bg-n800 border border-white/10 rounded-2xl p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck size={16} className="text-accent" /> Qualification
        </h3>
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${statusColor} font-bold`}
        >
          <span className="flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
            {currentStatus}
          </span>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-n900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
            {STATUS_OPTIONS.map(status => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-white/5 transition-colors ${
                  status === currentStatus ? 'text-white' : 'text-t3'
                }`}
              >
                {status}
                {status === currentStatus && <Check size={14} className="text-accent" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-t4 mt-4 text-center">
        Updating status will automatically log activity on the timeline.
      </p>
    </div>
  );
}
