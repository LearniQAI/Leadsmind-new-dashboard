'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPipeline } from '@/app/actions/pipelines';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CreatePipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePipelineModal({
  isOpen,
  onClose,
}: CreatePipelineModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setIsProcessing(true);
    const res = await createPipeline({
      name: name.trim(),
      stages: ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Closed Won'] // Default stages
    });

    if (res.success) {
      toast.success('Strategy pipeline launched');
      setName('');
      router.refresh();
      if (res.data?.id) {
        router.push(`/pipelines?pipelineId=${res.data.id}`);
      }
      onClose();
    } else {
      toast.error(res.error || 'Failed to create pipeline');
    }
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0b0f1a] border-white/5 text-[#eef2ff] max-w-sm p-0 overflow-hidden rounded-3xl shadow-2xl z-[1001]">
        <DialogHeader className="p-6 pb-4 border-b border-white/5">
          <DialogTitle className="text-xl font-extrabold font-space tracking-tight text-white flex items-center gap-3">
            <i className="fa-solid fa-plus text-[#3b82f6]"></i>
            Create New Pipeline
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[2px]">Pipeline Name</label>
            <input 
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Sales"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#2563eb]/50 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-bold uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreate}
              disabled={isProcessing || !name.trim()}
              className="flex-1 h-11 rounded-xl bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[12px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-[#2563eb]/20"
            >
              {isProcessing ? 'Processing...' : 'Create'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
