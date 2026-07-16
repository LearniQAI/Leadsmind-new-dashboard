'use client';

import React, { useState } from 'react';
import { createTask, toggleTaskStatus, deleteTask } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, CalendarDays } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { PremiumDatePicker } from '@/components/ui/premium-date-picker';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface TasksManagerProps {
  contactId: string;
  tasks: any[]; // ContactTask
}

export function TasksManager({ contactId, tasks }: TasksManagerProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAddTask = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    const res = await createTask({ contactId, title, dueDate: dueDate?.toISOString() });
    if (res.success) {
      toast.success('Task created');
      setTitle('');
      setDueDate(undefined);
    } else {
      toast.error(res.error || 'Failed to create task');
    }
    setIsSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteTask(deleteId);
    if (res.success) {
      toast.success('Task deleted');
    } else {
      toast.error(res.error || 'Failed to delete task');
    }
    setDeleteId(null);
  };

  const handleToggleTask = async (task: any) => {
    const res = await toggleTaskStatus(task.id, contactId, task.status);
    if (!res.success) {
      toast.error(res.error || 'Failed to update task');
    }
  };

  return (
    <div className="space-y-8">
      {/* Quick Add */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px] bg-dash-surface border border-dash-border rounded-lg h-10 px-4 flex items-center gap-3 focus-within:border-dash-accent/40 transition-all">
          <Plus size={11} className="text-dash-textMuted" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assign a new tactical task..."
            className="flex-1 bg-transparent border-none text-[13px] !text-dash-text placeholder:text-dash-textMuted focus:outline-none focus:ring-0"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />
        </div>
        <div className="w-52">
          <PremiumDatePicker
            date={dueDate}
            setDate={setDueDate}
            variant="light"
            fieldLabel="Due date"
          />
        </div>
        <DashButton
          onClick={handleAddTask}
          disabled={isSubmitting || !title.trim()}
          size="default"
          className="h-10"
        >
          Add Task
        </DashButton>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-[12px] !text-dash-textMuted italic">No tasks assigned to this contact.</p>
        ) : (
          tasks.map(task => {
            const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';

            return (
              <div
                key={task.id}
                className={cn(
                  "bg-white border border-dash-border rounded-xl p-4 flex items-center gap-4 group transition-all",
                  task.status === 'completed' && "opacity-50"
                )}
              >
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => handleToggleTask(task)}
                  className="border-dash-textMuted data-[state=checked]:bg-dash-accent data-[state=checked]:border-dash-accent"
                />

                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "text-[13.5px] font-medium !text-dash-text truncate",
                    task.status === 'completed' && "line-through !text-dash-textMuted"
                  )}>
                    {task.title}
                  </h4>
                  {task.due_date && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <CalendarDays size={10} className={isOverdue ? "text-red" : "text-dash-textMuted"} />
                      <span className={cn(
                        "text-[10px] font-bold",
                        isOverdue ? "text-red" : "text-dash-textMuted"
                      )}>
                        {format(new Date(task.due_date), 'MMM dd, yyyy')} {isOverdue && '(OVERDUE)'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button
                    onClick={() => setDeleteId(task.id)}
                    className="text-dash-textMuted hover:text-red p-2"
                   >
                    <Trash2 size={12} />
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Purge Relationship Obligation?"
        description="You are about to permanently delete this tactical task. This action cannot be reversed and the task will be purged from the relationship roadmap."
        confirmLabel="Purge Task"
        variant="danger"
      />
    </div>
  );
}
