'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Clock, AlertCircle, Plus, MoreHorizontal } from 'lucide-react';
import { updateTaskStatus } from '@/app/actions/tasks';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function TasksClient({ initialTasks }: { initialTasks: any[] }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-[#FF3CAC] bg-[#FF3CAC]/10 border-[#FF3CAC]/20';
      case 'urgent': return 'text-danger bg-danger/10 border-danger/20';
      case 'low': return 'text-success bg-success/10 border-success/20';
      default: return 'text-primary bg-primary/10 border-primary/20';
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setIsUpdating(taskId);
    const res = await updateTaskStatus(taskId, newStatus);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Task updated');
      router.refresh();
    }
    setIsUpdating(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Todo Column */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col h-[70vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2 text-white">
            <span className="w-2 h-2 rounded-full bg-warning" /> To Do
          </h3>
          <span className="text-white/40 text-xs font-black">{initialTasks.filter(t => t.status === 'todo').length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 common-scrollbar">
          {initialTasks.filter(t => t.status === 'todo').map(task => (
            <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} isUpdating={isUpdating === task.id} />
          ))}
          <Button variant="ghost" className="w-full text-white/50 hover:text-white hover:bg-white/5 border border-dashed border-white/20 mt-4">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </div>
      </div>

      {/* In Progress Column */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col h-[70vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2 text-white">
            <span className="w-2 h-2 rounded-full bg-primary" /> In Progress
          </h3>
          <span className="text-white/40 text-xs font-black">{initialTasks.filter(t => t.status === 'in_progress').length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 common-scrollbar">
          {initialTasks.filter(t => t.status === 'in_progress').map(task => (
            <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} isUpdating={isUpdating === task.id} />
          ))}
        </div>
      </div>

      {/* Done Column */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col h-[70vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2 text-white">
            <span className="w-2 h-2 rounded-full bg-success" /> Completed
          </h3>
          <span className="text-white/40 text-xs font-black">{initialTasks.filter(t => t.status === 'done').length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 common-scrollbar">
          {initialTasks.filter(t => t.status === 'done').map(task => (
            <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} isUpdating={isUpdating === task.id} />
          ))}
        </div>
      </div>
    </div>
  );

  function TaskCard({ task, onStatusChange, isUpdating }: { task: any, onStatusChange: any, isUpdating: boolean }) {
    return (
      <div className={`p-4 rounded-xl bg-[#0b0b1a] border border-white/5 shadow-lg group hover:border-primary/50 transition-all ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-start justify-between mb-2">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          <button className="text-white/30 hover:text-white transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
        <h4 className="font-medium text-white mb-2 leading-tight">{task.title}</h4>
        {task.due_date && (
          <div className="flex items-center gap-1.5 text-xs text-white/40 font-medium mb-4">
            <Clock className="w-3.5 h-3.5" />
            {new Date(task.due_date).toLocaleDateString()}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-2">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-[10px] text-primary font-bold">
              U
            </div>
          </div>
          <div className="flex gap-2">
            {task.status !== 'todo' && (
              <button 
                onClick={() => onStatusChange(task.id, 'todo')}
                className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                title="Move to To Do"
              >
                <Clock className="w-3 h-3" />
              </button>
            )}
            {task.status !== 'in_progress' && task.status !== 'done' && (
              <button 
                onClick={() => onStatusChange(task.id, 'in_progress')}
                className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                title="Move to In Progress"
              >
                <AlertCircle className="w-3 h-3" />
              </button>
            )}
            {task.status !== 'done' && (
              <button 
                onClick={() => onStatusChange(task.id, 'done')}
                className="w-6 h-6 rounded bg-success/10 border border-success/20 flex items-center justify-center text-success hover:bg-success hover:text-white transition-colors"
                title="Mark as Done"
              >
                <Check className="w-3 h-3 stroke-[3px]" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
