'use client';

import React, { useState } from 'react';
import { createTask, toggleTaskStatus, deleteTask } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface TasksManagerProps {
  contactId: string;
  tasks: any[]; // ContactTask
}

export function TasksManager({ contactId, tasks }: TasksManagerProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAddTask = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    const res = await createTask({ contactId, title });
    if (res.success) {
      toast.success('Task created');
      setTitle('');
    } else {
      toast.error(res.error || 'Failed to create task');
    }
    setIsSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await deleteTask(deleteId);
    toast.success('Task deleted');
    setDeleteId(null);
  };

  return (
    <div className="space-y-8">
      {/* Quick Add */}
      <div className="flex gap-3">
        <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-lg h-10 px-4 flex items-center gap-3 focus-within:border-[#2563eb]/40 transition-all">
          <i className="fa-solid fa-plus text-[11px] text-[#4a5a82]"></i>
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assign a new tactical task..."
            className="flex-1 bg-transparent border-none text-[13px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:ring-0 font-dm-sans"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />
        </div>
        <button 
          onClick={handleAddTask}
          disabled={isSubmitting || !title.trim()}
          className="h-10 px-6 rounded-lg bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[12px] font-bold font-dm-sans flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20 disabled:opacity-50"
        >
          Add Task
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-[12px] text-[#4a5a82] italic font-dm-sans">No tasks assigned to this contact.</p>
        ) : (
          tasks.map(task => {
            const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';
            
            return (
              <div 
                key={task.id} 
                className={cn(
                  "bg-[#080f28] border border-white/5 rounded-[12px] p-4 flex items-center gap-4 group transition-all",
                  task.status === 'completed' && "opacity-50"
                )}
              >
                <Checkbox 
                  checked={task.status === 'completed'}
                  onCheckedChange={() => toggleTaskStatus(task.id, contactId, task.status)}
                  className="border-[#4a5a82] data-[state=checked]:bg-[#2563eb] data-[state=checked]:border-[#2563eb]"
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "text-[13.5px] font-medium text-[#eef2ff] font-dm-sans truncate",
                    task.status === 'completed' && "line-through text-[#4a5a82]"
                  )}>
                    {task.title}
                  </h4>
                  {task.due_date && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <i className={cn(
                        "fa-solid fa-calendar-day text-[10px]",
                        isOverdue ? "text-red-400" : "text-[#4a5a82]"
                      )}></i>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest font-dm-sans",
                        isOverdue ? "text-red-400" : "text-[#4a5a82]"
                      )}>
                        {format(new Date(task.due_date), 'MMM dd, yyyy')} {isOverdue && '(OVERDUE)'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => setDeleteId(task.id)}
                    className="text-[#4a5a82] hover:text-red-400 p-2"
                   >
                    <i className="fa-solid fa-trash-can text-[12px]"></i>
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
