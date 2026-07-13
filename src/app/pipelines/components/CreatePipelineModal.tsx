'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from 'lucide-react';
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
      <DialogContent className="bg-white border-dash-border !text-dash-text max-w-sm p-0 overflow-hidden rounded-3xl shadow-2xl z-[1001]">
        <DialogHeader className="p-6 pb-4 border-b border-dash-border">
          <DialogTitle className="text-xl font-extrabold tracking-tight !text-dash-text flex items-center gap-3">
            <Plus size={18} className="text-dash-accent" />
            Create New Pipeline
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold !text-dash-textMuted tracking-[2px]">Pipeline Name</label>
            <input 
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Sales"
              className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-sm !text-dash-text focus:outline-none focus:border-dash-accent/50 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-dash-surface !text-dash-text hover:bg-dash-border/60 text-[12px] font-bold tracking-widest transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreate}
              disabled={isProcessing || !name.trim()}
              className="flex-1 h-11 rounded-xl bg-dash-accent text-white hover:bg-dash-accent/90 text-[12px] font-bold tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-dash-accent/20"
            >
              {isProcessing ? 'Processing...' : 'Create'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
