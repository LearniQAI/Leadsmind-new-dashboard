'use client';

import React, { useState } from 'react';
import { assignContactToPipeline } from '@/app/actions/contact-workspace';
import { Link as LinkIcon, Briefcase, Plus, Loader2 } from 'lucide-react';

export function ContactCRMConnector({ contactId, pipelineId }: { contactId: string, pipelineId?: string }) {
  const [loading, setLoading] = useState(false);

  const handlePush = async () => {
    setLoading(true);
    await assignContactToPipeline(contactId);
    setLoading(false);
  };

  return (
    <div className="bg-n800 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Briefcase size={16} className="text-accent" /> CRM Integration
        </h3>
      </div>

      {pipelineId ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <LinkIcon className="text-emerald-400 shrink-0" size={20} />
          <div>
            <p className="text-sm font-bold text-emerald-400">Connected to CRM</p>
            <p className="text-xs text-t3">Active in Pipeline Opportunity</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-t3">This contact is currently isolated. Push to pipeline to manage outreach and opportunities.</p>
          <button
            onClick={handlePush}
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Push to Pipeline
          </button>
        </div>
      )}
    </div>
  );
}
