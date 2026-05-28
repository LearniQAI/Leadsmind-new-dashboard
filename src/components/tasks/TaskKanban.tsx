'use client';

import React from 'react';
import { updateTaskStatus } from '@/app/actions/task-workspace';
import { Calendar, CheckCircle2, Circle, Clock, Building2, User, Target } from 'lucide-react';

const COLUMNS = [
  { id: 'Pending', title: 'To Do', color: 'text-t3' },
  { id: 'In Progress', title: 'In Progress', color: 'text-blue-400' },
  { id: 'Completed', title: 'Done', color: 'text-emerald-400' },
  { id: 'Overdue', title: 'Overdue', color: 'text-red-400' }
];

export function TaskKanban({ tasks }: { tasks: any[] }) {

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTaskStatus(taskId, newStatus);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-500/20 text-red-400';
      case 'High': return 'bg-amber-500/20 text-amber-400';
      case 'Low': return 'bg-white/5 text-t4';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-8 h-[calc(100vh-250px)]">
      {COLUMNS.map(column => {
        const columnTasks = tasks.filter(t => t.status === column.id);

        return (
          <div key={column.id} className="flex flex-col h-full bg-[#080f28] border border-white/5 shadow-lg shadow-black/20 rounded-3xl p-5">
            <div className={`mb-4 pb-4 border-b border-white/5 flex items-center justify-between`}>
              <h3 className={`font-space font-bold text-sm uppercase tracking-wider ${column.color}`}>{column.title}</h3>
              <span className="text-[10px] font-bold text-t4 bg-[#04091a] border border-white/5 px-2 py-1 rounded-md">{columnTasks.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {columnTasks.map(task => (
                <div key={task.id} className="bg-[#04091a] border border-white/[0.03] shadow-md rounded-2xl p-4 hover:border-accent/40 transition-colors group">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <button 
                      onClick={() => handleStatusChange(task.id, task.status === 'Completed' ? 'Pending' : 'Completed')}
                      className="mt-0.5 shrink-0 text-t4 hover:text-emerald-400 transition-colors"
                    >
                      {task.status === 'Completed' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} />}
                    </button>
                    <div className="flex-1">
                      <h4 className={`font-bold text-sm leading-tight ${task.status === 'Completed' ? 'text-t4 line-through' : 'text-white'}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-t4 mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.due_date && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-t4 uppercase tracking-widest">
                        <Calendar size={10} /> {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Entity Links */}
                  {(task.company || task.contact || task.opportunity) && (
                    <div className="space-y-1.5 pt-3 border-t border-white/5">
                      {task.opportunity?.name && (
                        <p className="text-[10px] text-t3 flex items-center gap-1.5 truncate uppercase tracking-widest font-bold">
                          <Target size={10} className="text-accent shrink-0" /> {task.opportunity.name}
                        </p>
                      )}
                      {task.company?.name && (
                        <p className="text-[10px] text-t3 flex items-center gap-1.5 truncate uppercase tracking-widest font-bold">
                          <Building2 size={10} className="text-t4 shrink-0" /> {task.company.name}
                        </p>
                      )}
                      {task.contact?.email && (
                        <p className="text-[10px] text-t3 flex items-center gap-1.5 truncate uppercase tracking-widest font-bold">
                          <User size={10} className="text-t4 shrink-0" /> {task.contact.email}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
