'use client';

import React, { useState } from 'react';
import { pushLeadToPipeline } from '@/app/actions/lead-workspace';
import { Link as LinkIcon, Briefcase, Plus, Loader2 } from 'lucide-react';

export function LeadCRMConnector({ leadId, pipelineId }: { leadId: string, pipelineId?: string }) {
  const [loading, setLoading] = useState(false);

  const handlePush = async () => {
    setLoading(true);
    // In a real implementation, you would open a modal to select pipeline and stage.
    // For MVP, we will push to a generic default pipeline stage.
    await pushLeadToPipeline(leadId, 'default-pipeline-id', 'default-stage-id');
    setLoading(false);
  };

  return (
    <div className="bg-white border border-dash-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold !text-dash-text tracking-wider flex items-center gap-2">
          <Briefcase size={16} className="text-dash-accent" /> CRM Integration
        </h3>
      </div>

      {pipelineId ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <LinkIcon className="text-emerald-400 shrink-0" size={20} />
          <div>
            <p className="text-sm font-bold text-emerald-400">Connected to CRM</p>
            <p className="text-xs !text-dash-textMuted">Active in Pipeline</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm !text-dash-textMuted">This lead is currently floating in the workspace. Push to pipeline to manage opportunities.</p>
          <button
            onClick={handlePush}
            disabled={loading}
            className="w-full py-2.5 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-sm font-bold tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create Opportunity
          </button>
        </div>
      )}
    </div>
  );
}
