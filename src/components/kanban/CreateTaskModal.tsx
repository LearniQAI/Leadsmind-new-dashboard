'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PremiumInput, PremiumTextarea } from '@/components/ui/premium-inputs';
import { Loader2, Layout, Target } from 'lucide-react';
import { PremiumDatePicker } from '@/components/ui/premium-date-picker';
import { PriorityToggleGroup } from '@/components/tasks/PriorityToggleGroup';
import { AssigneeSelector } from '@/components/tasks/AssigneeSelector';
import { getAssignableMembers, createTask } from '@/app/actions/tasks';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  initialStatus?: string;
  initialDate?: Date;
}

export function CreateTaskModal({ open, onOpenChange, onTaskCreated, initialStatus = 'todo', initialDate }: CreateTaskModalProps) {
  const { user: currentUser } = useDashboardContext();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDate);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadMembers();
      setStatus(initialStatus);
      setDueDate(initialDate);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setSelectedAssignees([]);
    }
  }, [open, initialStatus, initialDate]);

  async function loadMembers() {
    const res = await getAssignableMembers();
    if (res.data) setMembers(res.data);
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setLoading(true);
    const res = await createTask(
      {
        title,
        description,
        status,
        priority,
        due_date: dueDate ? dueDate.toISOString() : undefined
      },
      selectedAssignees
    );

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Task deployed successfully');
      onTaskCreated();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white border-dash-border p-0 overflow-hidden rounded-lg z-[2000]">
        <div className="flex flex-col max-h-[90vh]">
          {/* Header Section */}
          <div className="px-6 py-4 border-b border-dash-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
                <Target className="w-5 h-5 text-dash-accent" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight !text-dash-text flex items-center gap-3">
                  Create <span className="text-dash-accent">task</span>
                </DialogTitle>
                <DialogDescription className="text-[11px] font-semibold !text-dash-textMuted mt-1">
                  Strategic deployment & asset allocation
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Primary Configuration (Left) */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-3">
                  <label className="text-[12px] font-bold !text-dash-textMuted">
                    Objective identity
                  </label>
                  <PremiumInput
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Define core target..."
                    className="text-[13px] py-3 rounded-xl"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[12px] font-bold !text-dash-textMuted">
                    Strategic context
                  </label>
                  <PremiumTextarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Outline the execution path..."
                    className="min-h-[120px] text-[13px] p-4 rounded-xl"
                  />
                </div>
              </div>

              {/* Operational Metadata (Right) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-4 rounded-xl bg-white border border-dash-border space-y-6">
                  <PriorityToggleGroup
                    value={priority}
                    onChange={setPriority}
                  />

                  <PremiumDatePicker
                    date={dueDate}
                    setDate={setDueDate}
                  />

                  <AssigneeSelector
                    members={members}
                    selectedIds={selectedAssignees}
                    onChange={setSelectedAssignees}
                    currentUserId={currentUser?.id}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Control Bar */}
          <div className="px-10 py-2.5 border-t border-dash-border bg-dash-surface flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layout className="w-4 h-4 !text-dash-textMuted" />
              <span className="text-[11px] font-semibold !text-dash-textMuted">
                Ready for initialization
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="px-4 py-1 text-[12px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-md transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-dash-accent hover:bg-dash-accent/90 text-white px-4 py-1 rounded-md text-[12px] font-bold shadow-lg shadow-dash-accent/20 transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : 'Deploy task'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
