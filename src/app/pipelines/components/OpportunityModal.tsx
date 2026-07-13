'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Opportunity, Contact, PipelineStage } from '@/types/crm';
import { createOpportunity, updateOpportunity, deleteOpportunity } from '@/app/actions/pipelines';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Rocket, 
  PenSquare, 
  Trash2, 
  Check, 
  X, 
  DollarSign, 
  Target, 
  User, 
  Loader2,
  AlertCircle
} from 'lucide-react';

interface OpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity?: Opportunity | null;
  stageId?: string;
  contacts: Contact[];
  stages: PipelineStage[];
}

export function OpportunityModal({ 
  isOpen, 
  onClose, 
  opportunity, 
  stageId,
  contacts,
  stages
}: OpportunityModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    contact_id: '',
    stage_id: '',
    status: 'open' as 'open' | 'won' | 'lost'
  });

  useEffect(() => {
    if (opportunity) {
      setFormData({
        title: opportunity.title,
        value: opportunity.value.toString(),
        contact_id: opportunity.contact_id || '',
        stage_id: opportunity.stage_id,
        status: opportunity.status
      });
    } else {
      setFormData({
        title: '',
        value: '',
        contact_id: '',
        stage_id: stageId || (stages.length > 0 ? stages[0].id : ''),
        status: 'open'
      });
    }
  }, [opportunity, isOpen, stageId, stages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error('Deal title is required');
    if (!formData.stage_id) return toast.error('Sales stage is required');

    setIsProcessing(true);
    const payload = {
      ...formData,
      value: parseFloat(formData.value) || 0,
    };

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[TACTICAL DEBUG] Syncing deal. Action: ${opportunity ? 'UPDATE' : 'CREATE'}, Payload:`, payload);
    }

    const res = opportunity 
      ? await updateOpportunity(opportunity.id, payload)
      : await createOpportunity(payload);

    if ((res as any).success) {
      toast.success(opportunity ? 'Strategic deal synchronized' : 'Tactical deal launched');
      
      // Use transition to ensure refresh completes before closing
      startTransition(() => {
        router.refresh();
        setIsProcessing(false);
        onClose();
      });
    } else {
      console.error(`[TACTICAL DEBUG] Sync failure:`, (res as any).error);
      toast.error((res as any).error || 'Tactical failure');
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunity) return;
    setIsProcessing(true);
    const res = await deleteOpportunity(opportunity.id);
    if (res.success) {
      toast.success('Deal purged from pipeline');
      startTransition(() => {
        router.refresh();
        setIsProcessing(false);
        onClose();
      });
    } else {
      toast.error(res.error || 'Failed to delete deal');
      setIsProcessing(false);
    }
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[460px] p-0 bg-white border border-dash-border !text-dash-text overflow-hidden rounded-[16px] shadow-2xl z-[9999]">
          <DialogHeader className="px-6 py-5 bg-dash-surface border-b border-dash-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-[10px] flex items-center justify-center border shadow-lg",
                  opportunity 
                    ? "bg-dash-accent/10 border-dash-accent/20 text-dash-accent" 
                    : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                )}>
                  {opportunity ? <PenSquare size={20} /> : <Rocket size={20} />}
                </div>
                <div>
                  <DialogTitle className="text-[18px] font-bold font-display tracking-tight">
                    {opportunity ? 'Edit Strategic' : 'Launch New'} <span className="text-dash-accent">Deal</span>
                  </DialogTitle>
                  <p className="text-[10px] !text-dash-textMuted font-medium tracking-[0.8px] mt-0.5">
                    {opportunity ? 'Sync tactical data' : 'Initialize fresh node'}
                  </p>
                </div>
              </div>
              {opportunity && (
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-9 h-9 rounded-[8px] bg-red/10 text-red hover:bg-red hover:text-white transition-colors flex items-center justify-center border border-red/20 shadow-sm"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* 1. Title */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-wider !text-dash-textMuted ml-1">Opportunity Designation</Label>
              <div className="relative">
                <input 
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Enterprise Expansion Q4"
                  className="w-full h-11 bg-dash-surface border border-dash-border rounded-[10px] px-4 text-[14px] font-medium !text-dash-text placeholder:!text-dash-textMuted focus:outline-none focus:border-dash-accent/50 transition-all shadow-inner"
                />
                <Target className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 !text-dash-textMuted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 2. Value */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold tracking-wider !text-dash-textMuted ml-1">Contract Value</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dash-accent font-bold text-[13px]">R</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="0.00"
                    className="w-full h-11 bg-dash-surface border border-dash-border rounded-[10px] pl-9 pr-3 text-[15px] text-amber-600 font-display font-bold focus:outline-none focus:border-amber-500/50 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* 3. Status */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold tracking-wider !text-dash-textMuted ml-1">Node Status</Label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full h-11 bg-dash-surface border border-dash-border rounded-[10px] px-3 text-[12px] font-bold !text-dash-text focus:outline-none focus:border-dash-accent/50 transition-all appearance-none cursor-pointer tracking-widest"
                >
                  <option value="open" className="bg-white">Active Node</option>
                  <option value="won" className="bg-white">Won / Sync</option>
                  <option value="lost" className="bg-white">Lost / Stalled</option>
                </select>
              </div>
            </div>

            {/* 4. Sales Stage */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-wider !text-dash-textMuted ml-1">Pipeline Architecture Level</Label>
              <select 
                value={formData.stage_id}
                onChange={(e) => setFormData(prev => ({ ...prev, stage_id: e.target.value }))}
                className="w-full h-11 bg-dash-surface border border-dash-border rounded-[10px] px-3 text-[12px] font-bold !text-dash-text focus:outline-none focus:border-dash-accent/50 transition-all appearance-none cursor-pointer tracking-widest"
              >
                <option value="" disabled className="bg-white">Select tactical stage</option>
                {stages.map(s => (
                  <option key={s.id} value={s.id} className="bg-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Contact Selector */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-wider !text-dash-textMuted ml-1">Associated Entity</Label>
              <div className="relative">
                <select 
                  value={formData.contact_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_id: e.target.value }))}
                  className="w-full h-11 bg-dash-surface border border-dash-border rounded-[10px] px-3 pl-11 text-[13px] font-medium !text-dash-text focus:outline-none focus:border-dash-accent/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-white">Detach contact (Optional)</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id} className="bg-white">
                      {c.first_name} {c.last_name} ({c.email})
                    </option>
                  ))}
                </select>
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 !text-dash-textMuted" />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-[10px] bg-dash-surface !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface text-[11px] font-bold tracking-widest transition-all border border-dash-border"
              >
                Abort
              </button>
              <button 
                type="submit"
                disabled={isProcessing || isPending}
                className="flex-1 h-11 rounded-[10px] bg-dash-accent text-white hover:bg-dash-accent/90 text-[11px] font-bold tracking-widest transition-all shadow-lg shadow-dash-accent/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isProcessing || isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {opportunity ? 'Sync Changes' : 'Initialize Deal'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Purge Strategic Deal?"
        description="This action is irreversible. All tactical data associated with this opportunity will be permanently removed from the pipeline architecture."
        confirmLabel="Yes, Purge Deal"
        cancelLabel="Keep Deal"
        variant="danger"
      />
    </>
  );
}
