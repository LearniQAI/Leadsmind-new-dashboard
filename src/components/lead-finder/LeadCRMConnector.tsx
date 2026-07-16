'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { pushLeadToPipeline } from '@/app/actions/lead-workspace';
import { getPipelines, getPipelineStages } from '@/app/actions/pipelines';
import { toast } from 'sonner';
import { Link as LinkIcon, Briefcase, Plus, Loader2, AlertTriangle } from 'lucide-react';

export function LeadCRMConnector({ leadId, pipelineId }: { leadId: string, pipelineId?: string }) {
  const router = useRouter();
  const [isPicking, setIsPicking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[] | null>(null);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');

  const openPicker = async () => {
    setIsPicking(true);
    setLoading(true);
    const res = await getPipelines();
    if (res.success && res.data) {
      setPipelines(res.data);
      if (res.data.length > 0) {
        setSelectedPipelineId(res.data[0].id);
      }
    } else {
      setPipelines([]);
      toast.error(res.error || 'Failed to load pipelines');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedPipelineId) {
      setStages([]);
      setSelectedStageId('');
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await getPipelineStages(selectedPipelineId);
      if (cancelled) return;
      if (res.success && res.data) {
        setStages(res.data);
        setSelectedStageId(res.data.length > 0 ? res.data[0].id : '');
      } else {
        setStages([]);
        setSelectedStageId('');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPipelineId]);

  const handlePush = async () => {
    if (!selectedPipelineId || !selectedStageId) {
      toast.error('Select a pipeline and stage first');
      return;
    }
    setLoading(true);
    const res = await pushLeadToPipeline(leadId, selectedPipelineId, selectedStageId);
    setLoading(false);
    if (res.success) {
      toast.success('Opportunity created in pipeline');
      setIsPicking(false);
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to create opportunity');
    }
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
      ) : isPicking ? (
        <div className="space-y-3">
          {pipelines === null ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-dash-textMuted" />
            </div>
          ) : pipelines.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs !text-dash-textMuted">This workspace has no pipelines yet. Create one before converting a lead into an opportunity.</p>
              </div>
              <Link
                href="/pipelines/new"
                className="inline-flex w-full items-center justify-center py-2 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-lg text-xs font-bold tracking-wider transition-colors"
              >
                Create a pipeline
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-textMuted uppercase tracking-wider">Pipeline</label>
                <select
                  value={selectedPipelineId}
                  onChange={(e) => setSelectedPipelineId(e.target.value)}
                  className="w-full h-10 bg-dash-surface border border-dash-border rounded-lg px-3 text-[13px] font-medium !text-dash-text focus:outline-none focus:border-dash-accent/50"
                >
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-textMuted uppercase tracking-wider">Stage</label>
                <select
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  disabled={stages.length === 0}
                  className="w-full h-10 bg-dash-surface border border-dash-border rounded-lg px-3 text-[13px] font-medium !text-dash-text focus:outline-none focus:border-dash-accent/50 disabled:opacity-50"
                >
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setIsPicking(false)}
                  disabled={loading}
                  className="flex-1 py-2 bg-dash-surface border border-dash-border text-[12px] font-bold !text-dash-textMuted rounded-lg hover:!text-dash-text transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePush}
                  disabled={loading || !selectedPipelineId || !selectedStageId}
                  className="flex-1 py-2 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-lg text-[12px] font-bold tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create Opportunity
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm !text-dash-textMuted">This lead is currently floating in the workspace. Push to pipeline to manage opportunities.</p>
          <button
            onClick={openPicker}
            className="w-full py-2.5 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-sm font-bold tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Create Opportunity
          </button>
        </div>
      )}
    </div>
  );
}
