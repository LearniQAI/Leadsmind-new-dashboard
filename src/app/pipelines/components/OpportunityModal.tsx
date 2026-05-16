'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Opportunity, Contact, PipelineStage } from '@/types/crm';
import { createOpportunity, updateOpportunity, deleteOpportunity } from '@/app/actions/pipelines';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

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
        stage_id: stageId || '',
        status: 'open'
      });
    }
  }, [opportunity, isOpen, stageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error('Deal title is required');
    if (!formData.stage_id) return toast.error('Sales stage is required');

    setIsProcessing(true);
    const payload = {
      ...formData,
      value: parseFloat(formData.value) || 0,
    };

    const res = opportunity 
      ? await updateOpportunity(opportunity.id, payload)
      : await createOpportunity(payload);

    if ((res as any).success) {
      toast.success(opportunity ? 'Deal synchronized' : 'Tactical deal launched');
      onClose();
    } else {
      toast.error((res as any).error || 'Tactical failure');
    }
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    if (!opportunity) return;
    setIsProcessing(true);
    const res = await deleteOpportunity(opportunity.id);
    if (res.success) {
      toast.success('Deal purged from pipeline');
      onClose();
    } else {
      toast.error(res.error || 'Failed to delete deal');
    }
    setIsProcessing(false);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#0b0f1a] border-white/5 text-[#eef2ff] max-w-md p-0 overflow-hidden rounded-3xl shadow-2xl z-[1001]">
          <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-white/[0.02]">
            <DialogTitle className="text-xl font-extrabold font-space tracking-tight text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <i className={className("fa-solid", opportunity ? "fa-pen-to-square text-[#3b82f6]" : "fa-rocket text-[#ff9d00]")}></i>
                {opportunity ? 'Edit Strategic Deal' : 'Launch New Deal'}
              </div>
              {opportunity && (
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                >
                  <i className="fa-solid fa-trash-can text-[12px]"></i>
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* 1. Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans ml-1">
                Opportunity Title
              </label>
              <input 
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Enterprise Expansion Q3"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb] transition-all font-dm-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 2. Value */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans ml-1">
                  Deal Value (R)
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[16px] text-[#ff9d00] font-space font-bold focus:outline-none focus:border-[#ff9d00]/50 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest pointer-events-none">ZAR</span>
                </div>
              </div>

              {/* 3. Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans ml-1">
                  Tactical Status
                </label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb] transition-all font-dm-sans appearance-none cursor-pointer"
                >
                  <option value="open" className="bg-[#0b0f1a]">Open / Active</option>
                  <option value="won" className="bg-[#0b0f1a]">Won / Closed</option>
                  <option value="lost" className="bg-[#0b0f1a]">Lost / Stalled</option>
                </select>
              </div>
            </div>

            {/* 4. Sales Stage */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans ml-1">
                Sales Pipeline Stage
              </label>
              <select 
                value={formData.stage_id}
                onChange={(e) => setFormData(prev => ({ ...prev, stage_id: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb] transition-all font-dm-sans appearance-none cursor-pointer"
              >
                <option value="" disabled className="bg-[#0b0f1a]">Select a stage</option>
                {stages.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0b0f1a]">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Contact Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans ml-1">
                Associate Lead
              </label>
              <select 
                value={formData.contact_id}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_id: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb] transition-all font-dm-sans appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#0b0f1a]">Select a contact (Optional)</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0b0f1a]">
                    {c.first_name} {c.last_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-white/5 text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/10 text-[12px] font-bold uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isProcessing}
                className="flex-1 h-11 rounded-xl bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[12px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-[#2563eb]/20 disabled:opacity-50"
              >
                {isProcessing ? 'Syncing...' : (opportunity ? 'Save Changes' : 'Create Deal')}
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
        description="This action is irreversible. All tactical data associated with this opportunity will be permanently removed from the pipeline."
        confirmLabel="Yes, Purge Deal"
        cancelLabel="Keep Deal"
        variant="danger"
      />
    </>
  );
}

function className(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
