'use client';

import { useState } from 'react';
import { ContactTask } from '@/types/crm.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createTask, toggleTaskStatus, deleteTask } from '@/app/actions/contacts';
import { format } from 'date-fns';
import { Trash2, Calendar, Plus, CheckCircle2, Circle, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TasksSectionProps {
  contactId: string;
  tasks: ContactTask[];
}

export function TasksSection({ contactId, tasks }: TasksSectionProps) {
  const [title, setTitle] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleAddTask() {
    if (!title.trim()) return;
    setIsPending(true);
    try {
      const result = await createTask({ contactId, title });
      if (result.success) {
        toast.success('Task created');
        setTitle('');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to create task');
    } finally {
      setIsPending(false);
    }
  }

  async function handleToggle(id: string, currentStatus: 'todo' | 'completed') {
    try {
      const result = await toggleTaskStatus(id, contactId, currentStatus);
      if (result.success) {
        toast.success(currentStatus === 'todo' ? 'Task completed' : 'Task reopened');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to update task');
    }
  }

  async function handleDelete(id: string) {
    try {
      const result = await deleteTask(id);
      if (result.success) {
        toast.success('Task deleted');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to delete task');
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Input 
          placeholder="What needs to be done?" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          className="bg-[#0b0b10] border-white/5 text-white h-12 rounded-xl focus:border-[#6c47ff]/50 transition-all px-4"
        />
        <Button 
          onClick={handleAddTask} 
          disabled={isPending || !title.trim()}
          className="bg-[#6c47ff] hover:bg-[#5b3ce0] text-white h-12 px-6 rounded-xl font-bold shrink-0 shadow-lg shadow-[#6c47ff]/20"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className={cn(
            "flex items-center gap-4 bg-[#0b0b10] border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/4 group",
            task.status === 'completed' && "opacity-50"
          )}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={() => handleToggle(task.id, task.status)}
            >
               {task.status === 'completed' ? (
                 <CheckCircle2 className="h-6 w-6 text-green-400 fill-green-400/20" />
               ) : (
                 <Circle className="h-6 w-6 text-white/10 hover:text-[#6c47ff]" />
               )}
            </Button>
            
            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
               <span className={cn(
                 "text-sm font-bold text-white transition-all",
                 task.status === 'completed' && "line-through text-white/20"
               )}>
                 {task.title}
               </span>
               <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-white/20">
                    <Calendar className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {format(new Date(task.created_at), 'MMM d')}
                    </span>
                  </div>
               </div>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg shrink-0"
              onClick={() => handleDelete(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-white/10 border border-dashed border-white/5 rounded-3xl">
             <CheckSquare className="h-8 w-8 mb-2" />
             <p className="text-xs font-semibold">No tasks assigned</p>
          </div>
        )}
      </div>
    </div>
  );
}
