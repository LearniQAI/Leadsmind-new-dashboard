'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { DashButton, DashInput, DashTextarea } from '@/components/dashboard-ui';
import { Loader2, Target } from 'lucide-react';
import { PremiumDatePicker } from '@/components/ui/premium-date-picker';
import { PriorityToggleGroup } from '@/components/tasks/PriorityToggleGroup';
import { AssigneeSelector } from '@/components/tasks/AssigneeSelector';
import { getAssignableMembers, createTask } from '@/app/actions/tasks';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { toast } from 'sonner';

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
      toast.success('Task created successfully');
      onTaskCreated();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white border-dash-border p-0 overflow-hidden rounded-2xl shadow-2xl z-[2000]">
        <div className="flex flex-col max-h-[90vh]">
          {/* Header Section */}
          <div className="px-6 py-4 border-b border-dash-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
                <Target className="w-5 h-5 text-dash-accent" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight !text-dash-text">
                  Create task
                </DialogTitle>
                <DialogDescription className="text-[12px] font-medium !text-dash-textMuted mt-0.5">
                  Add a task to your team's board.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Primary Configuration (Left) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold !text-dash-text">
                    Task name
                  </label>
                  <DashInput
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Follow up with Acme Corp"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold !text-dash-text">
                    Description
                  </label>
                  <DashTextarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any extra detail (optional)..."
                    className="min-h-[120px]"
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
                    variant="light"
                    fieldLabel="Due date"
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
          <div className="px-6 py-3.5 border-t border-dash-border bg-dash-surface flex items-center justify-between">
            <span className="text-[12px] font-medium !text-dash-textMuted">
              Assignees and due date are optional.
            </span>

            <div className="flex items-center gap-3">
              <DashButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </DashButton>
              <DashButton
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : 'Create task'}
              </DashButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
